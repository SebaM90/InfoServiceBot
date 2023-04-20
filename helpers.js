import fs from 'fs';
import { parse, formatDistance } from 'date-fns';
import es from 'date-fns/locale/es/index.js';

export async function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Convierte dinero string en numero: 'Deuda Total $ 7.994,98' → '7994.98'
// Si no encuentra nada, devuelve '---'
export function dineroToNumber(monto) {
  const regex = /-?[\d.,]+/g;
  if (!monto || typeof monto !== 'string') return '❌E1'
  const match = monto?.match(regex) ?? null;
  if ( !Array.isArray(match) ) return '❌E2';
  const limpio = match[0]?.replace('.', '').replace(',', '.'); // '-111.555,9' ---> '111555.9'
  const numero = match ? parseFloat(limpio) : '❌E3';
  return numero
}

// Convierte un numero a dinero argentino: 1234.5 → '$ 1.234,5'
export function numeroToDinero(numero) {
  return numero?.toLocaleString('es-AR', {style: 'currency', currency: 'ARS'});
}


export async function saveScreenshot(page = null, servicio = '', detalle = '') {
  const ruta = `captura${servicio.toUpperCase()}_${detalle}.png`;
  return page ? await page.screenshot({path: ruta, fullPage: false, type: 'png'})
              : false;
}


// Borra todas las capturas
export async function deleteCapturas() {
  const directory = './'; // Directorio actual
  fs.readdir(directory, (err, files) => {
    if (err) throw err;
    files.forEach(file => {
      if (file.startsWith('captura') && file.endsWith('.png')) {
        fs.unlink(`${file}`, (err) => {
          if (err) throw err;
          console.log(`❎ "${file}" eliminado.`);
        });
      }
    });
  });
}

// devuelve la cantidad de dias, segun la diferencia entre la fechaTexto y la fecha actual
export function diasHastaHoy(fechaTexto) {
  const fechaActual = new Date();
  const fechaEntradaObjeto = parse(fechaTexto, 'dd/MM/yyyy', new Date());
  const distanciaEnDias = formatDistance(fechaEntradaObjeto, fechaActual, { addSuffix: true, locale: es });
  return distanciaEnDias.charAt(0).toUpperCase() + distanciaEnDias.slice(1); // primera letra en mayuscula;
}
