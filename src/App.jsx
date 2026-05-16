import { useState } from 'react'
import ScanScreen from './components/ScanScreen.jsx'
import Collection from './components/Collection.jsx'

export default function App() {
  const [tab, setTab] = useState('scan')
  const [scanKey, setScanKey] = useState(0)

  function goScan() {
    setScanKey((k) => k + 1) // reinicia el flujo de escaneo
    setTab('scan')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          Poké<span>Scan</span>
        </h1>
        <p className="tagline">Escanea · Identifica · Valora</p>
      </header>

      <main className="app-main">
        {tab === 'scan' ? (
          <ScanScreen key={scanKey} />
        ) : (
          <Collection onScan={goScan} />
        )}
      </main>

      <nav className="tabbar">
        <button
          className={tab === 'scan' ? 'active' : ''}
          onClick={goScan}
        >
          <span className="tab-icon">⌖</span>
          Escanear
        </button>
        <button
          className={tab === 'collection' ? 'active' : ''}
          onClick={() => setTab('collection')}
        >
          <span className="tab-icon">▦</span>
          Colección
        </button>
      </nav>
    </div>
  )
}
