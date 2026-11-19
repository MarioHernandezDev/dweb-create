// Genera las imágenes FICTICIAS de la demo (ilustración geométrica, sin caras ni
// marcas reales) renderizando HTML/SVG en Chrome y capturando cada lienzo a PNG.
// Uso: node gen-demo-images.mjs <depsVideoDir> <outDir>
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const [depsDir, outDir] = process.argv.slice(2)
const { chromium } = createRequire(`${depsDir}/package.json`)('playwright-core')
mkdirSync(outDir, { recursive: true })

const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;600;800&display=swap" rel="stylesheet">'
const base = `*{margin:0;box-sizing:border-box} body{background:transparent} .a{position:relative;overflow:hidden;font-family:Sora,sans-serif}`

// Retrato ilustrado (silueta abstracta, sin rasgos): fondo, hombros, cabeza, gafas.
const portrait = (bg1, bg2, skin, cloth, accent) => `
<svg viewBox="0 0 512 512" width="100%" height="100%">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="400" cy="110" r="70" fill="${accent}" opacity=".35"/>
  <path d="M86 512c10-110 80-170 170-170s160 60 170 170z" fill="${cloth}"/>
  <path d="M216 300h80v58c0 22-18 34-40 34s-40-12-40-34z" fill="${skin}"/>
  <ellipse cx="256" cy="228" rx="86" ry="98" fill="${skin}"/>
  <path d="M166 214c0-70 40-112 96-112 60 0 92 44 92 104-30-34-78-46-122-40-30 4-50 22-66 48z" fill="#1d1430"/>
  <rect x="190" y="222" width="56" height="30" rx="12" fill="#1d1430"/><rect x="266" y="222" width="56" height="30" rx="12" fill="#1d1430"/>
  <rect x="244" y="232" width="24" height="6" rx="3" fill="#1d1430"/>
</svg>`

const monogram = (txt, c1, c2) => `<div class="a" style="width:512px;height:512px;background:linear-gradient(135deg,${c1},${c2});display:grid;place-items:center">
  <div style="font:800 190px Sora;color:#fff;letter-spacing:-8px;opacity:.95">${txt}</div></div>`

const novaMark = (size, color) => `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><path d="M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z" fill="${color}"/><circle cx="50" cy="50" r="7" fill="#0e0b16"/></svg>`

