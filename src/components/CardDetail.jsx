import { useEffect, useState } from 'react'
import { fetchPrices } from '../lib/scan.js'
import { fmtUsd, fmtEur, usdToEur } from '../lib/pricing.js'
import {
  gradingAnalysis,
  VERDICT_LABEL,
  DEFAULT_GRADING_COST,
} from '../lib/grading.js'
import { languageLabel } from '../lib/languages.js'
import { addToCollection, getSettings, saveSettings } from '../lib/storage.js'

export default function CardDetail({ card, language, onBack }) {
  const [prices, setPrices] = useState(null)
  const [state, setState] = useState('loading') // loading | done | error
  const [errMsg, setErrMsg] = useState('')
  const [cost, setCost] = useState(
    getSettings().gradingCost || DEFAULT_GRADING_COST
  )
  const [odds, setOdds] = useState(getSettings().psa10Odds || 0.35)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    setState('loading')
    fetchPrices(card.productId)
      .then((p) => {
        if (alive) {
          setPrices(p)
          setState('done')
        }
      })
      .catch((e) => {
        if (alive) {
          setErrMsg(e.message || 'No disponible')
          setState('error')
        }
      })
    return () => {
      alive = false
    }
  }, [card.productId])

  const rawUsd = prices?.ungraded ?? null
  const psa10Usd = prices?.psa10 ?? null
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
      cardId: card.productId,
      name: card.name,
      number: '',
      setName: card.set,
      image: card.image || '',
      language,
      rawPriceEur: rawUsd != null ? usdToEur(rawUsd) : null,
      psa10PriceEur: psa10Usd != null ? usdToEur(psa10Usd) : null,
    })
    setSaved(true)
  }

  return (
    <div className="screen detail">
      <button className="link" onClick={onBack}>
        ‹ Otra carta
      </button>

      <div className="detail-head">
        {card.image && (
          <img className="detail-img" src={card.image} alt={card.name} />
        )}
        <div className="detail-info">
          <h2>{card.name}</h2>
          <p className="muted">{card.set}</p>
          <span className="badge">{languageLabel(language)}</span>
        </div>
      </div>

      {state === 'loading' && (
        <div className="screen processing">
          <div className="spinner" />
          <p className="muted">Consultando precios…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="price-card">
          <span className="price-label">Precios</span>
          <span className="price-value small">No disponible</span>
          <span className="muted">{errMsg}</span>
        </div>
      )}

      {state === 'done' && (
        <>
          <div className="price-grid">
            <div className="price-card">
              <span className="price-label">Precio raw</span>
              <span className="price-value">{fmtUsd(rawUsd)}</span>
              <span className="muted">≈ {fmtEur(usdToEur(rawUsd))}</span>
            </div>
            <div className="price-card psa">
              <span className="price-label">PSA 10</span>
              <span className="price-value">{fmtUsd(psa10Usd)}</span>
              <span className="muted">
                ≈ {fmtEur(usdToEur(psa10Usd))}
                {prices.grade9 ? ` · G9 ${fmtUsd(prices.grade9)}` : ''}
              </span>
            </div>
          </div>

          {prices.url && (
            <a
              className="link"
              href={prices.url}
              target="_blank"
              rel="noreferrer"
            >
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
                      saveSettings({ gradingCost: Number(e.target.value) })
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
                      saveSettings({ psa10Odds: Number(e.target.value) })
                    }}
                  />
                </label>
              </div>
            </section>
          )}
        </>
      )}

      <button className="btn btn-primary" onClick={save} disabled={saved}>
        {saved ? 'Añadida a tu colección ✓' : 'Añadir a mi colección'}
      </button>
    </div>
  )
}
