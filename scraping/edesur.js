import dotenv from 'dotenv';
import { dineroToNumber, saveScreenshot, sleep } from '../helpers.js';
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
  
  console.log(`✔ Ingresando a ${SERVICIO}`);
  await page.goto(URL_LOGIN, { waitUntil: 'networkidle0' })

  await saveScreenshot(page, SERVICIO, 0)

  console.log(`✔ Enviando credenciales y haciendo login: ${SERVICIO}`)
  await page.waitForSelector(HTML_INPUT_EMAIL);

  await page.waitForSelector('asl-google-signin-button>div>iframe');

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

  await saveScreenshot(page, SERVICIO, 1)
  await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.keyboard.press('Enter')
  ]);

  // Espero que cargue la factura y deuda
  await page.waitForSelector('h5.card-title');

  console.log(`✔ Leyendo datos: ${SERVICIO}`)

  await sleep(1000);

  await saveScreenshot(page, SERVICIO, 2)

  // Leo los datos
  const result = await page.evaluate((a) => {
    let data = {};
    document.querySelectorAll('div.display-sm p').forEach( (el, index, lista) => {
        // 1er Vencimiento, TOTAL FACTURA, TOTAL A PAGAR
        // if (index % 2 === 0) data.push({concepto: el.innerText, valor: lista[index+1]?.innerText});
        if (index % 2 === 0) data[el.innerText] = lista[index+1]?.innerText;
    });

    const isSinDeuda = Array.from(document.querySelectorAll('h5 + div.acciones-estado-cuenta span'))
                                ?.map( e => e.innerText?.trim()?.toUpperCase() )
                                ?.includes('SU CUENTA NO POSEE DEUDA') ?? false // "Al día de la fecha, su cuenta no posee deuda.""

    if ( !data['TOTAL A PAGAR'] || isSinDeuda ) data['TOTAL A PAGAR'] = '$ 0';

    return data;
  }, SERVICIO);

  // await page.close();
  console.log(`✅ FINALIZADO: ${SERVICIO}`)
  return {
    servicio: SERVICIO,
    facturas: [{
      periodo: '------',
      monto: result['TOTAL FACTURA'],
      total: result['TOTAL FACTURA'],
      vencimiento: result['1er Vencimiento'] ?? result['2do Vencimiento']
    }],
    total: dineroToNumber(result['TOTAL A PAGAR'])
  }
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