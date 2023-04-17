import dotenv from 'dotenv';
import { sleep } from '../helpers.js';
console.clear();
dotenv.config();

const SERVICIO = 'AySA';
const URL_LOGIN = 'https://portal.web.aysa.com.ar/index.html#/estadocuenta';
const HTML_INPUT_EMAIL = '#j_username';
const HTML_INPUT_PASSWORD = '#j_password';

export async function aysa(browser) {
  const page = await browser.newPage();

  await page.setDefaultTimeout(60000);
  await page.setDefaultNavigationTimeout(60000);
  
  console.log(`✅ ${SERVICIO}: Ingresando...`);
  await page.goto(URL_LOGIN, { waitUntil: 'networkidle2' });

  console.log(`✅ ${SERVICIO}: Esperando redirecciones`)
  await page.waitForNavigation();

  console.log(`✅ ${SERVICIO}: Esperando formulario`)
  await page.waitForSelector(HTML_INPUT_EMAIL);
  await sleep(3000)

  await page.type(HTML_INPUT_EMAIL, process.env.AYSA_USER);
  await page.keyboard.press('Tab');
  await page.type(HTML_INPUT_PASSWORD, process.env.AYSA_PASS);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Espero que cargue la factura y deuda
  await page.waitForNavigation({waitUntil: 'networkidle2'});
  await page.waitForSelector('span.textDeuda');

  console.log(`✅ ${SERVICIO}: Leyendo datos`)
  const result = await page.$eval('span.textDeuda', span => span.innerText); // Su saldo es $ 7.997,67


  // await sleep(1000);
  await page.close();
  return {
    servicio: SERVICIO,
    '1er Vencimiento': '',
    'TOTAL FACTURA': '',
    'TOTAL A PAGAR': result?.replace('Su saldo es ', '')
  }
};