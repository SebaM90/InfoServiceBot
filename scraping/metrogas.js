import dotenv from 'dotenv';
import { dineroToNumber, saveScreenshot, sleep } from '../helpers.js';
console.clear();
dotenv.config();

const SERVICIO = 'METROGAS';
const URL_LOGIN = 'https://portal.micuenta.metrogas.com.ar/sites#ConsumosSaldos-Detalle';
const HTML_INPUT_EMAIL = '#j_username';
const HTML_INPUT_PASSWORD = '#j_password';

export async function metrogas(browser) {
  const page = await browser.newPage();

  await page.setDefaultTimeout(60000);
  await page.setDefaultNavigationTimeout(60000);

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
  await page.waitForSelector('#__status7-text');

  console.log(`✔ Leyendo datos: ${SERVICIO}`)
  await sleep(500);
  const result = await page.$eval('#__status7-text', span => span.innerText?.trim()?.toUpperCase() ); // Deuda Total: $ 3.265,18 ó "No registra deuda"


  await saveScreenshot(page, SERVICIO, 2)
  // Click en Boton de "Facturas Impagass"
  await page.waitForSelector('#application-ConsumosSaldos-Detalle-component---Main--tab1Id');
  await page.click('#application-ConsumosSaldos-Detalle-component---Main--tab1Id');

  await sleep(1000);

  await saveScreenshot(page, SERVICIO, 3)

  const facturas = await page.evaluate( () => {
    const filas = document.querySelectorAll('#application-ConsumosSaldos-Detalle-component---Main--idTableDebts-tblBody > tr');
    const rows = [];
    filas.forEach(row => {
      const cells = row.querySelectorAll('td');
      const obj = {
        periodo: cells[2]?.innerText.trim(),
        monto: cells[3]?.innerText.trim(),
        total: cells[4].querySelector('.sapMObjStatusText')?.innerText.trim(),
        vencimiento: cells[5].querySelector('.sapMText')?.innerText.trim(),
      };
      rows.push(obj);
    })
    return rows;
  })

  // await sleep(1000);
  // await page.close();
  console.log(`✅ FINALIZADO: ${SERVICIO}`)
  return {
    servicio: SERVICIO,
    facturas: facturas,
    total: (result && result === 'NO REGISTRA DEUDA') ? 0 : dineroToNumber(result)
  }
};