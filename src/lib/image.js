// Redimensiona la foto antes de enviarla (PriceCharting usa máx. 768 px).
const MAX_SIDE = 768

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = src
  })
}

function drawScaled(img) {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export async function resizeDataUrl(dataUrl) {
  return drawScaled(await loadImage(dataUrl))
}

export async function fileToResizedDataUrl(file) {
  const url = URL.createObjectURL(file)
  try {
    return drawScaled(await loadImage(url))
  } finally {
    URL.revokeObjectURL(url)
  }
}
