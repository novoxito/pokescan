// Lógica compartida contra PriceCharting: reconocimiento de carta por foto
// y consulta de precios. La usan tanto el server local (server/index.js)
// como las funciones serverless de Vercel (api/*.js).
//
// Cómo funciona el reconocimiento: PriceCharting tiene un buscador "por foto"
// (POST /search-by-photo) que compara la imagen contra su base de datos de
// cartas. Funciona en cualquier idioma porque compara la imagen, no el texto.
// Replicamos exactamente esa llamada que hace su web.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const ORIGIN = 'https://www.pricecharting.com'
const SEED_PAGE = `${ORIGIN}/search-products?type=prices&q=pokemon`

// El endpoint /search-by-photo exige cookies de sesión: primero visitamos
// una página para obtenerlas y las reutilizamos un rato.
let cookieJar = null
let cookieTime = 0
const COOKIE_TTL = 25 * 60 * 1000

async function getCookies() {
  if (cookieJar && Date.now() - cookieTime < COOKIE_TTL) return cookieJar
  const res = await fetch(SEED_PAGE, { headers: { 'User-Agent': UA } })
  const setCookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : []
  cookieJar = setCookies.map((c) => c.split(';')[0]).join('; ')
  cookieTime = Date.now()
  return cookieJar
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&#43;/g, '+')
    .replace(/&quot;/g, '"')
}

/**
 * Reconoce una carta a partir de una foto.
 * @param {Buffer} imageBuffer  imagen (ya redimensionada por el cliente)
 * @param {string} mime         tipo MIME de la imagen
 * @param {string} category     categoría PriceCharting (pokemon-cards)
 * @param {string} language     '' (todos) | 'english' | 'japanese'
 * @returns {Promise<{candidates: Array}>}
 */
export async function searchByPhoto(
  imageBuffer,
  mime = 'image/jpeg',
  category = 'pokemon-cards',
  language = ''
) {
  const cookie = await getCookies()
  const fd = new FormData()
  fd.append('img', new Blob([imageBuffer], { type: mime }), 'card.jpg')
  fd.append('category', category)
  fd.append('language', language)

  const res = await fetch(`${ORIGIN}/search-by-photo`, {
    method: 'POST',
    body: fd,
    headers: { 'User-Agent': UA, Cookie: cookie, Referer: SEED_PAGE },
  })

  let json
  try {
    json = await res.json()
  } catch {
    throw new Error('PriceCharting devolvió una respuesta no válida')
  }
  if (json.answer_count === undefined && json.status?.code !== 200) {
    throw new Error(json.error || 'El reconocimiento por foto falló')
  }

  const records = json.answer_records || []
  const distances = json.answer_distances || []
  const candidates = records.map((r, i) => ({
    productId: String(r.product_id || '').replace(/^G/, ''),
    name: decodeEntities(r.name || ''),
    set: decodeEntities(r.set || ''),
    image: r._url || r.image_url || '',
    // distance: 0 = idéntica, mayor = peor. Lo pasamos a 0-100% de confianza.
    distance: distances[i] ?? null,
    confidence:
      distances[i] != null
        ? Math.max(0, Math.round((1 - distances[i]) * 100))
        : null,
  }))
  return { candidates }
}

