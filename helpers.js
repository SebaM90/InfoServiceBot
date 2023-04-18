
export async function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Convierte dinero string en numero: 'Deuda Total $ 7.994,98' → '7994.98'
// Si no encuentra nada, devuelve '---'
export function dineroToNumber(monto) {
  const regex = /-?[\d.,]+/g;
  const match = monto.match(regex) ?? null;
  const numero = match ? parseFloat(match[0].replace(',', '.')) : '---';
  return numero
}