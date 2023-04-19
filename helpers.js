
export async function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Convierte dinero string en numero: 'Deuda Total $ 7.994,98' → '7994.98'
// Si no encuentra nada, devuelve '---'
export function dineroToNumber(monto) {
  const regex = /-?[\d.,]+/g;
  const match = monto?.match(regex) ?? null;
  const limpio = match[0]?.replace('.', '').replace(',', '.'); // '-111.555,9' ---> '111555.9'
  const numero = match ? parseFloat(limpio) : '---';
  return numero
}

// Convierte un numero a dinero argentino: 1234.5 → '$ 1.234,5'
export function numeroToDinero(numero) {
  return numero?.toLocaleString('es-AR', {style: 'currency', currency: 'ARS'});
}