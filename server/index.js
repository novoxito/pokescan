// Servidor proxy para desarrollo local (npm run proxy).
// En producción, estas mismas operaciones las sirven las funciones
// serverless de Vercel en api/scan.js y api/price.js.
import http from 'node:http'
import { searchByPhoto, getPrices } from './pricecharting.js'

const PORT = process.env.PORT || 8787

function send(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 12 * 1024 * 1024) reject(new Error('Imagen demasiado grande'))
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('JSON no válido'))
      }
    })
    req.on('error', reject)
  })
}

function dataUrlToBuffer(dataUrl) {
  const m = /^data:(image\/[\w+.-]+);base64,(.+)$/s.exec(dataUrl || '')
  if (!m) throw new Error('Falta la imagen (data URL)')
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  try {
    if (url.pathname === '/health') {
      return send(res, 200, { ok: true })
    }

    if (url.pathname === '/api/scan' && req.method === 'POST') {
      const body = await readJson(req)
      const { mime, buffer } = dataUrlToBuffer(body.img)
      const result = await searchByPhoto(
        buffer,
        mime,
        body.category || 'pokemon-cards',
        body.language || ''
      )
      return send(res, 200, result)
    }

    if (url.pathname === '/api/price' && req.method === 'GET') {
      const id = url.searchParams.get('id')
      if (!id) return send(res, 400, { error: 'Falta el parámetro id' })
      return send(res, 200, await getPrices(id))
    }

    return send(res, 404, { error: 'Not found' })
  } catch (e) {
    return send(res, 502, { error: e.message || 'Error en el proxy' })
  }
})

server.listen(PORT, () => {
  console.log(`PokéScan proxy escuchando en http://localhost:${PORT}`)
})