// IDs de columnas de precio en la ficha de PriceCharting para cartas:
//   used_price        -> Ungraded (raw)
//   graded_price      -> Grade 9
//   manual_only_price -> PSA 10
function priceFromId(html, id) {
  const re = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</td>`, 'i')
  const m = html.match(re)
  if (!m) return null
  const pm = m[1].replace(/<[^>]+>/g, ' ').match(/\$[\d,]+(?:\.\d{1,2})?/)
  if (!pm) return null
  const n = Number(pm[0].replace(/[$,]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Extrae el nombre del Pokémon y el número del título de PriceCharting.
// "Charizard [Shadowless] #4" -> { pokemon: 'Charizard', number: '4' }
function parsePcName(name = '') {
  const pokemon = name
    .split('#')[0]
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const numM = name.match(/#\s*([A-Za-z]*\d+[A-Za-z]*)/)
  return { pokemon, number: numM ? numM[1] : '' }
}

function setTokens(s = '') {
  return new Set(
    s
      .toLowerCase()
      .replace(/pokemon|japanese|english/g, '')
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  )
}

// Precios de Cardmarket (mercado europeo, EUR) por idioma — vía pokemon-tcg-api
// en RapidAPI. Sirve `lowest_near_mint_{ES,DE,FR,IT}` y medianas de eBay graded.
const RAPIDAPI_HOST = 'pokemon-tcg-api.p.rapidapi.com'

async function searchPokeApiTcg(pokemon, number) {
  const key = process.env.RAPIDAPI_KEY
  if (!key || !pokemon) return []
  const params = new URLSearchParams({ name: pokemon })
  if (number) params.set('card_number', number)
  try {
    const res = await fetch(`https://${RAPIDAPI_HOST}/cards?${params}`, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    })
    if (!res.ok) return []
    return (await res.json()).data || []
  } catch {
    return []
  }
}

/**
 * Precio de Cardmarket por idioma para una carta concreta.
 * Si no hay clave de RapidAPI configurada, devuelve null y la app sigue.
 */
export async function getCardmarketPrice(pokemon, number, setHint = '') {
  const cards = await searchPokeApiTcg(pokemon, number)
  if (!cards.length) return null

  const hintTokens = setTokens(setHint)
  let best = null
  let bestScore = -1
  for (const c of cards) {
    const cm = c.prices?.cardmarket
    if (!cm) continue
    const tokens = setTokens(c.episode?.name || '')
    let overlap = 0
    for (const t of tokens) if (hintTokens.has(t)) overlap++
    if (overlap > bestScore) {
      bestScore = overlap
      best = {
        currency: cm.currency || 'EUR',
        lowest: cm.lowest_near_mint ?? null,
        prices_by_lang: {
          ES: cm.lowest_near_mint_ES ?? null,
          EN: cm.lowest_near_mint_EU_only ?? null, // proxy razonable para EN-EU
          DE: cm.lowest_near_mint_DE ?? null,
          FR: cm.lowest_near_mint_FR ?? null,
          IT: cm.lowest_near_mint_IT ?? null,
        },
        avg30: cm['30d_average'] ?? null,
        avg7: cm['7d_average'] ?? null,
        available: cm.available_items ?? null,
        ebay_graded: c.prices?.ebay?.graded ?? null,
        set: c.episode?.name || '',
        cardmarket_id: c.cardmarket_id || null,
      }
    }
  }
  return best
}

/**
 * Precios de una carta por su product_id de PriceCharting.
 * Incluye precios de PriceCharting (USD) y de Cardmarket (EUR) si se encuentran.
 */
export async function getPrices(productId, hints = {}) {
  const id = String(productId).replace(/^G/, '').replace(/[^0-9]/g, '')
  if (!id) throw new Error('productId no válido')

  const res = await fetch(`${ORIGIN}/game/${id}`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`PriceCharting respondió ${res.status}`)
  const html = await res.text()

  const nameM = html.match(/id="product_name"[^>]*>([\s\S]*?)<\/h1>/i)
  const fullName = nameM
    ? decodeEntities(
        nameM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      )
    : null

  // El nombre/número para Cardmarket: del hint del cliente o del título.
  const { pokemon, number } = parsePcName(hints.name || fullName || '')
  const cardmarket = await getCardmarketPrice(
    pokemon,
    number,
    hints.set || fullName || ''
  )

  return {
    name: fullName,
    url: res.url,
    currency: 'USD',
    ungraded: priceFromId(html, 'used_price'),
    grade9: priceFromId(html, 'graded_price'),
    psa10: priceFromId(html, 'manual_only_price'),
    cardmarket, // { trend, avg30, low, set, url } en EUR, o null
    source: 'PriceCharting',
  }
}
