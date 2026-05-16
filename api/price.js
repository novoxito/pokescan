// Función serverless (Vercel): precios raw / PSA 10 de una carta por su ID.
import { getPrices } from '../server/pricecharting.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  const id = req.query.id
  if (!id) return res.status(400).json({ error: 'Falta el parámetro id' })
  try {
    res.status(200).json(await getPrices(id))
  } catch (e) {
    res.status(502).json({ error: e.message || 'Error consultando precios' })
  }
}
