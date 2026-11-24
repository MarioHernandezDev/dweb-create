/** Única forma de escribir un importe en euros (recibe céntimos). `digits` = decimales máximos. */
export function formatMoney(cents: number, digits = 0): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits }).format(cents / 100)
}
