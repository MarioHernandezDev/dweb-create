// Comprueba el contraste (WCAG 2.x) de las combinaciones de color que usa el
// sistema «Señal». Lee los valores de app/assets/css/tokens.css, así que si se
// cambia un token, este script dice si la combinación sigue siendo válida.
//
// Uso: node scripts/design/check-contrast.mjs   (sale con 1 si algo falla)
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../../app/assets/css/tokens.css', import.meta.url), 'utf8')
const token = (name) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`Token no encontrado: --color-${name}`)
  return m[1]
}
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// [texto o elemento, fondo, mínimo, para qué]
const TEXT = 4.5
const UI = 3
const pairs = [
  ['tinta-950', 'hueso-100', TEXT, 'texto sobre fondo'],
  ['tinta-950', 'hueso-200', TEXT, 'texto sobre hundido'],
  ['tinta-500', 'hueso-100', TEXT, 'texto secundario sobre fondo'],
  ['tinta-500', 'hueso-50', TEXT, 'texto secundario sobre tarjeta'],
  ['tinta-500', 'hueso-200', TEXT, 'texto secundario sobre hundido'],
  ['tinta-400', 'hueso-100', TEXT, 'metadatos sobre fondo'],
  ['tinta-400', 'hueso-50', TEXT, 'metadatos sobre tarjeta'],
  ['tinta-400', 'hueso-200', TEXT, 'metadatos sobre hundido'],
  ['hueso-100', 'tinta-950', TEXT, 'texto sobre bloque oscuro'],
  ['tinta-950', 'voltio-400', TEXT, 'texto de botón de marca'],
  ['hueso-100', 'tinta-950', TEXT, 'texto de botón primario'],
  ['cobalto-600', 'hueso-100', TEXT, 'enlaces'],
  ['cobalto-600', 'hueso-100', UI, 'anillo de foco'],
  ['lila-600', 'hueso-50', TEXT, 'cifra de predicción'],
  ['danger', 'hueso-50', TEXT, 'mensaje de error'],
  ['danger', 'danger-tint', TEXT, 'texto de «Fuera de plazo»'],
  ...['idea', 'production', 'review', 'scheduled', 'published'].flatMap((p) => [
    ['tinta-950', `phase-${p}-tint`, TEXT, `texto del chip «${p}»`],
    [`phase-${p}`, `phase-${p}-tint`, UI, `color fuerte de «${p}» sobre su tinte`],
    [`phase-${p}`, 'hueso-100', UI, `color fuerte de «${p}» sobre fondo`]
  ])
]

let failures = 0
for (const [fg, bg, min, what] of pairs) {
  const r = ratio(token(fg), token(bg))
  const ok = r >= min
  if (!ok) failures++
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${r.toFixed(2).padStart(5)}:1 (mín. ${min}) ${what} · ${fg} sobre ${bg}`)
}
console.log(failures ? `\n${failures} combinación(es) por debajo del mínimo.` : `\n${pairs.length} combinaciones correctas.`)
process.exit(failures ? 1 : 0)
