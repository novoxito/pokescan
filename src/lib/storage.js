// Colección del usuario, persistida en localStorage.
const KEY = 'pokescan.collection.v1'
const SETTINGS_KEY = 'pokescan.settings.v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
  window.dispatchEvent(new Event('collection-changed'))
}

export function getCollection() {
  return read()
}

export function addToCollection(entry) {
  const list = read()
  const uid = `${entry.cardId}-${entry.language}-${Date.now()}`
  list.unshift({
    uid,
    quantity: 1,
    condition: 'NM',
    addedAt: new Date().toISOString(),
    ...entry,
  })
  write(list)
  return uid
}

export function updateEntry(uid, patch) {
  const list = read().map((e) => (e.uid === uid ? { ...e, ...patch } : e))
  write(list)
}

export function removeEntry(uid) {
  write(read().filter((e) => e.uid !== uid))
}

// Totales en USD (la divisa canónica interna).
export function collectionStats() {
  const list = read()
  let rawTotalUsd = 0
  let psa10TotalUsd = 0
  let cards = 0
  for (const e of list) {
    const qty = e.quantity || 1
    cards += qty
    if (e.rawPriceUsd) rawTotalUsd += e.rawPriceUsd * qty
    if (e.psa10PriceUsd) psa10TotalUsd += e.psa10PriceUsd * qty
  }
  return { entries: list.length, cards, rawTotalUsd, psa10TotalUsd }
}

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}
  } catch {
    return {}
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  return next
}
