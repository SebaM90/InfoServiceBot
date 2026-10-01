import { dineroToNumber, saveScreenshot, sleep, downloadUrlFile, getDateTimeStamp } from '../helpers.js';
import fs from 'node:fs';
const SERVICIO = 'METROGAS';
const URL_LOGIN = 'https://portal.micuenta.metrogas.com.ar/sites#ConsumosSaldos-Detalle';
const URL_INVOICE = 'https://portal.micuenta.metrogas.com.ar/sap/fiori/ovconsumosm360v2//OvServiceHub/api/v1/M360/invoice/isu';
const HTML_INPUT_EMAIL = '#j_username';
const HTML_INPUT_PASSWORD = '#j_password';

export async function metrogas(browser) {
  const TIMEOUT = Number(process.env.METROGAS_TIMEOUT ?? 20000);
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
  
  await page.goto(URL_LOGIN, { waitUntil: 'networkidle0' })


  console.log(`✔ Esperando redirecciones: ${SERVICIO}`)

  await saveScreenshot(page, SERVICIO, 0)

  console.log(`✔ Esperando formulario: ${SERVICIO}`)
  await page.waitForSelector(HTML_INPUT_EMAIL);
  await sleep(2000)

  await page.type(HTML_INPUT_EMAIL, process.env.METROGAS_USER);
  await page.keyboard.press('Tab');
  await page.type(HTML_INPUT_PASSWORD, process.env.METROGAS_PASS);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  await saveScreenshot(page, SERVICIO, 1)
  await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.keyboard.press('Enter')
  ]);

  // Espero que cargue la factura y deuda
  await saveScreenshot(page, SERVICIO, 11)
  await page.waitForSelector('#__status7-text');

  console.log(`✔ Leyendo datos: ${SERVICIO}`)
  await sleep(500);
  const result = await page.$eval('#__status7-text', span => span.innerText?.trim()?.toUpperCase() ); // Deuda Total: $ 3.265,18 ó "No registra deuda"


  await saveScreenshot(page, SERVICIO, 2)
  // Click en Boton de "Facturas Impagass"
  await page.waitForSelector('#application-ConsumosSaldos-Detalle-component---Main--tab2Id');
  await page.click('#application-ConsumosSaldos-Detalle-component---Main--tab2Id');

  await sleep(1000);

  await saveScreenshot(page, SERVICIO, 3)

  const facturas = await page.evaluate( () => {
    const filas = document.querySelectorAll('#application-ConsumosSaldos-Detalle-component---Main--idTableDebts-tblBody > tr');
    const rows = [];
    filas.forEach(row => {
      const cells = row.querySelectorAll('td');
      const obj = {
        facturaCiclo: cells[1]?.querySelector('bdi')?.innerText, // Es el "número de impresión", ejemplo: 250001642845
        periodo: cells[2]?.innerText.trim(),
        monto: cells[3]?.innerText.trim(),
        total: cells[4].querySelector('.sapMObjStatusText')?.innerText.trim(),
        vencimiento: cells[5].querySelector('.sapMText')?.innerText.trim(),
      };
      rows.push(obj);
    })
    return rows;
  })

  // Descargar las facturas fisicas
  for (const [index, f] of facturas.entries()) {
    if (!f.facturaCiclo) continue;
    const url = `${URL_INVOICE}/${f.facturaCiclo}`;
    const filename= `${SERVICIO}_${index}_${f.facturaCiclo}.pdf`;
    const host = new URL(url).hostname;
    const cookies = (await page.browserContext().cookies()).filter(cookie => {
      const domain = cookie.domain.replace(/^\./, '');
      return host === domain || (cookie.domain.startsWith('.') && host.endsWith(`.${domain}`));
    });
    await downloadUrlFile(url, filename, cookies);
  };

  // await sleep(1000);
  // await page.close();
  console.log(`✅ FINALIZADO: ${SERVICIO}`)
  return {
    servicio: SERVICIO,
    facturas: facturas,
    total: (result && result === 'NO REGISTRA DEUDA') ? 0 : dineroToNumber(result)
  }
};
