import { useEffect, useState } from 'react'
import {
  getCollection,
  collectionStats,
  updateEntry,
  removeEntry,
} from '../lib/storage.js'
import { fmtEur } from '../lib/pricing.js'
import { languageLabel } from '../lib/languages.js'

export default function Collection({ onScan }) {
  const [list, setList] = useState(getCollection())
  const [stats, setStats] = useState(collectionStats())

  useEffect(() => {
    const refresh = () => {
      setList(getCollection())
      setStats(collectionStats())
    }
    window.addEventListener('collection-changed', refresh)
    return () => window.removeEventListener('collection-changed', refresh)
  }, [])

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
          <span className="stat-num">{fmtEur(stats.rawTotal)}</span>
          <span className="stat-label">valor raw</span>
        </div>
        <div className="stat">
          <span className="stat-num">{fmtEur(stats.psa10Total)}</span>
          <span className="stat-label">si todo PSA 10</span>
        </div>
      </div>

      <div className="coll-list">
        {list.map((e) => (
          <div key={e.uid} className="coll-item">
            {e.image ? (
              <img src={e.image} alt={e.name} loading="lazy" />
            ) : (
              <div className="candidate-noimg">—</div>
            )}
            <div className="coll-meta">
              <strong>{e.name}</strong>
              <span className="muted">
                {e.setName} · {e.number}
              </span>
              <span className="badge sm">{languageLabel(e.language)}</span>
              <span className="muted">
                Raw {fmtEur(e.rawPriceEur)} · PSA 10 {fmtEur(e.psa10PriceEur)}
              </span>
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
