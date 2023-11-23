import { formatDistance, parse } from 'date-fns';
import es from 'date-fns/locale/es/index.js';
import fs from 'fs';
import https from 'https';


export async function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Devuelve una marca de fecha y hora formateada.
 * @returns {string} La marca de fecha y hora formateada en el formato "YYYY_MM_DD_HH_MM_SS".
 */
export function getDateTimeStamp() {
  const fechaActual = new Date();
  const year = fechaActual.getFullYear();
  const month = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
  const day = fechaActual.getDate().toString().padStart(2, '0');
  const hours = fechaActual.getHours().toString().padStart(2, '0');
  const minutes = fechaActual.getMinutes().toString().padStart(2, '0');
  const seconds = fechaActual.getSeconds().toString().padStart(2, '0');

  return `${year}_${month}_${day}__${hours}_${minutes}_${seconds}`;
}


// Convierte dinero string en numero: 'Deuda Total $ 7.994,98' → '7994.98'
/**
 * Convierte un string con formato símil moneda a un número.
 *
 * @param {string} monto - El string con formato de moneda a convertir.
 * @returns {number|string} El número convertido o un mensaje de error si no se pudo realizar la conversión.
 * @example
 * dineroToNumber("$123.456,78") // Retorna: 123456.78
 * dineroToNumber("$ - 123.456,78") // Retorna: -123456.78
 * dineroToNumber("123,456.78") // Retorna: 123
 * dineroToNumber("123.456.78") // Retorna: 12345678
 * dineroToNumber("Saldo Positivo-$123,45") // Retorna: -123.45
 * dineroToNumber("Estas al día") // Retorna: "❌ Error al convertir"
 */
export function dineroToNumber(monto) {
  try {
    const sinTextoPrevio = monto.replace(/^.+?(\$|-)/, '$1'); // Eliminar el texto antes del símbolo "$" o "-".
    const sinSimboloDolar = sinTextoPrevio.replace(/\$/g, ''); // Eliminar el símbolo de dólar.
    const sinEspacios = sinSimboloDolar.replace(/\s+/g, ''); // Eliminar los espacios en blanco.
    const sinPuntos = sinEspacios.replace(/\./g, ''); // Eliminar los puntos que separan los miles.
    const conPuntoDecimal = sinPuntos.replace(/,(\d{2})$/, '.$1'); // Reemplazar la coma decimal por un punto decimal.
    const numero = parseFloat(conPuntoDecimal); // Convertir el string resultante a un número.
    if (isNaN(numero)) throw new Error(); // Verificar si la conversión tuvo éxito.
    return numero;
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
export async function deleteCapturas() {
  const directory = './'; // Directorio actual
  fs.readdir(directory, (err, files) => {
    if (err) throw err;
    files.forEach(file => {
      if (file.startsWith('captura') && file.endsWith('.png')) {
        fs.unlink(`${file}`, (err) => {
          if (err) throw err;
          console.log(`⚪ "${file}" eliminado.`);
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


// Descarga un archivo
export function downloadUrlFile(url, filename, cookies = {}) {

  // Convierte las cookies en una cadena
  const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

  const options = {
    rejectUnauthorized: false, // Asi no rebota por certificado SSL
    headers: {
      'Cookie': cookieString
    },
  };

  const file = fs.createWriteStream(filename);
  https.get(url, options, (response) => {
    response.pipe(file);
  });
}