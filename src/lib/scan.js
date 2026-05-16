// Cliente de la API: reconocimiento por foto y precios.
// En desarrollo, Vite redirige /api al proxy local (ver vite.config.js).
// En producción, /api son funciones serverless del mismo dominio.
const API_BASE = import.meta.env.VITE_API_BASE || ''

async function asJson(res) {
  let json = null
  try {
    json = await res.json()
  } catch {
    /* respuesta no-JSON */
  }
  if (!res.ok) {
    throw new Error(json?.error || `Error ${res.status}`)
  }
  return json
}

/**
 * Reconoce la carta de una foto. Devuelve la lista de candidatos.
 * @param {string} imgDataUrl  imagen ya redimensionada (data URL)
 * @param {string} language    '' | 'english' | 'japanese'
 */
export async function scanCard(imgDataUrl, language = '') {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      img: imgDataUrl,
      category: 'pokemon-cards',
      language,
    }),
  })
  const json = await asJson(res)
  return json.candidates || []
}

/** Precios (raw / Grade 9 / PSA 10) de una carta por su productId. */
export async function fetchPrices(productId) {
  const res = await fetch(
    `${API_BASE}/api/price?id=${encodeURIComponent(productId)}`
  )
  return asJson(res)
}
