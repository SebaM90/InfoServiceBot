import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { aysa } from './scraping/aysa.js';
import { edesur } from './scraping/edesur.js';
import { metrogas } from './scraping/metrogas.js';

console.clear();
dotenv.config();

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized']});

  console.time('🕙 Temporizador');
  Promise.all([
    edesur(browser),
    metrogas(browser),
    aysa(browser)
  ]).then( r => {
    console.table(r);
    browser.close();
    console.timeEnd('🕙 Temporizador');
  })

})();
