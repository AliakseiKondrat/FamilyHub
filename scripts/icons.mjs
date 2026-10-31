// Renders the Family Hub icon (white house with a pink heart on the indigo→violet brand gradient) to PNG,
// with no image libraries: shapes are tested per sub-pixel and antialiased by supersampling.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

const TOP = [67, 56, 202]     // #4338ca
const BOTTOM = [168, 85, 247] // #a855f7
const WHITE = [255, 255, 255]
const HEART = [255, 94, 138]  // #ff5e8a

// Shapes in a [-1.8, 1.8] square, y pointing up.
const inTriangle = (x, y) => y >= 0.05 && y <= 1.1 - Math.abs(x) * 1.0 && Math.abs(x) <= 1.05
const inBody = (x, y) => Math.abs(x) <= 0.78 && y <= 0.1 && y >= -1.0
const inChimney = (x, y) => x >= 0.42 && x <= 0.66 && y >= 0.3 && y <= 0.95
const inHouse = (x, y) => inTriangle(x, y) || inBody(x, y) || inChimney(x, y)
const inHeart = (x, y) => {
  const s = 0.36
  const hx = x / s, hy = (y + 0.38) / s + 0.15
  return (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3 <= 0
}

function render(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const ss = 4
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0
    const t = py / (size - 1)
    const bg = TOP.map((v, i) => v + (BOTTOM[i] - v) * t)
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const x = ((px + (sx + 0.5) / ss) / size - 0.5) * 3.6
          const y = -((py + (sy + 0.5) / ss) / size - 0.5) * 3.6 - 0.05
          const c = inHeart(x, y) ? HEART : inHouse(x, y) ? WHITE : bg
          for (let i = 0; i < 3; i++) acc[i] += c[i]
        }
      const o = py * (size * 3 + 1) + 1 + px * 3
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(acc[i] / (ss * ss))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/apple-touch-icon.png', render(180))
writeFileSync('public/icons/icon-192.png', render(192))
writeFileSync('public/icons/icon-512.png', render(512))
console.log('icons written')
