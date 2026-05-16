// Utilidades de formato de precio. Los precios de PriceCharting vienen en USD.
const USD_TO_EUR = 0.92 // aproximado, solo de referencia

export const usdToEur = (n) => (n == null ? null : n * USD_TO_EUR)

export function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
  }).format(n)
}

export function fmtEur(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}
