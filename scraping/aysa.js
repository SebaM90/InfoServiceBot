import { dineroToNumber, saveScreenshot, sleep, getDateTimeStamp } from '../helpers.js';
import fs from 'node:fs';
const SERVICIO = 'AySA';
const URL_LOGIN = 'https://portal.web.aysa.com.ar/index.html#/estadocuenta';
const HTML_INPUT_EMAIL = '#j_username';
const HTML_INPUT_PASSWORD = '#j_password';

export async function aysa(browser) {
  const TIMEOUT = Number(process.env.AYSA_TIMEOUT ?? 20000);
  const page = await browser.newPage();

  // Habilitar la escucha de eventos de consola y guardarlos en un archivo
  const filenameConsole = `console_${SERVICIO.toLowerCase()}.txt`;
  fs.rmSync(filenameConsole, { force: true });
  page
    .on('console', cMsg =>
          fs.appendFileSync(filenameConsole, `🖥️ CONSOLE       ▓ ${getDateTimeStamp(true)} ▓ ${cMsg.type()?.toUpperCase()} ▓ ${cMsg.location()?.url} ▓ ${cMsg.text()}\n`) )
    .on('response', cMsg =>
          fs.appendFileSync(filenameConsole, `📡 RESPONSE      ▓ ${getDateTimeStamp(true)} ▓ ${cMsg.status()} ▓ ${cMsg.url()}\n`))
    .on('requestfailed', request =>
          fs.appendFileSync(filenameConsole, `❌ REQUESTFAILED ▓ ${getDateTimeStamp(true)} ▓ ${request.failure().errorText} ▓ ${request.url()}\n`))
    .on('pageerror', ({ message }) =>
          fs.appendFileSync(filenameConsole, `🚨 PAGEERROR     ▓ ${getDateTimeStamp(true)} ▓ ${message}\n`));


  await page.setDefaultTimeout(TIMEOUT);
  await page.setDefaultNavigationTimeout(TIMEOUT);

  
  console.log(`✔ Ingresando a ${SERVICIO}`);
  await page.goto(URL_LOGIN, { waitUntil: 'networkidle0' });

  console.log(`✔ Esperando redirecciones: ${SERVICIO}`)

  await saveScreenshot(page, SERVICIO, 0)

  console.log(`✔ Esperando formulario: ${SERVICIO}`)
  await page.waitForSelector(HTML_INPUT_EMAIL);
  await sleep(4000)


  await page.type(HTML_INPUT_EMAIL, process.env.AYSA_USER);
  await page.keyboard.press('Tab');
  await page.type(HTML_INPUT_PASSWORD, process.env.AYSA_PASS);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  await saveScreenshot(page, SERVICIO, 1)

  await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.keyboard.press('Enter')
  ]);

  // Espero que cargue la factura y deuda
  await saveScreenshot(page, SERVICIO, 11)
  await sleep(3000);

  console.log(`✔ Leyendo datos: ${SERVICIO}`);
  // Busco si hay deuda o no
  const result = await page.evaluate(() => {
    try {
      const saldo = document.querySelector('span.textDeuda');
      if (saldo) return saldo.innerText; // "Su saldo es $ 7.997,67"

      const sinDeuda = document.querySelector('#__text34');
      if (sinDeuda) return sinDeuda?.innerText; // "La cuenta no posee deuda"

      throw new Error('AySA balance element not found');
    } catch (error) {
      throw error;
    }
  });


  await saveScreenshot(page, SERVICIO, 2)

  const facturas = await page.evaluate( () => {
    const filas = document.querySelectorAll('tbody > tr')
    const rows = [];
    filas.forEach(row => {
      const cells = row.querySelectorAll('td.sapMListTblCell');
      // DESCRIPCIÓN          VENCIMIENTO   IMP. ORIGINAL   IMP. ACTUALIZADO
      // Facturación General	25/04/2023	  $ 8.720,47	    $ 8.720,47
      // Remesas de Pagos	    06/02/2023	  $ 722,80        $ 722,80
      const isRemesas = cells[0].innerText?.toLowerCase().trim().includes('remesas') ?? false; // Guita a favor
      const obj = {
        periodo: '------',
        monto: cells[2]?.innerText.trim(),
        total: cells[3]?.innerText.trim(),
        vencimiento: cells[1]?.innerText.trim(),
      };
      if (isRemesas) {
        obj.monto = obj.monto.replace('$ ', '$-');
        obj.total = obj.total.replace('$ ', '$-');
      }
      rows.push(obj);
    })
    return rows;
  })

  // await page.close();
  console.log(`✅ FINALIZADO: ${SERVICIO}`)
  return {
    servicio: SERVICIO,
    facturas: facturas,
    total: result?.trim().toUpperCase() === 'LA CUENTA NO POSEE DEUDA' ? 0 : dineroToNumber(result)
  }
};
