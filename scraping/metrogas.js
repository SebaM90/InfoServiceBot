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
  
  console.log(`⌛ ${SERVICIO}: Ingresando...`);
  await page.goto(URL_LOGIN, { waitUntil: 'networkidle2' });

  console.log(`⌛ ${SERVICIO}: Esperando redirecciones`)
  await page.waitForNavigation();

  console.log(`⌛ ${SERVICIO}: Esperando formulario`)
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

  console.log(`⌛ ${SERVICIO}: Leyendo datos`)
  const result = await page.$eval('.sapMObjectNumberText', span => span.innerText); // Deuda Total: $ 3.265,18


  // await sleep(1000);
  await page.close();
  console.log(`✅ ${SERVICIO}: FIN.`)
  return {
    servicio: SERVICIO,
    '1er Vencimiento': '',
    'TOTAL FACTURA': '',
    'TOTAL A PAGAR': dineroToNumber(result)
  }
};