import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
console.clear();
dotenv.config();

(async () => {
  const browser = await puppeteer.launch({ headless: true, console: true });
  const page = await browser.newPage();
  
  console.log('✅ Entrando a edesur.com.ar');
  await page.goto('https://ov.edesur.com.ar/login', { waitUntil: 'networkidle2' });

  console.log('✅ Enviando credenciales y haciendo login')
  await page.waitForSelector('form input[type="email"]');
  
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.type('form input[type="email"]', process.env.EDESUR_USER);
  await page.keyboard.press('Tab');
  await page.type('form input[type="password"]', process.env.EDESUR_PASS);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Espero que cargue la factura y deuda
  await page.waitForNavigation({waitUntil: 'networkidle2'});
  await page.waitForSelector('h5.card-title');

  console.log('✅ Obteniendo datos')
  await sleep(1000);

  // Leo los datos
  const result = await page.evaluate(() => {
    let data = [];
    document.querySelectorAll('div.display-sm p').forEach( (el, index, lista) => {
        if (index % 2 === 0) data.push({concepto: el.innerText, valor: lista[index+1]?.innerText});
    });
    return data;
  });
  

  console.log('░░░░░▒▒▒▒▒▓▓▓▓▓ ⚡ EDESUR ⚡ ▓▓▓▓▓▒▒▒▒▒░░░░░')
  console.table(result);

  await browser.close();
})();


async function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// No se usa pero en un futuro puede ser util
async function API_LOGIN() {
  const headers = {
    'authority': 'ed.edesur.com.ar',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'es-AR,es;q=0.6',
    'content-type': 'application/json',
  };
  const body = {
    'email': process.env.EDESUR_USER,
    'password': process.env.EDESUR_PASS
  };
  return fetch("https://ed.edesur.com.ar/api/Usuario/Login", {
    "method": 'POST',
    "body": JSON.stringify(body),
    "headers": headers,
  }).then( r => r.json() ).then( r => console.log({r}));
}