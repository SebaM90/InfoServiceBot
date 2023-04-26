import dotenv from 'dotenv';
import { dineroToNumber, saveScreenshot, sleep } from '../helpers.js';
console.clear();
dotenv.config();

const SERVICIO = 'METROGAS';
const URL_LOGIN = 'https://portal.micuenta.metrogas.com.ar/sites#Consumos-App&/facturas/' + process.env.METROGAS_CTA_CONTRATO;
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
  await page.waitForSelector('.sapMObjectNumberText');

  console.log(`✔ Leyendo datos: ${SERVICIO}`)
  await sleep(500);
  const result = await page.$eval('.sapMObjectNumberText', span => span.innerText?.trim()?.toUpperCase() ); // Deuda Total: $ 3.265,18 ó "No registra deuda"

  await sleep(1000);

  await saveScreenshot(page, SERVICIO, 2)

  const facturas = await page.evaluate( () => {
    const filas = document.querySelectorAll('table#__xmlview0--idTableDebts-listUl > tbody > tr')
    const rows = [];
    filas.forEach(row => {
      const cells = row.querySelectorAll('td');
      const obj = {
        // facturaDeCiclo: cells[0].innerText.trim(),
        periodo: cells[1]?.innerText.trim(),
        monto: cells[2]?.innerText.trim(),
        total: cells[3].querySelector('.sapMObjStatusText')?.innerText.trim(),
        vencimiento: cells[4].querySelector('.sapMText')?.innerText.trim(),
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