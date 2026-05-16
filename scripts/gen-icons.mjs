// Genera los iconos PWA (icon-192.png / icon-512.png) sin dependencias externas.
import zlib from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const BG = [11, 16, 32, 255] // #0b1020
const YELLOW = [255, 203, 5, 255] // #ffcb05

function hex(c) {
  return c
}

// Dibuja un "diana de escaneo" centrado.
function render(size) {
  const px = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const rings = [
    { r: 0.44, color: YELLOW },
    { r: 0.34, color: BG },
    { r: 0.14, color: YELLOW },
  ]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy) / size
      let color = BG
      for (const ring of rings) {
        if (dist <= ring.r) color = ring.color
      }
      const i = (y * size + x) * 4
      px[i] = color[0]
      px[i + 1] = color[1]
      px[i + 2] = color[2]
      px[i + 3] = color[3]
    }
  }
  return px
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])) >>> 0, 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // resto 0: compression / filter / interlace

  // scanlines con byte de filtro 0
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(
      raw,
      y * (size * 4 + 1) + 1,
      y * size * 4,
      (y + 1) * size * 4
    )
  }
  const idat = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(new URL('../public/', import.meta.url), { recursive: true })
for (const size of [192, 512]) {
  const png = encodePng(size, render(size))
  const out = new URL(`../public/icon-${size}.png`, import.meta.url)
  writeFileSync(out, png)
  console.log(`icon-${size}.png — ${png.length} bytes`)
}
