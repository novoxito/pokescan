// Idiomas de búsqueda que admite el reconocimiento de PriceCharting.
export const SCAN_LANGUAGES = [
  { code: '', label: 'Todos' },
  { code: 'english', label: 'Inglés' },
  { code: 'japanese', label: 'Japonés' },
]

// Idiomas para etiquetar tu copia física en la colección.
export const LANGUAGES = [
  { code: 'EN', label: 'Inglés', flag: '🇬🇧' },
  { code: 'ES', label: 'Español', flag: '🇪🇸' },
  { code: 'JP', label: 'Japonés', flag: '🇯🇵' },
  { code: 'FR', label: 'Francés', flag: '🇫🇷' },
  { code: 'DE', label: 'Alemán', flag: '🇩🇪' },
  { code: 'IT', label: 'Italiano', flag: '🇮🇹' },
  { code: 'PT', label: 'Portugués', flag: '🇵🇹' },
  { code: 'KO', label: 'Coreano', flag: '🇰🇷' },
  { code: 'ZH', label: 'Chino', flag: '🇨🇳' },
]

export function languageLabel(code) {
  const l = LANGUAGES.find((x) => x.code === code)
  return l ? `${l.flag} ${l.label}` : code
}

// Sugiere el idioma de la copia a partir del set detectado por PriceCharting.
export function languageFromSet(setName = '') {
  return /japanese/i.test(setName) ? 'JP' : 'EN'
}
