import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', request => request.abort());
  await page.setContent('<html><body><span id="balance">$ 1.234,56</span></body></html>');
  assert.equal(await page.$eval('#balance', element => element.textContent), '$ 1.234,56');
  assert.ok(Array.isArray(await page.browserContext().cookies()));
  console.log(`Browser smoke passed: ${await browser.version()}. Local HTML only; outbound requests blocked.`);
} finally {
  await browser.close();
}
