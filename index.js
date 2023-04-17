import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { edesur } from './scraping/edesur.js';
import { metrogas } from './scraping/metrogas.js';

console.clear();
dotenv.config();

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized']});

  Promise.all([
    edesur(browser),
    metrogas(browser)
  ]).then( r => {
    console.table(r);
    browser.close();
  })

})();
