import { dineroToNumber, saveScreenshot, sleep, getDateTimeStamp } from '../helpers.js';
import fs from 'node:fs';
const SERVICIO = 'EDESUR';
const URL_LOGIN = 'https://ov.edesur.com.ar/login';
const HTML_INPUT_EMAIL = 'form input[type="email"]';
const HTML_INPUT_PASSWORD = 'form input[type="password"]';

export function readEdesurBalance() {
  const data = {};
  document.querySelectorAll('div.display-sm p').forEach((element, index, elements) => {
    if (index % 2 === 0) data[element.innerText] = elements[index + 1]?.innerText;
  });
  const hasNoDebt = Array.from(document.querySelectorAll('h5 + div.acciones-estado-cuenta span'))
    .some(element => (element.innerText ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
      .includes('SU CUENTA NO POSEE DEUDA'));
  if (hasNoDebt) data['TOTAL A PAGAR'] = '$ 0';
  if (!data['TOTAL A PAGAR']) throw new Error('Edesur balance element not found');
  return data;
}

export async function edesur(browser) {
  const TIMEOUT = Number(process.env.EDESUR_TIMEOUT ?? 20000);
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

  await saveScreenshot(page, SERVICIO, 0)

  console.log(`✔ Enviando credenciales y haciendo login: ${SERVICIO}`)
  await page.waitForSelector(HTML_INPUT_EMAIL);

  await page.waitForSelector('asl-google-signin-button>div>iframe');

  await sleep(1000);
  
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
  const result = await page.evaluate(readEdesurBalance);

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
