import { useState } from 'react'
import CameraView from './CameraView.jsx'
import Candidates from './Candidates.jsx'
import CardDetail from './CardDetail.jsx'
import { scanCard } from '../lib/scan.js'

// stage: camera | scanning | candidates | detail | error
export default function ScanScreen() {
  const [stage, setStage] = useState('camera')
  const [scanLang, setScanLang] = useState('')
  const [photo, setPhoto] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [picked, setPicked] = useState(null)
  const [error, setError] = useState('')

  function reset() {
    setStage('camera')
    setPhoto(null)
    setCandidates([])
    setPicked(null)
    setError('')
  }

  async function handleCapture(dataUrl) {
    setPhoto(dataUrl)
    setStage('scanning')
    setError('')
    try {
      const found = await scanCard(dataUrl, scanLang)
      if (!found.length) {
        setError('No se ha reconocido la carta. Prueba con mejor luz, la carta plana y bien encuadrada.')
        setStage('error')
        return
      }
      setCandidates(found)
      setStage('candidates')
    } catch (e) {
      setError(e.message || 'Error al reconocer la carta.')
      setStage('error')
    }
  }

  if (stage === 'camera') {
    return (
      <CameraView
        scanLang={scanLang}
        onScanLang={setScanLang}
        onCapture={handleCapture}
      />
    )
  }

  if (stage === 'scanning') {
    return (
      <div className="screen processing">
        {photo && <img src={photo} alt="" className="scan-thumb big" />}
        <div className="spinner" />
        <p>Reconociendo la carta…</p>
        <p className="muted">Comparando con la base de datos de PriceCharting</p>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="screen empty">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={reset}>
          Volver a escanear
        </button>
      </div>
    )
  }

  if (stage === 'candidates') {
    return (
      <Candidates
        photo={photo}
        candidates={candidates}
        onRetry={reset}
        onPick={(card, language) => {
          setPicked({ card, language })
          setStage('detail')
        }}
      />
    )
  }

  if (stage === 'detail' && picked) {
    return (
      <CardDetail
        card={picked.card}
        language={picked.language}
        onBack={() => setStage('candidates')}
      />
    )
  }

  return null
}
