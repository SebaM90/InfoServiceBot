import { formatDistance, parse } from 'date-fns';
import { es } from 'date-fns/locale/es';
import fs from 'fs';
import https from 'https';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';


export async function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtiene una marca de tiempo de fecha y hora actual en formato personalizado.
 * @param {boolean} raw - Indica si se debe devolver la marca de tiempo sin formato.
 * @returns {string} La marca de tiempo en formato personalizado.
 * @example getDateTimeStamp() // Retorna: "2021_08_01__23_59_59"
 * @example getDateTimeStamp(true) // Retorna: "20210801235959333"
 */
export function getDateTimeStamp(raw = false) {
  const fechaActual = new Date();
  const year = fechaActual.getFullYear();
  const month = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
  const day = fechaActual.getDate().toString().padStart(2, '0');
  const hours = fechaActual.getHours().toString().padStart(2, '0');
  const minutes = fechaActual.getMinutes().toString().padStart(2, '0');
  const seconds = fechaActual.getSeconds().toString().padStart(2, '0');
  const miliseconds = fechaActual.getMilliseconds().toString().padStart(3, '0');

  return raw  ? `${year}${month}${day}${hours}${minutes}${seconds}${miliseconds}`
              : `${year}_${month}_${day}__${hours}_${minutes}_${seconds}`;
}


/**
 * Parse Argentine currency with optional labels, signs and thousands separators.
 * Reject malformed amounts instead of accepting a partial numeric prefix.
 * @param {string} monto - Currency text.
 * @returns {number|string} Parsed amount or the existing conversion error message.
 * @example
 * dineroToNumber("$123.456,78") // 123456.78
 * dineroToNumber("-$ 123,45") // -123.45
 * dineroToNumber("$ 1,2") // 1.2
 */
export function dineroToNumber(monto) {
  try {
    if (typeof monto !== 'string') throw new TypeError('Currency text must be a string');
    const amount = monto.trim().replace(/^[^\d$+-]+/, '').replace(/\s+/g, '');
    const match = amount.match(/^([+-]?)\$?([+-]?)((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)$/);
    if (!match || (match[1] && match[2])) throw new Error('Invalid currency format');
    const value = Number(match[3].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(value)) throw new Error('Invalid currency amount');
    return (match[1] || match[2]) === '-' ? -value : value;
  } catch (error) {
    return `❌ Error al convertir "${monto}" a número.`;
  }
}

// Convierte un numero a dinero argentino: 1234.5 → '$ 1.234,5'
export function numeroToDinero(numero) {
  return numero?.toLocaleString('es-AR', {style: 'currency', currency: 'ARS'});
}


export async function saveScreenshot(page = null, servicio = '', detalle = '') {
  const ruta = `captura${servicio.toUpperCase()}_${detalle}.png`;
  try {
    if (page) {
      return await page.screenshot({path: ruta, fullPage: false, type: 'png'});
    }
  } catch (error) {
    console.error(`❌ Screenshot: ${error}`);
  }
  return false;
}


// Borra todas las capturas
export async function deleteCapturas(directory = '.') {
  const files = await fs.promises.readdir(directory);
  await Promise.all(files
    .filter(file => file.startsWith('captura') && file.endsWith('.png'))
    .map(file => fs.promises.unlink(path.join(directory, file))));
}

// devuelve la cantidad de dias, segun la diferencia entre la fechaTexto y la fecha actual
export function diasHastaHoy(fechaTexto) {
  const fechaActual = new Date();
  const fechaEntradaObjeto = parse(fechaTexto, 'dd/MM/yyyy', new Date());
  const distanciaEnDias = formatDistance(fechaEntradaObjeto, fechaActual, { addSuffix: true, locale: es });
  return distanciaEnDias.charAt(0).toUpperCase() + distanciaEnDias.slice(1); // primera letra en mayuscula;
}


// Descarga un archivo
export async function downloadUrlFile(url, filename, cookies = []) {
  const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  const response = await new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { Cookie: cookieString } }, resolve);
    request.on('error', reject);
    request.setTimeout(20000, () => request.destroy(new Error('Invoice download timed out')));
  });
  if (response.statusCode !== 200) {
    response.resume();
    throw new Error(`Invoice download failed (HTTP ${response.statusCode})`);
  }
  try {
    await pipeline(response, fs.createWriteStream(filename));
  } catch (error) {
    await fs.promises.rm(filename, { force: true });
    throw error;
  }
}
