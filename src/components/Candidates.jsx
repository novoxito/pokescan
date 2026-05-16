import { useState } from 'react'
import { LANGUAGES } from '../lib/languages.js'

// Lista de cartas candidatas + selección de idioma (importante: el precio y la
// ficha dependen del idioma de la copia física que tiene el usuario).
export default function Candidates({ photo, ocr, candidates, onPick, onRetry }) {
  const [language, setLanguage] = useState(ocr?.language || 'EN')

  return (
    <div className="screen">
      <div className="scan-summary">
        {photo && <img src={photo} alt="" className="scan-thumb" />}
        <div>
          <p className="scan-read">
            Texto leído:{' '}
            <strong>{ocr?.name || '¿?'}</strong>
            {ocr?.number ? ` · nº ${ocr.number}` : ''}
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
        <h3>
          {candidates.length
            ? 'Elige tu carta'
            : 'Sin coincidencias — vuelve a escanear'}
        </h3>
        <div className="candidate-list">
          {candidates.map((c) => (
            <button
              key={c.id}
              className="candidate"
              onClick={() => onPick(c, language)}
            >
              {c.images?.small ? (
                <img src={c.images.small} alt={c.name} loading="lazy" />
              ) : (
                <div className="candidate-noimg">Sin imagen</div>
              )}
              <div className="candidate-meta">
                <strong>{c.name}</strong>
                <span>
                  {c.setName} · {c.number}
                  {c.setTotal ? `/${c.setTotal}` : ''}
                </span>
                <span className="muted">
                  {c.rarity || '—'}
                  {c.releaseDate ? ` · ${c.releaseDate.slice(0, 4)}` : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