const items = [
  { name: 'arezz-avatar', w: 512, h: 512, html: `<div class="a" style="width:512px;height:512px">${portrait('#ff9a62', '#d9479a', '#f2c4a0', '#4828c0', '#fff3c4')}</div>` },
  // Portadas SIN texto y con el motivo centrado: la app pone el nombre encima y las
  // recorta tanto en vertical (tarjetas de Descubrir) como en horizontal (perfil).
  { name: 'arezz-cover', w: 1600, h: 900, html: `<div class="a" style="width:1600px;height:900px;background:linear-gradient(160deg,#2a1660 0%,#7040e8 45%,#ff8a5c 100%)">
      <div style="position:absolute;left:640px;top:150px;width:320px;height:320px;border-radius:50%;background:#ffd27a;opacity:.9"></div>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<div style="position:absolute;bottom:0;left:${i * 210 - 20}px;width:170px;height:${260 + ((i * 97) % 280)}px;background:#190e41;opacity:${0.55 + (i % 3) * 0.12};border-radius:14px 14px 0 0"></div>`).join('')}</div>` },
  ...[
    ['c-sofia-cover', '#0e7490', '#67e8f9', '#fef3c7'], ['c-iker-cover', '#9d174d', '#f9a8d4', '#fdf2f8'], ['c-lia-cover', '#0f766e', '#86efac', '#f0fdf4'],
    ['c-dani-cover', '#1e3a8a', '#93c5fd', '#eff6ff'], ['c-marta-cover', '#b91c1c', '#fdba74', '#fff7ed'], ['c-kenji-cover', '#4c1d95', '#c4b5fd', '#f5f3ff'],
    ['p-brisa-cover', '#8a6d4b', '#e7d8c3', '#faf6f0'], ['p-lucuma-cover', '#78350f', '#fcd34d', '#fffbeb'], ['p-pulso-cover', '#7f1d1d', '#fca5a5', '#fef2f2']
  ].map(([name, c1, c2, c3]) => ({ name, w: 1600, h: 900, html: `<div class="a" style="width:1600px;height:900px;background:linear-gradient(150deg,${c1},${c2})">
      <div style="position:absolute;left:560px;top:140px;width:480px;height:480px;border-radius:50%;background:${c3};opacity:.35"></div>
      <div style="position:absolute;left:700px;top:260px;width:200px;height:640px;border-radius:100px 100px 0 0;background:${c3};opacity:.5"></div>
      <div style="position:absolute;left:470px;top:420px;width:160px;height:480px;border-radius:80px 80px 0 0;background:${c1};opacity:.55"></div>
      <div style="position:absolute;left:970px;top:360px;width:170px;height:540px;border-radius:85px 85px 0 0;background:${c1};opacity:.45"></div></div>` })),
  { name: 'nova-logo', w: 512, h: 512, html: `<div class="a" style="width:512px;height:512px;background:#0e0b16;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px">
      ${novaMark(220, '#c9f264')}<div style="color:#fff;font:700 54px Sora;letter-spacing:10px">NOVA</div><div style="color:#c9f264;font:600 26px 'Hanken Grotesk';letter-spacing:14px;margin-top:-18px">STUDIO</div></div>` },
  { name: 'nova-cover', w: 1600, h: 900, html: `<div class="a" style="width:1600px;height:900px;background:#efeae0">
      <div style="position:absolute;left:470px;top:-120px;width:660px;height:1140px;background:#0e0b16;transform:rotate(8deg)"></div>
      ${['#c9f264', '#7040e8', '#ff8a5c', '#e7d8c3'].map((c, i) => `<div style="position:absolute;left:${545 + i * 130}px;top:${230 + (i % 2) * 50}px;width:210px;height:440px;background:${c};border-radius:105px 105px 16px 16px;transform:rotate(${i * 4 - 6}deg)"></div>`).join('')}
      <div style="position:absolute;left:1260px;top:110px">${novaMark(150, '#0e0b16')}</div></div>` },
  // Paquetes de AREZZ
  ...[
    ['pkg-reel', 'Reel de lanzamiento', '#7040e8', '#ff8a5c', '▶'],
    ['pkg-campana', 'Campaña completa', '#190e41', '#7040e8', '★'],
    ['pkg-carrusel', 'Carrusel de producto', '#d9479a', '#ffd27a', '▦']
  ].map(([name, label, c1, c2, glyph]) => ({ name, w: 1200, h: 800, html: `<div class="a" style="width:1200px;height:800px;background:linear-gradient(135deg,${c1},${c2})">
      <div style="position:absolute;inset:0;display:grid;place-items:center;font:800 420px Sora;color:#fff;opacity:.28" title="${label}">${glyph}</div></div>` })),
  // Piezas de publicaciones (4:5)
  ...[
    ['post-otono', 'Look de otoño', '#7a3b1d', '#ffb36b'],
    ['post-rutina', 'Rutina de mañana', '#1f6f6b', '#c9f2e4'],
    ['post-madrid', 'Un día en Madrid', '#4828c0', '#ff9a62'],
    ['post-sneakers', 'Sneakers en rotación', '#190e41', '#d9479a'],
    ['post-cafe', 'Brunch de domingo', '#5b3a29', '#f2d3a6']
  ].map(([name, label, c1, c2]) => ({ name, w: 1080, h: 1350, html: `<div class="a" style="width:1080px;height:1350px;background:linear-gradient(170deg,${c2},${c1})">
      <div style="position:absolute;left:140px;top:240px;width:800px;height:800px;border-radius:50%;background:${c1};opacity:.35"></div>
      <div style="position:absolute;left:300px;top:380px;width:480px;height:640px;border-radius:240px 240px 30px 30px;background:#fff;opacity:.22"></div>
      <div style="position:absolute;left:80px;bottom:110px;color:#fff;font:700 92px Sora;letter-spacing:-3px;max-width:900px">${label}</div>
      <div style="position:absolute;left:84px;top:80px;color:#fff;font:600 32px 'Hanken Grotesk';letter-spacing:6px">@arezz.demo</div></div>` })),
  // Pieza de la colaboración en directo: versión 1 (antes de cambios) y 2 (corregida)
  ...[['nova-capsula-v1', false], ['nova-capsula-v2', true]].map(([name, fixed]) => ({ name, w: 1080, h: 1350, html: `<div class="a" style="width:1080px;height:1350px;background:#efeae0">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,#0e0b16 100%)"></div>
      ${['#c9f264', '#7040e8', '#ff8a5c'].map((c, i) => `<div style="position:absolute;left:${170 + i * 250}px;top:${260 + i * 40}px;width:240px;height:520px;background:${c};border-radius:120px 120px 16px 16px;transform:rotate(${i * 5 - 5}deg)"></div>`).join('')}
      <div style="position:absolute;left:80px;top:80px;display:flex;align-items:center;gap:20px">${novaMark(70, '#0e0b16')}<span style="font:700 34px Sora;letter-spacing:8px;color:#0e0b16">NOVA × AREZZ</span></div>
      <div style="position:absolute;left:80px;bottom:200px;color:#fff;font:800 96px Sora;letter-spacing:-3px">Cápsula Otoño</div>
      <div style="position:absolute;left:84px;bottom:120px;color:${fixed ? '#c9f264' : '#fff'};font:600 40px 'Hanken Grotesk'">${fixed ? 'Ya disponible · 20 % de lanzamiento con AREZZ20' : 'Ya disponible'}</div></div>` })),
  // Fondo: creadores y marcas secundarios (monogramas)
  ...[
    ['c-lia', 'LM', '#22c55e', '#0f766e'], ['c-dani', 'DO', '#3b82f6', '#1e3a8a'], ['c-marta', 'MV', '#f97316', '#b91c1c'],
    ['c-kenji', 'KR', '#a855f7', '#4c1d95'], ['c-sofia', 'SL', '#06b6d4', '#0e7490'], ['c-iker', 'IS', '#ec4899', '#9d174d'],
    ['p-brisa', 'AB', '#e7d8c3', '#8a6d4b'], ['p-lucuma', 'LC', '#f59e0b', '#78350f'], ['p-pulso', 'PF', '#ef4444', '#7f1d1d']
  ].map(([name, txt, c1, c2]) => ({ name, w: 512, h: 512, html: monogram(txt, c1, c2) }))
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1700, height: 1400 }, deviceScaleFactor: 1 })
for (const it of items) {
  await page.setContent(`<!doctype html><html><head>${FONTS}<style>${base}</style></head><body>${it.html}</body></html>`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.a').first().screenshot({ path: `${outDir}/${it.name}.png` })
}
await browser.close()
console.log(`${items.length} imágenes en ${outDir}`)
