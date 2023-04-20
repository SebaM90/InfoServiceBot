import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { aysa } from './scraping/aysa.js';
import { edesur } from './scraping/edesur.js';
import { metrogas } from './scraping/metrogas.js';
import { deleteCapturas, diasHastaHoy, dineroToNumber, numeroToDinero } from './helpers.js';

console.clear();
dotenv.config();


(async () => {
  console.time('⌛ Temporizador');
  const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized'], defaultViewport: { width: 1200, height: 1000 }});

  await deleteCapturas();

  Promise.allSettled([
    edesur(browser),
    metrogas(browser),
    aysa(browser)
  ]).then( promesas => {
    browser.close();
    const servicios = promesas.filter( p => p.status === 'fulfilled' )?.map( p => p.value );
    const errores = promesas.filter( p => p.status === 'rejected' )?.map( p => p.reason );

    console.log('•'.repeat(60))
    console.timeEnd('⌛ Temporizador');
    const total = servicios?.reduce( (acc, cur) => acc + (cur?.total ?? 0), 0);
    console.log('❌ Problemas:', errores.length ?? 0)
    console.log('⭕ TOTAL', numeroToDinero(total));
    console.log('•'.repeat(60))
    servicios.forEach( s => {
      console.log( '⭐', s.servicio, '⭕ TOTAL', numeroToDinero(s.total) )
      const facturas = s?.facturas?.map( f => {
        f.monto = dineroToNumber(f.monto);
        f.total = dineroToNumber(f.total);
        if (f.vencimiento) f.cuandoVence = diasHastaHoy(f.vencimiento);
        return f
      });
      console.table(facturas)
    })

    // Errores
    if (errores && errores.length) {
      console.log('•'.repeat(60))
      console.log('❌ ERRORES:')
      errores.forEach( p => console.log('\n', p) )
    }
  })

})();
