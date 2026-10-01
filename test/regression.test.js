import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { deleteCapturas, diasHastaHoy, dineroToNumber, downloadUrlFile } from '../helpers.js';
import { runServices, validateConfiguration } from '../index.js';
import { runInNewContext } from 'node:vm';
import { readEdesurBalance } from '../scraping/edesur.js';

test('date-fns Spanish locale loads and formats a date', () => {
  assert.match(diasHastaHoy('01/01/2020'), /^Hace /);
});

test('Argentine balances retain decimal values and credit signs', () => {
  assert.equal(dineroToNumber('Deuda Total $ 7.994,98'), 7994.98);
  assert.equal(dineroToNumber('Saldo Positivo-$123,45'), -123.45);
  assert.equal(dineroToNumber('$ 0'), 0);
});

test('Argentine currency handles signs around the symbol and one-digit decimals', () => {
  for (const [input, expected] of [
    ['-$ 123,45', -123.45], ['$ 1,2', 1.2], ['$ - 123.456,78', -123456.78],
    ['$-123,45', -123.45], ['-123,45', -123.45], ['Saldo Positivo-$123,45', -123.45],
    ['Deuda Total $ 7.994,98', 7994.98], ['$ 1.234.567,89', 1234567.89],
    ['123.456', 123456], ['1234,5', 1234.5], ['$\u00a01.234,50', 1234.5], ['$ 0', 0]
  ]) assert.equal(dineroToNumber(input), expected, input);
});

test('malformed currency retains the error contract without partial parsing', () => {
  for (const input of ['', 'Estas al día', '$123abc', '1.23', '123.456.78', '123,456.78',
    '$ 1,234', '$ 1.234,567', '--$123', '-$-123', '$$', null, undefined]) {
    assert.equal(dineroToNumber(input), `❌ Error al convertir "${input}" a número.`);
  }
});

function evaluateEdesurFixture(labels = [], notices = []) {
  // Execute the exact callback passed to page.evaluate, with an offline document.
  return runInNewContext(`(${readEdesurBalance.toString()})()`, {
    document: {
      querySelectorAll(selector) {
        if (selector === 'div.display-sm p') return labels.map(innerText => ({ innerText }));
        if (selector === 'h5 + div.acciones-estado-cuenta span') return notices.map(innerText => ({ innerText }));
        assert.fail(`Unexpected selector: ${selector}`);
      }
    }
  });
}

test('Edesur callback recognizes the full no-debt message and normalized whitespace', () => {
  for (const notice of ['Al día de la fecha, su cuenta no posee deuda.',
    ' AL DÍA DE LA FECHA, SU  CUENTA\nNO POSEE DEUDA. ', 'Su cuenta no posee deuda']) {
    assert.equal(evaluateEdesurFixture([], [notice])['TOTAL A PAGAR'], '$ 0');
  }
});

test('Edesur callback preserves a debt balance when no no-debt notice exists', () => {
  const result = evaluateEdesurFixture(['TOTAL A PAGAR', '$ 7.994,98', 'TOTAL FACTURA', '$ 1.234,50'], ['Tiene facturas pendientes.']);
  assert.equal(result['TOTAL A PAGAR'], '$ 7.994,98');
  assert.equal(result['TOTAL FACTURA'], '$ 1.234,50');
  assert.equal(dineroToNumber(result['TOTAL A PAGAR']), 7994.98);
});

test('Edesur callback rejects missing balance without claiming the account has no debt', () => {
  assert.throws(() => evaluateEdesurFixture([], []), /Edesur balance element not found/);
  assert.throws(() => evaluateEdesurFixture(['TOTAL FACTURA', '$ 1.234,50'], ['Estado de cuenta']), /Edesur balance element not found/);
});

test('screenshot cleanup is awaited and preserves unrelated files', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'infoservicebot-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const file of ['capturaAYSA_0.png', 'other.png', 'captura.txt']) await fs.writeFile(path.join(directory, file), 'fixture');
  await deleteCapturas(directory);
  assert.deepEqual((await fs.readdir(directory)).sort(), ['captura.txt', 'other.png']);
  await assert.rejects(deleteCapturas(path.join(directory, 'missing')), { code: 'ENOENT' });
});

test('all services settle before browser closure, including synchronous failures', async () => {
  const order = [];
  const results = await runServices({
    launch: async options => { assert.equal(options.headless, true); return { close: async () => { await Promise.resolve(); order.push('closed'); } }; },
    cleanup: async () => { order.push('cleanup'); },
    scrapers: [async () => { await Promise.resolve(); order.push('service'); return { total: 42 }; }, () => { throw new Error('offline failure'); }]
  });
  assert.deepEqual(order, ['cleanup', 'service', 'closed']);
  assert.deepEqual(results.map(result => result.status), ['fulfilled', 'rejected']);
});

test('cleanup failure still closes the browser and never starts services', async () => {
  let closed = false;
  await assert.rejects(runServices({
    launch: async () => ({ close: async () => { closed = true; } }),
    cleanup: async () => { throw new Error('cleanup failed'); },
    scrapers: [() => assert.fail('service must not start')]
  }), /cleanup failed/);
  assert.ok(closed);
});

test('invalid service balances are rejected instead of corrupting totals', async () => {
  const results = await runServices({
    launch: async () => ({ close: async () => {} }), cleanup: async () => {},
    scrapers: [async () => ({ total: 'conversion error' }), async () => ({ total: NaN })]
  });
  assert.ok(results.every(result => result.status === 'rejected'));
});

test('configuration reports missing keys without exposing values', () => {
  assert.throws(() => validateConfiguration({}), /Missing required configuration: EDESUR_USER/);
  const env = Object.fromEntries(['EDESUR', 'METROGAS', 'AYSA'].flatMap(service =>
    [[`${service}_USER`, 'offline'], [`${service}_PASS`, 'offline']]));
  validateConfiguration(env);
  assert.throws(() => validateConfiguration({ ...env, AYSA_TIMEOUT: 'not-a-number' }), /Invalid timeout for AYSA/);
});

function mockDownload(t, statusCode, body = 'offline invoice') {
  t.mock.method(https, 'get', (_url, options, callback) => {
    assert.equal(options.rejectUnauthorized, undefined);
    const request = new EventEmitter();
    request.setTimeout = () => request;
    request.destroy = error => request.emit('error', error);
    queueMicrotask(() => {
      const response = Readable.from([body]);
      response.statusCode = statusCode;
      callback(response);
    });
    return request;
  });
}

test('invoice download finishes writing before resolving, default cookies work', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'infoservicebot-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  mockDownload(t, 200);
  const filename = path.join(directory, 'invoice.pdf');
  await downloadUrlFile('https://offline.invalid/invoice', filename);
  assert.equal(await fs.readFile(filename, 'utf8'), 'offline invoice');
});

test('invoice HTTP errors reject without creating a misleading PDF', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'infoservicebot-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  mockDownload(t, 403, 'access denied');
  const filename = path.join(directory, 'invoice.pdf');
  await assert.rejects(downloadUrlFile('https://offline.invalid/invoice', filename), /HTTP 403/);
  assert.deepEqual(await fs.readdir(directory), []);
});

test('invoice network errors reject rather than becoming unhandled events', async t => {
  t.mock.method(https, 'get', () => {
    const request = new EventEmitter();
    request.setTimeout = () => request;
    queueMicrotask(() => request.emit('error', new Error('offline network failure')));
    return request;
  });
  await assert.rejects(downloadUrlFile('https://offline.invalid/invoice', 'unused.pdf'), /offline network failure/);
});
