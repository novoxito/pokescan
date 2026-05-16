// Divisas y conversión. Los precios internos están en USD (PriceCharting)
// o EUR (Cardmarket); aquí se convierten a la divisa elegida por el usuario.
export const CURRENCIES = [
  { code: 'USD', label: 'Dólar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'JPY', label: 'Yen', symbol: '¥' },
]

// Tipos de cambio de respaldo si la API de divisas no responde.
const FALLBACK_RATES = { USD: 1, EUR: 0.92, JPY: 155 }
const RATES_KEY = 'pokescan.rates.v1'

const todayStr = () => new Date().toISOString().slice(0, 10)

/** Carga tipos de cambio (base USD), con caché diaria en localStorage. */
export async function loadRates() {
  try {
    const cached = JSON.parse(localStorage.getItem(RATES_KEY) || 'null')
    if (cached?.date === todayStr() && cached.rates) return cached.rates
  } catch {
    /* sin caché válida */
  }
  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,JPY'
    )
    if (res.ok) {
      const j = await res.json()
      if (j.rates?.EUR && j.rates?.JPY) {
        const rates = { USD: 1, EUR: j.rates.EUR, JPY: j.rates.JPY }
        localStorage.setItem(
          RATES_KEY,
          JSON.stringify({ date: todayStr(), rates })
        )
        return rates
      }
    }
  } catch {
    /* sin red */
  }
  return FALLBACK_RATES
}

/** Convierte un importe de la divisa `from` a `to` usando tipos base USD. */
export function convert(amount, from, to, rates) {
  if (amount == null || Number.isNaN(amount)) return null
  const usd = amount / (rates[from] ?? 1)
  return usd * (rates[to] ?? 1)
}

export function formatMoney(amount, currency) {
  if (amount == null || Number.isNaN(amount)) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount)
}
