// Idiomas en los que se imprimen las cartas Pokémon.
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

// Pista de idioma a partir del texto OCR (heurística sencilla).
export function guessLanguage(text) {
  const t = (text || '').toLowerCase()
  if (/[぀-ヿ一-鿿]/.test(t)) return 'JP'
  if (/[가-힯]/.test(t)) return 'KO'
  if (/punto de vida|puntos de vida|etapa|fase|debilidad|resistencia/.test(t))
    return 'ES'
  if (/points de vie|faiblesse|résistance|niveau/.test(t)) return 'FR'
  if (/kraftpunkte|schwäche|resistenz/.test(t)) return 'DE'
  if (/punti vita|debolezza|resistenza/.test(t)) return 'IT'
  if (/weakness|resistance|retreat|stage|basic/.test(t)) return 'EN'
  return 'EN'
}
