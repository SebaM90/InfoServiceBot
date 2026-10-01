import dotenv from 'dotenv';
import fs from 'node:fs'
import puppeteer from 'puppeteer';
import { pathToFileURL } from 'node:url';
import { deleteCapturas, diasHastaHoy, dineroToNumber, numeroToDinero, getDateTimeStamp } from './helpers.js';

export async function runServices({ scrapers, launch = options => puppeteer.launch(options), cleanup = deleteCapturas }) {
  const browser = await launch({
    headless: true,
    args: ['--start-maximized'],
    defaultViewport: { width: 1200, height: 1000 }
  });

  try {
    await cleanup();
    return await Promise.allSettled(scrapers.map(async scrape => {
      const result = await scrape(browser);
      if (!Number.isFinite(result?.total)) throw new TypeError('Service returned an invalid balance');
      return result;
    }));
  } finally {
    await browser.close();
  }
}

export function validateConfiguration(env) {
  for (const service of ['EDESUR', 'METROGAS', 'AYSA']) {
    for (const suffix of ['USER', 'PASS']) {
      const name = `${service}_${suffix}`;
      if (!env[name]?.trim()) throw new Error(`Missing required configuration: ${name}`);
    }
    const timeout = Number(env[`${service}_TIMEOUT`] ?? 20000);
    if (!Number.isFinite(timeout) || timeout <= 0) throw new Error(`Invalid timeout for ${service}`);
  }
}

async function main() {
  dotenv.config({ quiet: true });
  validateConfiguration(process.env);
  const [{ edesur }, { metrogas }, { aysa }] = await Promise.all([
    import('./scraping/edesur.js'), import('./scraping/metrogas.js'), import('./scraping/aysa.js')
  ]);
  const timeStart = performance.now();
  const promesas = await runServices({ scrapers: [edesur, metrogas, aysa] });
    const servicios = promesas.filter( p => p.status === 'fulfilled' )?.map( p => p.value );
    const errores = promesas.filter( p => p.status === 'rejected' )?.map( p => p.reason );

    console.log('\n' + '•'.repeat(70))
    const total = servicios?.reduce( (acc, cur) => acc + (cur?.total ?? 0), 0);
    console.log(
                '➰ HORA:', (new Date()).toLocaleTimeString(), '\t\t' +
                '⌛ TIEMPO:', ((performance.now()-timeStart)/1000).toFixed(1) + ' s'
                );
    console.log(
                '⛔ ERRORES:', (errores.length ?? 0), '\t\t' +
                getTextoDeuda(total) + ':' , numeroToDinero(total)
                );
    console.log('•'.repeat(70), '\n')
    servicios.forEach( s => {
      console.log( '⭐', s.servicio, '⭐', '\t' + getTextoDeuda(s.total) + ':', numeroToDinero(s.total) )
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

      // Detalle de errores en archivo
      const filename = `errores_${getDateTimeStamp()}.txt`;
      fs.writeFileSync(filename, `${(new Date()).toLocaleString()}\n\n`);
      errores.forEach(error => {
        const todasLasPropiedades = Object.getOwnPropertyNames(error)?.sort(); // Obtiene todas las propiedades del objeto incluyendo las no-enumerables
        todasLasPropiedades.forEach((prop) => fs.appendFileSync(filename, `${prop.toUpperCase()}: ${error[prop]}\n`) );
        fs.appendFileSync(filename, '\n');
      });

      // Resumen de errores en consola
      console.log('⛔ ERRORES RESUMEN:')
      errores.forEach( p => console.log('\t', p?.name + ': ', p?.message?.length>20 ? p.message.slice(0,60)+'...' : p.message) );
      
      console.log('\x1b[31m%s\x1b[0m', '\n❗Se guardó el detalle completo de errores en el archivo:', filename, '❗');
      console.log('•'.repeat(60));
    }
  if (promesas.some(result => result.status === 'rejected')) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('Startup failed. Check required configuration, browser installation and local file permissions.');
    process.exitCode = 1;
  });
}

function getTextoDeuda(numero) {
  if ( numero === null ) '⭕ DEUDA TOTAL';
  if (typeof numero === 'number') {
    if ( numero < 0 ) return '✅ SALDO A FAVOR'
    if ( numero === 0 ) return '⏺  SIN ADEUDAR'
  }
  return '⭕ DEUDA TOTAL';
}
