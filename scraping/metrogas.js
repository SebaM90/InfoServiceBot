import dotenv from 'dotenv';
import { dineroToNumber, sleep } from '../helpers.js';
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
  
  console.log(`❔ ${SERVICIO}: Ingresando...`);
  await page.goto(URL_LOGIN, { waitUntil: 'networkidle2' });

  console.log(`❔ ${SERVICIO}: Esperando redirecciones`)
  await page.waitForNavigation();

  console.log(`❔ ${SERVICIO}: Esperando formulario`)
  await page.waitForSelector(HTML_INPUT_EMAIL);
  await sleep(2000)

  await page.type(HTML_INPUT_EMAIL, process.env.METROGAS_USER);
  await page.keyboard.press('Tab');
  await page.type(HTML_INPUT_PASSWORD, process.env.METROGAS_PASS);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Espero que cargue la factura y deuda
  await page.waitForNavigation({waitUntil: 'networkidle2'});
  await page.waitForSelector('.sapMObjectNumberText');

  console.log(`❔ ${SERVICIO}: Leyendo datos`)
  const result = await page.$eval('.sapMObjectNumberText', span => span.innerText); // Deuda Total: $ 3.265,18

  await sleep(500);

  const facturas = await page.evaluate( () => {
    const filas = document.querySelectorAll('tbody > tr')
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
  await page.close();
  console.log(`✅ ${SERVICIO}: FIN.`)
  return {
    servicio: SERVICIO,
    facturas: facturas.map( f => { f.monto = dineroToNumber(f.monto); f.total = dineroToNumber(f.total); return f }),
    total: dineroToNumber(result)
  }
};