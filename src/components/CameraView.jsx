import { useEffect, useRef, useState } from 'react'

// Captura una foto de la carta: cámara en vivo si se puede, si no, subir archivo.
export default function CameraView({ onCapture }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Tu navegador no permite usar la cámara aquí.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }
      } catch {
        setError('No se pudo abrir la cámara. Sube una foto en su lugar.')
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    onCapture(canvas.toDataURL('image/jpeg', 0.95))
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onCapture(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="camera">
      <div className="camera-stage">
        {!error && (
          <video ref={videoRef} playsInline muted className="camera-video" />
        )}
        {error && <div className="camera-fallback">{error}</div>}
        <div className="camera-frame" aria-hidden="true" />
        <p className="camera-hint">
          Encuadra la carta dentro del marco. Buena luz y sin reflejos.
        </p>
      </div>

      <div className="camera-actions">
        <button
          className="btn btn-primary btn-shutter"
          onClick={capture}
          disabled={!ready}
        >
          {ready ? 'Escanear carta' : 'Abriendo cámara…'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => fileRef.current?.click()}
        >
          Subir foto
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={onFile}
        />
      </div>
    </div>
  )
}
