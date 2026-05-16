import Tesseract from 'tesseract.js'

let workerPromise = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker(['eng', 'spa'], 1, {
      // logger silencioso; el progreso se gestiona aparte
    })
  }
  return workerPromise
}

/**
 * Reduce la imagen para que el OCR sea más rápido y estable en móvil.
 */
async function downscale(dataUrl, maxSide = 1400) {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.92)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Extrae texto de la foto de la carta y deduce nombre y número de coleccionista.
 * Devuelve { rawText, name, number, setTotal, hp }.
 */
export async function readCard(dataUrl, onProgress) {
  const worker = await getWorker()
  const prepared = await downscale(dataUrl)
  if (onProgress) onProgress(0.15)
  const { data } = await worker.recognize(prepared)
  if (onProgress) onProgress(0.95)

  const rawText = data.text || ''
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return {
    rawText,
    name: guessName(lines),
    ...guessNumber(rawText),
    hp: guessHp(rawText),
  }
}

// El número de coleccionista suele ir como "123/198", "SV045", "TG12/TG30"...
function guessNumber(text) {
  const slash = text.match(/\b([A-Z]{0,3}\s?\d{1,3})\s*\/\s*([A-Z]{0,3}\s?\d{1,3})\b/i)
  if (slash) {
    return {
      number: slash[1].replace(/\s/g, '').toUpperCase(),
      setTotal: slash[2].replace(/\s/g, '').toUpperCase(),
    }
  }
  const promo = text.match(/\b(SWSH|SM|XY|SV[PE]?)\s?-?\s?(\d{1,3})\b/i)
  if (promo) {
    return { number: `${promo[1]}${promo[2]}`.toUpperCase(), setTotal: null }
  }
  return { number: null, setTotal: null }
}

function guessHp(text) {
  const m = text.match(/\bHP\s?(\d{2,3})\b/i) || text.match(/\b(\d{2,3})\s?HP\b/i)
  return m ? Number(m[1]) : null
}

// El nombre suele ser la línea más prominente en la zona superior.
function guessName(lines) {
  const top = lines.slice(0, 6)
  const candidates = top
    .map((l) => l.replace(/\b(HP|PV)\s?\d{2,3}\b/gi, '').trim())
    .map((l) => l.replace(/[^A-Za-zÀ-ÿ '.\-]/g, '').trim())
    .filter((l) => l.length >= 3 && /[A-Za-zÀ-ÿ]{3,}/.test(l))
  if (!candidates.length) return null
  candidates.sort((a, b) => scoreName(b) - scoreName(a))
  return candidates[0]
}

function scoreName(s) {
  const words = s.split(/\s+/).filter(Boolean)
  // Penaliza líneas larguísimas (probablemente texto de ataque).
  return (words.length <= 4 ? 10 : 0) + Math.min(s.length, 24)
}

export async function terminateOcr() {
  if (workerPromise) {
    const w = await workerPromise
    await w.terminate()
    workerPromise = null
  }
}
