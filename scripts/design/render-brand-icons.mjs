// Genera los PNG e ICO del logotipo a partir de los SVG de public/ (fuente de
// verdad). Se ejecuta a mano solo cuando cambia el logotipo.
//
// Uso: node scripts/design/render-brand-icons.mjs <carpeta-con-playwright-core>
// (usa el Chrome instalado en el equipo; no descarga navegadores ni hace peticiones de red)
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const depsDir = process.argv[2]
if (!depsDir) { console.error('Uso: node scripts/design/render-brand-icons.mjs <carpeta-con-playwright-core>'); process.exit(1) }
const { chromium } = createRequire(join(resolve(depsDir), 'package.json'))('playwright-core')
const pub = resolve('public')

const jobs = [
  { src: 'favicon.svg', out: 'img/brand/icon-16.png', size: 16 },
  { src: 'favicon.svg', out: 'img/brand/icon-32.png', size: 32 },
  { src: 'favicon.svg', out: 'img/brand/apple-touch-icon.png', size: 180, bleed: true },
  { src: 'favicon.svg', out: 'img/brand/icon-192.png', size: 192 },
  { src: 'favicon.svg', out: 'img/brand/icon-512.png', size: 512 },
  { src: 'img/brand/icon-maskable.svg', out: 'img/brand/icon-maskable-512.png', size: 512 }
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const job of jobs) {
  let svg = readFileSync(join(pub, job.src), 'utf8')
  // El icono de Apple no lleva esquinas redondeadas propias: iOS las aplica.
  if (job.bleed) svg = svg.replace('rx="14"', 'rx="0"')
  await page.setViewportSize({ width: job.size, height: job.size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${job.size}" height="${job.size}" `)}</body></html>`)
  writeFileSync(join(pub, job.out), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: job.size, height: job.size } }))
  console.log('generado', job.out)
}
await browser.close()

// favicon.ico con dos imágenes PNG embebidas (16 y 32 px), formato admitido por todos los navegadores.
const images = [16, 32].map((s) => ({ size: s, data: readFileSync(join(pub, `img/brand/icon-${s}.png`)) }))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4)
let offset = 6 + 16 * images.length
const entries = images.map(({ size, data }) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(size, 0); e.writeUInt8(size, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12)
  offset += data.length
  return e
})
writeFileSync(join(pub, 'favicon.ico'), Buffer.concat([header, ...entries, ...images.map((i) => i.data)]))
console.log('generado favicon.ico')
