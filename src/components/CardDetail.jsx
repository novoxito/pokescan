import { useEffect, useState } from 'react'
import { fetchPrices } from '../lib/scan.js'
import {
  gradingAnalysis,
  VERDICT_LABEL,
  DEFAULT_GRADING_COST,
} from '../lib/grading.js'
import { languageLabel } from '../lib/languages.js'
import { addToCollection, getSettings, saveSettings } from '../lib/storage.js'
import { useCurrency } from '../context/currency.jsx'

export default function CardDetail({ card, language, onBack }) {
  const { fmt } = useCurrency()
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
    fetchPrices(card.productId, card.name, card.set)
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
  const cm = prices?.cardmarket ?? null
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
    const langKey = ['ES', 'EN', 'DE', 'FR', 'IT'].includes(language)
      ? language
      : null
    const cmLang = langKey ? cm?.prices_by_lang?.[langKey] ?? null : null
    const cmEur = cmLang ?? cm?.lowest ?? null
    addToCollection({
      cardId: card.productId,
      name: card.name,
      number: '',
      setName: card.set,
      image: card.image || '',
      language,
      rawPriceUsd: rawUsd,
      psa10PriceUsd: psa10Usd,
      cardmarketEur: cmEur,
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
          <h3 className="price-heading">PriceCharting · mercado internacional</h3>
          <div className="price-grid">
            <div className="price-card">
              <span className="price-label">Precio raw</span>
              <span className="price-value">{fmt(rawUsd, 'USD')}</span>
              {prices.grade9 != null && (
                <span className="muted">
                  Grade 9 · {fmt(prices.grade9, 'USD')}
                </span>
              )}
            </div>
            <div className="price-card psa">
              <span className="price-label">PSA 10</span>
              <span className="price-value">{fmt(psa10Usd, 'USD')}</span>
            </div>
          </div>

          <h3 className="price-heading">Cardmarket · mercado europeo</h3>
          {cm ? (
            <CardmarketBlock cm={cm} language={language} fmt={fmt} />
          ) : (
            <div className="price-card">
              <span className="price-value small">No disponible</span>
              <span className="muted">
                Sin datos de Cardmarket para esta carta.
              </span>
            </div>
          )}

          {prices.url && (
            <a className="link" href={prices.url} target="_blank" rel="noreferrer">
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
                  <strong>{fmt(analysis.netIfGraded, 'USD')}</strong>
                </li>
                <li>
                  <span>Beneficio frente a vender raw</span>
                  <strong>{fmt(analysis.profitVsRaw, 'USD')}</strong>
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

// Bloque de precios de Cardmarket por idioma. Resalta el idioma de la copia
// del usuario (ES/EN/DE/FR/IT); si no hay datos en ese idioma, muestra el
// "más bajo NM" como referencia europea.
const CM_LANG_LABELS = { ES: 'Español', EN: 'Inglés', DE: 'Alemán', FR: 'Francés', IT: 'Italiano' }
const CM_LANGS = ['ES', 'EN', 'DE', 'FR', 'IT']

function CardmarketBlock({ cm, language, fmt }) {
  const langKey = CM_LANGS.includes(language) ? language : null
  const langPrice = langKey ? cm.prices_by_lang?.[langKey] ?? null : null
  const others = CM_LANGS.filter((k) => k !== langKey)

  return (
    <div className="price-card">
      <span className="price-label">
        {langKey
          ? `Cardmarket · ${CM_LANG_LABELS[langKey]} (NM)`
          : 'Cardmarket · más bajo NM'}
      </span>
      {langKey && langPrice != null ? (
        <span className="price-value">{fmt(langPrice, 'EUR')}</span>
      ) : langKey ? (
        <>
          <span className="price-value">{fmt(cm.lowest, 'EUR')}</span>
          <span className="muted">
            Sin precio específico en {CM_LANG_LABELS[langKey]} — se muestra el
            más bajo NM disponible.
          </span>
        </>
      ) : (
        <>
          <span className="price-value">{fmt(cm.lowest, 'EUR')}</span>
          <span className="muted">
            Cardmarket no cubre tu idioma. Se muestra el más bajo NM global.
          </span>
        </>
      )}

      <div className="cm-langs">
        {others.map((k) =>
          cm.prices_by_lang?.[k] != null ? (
            <span key={k} className="cm-pill">
              {k} {fmt(cm.prices_by_lang[k], 'EUR')}
            </span>
          ) : null
        )}
      </div>

      <span className="muted">
        {cm.avg30 != null ? `Media 30d ${fmt(cm.avg30, 'EUR')}` : ''}
        {cm.avg7 != null ? ` · 7d ${fmt(cm.avg7, 'EUR')}` : ''}
        {cm.available != null ? ` · ${cm.available} a la venta` : ''}
      </span>
    </div>
  )
}
