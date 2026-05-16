import { useEffect, useState } from 'react'
import {
  getRawPrice,
  getGradedPrice,
  fmtEur,
  fmtUsd,
  usdToEur,
} from '../lib/pricing.js'
import { gradingAnalysis, VERDICT_LABEL, DEFAULT_GRADING_COST } from '../lib/grading.js'
import { languageLabel } from '../lib/languages.js'
import { addToCollection, getSettings, saveSettings } from '../lib/storage.js'

export default function CardDetail({ card, language, onBack, onSaved }) {
  const raw = getRawPrice(card)
  const [psa, setPsa] = useState(null)
  const [psaState, setPsaState] = useState('idle') // idle | loading | done | error
  const [psaError, setPsaError] = useState('')
  const [cost, setCost] = useState(getSettings().gradingCost || DEFAULT_GRADING_COST)
  const [odds, setOdds] = useState(getSettings().psa10Odds || 0.35)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchGraded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  async function fetchGraded() {
    setPsaState('loading')
    setPsaError('')
    try {
      const data = await getGradedPrice({
        name: card.name,
        setName: card.setName,
        number: card.number,
      })
      setPsa(data)
      setPsaState('done')
    } catch (e) {
      setPsaError(e.message || 'No disponible')
      setPsaState('error')
    }
  }

  const psa10Usd = psa?.psa10 || null
  const rawUsd = raw?.usd || (psa?.ungraded ?? null)
  const analysis =
    rawUsd && psa10Usd
      ? gradingAnalysis({
          rawPrice: rawUsd,
          psa10Price: psa10Usd,
          gradingCost: Number(cost),
          psa10Odds: Number(odds),
        })
      : null

  function save() {
    addToCollection({
      cardId: card.id,
      name: card.name,
      number: card.number,
      setName: card.setName,
      image: card.images?.small || card.images?.large || '',
      language,
      rawPriceEur: raw?.eur ?? null,
      psa10PriceEur: psa10Usd ? usdToEur(psa10Usd) : null,
    })
    setSaved(true)
    onSaved?.()
  }

  function persistSettings(next) {
    saveSettings(next)
  }

  return (
    <div className="screen detail">
      <button className="link" onClick={onBack}>
        ‹ Otra carta
      </button>

      <div className="detail-head">
        {card.images?.large || card.images?.small ? (
          <img
            className="detail-img"
            src={card.images.large || card.images.small}
            alt={card.name}
          />
        ) : null}
        <div className="detail-info">
          <h2>{card.name}</h2>
          <p className="muted">
            {card.setName} · {card.number}
            {card.setTotal ? `/${card.setTotal}` : ''}
          </p>
          <p className="muted">{card.rarity}</p>
          <span className="badge">{languageLabel(language)}</span>
        </div>
      </div>

      <div className="price-grid">
        <div className="price-card">
          <span className="price-label">Precio raw</span>
          <span className="price-value">{fmtEur(raw?.eur)}</span>
          <span className="muted">
            {raw ? `${raw.source} · ${fmtUsd(raw.usd)}` : 'Sin datos'}
          </span>
        </div>
        <div className="price-card psa">
          <span className="price-label">PSA 10</span>
          {psaState === 'loading' && <span className="price-value">…</span>}
          {psaState === 'done' && (
            <>
              <span className="price-value">{fmtUsd(psa?.psa10)}</span>
              <span className="muted">
                {psa?.psa10 ? `≈ ${fmtEur(usdToEur(psa.psa10))}` : 'Sin dato'}
                {psa?.grade9 ? ` · G9 ${fmtUsd(psa.grade9)}` : ''}
              </span>
            </>
          )}
          {psaState === 'error' && (
            <>
              <span className="price-value small">No disponible</span>
              <span className="muted">{psaError}</span>
              <button className="link" onClick={fetchGraded}>
                Reintentar
              </button>
            </>
          )}
        </div>
      </div>

      {psa?.url && (
        <a className="link" href={psa.url} target="_blank" rel="noreferrer">
          Ver en PriceCharting ↗
        </a>
      )}

      {analysis && (
        <section className="grading">
          <h3>¿Merece la pena gradear?</h3>
          <div className={`verdict ${VERDICT_LABEL[analysis.verdict].tone}`}>
            {VERDICT_LABEL[analysis.verdict].text}
          </div>
          <ul className="grading-stats">
            <li>
              <span>Multiplicador PSA 10 / raw</span>
              <strong>{analysis.multiple.toFixed(1)}×</strong>
            </li>
            <li>
              <span>Valor esperado (tras coste)</span>
              <strong>{fmtUsd(analysis.netIfGraded)}</strong>
            </li>
            <li>
              <span>Beneficio frente a vender raw</span>
              <strong>{fmtUsd(analysis.profitVsRaw)}</strong>
            </li>
          </ul>
          <div className="grading-controls">
            <label>
              Coste de gradeo (USD)
              <input
                type="number"
                value={cost}
                min="0"
                onChange={(e) => {
                  setCost(e.target.value)
                  persistSettings({ gradingCost: Number(e.target.value) })
                }}
              />
            </label>
            <label>
              Prob. de PSA 10: {Math.round(odds * 100)}%
              <input
                type="range"
                min="0.05"
                max="0.9"
                step="0.05"
                value={odds}
                onChange={(e) => {
                  setOdds(e.target.value)
                  persistSettings({ psa10Odds: Number(e.target.value) })
                }}
              />
            </label>
          </div>
        </section>
      )}

      <button className="btn btn-primary" onClick={save} disabled={saved}>
        {saved ? 'Añadida a tu colección ✓' : 'Añadir a mi colección'}
      </button>
    </div>
  )
}
