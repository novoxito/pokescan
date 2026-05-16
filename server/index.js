// Proxy de precios PSA 10 — consulta PriceCharting y lo sirve a la PWA.
//
// Por qué existe: el navegador no puede leer PriceCharting directamente (CORS),
// y PriceCharting no ofrece API gratuita. Este proxy hace la consulta del lado
// servidor. Es "best-effort": si PriceCharting cambia su HTML, el parser puede
// romperse. Para uso intensivo, contrata su API oficial.
//
// Arranque:  npm run proxy   (escucha en http://localhost:8787)
import http from 'node:http'

const PORT = process.env.PORT || 8787
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const cache = new Map()
const TTL = 60 * 60 * 1000 // 1h

// Mapeo de columnas de PriceCharting para cartas (orden: Ungraded, Grade 7,
// Grade 8, Grade 9, Grade 9.5, PSA 10):
//   used_price        -> Ungraded (raw)
//   graded_price      -> Grade 9
//   manual_only_price -> PSA 10
function priceFromId(html, id) {
  const re = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</td>`, 'i')
  const m = html.match(re)
  if (!m) return null
  const pm = m[1].replace(/<[^>]+>/g, ' ').match(/\$[\d,]+(?:\.\d{1,2})?/)
  if (!pm) return null
  const n = Number(pm[0].replace(/[$,]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&#43;/g, '+')
    .replace(/&quot;/g, '"')
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  })
  if (!res.ok) throw new Error(`PriceCharting respondió ${res.status}`)
  return { html: await res.text(), finalUrl: res.url }
}

async function lookup(q) {
  const cached = cache.get(q)
  if (cached && Date.now() - cached.t < TTL) return cached.v

  const searchUrl =
    'https://www.pricecharting.com/search-products?type=prices&q=' +
    encodeURIComponent(q)
  let { html, finalUrl } = await fetchHtml(searchUrl)

  // Si la búsqueda no redirige a la ficha, sigue el primer resultado.
  // Los enlaces de resultados son absolutos: https://www.pricecharting.com/game/...
  if (!/id="product_name"/i.test(html)) {
    const m = html.match(
      /href="(?:https?:\/\/www\.pricecharting\.com)?(\/game\/[^"#]+)"/i
    )
    if (!m) throw new Error('Sin resultados en PriceCharting para esa carta')
    finalUrl = 'https://www.pricecharting.com' + decodeEntities(m[1])
    ;({ html } = await fetchHtml(finalUrl))
  }

  const nameM = html.match(/id="product_name"[^>]*>([\s\S]*?)<\/h1>/i)
  const result = {
    matchedName: nameM
      ? decodeEntities(
          nameM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        )
      : null,
    currency: 'USD',
    ungraded: priceFromId(html, 'used_price'),
    grade9: priceFromId(html, 'graded_price'),
    psa10: priceFromId(html, 'manual_only_price'),
    url: finalUrl,
    source: 'PriceCharting',
  }
  cache.set(q, { t: Date.now(), v: result })
  return result
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true }))
  }

  if (url.pathname === '/api/psa10') {
    const q = (url.searchParams.get('q') || '').trim()
    if (!q) {
      res.writeHead(400)
      return res.end('Falta el parámetro q')
    }
    try {
      const data = await lookup(q)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(data))
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end(e.message || 'Error consultando PriceCharting')
    }
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`PokéScan proxy escuchando en http://localhost:${PORT}`)
})
