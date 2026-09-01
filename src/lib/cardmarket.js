// Enlaces directos a Cardmarket ya filtrados por idioma y condición.
//
// Cardmarket no ofrece API pública ni permite consultar sus listados desde
// fuera, así que la app no puede leer el primer precio de cada condición.
// Lo que sí puede es abrir la página exacta con los filtros puestos para
// que el primer precio de la lista sea el de esa condición en ese idioma.

// IDs de idioma que usa Cardmarket en sus URLs.
export const CM_LANG = { EN: 1, FR: 2, DE: 3, ES: 4, IT: 5, ZH: 6, JP: 7, PT: 8, KO: 10 }

// Condición mínima ("esta o mejor"). 1 = MT, 2 = NM, 3 = EX, 4 = GD, 5 = LP, 6 = PL, 7 = PO.
export const CM_CONDITIONS = [
  { code: 'NM', min: 2 },
  { code: 'EX', min: 3 },
  { code: 'GD', min: 4 },
]

// Limpia el título que devuelve PriceCharting: "Iono #350 [Shiny Treasure]" -> "Iono".
export function cleanCardName(name = '') {
  return name
    .replace(/\s*#.*$/, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * URL de Cardmarket para una carta, filtrada por idioma y condición mínima.
 * Si Cardmarket encuentra un único producto abre su ficha con los filtros
 * aplicados; si devuelve una lista, el usuario toca la carta.
 *
 * @param {object} opts
 * @param {string} opts.name       nombre de la carta (título PriceCharting o limpio)
 * @param {string} opts.language   código de idioma de la copia (JP, EN, ES…)
 * @param {number|null} opts.minCondition  2 = NM, 3 = EX, 4 = GD; null = todas
 */
export function cardmarketUrl({ name = '', language = 'JP', minCondition = null }) {
  const params = new URLSearchParams({ searchString: cleanCardName(name) })
  const lang = CM_LANG[language]
  if (lang) params.set('language', String(lang))
  if (minCondition) params.set('minCondition', String(minCondition))
  return `https://www.cardmarket.com/en/Pokemon/Products/Search?${params}`
}
