import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { aysa } from './scraping/aysa.js';
import { edesur } from './scraping/edesur.js';
import { metrogas } from './scraping/metrogas.js';
import { numeroToDinero } from './helpers.js';

console.clear();
dotenv.config();


(async () => {
  console.time('⌛ Temporizador');
  const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized']});

  Promise.all([
    edesur(browser),
    metrogas(browser),
    aysa(browser)
  ]).then( servicios => {
    browser.close();
    console.log('•'.repeat(60))
    console.timeEnd('⌛ Temporizador');
    const total = servicios?.reduce( (acc, cur) => acc + (cur.total ?? 0), 0);
    console.log('⭕ TOTAL', numeroToDinero(total));
    console.log('•'.repeat(60))
    servicios.forEach( s => {
      console.log( '⭐', s.servicio, '⭕ TOTAL', numeroToDinero(s.total) )
      console.table( s.facturas)
    })
  })

})();
