// Precios: "raw" (sin gradear) desde la API de Pokémon TCG (Cardmarket / TCGplayer)
// y "PSA 10" desde un proxy propio que consulta PriceCharting.

// URL del proxy de PriceCharting. Por defecto localhost; en producción
// apunta a donde despliegues server/index.js (variable VITE_PSA_PROXY).
const PSA_PROXY =
  import.meta.env.VITE_PSA_PROXY || 'http://localhost:8787'

const USD_TO_EUR = 0.92 // aproximado, solo para mostrar referencia

export const usdToEur = (n) => (n == null ? null : n * USD_TO_EUR)
export const eurToUsd = (n) => (n == null ? null : n / USD_TO_EUR)

/**
 * Precio raw a partir del objeto carta de la API de Pokémon TCG.
 * Devuelve { eur, usd, source, url, detail }.
 */
export function getRawPrice(card) {
  const cm = card.cardmarket?.prices
  if (cm && (cm.trendPrice || cm.averageSellPrice)) {
    const eur = cm.trendPrice || cm.averageSellPrice
    return {
      eur,
      usd: eur / USD_TO_EUR,
      source: 'Cardmarket',
      url: card.cardmarket.url,
      detail: {
        Tendencia: cm.trendPrice,
        'Media 30d': cm.avg30,
        'Más bajo': cm.lowPrice,
      },
    }
  }
  const tp = card.tcgplayer?.prices
  if (tp) {
    const variant =
      tp.holofoil || tp.normal || tp.reverseHolofoil || Object.values(tp)[0]
    if (variant?.market || variant?.mid) {
      const usd = variant.market || variant.mid
      return {
        eur: usd * USD_TO_EUR,
        usd,
        source: 'TCGplayer',
        url: card.tcgplayer.url,
        detail: { Market: variant.market, Low: variant.low, High: variant.high },
      }
    }
  }
  return null
}

/**
 * Precio PSA 10 (y raw de PriceCharting como contraste) vía proxy.
 * Devuelve { ungraded, psa10, grade9, url, currency } o lanza error.
 */
export async function getGradedPrice({ name, setName, number }) {
  const q = [name, setName, number].filter(Boolean).join(' ')
  const res = await fetch(`${PSA_PROXY}/api/psa10?q=${encodeURIComponent(q)}`)
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `Proxy PriceCharting: ${res.status}`)
  }
  return res.json()
}

export function fmtEur(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}

export function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
  }).format(n)
}
