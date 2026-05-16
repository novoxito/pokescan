// Búsqueda de cartas contra la API pública de Pokémon TCG (gratuita).
// https://docs.pokemontcg.io  — admite CORS, no requiere clave (con clave hay más cuota).
const BASE = 'https://api.pokemontcg.io/v2'
const API_KEY = import.meta.env.VITE_POKEMONTCG_KEY || ''

function headers() {
  return API_KEY ? { 'X-Api-Key': API_KEY } : {}
}

async function query(q, pageSize = 30) {
  const url = `${BASE}/cards?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=-set.releaseDate`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) throw new Error(`Pokémon TCG API: ${res.status}`)
  const json = await res.json()
  return json.data || []
}

function escapeName(name) {
  return name.replace(/["\\]/g, '').trim()
}

/**
 * Busca candidatos a partir del nombre y/o número detectados por OCR.
 * Devuelve cartas normalizadas, ordenadas por relevancia.
 */
export async function searchCards({ name, number, setTotal }) {
  const seen = new Map()
  const add = (cards) => {
    for (const c of cards) if (!seen.has(c.id)) seen.set(c.id, c)
  }

  const cleanName = name ? escapeName(name) : ''
  const numCore = number ? number.replace(/[^0-9A-Za-z]/g, '') : ''

  try {
    if (cleanName && numCore) {
      add(await query(`name:"${cleanName}*" number:"${numCore}"`))
    }
    if (cleanName) {
      add(await query(`name:"${cleanName}*"`))
    }
    if (numCore && seen.size < 4) {
      add(await query(`number:"${numCore}"`))
    }
  } catch (e) {
    if (!seen.size) throw e
  }

  const list = [...seen.values()].map(normalize)
  return rank(list, { name: cleanName, number: numCore, setTotal })
}

export async function getCardById(id) {
  const res = await fetch(`${BASE}/cards/${id}`, { headers: headers() })
  if (!res.ok) throw new Error(`Pokémon TCG API: ${res.status}`)
  const json = await res.json()
  return normalize(json.data)
}

function normalize(c) {
  return {
    id: c.id,
    name: c.name,
    number: c.number,
    setName: c.set?.name || '',
    setId: c.set?.id || '',
    setTotal: c.set?.printedTotal || c.set?.total || null,
    series: c.set?.series || '',
    releaseDate: c.set?.releaseDate || '',
    rarity: c.rarity || '',
    artist: c.artist || '',
    images: c.images || {},
    cardmarket: c.cardmarket || null,
    tcgplayer: c.tcgplayer || null,
  }
}

function rank(list, { name, number, setTotal }) {
  const n = name.toLowerCase()
  return list
    .map((c) => {
      let score = 0
      const cn = c.name.toLowerCase()
      if (n && cn === n) score += 50
      else if (n && cn.startsWith(n)) score += 30
      else if (n && cn.includes(n)) score += 15
      if (number && c.number.toLowerCase() === number.toLowerCase()) score += 40
      if (setTotal && String(c.setTotal) === String(setTotal).replace(/\D/g, ''))
        score += 25
      if (c.images?.small) score += 2
      return { ...c, _score: score }
    })
    .sort((a, b) => b._score - a._score)
}
