import dotenv from 'dotenv';
import { sleep } from '../helpers.js';
console.clear();
dotenv.config();

const SERVICIO = 'EDESUR';
const URL_LOGIN = 'https://ov.edesur.com.ar/login';
const HTML_INPUT_EMAIL = 'form input[type="email"]';
const HTML_INPUT_PASSWORD = 'form input[type="password"]';

export async function edesur(browser) {
  const page = await browser.newPage();

  await page.setDefaultTimeout(60000);
  await page.setDefaultNavigationTimeout(60000);
  
  console.log(`⌛ ${SERVICIO}: Ingresando...`);
  await page.goto(URL_LOGIN, { waitUntil: 'networkidle2' });

  console.log(`⌛ ${SERVICIO}: Enviando credenciales y haciendo login`)
  await page.waitForSelector(HTML_INPUT_EMAIL);

  await page.waitForSelector('asl-google-signin-button>div>iframe');

  // await page.screenshot({ path: 'captura'+SERVICIO+'.png' });

  sleep(1000);
  
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.type(HTML_INPUT_EMAIL, process.env.EDESUR_USER);
  await page.keyboard.press('Tab');
  await page.type(HTML_INPUT_PASSWORD, process.env.EDESUR_PASS);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Espero que cargue la factura y deuda
  await page.waitForNavigation({waitUntil: 'networkidle2'});
  await page.waitForSelector('h5.card-title');

  console.log(`⌛ ${SERVICIO}: Leyendo datos`)
  await sleep(1000);

  // Leo los datos
  const result = await page.evaluate((a) => {
    let data = { servicio: a };
    document.querySelectorAll('div.display-sm p').forEach( (el, index, lista) => {
        // if (index % 2 === 0) data.push({concepto: el.innerText, valor: lista[index+1]?.innerText});
        if (index % 2 === 0) data[el.innerText] = lista[index+1]?.innerText;
    });
    return data;
  }, SERVICIO);

  await page.close();
  console.log(`✅ ${SERVICIO}: FIN.`)
  return result
};


// No se usa pero en un futuro puede ser util
// async function API_LOGIN() {
//   const headers = {
//     'authority': 'ed.edesur.com.ar',
//     'accept': 'application/json, text/plain, */*',
//     'accept-language': 'es-AR,es;q=0.6',
//     'content-type': 'application/json',
//   };
//   const body = {
//     'email': process.env.EDESUR_USER,
//     'password': process.env.EDESUR_PASS
//   };
//   return fetch("https://ed.edesur.com.ar/api/Usuario/Login", {
//     "method": 'POST',
//     "body": JSON.stringify(body),
//     "headers": headers,
//   }).then( r => r.json() ).then( r => console.log({r}));
// }