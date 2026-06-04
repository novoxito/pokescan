// Función serverless (Vercel): precios raw / PSA 10 de una carta por su ID.
import { getPrices } from '../server/pricecharting.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  const { id, name, set } = req.query
  if (!id) return res.status(400).json({ error: 'Falta el parámetro id' })
  try {
    const data = await getPrices(id, { name, set })
    // Cacheo en el edge de Vercel 24h. Repetir la misma carta = 0 consultas.
    res.setHeader(
      'Cache-Control',
      's-maxage=86400, stale-while-revalidate=604800'
    )
    res.status(200).json(data)
  } catch (e) {
    res.status(502).json({ error: e.message || 'Error consultando precios' })
  }
}
