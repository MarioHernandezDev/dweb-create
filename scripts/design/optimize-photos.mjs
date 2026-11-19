// Reduce las fotos locales de public/img (originales de 1–3 MB, hasta 6000 px)
// a un tamaño razonable para la web: 1600 px el lado mayor, JPEG progresivo
// mozjpeg calidad 76. Se sobrescriben en el mismo sitio (los originales siguen
// en el historial de git) porque las portadas de demo apuntan a estas rutas.
// Uso: node scripts/design/optimize-photos.mjs
import sharp from 'sharp'
import { readdirSync, statSync, writeFileSync } from 'node:fs'

const DIR = 'public/img'
const MAX = 1600
for (const file of readdirSync(DIR).filter((f) => /^pexels-.*\.jpg$/.test(f))) {
  const path = `${DIR}/${file}`
  const before = statSync(path).size
  const out = await sharp(path).rotate().resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true, progressive: true }).toBuffer()
  if (out.length < before) writeFileSync(path, out)
  console.log(`${file}: ${(before / 1024).toFixed(0)} KB → ${(Math.min(out.length, before) / 1024).toFixed(0)} KB`)
}
