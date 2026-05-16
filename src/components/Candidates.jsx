import { useState } from 'react'
import { LANGUAGES, languageFromSet } from '../lib/languages.js'

// Lista de cartas candidatas devueltas por el reconocimiento de imagen,
// ordenadas por confianza. El usuario elige la suya y el idioma de su copia.
export default function Candidates({ photo, candidates, onPick, onRetry }) {
  const [language, setLanguage] = useState(
    languageFromSet(candidates[0]?.set)
  )

  return (
    <div className="screen">
      <div className="scan-summary">
        {photo && <img src={photo} alt="" className="scan-thumb" />}
        <div>
          <p className="scan-read">
            {candidates.length} coincidencia
            {candidates.length === 1 ? '' : 's'} encontrada
            {candidates.length === 1 ? '' : 's'}
          </p>
          <button className="link" onClick={onRetry}>
            Volver a escanear
          </button>
        </div>
      </div>

      <section className="lang-block">
        <h3>Idioma de tu carta</h3>
        <div className="lang-grid">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`lang-chip ${language === l.code ? 'active' : ''}`}
              onClick={() => setLanguage(l.code)}
            >
              <span className="lang-flag">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Elige tu carta</h3>
        <div className="candidate-list">
          {candidates.map((c, i) => (
            <button
              key={c.productId + i}
              className={`candidate ${i === 0 ? 'best' : ''}`}
              onClick={() => onPick(c, language)}
            >
              {c.image ? (
                <img src={c.image} alt={c.name} loading="lazy" />
              ) : (
                <div className="candidate-noimg">Sin imagen</div>
              )}
              <div className="candidate-meta">
                <strong>{c.name}</strong>
                <span className="muted">{c.set}</span>
                {c.confidence != null && (
                  <span
                    className={`match ${
                      c.confidence >= 55 ? 'ok' : 'low'
                    }`}
                  >
                    {i === 0 ? 'Mejor coincidencia · ' : ''}
                    {c.confidence}% de parecido
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
