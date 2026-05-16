import { useState } from 'react'
import CameraView from './CameraView.jsx'
import Candidates from './Candidates.jsx'
import CardDetail from './CardDetail.jsx'
import { readCard } from '../lib/ocr.js'
import { searchCards } from '../lib/pokeApi.js'
import { guessLanguage } from '../lib/languages.js'

// stage: camera | processing | candidates | detail | error
export default function ScanScreen() {
  const [stage, setStage] = useState('camera')
  const [photo, setPhoto] = useState(null)
  const [ocr, setOcr] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [picked, setPicked] = useState(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  function reset() {
    setStage('camera')
    setPhoto(null)
    setOcr(null)
    setCandidates([])
    setPicked(null)
    setError('')
  }

  async function handleCapture(dataUrl) {
    setPhoto(dataUrl)
    setStage('processing')
    setProgress(0.05)
    try {
      const read = await readCard(dataUrl, setProgress)
      read.language = guessLanguage(read.rawText)
      setOcr(read)
      if (!read.name && !read.number) {
        setError(
          'No se ha podido leer la carta. Prueba con más luz, sin reflejos y la carta bien encuadrada.'
        )
        setStage('error')
        return
      }
      const found = await searchCards({
        name: read.name,
        number: read.number,
        setTotal: read.setTotal,
      })
      setCandidates(found)
      setStage('candidates')
    } catch (e) {
      setError(e.message || 'Error procesando la carta.')
      setStage('error')
    }
  }

  if (stage === 'camera') return <CameraView onCapture={handleCapture} />

  if (stage === 'processing') {
    return (
      <div className="screen processing">
        {photo && <img src={photo} alt="" className="scan-thumb big" />}
        <div className="spinner" />
        <p>Identificando la carta…</p>
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
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
        ocr={ocr}
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
        onSaved={() => {}}
      />
    )
  }

  return null
}
