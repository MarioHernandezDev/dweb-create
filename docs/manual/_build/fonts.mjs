/** Copia las fuentes de la propia app (Hanken Grotesk, Bricolage Grotesque) a docs/manual/fonts leyendo la app local. */
import { chromium } from '../../../node_modules/@playwright/test/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
const OUT = path.resolve(import.meta.dirname, '../fonts')
const BASE = process.env.MANUAL_BASE_URL || 'http://localhost:3000'
const b = await chromium.launch({ channel: 'chrome' })
const page = await (await b.newContext()).newPage()
await page.goto(BASE + '/login'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500)
const rules = await page.evaluate(() => {
  const out = []
  for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules } catch { continue }
    for (const r of rs) if (r instanceof CSSFontFaceRule && /Hanken|Bricolage/.test(r.style.fontFamily)) out.push({ family: r.style.fontFamily.replace(/["']/g, ''), weight: r.style.fontWeight, range: r.style.unicodeRange, src: r.style.src }) }
  return out
})
const lat = rules.filter((r) => /U\+0*-0*FF/i.test(r.range) && !/ext|vietnamese/i.test(r.src))
let css = ''
for (const r of lat) {
  const m = r.src.match(/url\("?([^")]+)"?\)/); if (!m) continue
  const url = new URL(m[1], BASE).href
  const file = `${r.family.replace(/\s+/g, '')}-${r.weight.replace(/\s+/g, '-')}.woff2`
  fs.writeFileSync(path.join(OUT, file), Buffer.from(await (await fetch(url)).arrayBuffer()))
  css += `@font-face{font-family:"${r.family}";font-weight:${r.weight};font-style:normal;font-display:swap;src:url("../fonts/${file}") format("woff2")}\n`
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), css)
console.log(lat.length, 'reglas latinas;', rules.length, 'totales'); await b.close()
