import assert from 'node:assert/strict';
import { runServices, validateConfiguration } from '../index.js';
import { diasHastaHoy, dineroToNumber } from '../helpers.js';
import { aysa } from '../scraping/aysa.js';
import { edesur } from '../scraping/edesur.js';
import { metrogas } from '../scraping/metrogas.js';

validateConfiguration(Object.fromEntries(['EDESUR', 'METROGAS', 'AYSA'].flatMap(service =>
  [[`${service}_USER`, 'offline-user'], [`${service}_PASS`, 'offline-password']])));
assert.equal(dineroToNumber('$ 1.234,56'), 1234.56);
assert.equal(typeof diasHastaHoy('01/01/2026'), 'string');
assert.ok([aysa, edesur, metrogas].every(scrape => typeof scrape === 'function'));
let closed = false;
const results = await runServices({
  launch: async () => ({ close: async () => { closed = true; } }),
  cleanup: async () => {},
  scrapers: ['EDESUR', 'METROGAS', 'AYSA'].map(servicio => async () => ({ servicio, total: 0, facturas: [] }))
});
assert.ok(closed);
assert.ok(results.every(result => result.status === 'fulfilled'));
console.log('Offline smoke passed: module imports, formatting and mocked orchestration. No credentials loaded or outbound calls made.');
