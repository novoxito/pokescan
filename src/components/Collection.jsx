import { useEffect, useMemo, useState } from 'react'
import {
  getCollection,
  collectionStats,
  updateEntry,
  removeEntry,
  getSettings,
  saveSettings,
} from '../lib/storage.js'
import { languageLabel } from '../lib/languages.js'
import { useCurrency } from '../context/currency.jsx'

const SORTS = {
  recent: { label: 'Fecha de escaneo', fn: (a, b) => ts(b) - ts(a) },
  'value-desc': { label: 'Valor: mayor a menor', fn: (a, b) => val(b) - val(a) },
  'value-asc': { label: 'Valor: menor a mayor', fn: (a, b) => val(a) - val(b) },
}

const ts = (e) => new Date(e.addedAt || 0).getTime()
const val = (e) => e.rawPriceUsd ?? e.psa10PriceUsd ?? 0

export default function Collection({ onScan }) {
  const { fmt } = useCurrency()
  const [list, setList] = useState(getCollection())
  const [stats, setStats] = useState(collectionStats())
  const [sort, setSort] = useState(getSettings().collectionSort || 'recent')

  useEffect(() => {
    const refresh = () => {
      setList(getCollection())
      setStats(collectionStats())
    }
    window.addEventListener('collection-changed', refresh)
    return () => window.removeEventListener('collection-changed', refresh)
  }, [])

  const sortedList = useMemo(
    () => [...list].sort((SORTS[sort] || SORTS.recent).fn),
    [list, sort]
  )

  function changeSort(value) {
    setSort(value)
    saveSettings({ collectionSort: value })
  }

  function setQty(uid, qty) {
    if (qty < 1) return
    updateEntry(uid, { quantity: qty })
  }

  if (!list.length) {
    return (
      <div className="screen empty">
        <p>Tu colección está vacía.</p>
        <button className="btn btn-primary" onClick={onScan}>
          Escanear mi primera carta
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="stats-row">
        <div className="stat">
          <span className="stat-num">{stats.cards}</span>
          <span className="stat-label">cartas</span>
        </div>
        <div className="stat">
          <span className="stat-num">{fmt(stats.rawTotalUsd, 'USD')}</span>
          <span className="stat-label">valor raw</span>
        </div>
        <div className="stat">
          <span className="stat-num">{fmt(stats.psa10TotalUsd, 'USD')}</span>
          <span className="stat-label">si todo PSA 10</span>
        </div>
      </div>

      <label className="sort-row">
        <span>Ordenar por</span>
        <select value={sort} onChange={(e) => changeSort(e.target.value)}>
          {Object.entries(SORTS).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="coll-list">
        {sortedList.map((e) => (
          <div key={e.uid} className="coll-item">
            {e.image ? (
              <img src={e.image} alt={e.name} loading="lazy" />
            ) : (
              <div className="candidate-noimg">—</div>
            )}
            <div className="coll-meta">
              <strong>{e.name}</strong>
              <span className="muted">
                {e.setName}
                {e.number ? ` · ${e.number}` : ''}
              </span>
              <span className="badge sm">{languageLabel(e.language)}</span>
              <span className="muted">
                Raw {fmt(e.rawPriceUsd, 'USD')} · PSA 10{' '}
                {fmt(e.psa10PriceUsd, 'USD')}
              </span>
              {e.cardmarketEur != null && (
                <span className="muted">
                  Cardmarket {fmt(e.cardmarketEur, 'EUR')}
                </span>
              )}
            </div>
            <div className="coll-actions">
              <div className="qty">
                <button onClick={() => setQty(e.uid, (e.quantity || 1) - 1)}>
                  −
                </button>
                <span>{e.quantity || 1}</span>
                <button onClick={() => setQty(e.uid, (e.quantity || 1) + 1)}>
                  +
                </button>
              </div>
              <button
                className="link danger"
                onClick={() => removeEntry(e.uid)}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
