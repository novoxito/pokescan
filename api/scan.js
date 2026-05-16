// Función serverless (Vercel): reconoce una carta a partir de una foto.
import { searchByPhoto } from '../server/pricecharting.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const m = /^data:(image\/[\w+.-]+);base64,(.+)$/s.exec(body.img || '')
    if (!m) return res.status(400).json({ error: 'Falta la imagen' })

    const result = await searchByPhoto(
      Buffer.from(m[2], 'base64'),
      m[1],
      body.category || 'pokemon-cards',
      body.language || ''
    )
    res.status(200).json(result)
  } catch (e) {
    res.status(502).json({ error: e.message || 'Error en el reconocimiento' })
  }
}
