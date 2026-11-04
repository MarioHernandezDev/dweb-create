// Genera los recursos de marca a partir del logotipo original (public/img/newlogo.jpeg,
// luz sobre negro). La luminosidad de cada píxel pasa a ser su opacidad, así el símbolo
// se puede poner sobre cualquier fondo oscuro sin el recuadro negro del JPEG.
// Uso: node scripts/design/build-brand-assets.mjs
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const SRC = 'public/img/newlogo.jpeg'
const OUT = 'public/img/brand'
const TINTA = { r: 0x12, g: 0x10, b: 0x19 } // --color-tinta-950
mkdirSync(OUT, { recursive: true })

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info

// 1. Caja del símbolo (píxeles que no son negro)
let x0 = W, y0 = H, x1 = 0, y1 = 0
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 3
  if (Math.max(data[i], data[i + 1], data[i + 2]) > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
}
const side = Math.max(x1 - x0, y1 - y0) + 1
const pad = Math.round(side * 0.04)
const box = side + pad * 2
const left = Math.round((x0 + x1) / 2 - box / 2)
const top = Math.round((y0 + y1) / 2 - box / 2)
console.log({ W, H, bbox: [x0, y0, x1, y1], box })

// 2. Alfa = luminosidad (con un suelo para el ruido del JPEG), color sin premultiplicar
const rgba = Buffer.alloc(box * box * 4)
for (let y = 0; y < box; y++) for (let x = 0; x < box; x++) {
  const sx = x + left, sy = y + top
  const o = (y * box + x) * 4
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue
  const i = (sy * W + sx) * 3
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const m = Math.max(r, g, b)
  const a = m < 10 ? 0 : Math.min(255, Math.round(((m - 10) / 245) * 255 * 1.04))
  if (a === 0) continue
  const k = 255 / m
  rgba[o] = Math.min(255, Math.round(r * k)); rgba[o + 1] = Math.min(255, Math.round(g * k)); rgba[o + 2] = Math.min(255, Math.round(b * k)); rgba[o + 3] = a
}
const mark = sharp(rgba, { raw: { width: box, height: box, channels: 4 } })

await mark.clone().resize(1024, 1024).png({ compressionLevel: 9 }).toFile(`${OUT}/mark-1024.png`)
await mark.clone().resize(512, 512).png({ compressionLevel: 9 }).toFile(`${OUT}/mark-512.png`)
await mark.clone().resize(192, 192).png({ compressionLevel: 9 }).toFile(`${OUT}/mark-192.png`)

// 3. Iconos de instalación y favicon: símbolo sobre tinta (el símbolo es claro)
async function tile(size, fill, file, radiusPct = 0) {
  const inner = Math.round(size * fill)
  const sym = await mark.clone().resize(inner, inner).png().toBuffer()
  let img = sharp({ create: { width: size, height: size, channels: 4, background: { ...TINTA, alpha: 1 } } })
    .composite([{ input: sym, gravity: 'centre' }])
  if (radiusPct) {
    const r = Math.round(size * radiusPct)
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`)
    img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }])
  }
  await img.png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`)
}
await tile(512, 0.86, 'icon-512.png', 0.22)
await tile(192, 0.86, 'icon-192.png', 0.22)
await tile(180, 0.84, 'apple-touch-icon.png') // iOS aplica su propia máscara
await tile(512, 0.62, 'icon-maskable-512.png') // zona segura del 80 %
await tile(32, 0.94, 'icon-32.png', 0.2)
await tile(16, 0.98, 'icon-16.png', 0.2)

// 4. favicon.ico (16 + 32 + 48) con PNG incrustados
const sizes = [16, 32, 48]
const pngs = []
for (const s of sizes) {
  const sym = await mark.clone().resize(Math.round(s * 0.96), Math.round(s * 0.96)).png().toBuffer()
  pngs.push(await sharp({ create: { width: s, height: s, channels: 4, background: { ...TINTA, alpha: 1 } } }).composite([{ input: sym, gravity: 'centre' }]).png().toBuffer())
}
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4)
let offset = 6 + sizes.length * 16
const dirs = [], blobs = []
sizes.forEach((s, n) => {
  const d = Buffer.alloc(16); d[0] = s; d[1] = s; d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(pngs[n].length, 8); d.writeUInt32LE(offset, 12)
  offset += pngs[n].length; dirs.push(d); blobs.push(pngs[n])
})
writeFileSync('public/favicon.ico', Buffer.concat([head, ...dirs, ...blobs]))
console.log('listo')
