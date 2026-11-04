// Tarjetas de título (intro, módulos, cierre) con la identidad de CIBERAN: logo, Snasm
// para la marca, Sora para títulos, Hanken Grotesk para texto y los colores del logo.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PROJECT = fileURLToPath(new URL('../../', import.meta.url))
const LOGO = pathToFileURL(`${PROJECT}/public/img/logo-svg.png`).href
const SNASM = pathToFileURL(`${PROJECT}/app/assets/fonts/Snasm-Light.otf`).href

function html({ kind, kicker, title, subtitle, note }) {
  const big = kind === 'intro' || kind === 'outro'
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@font-face{font-family:Snasm;src:url("${SNASM}") format("opentype");font-weight:300}
*{margin:0;box-sizing:border-box}
html,body{width:1280px;height:720px;overflow:hidden;background:#120a33}
.bg{position:absolute;inset:0;background:radial-gradient(120% 90% at 20% 10%,#2a1670 0%,#160c3f 45%,#0d0726 100%)}
.blob{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55;animation:drift 9s ease-in-out infinite alternate}
.b1{width:520px;height:520px;left:-120px;top:-160px;background:#4be0ea;opacity:.28}
.b2{width:560px;height:560px;right:-160px;bottom:-200px;background:#7040e8;animation-duration:11s}
.b3{width:300px;height:300px;right:220px;top:-60px;background:#e45cf0;opacity:.3;animation-duration:13s}
.b4{width:180px;height:180px;left:300px;bottom:40px;background:#ffbe3d;opacity:.22;animation-duration:10s}
@keyframes drift{to{transform:translate(40px,30px) scale(1.08)}}
.brand{position:absolute;left:64px;top:52px;display:flex;align-items:center;gap:14px;opacity:0;animation:in .7s .05s ease forwards}
.brand img{width:44px;height:44px}
.brand span{font:300 34px Snasm;color:#fff;letter-spacing:.04em}
.wrap{position:absolute;left:64px;right:64px;top:50%;transform:translateY(-50%)}
.kicker{font:600 20px 'Hanken Grotesk';letter-spacing:.18em;text-transform:uppercase;color:#c9b8ff;opacity:0;animation:up .7s .2s ease forwards}
.title{margin-top:18px;font:700 ${big ? 84 : 92}px/1.02 Sora;letter-spacing:-.025em;color:#fff;opacity:0;animation:up .8s .35s cubic-bezier(.2,.8,.2,1) forwards}
.title em{font-style:normal;background:linear-gradient(90deg,#4be0ea,#8a5ced 50%,#e45cf0);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{margin-top:24px;max-width:900px;font:500 28px/1.4 'Hanken Grotesk';color:#ddd5ff;opacity:0;animation:up .8s .6s ease forwards}
.note{position:absolute;left:64px;bottom:48px;font:500 17px 'Hanken Grotesk';color:#a99ce0;opacity:0;animation:in .8s .9s ease forwards}
.bar{margin-top:34px;height:5px;width:0;border-radius:5px;background:linear-gradient(90deg,#4be0ea,#7040e8,#e45cf0,#ffbe3d);animation:grow 1.1s .7s cubic-bezier(.2,.8,.2,1) forwards}
.hero{display:flex;align-items:center;gap:30px;opacity:0;animation:up .9s .15s cubic-bezier(.2,.8,.2,1) forwards}
.hero img{width:120px;height:120px}
.hero span{font:300 110px Snasm;color:#fff;letter-spacing:.04em}
@keyframes up{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes in{to{opacity:1}}
@keyframes grow{to{width:220px}}
body:not(.go) *{animation-play-state:paused!important}
</style></head><body>
<div class="bg"></div><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="blob b4"></div>
${big ? '' : `<div class="brand"><img src="${LOGO}"><span>CIBERAN</span></div>`}
<div class="wrap">
  ${big ? `<div class="hero"><img src="${LOGO}"><span>CIBERAN</span></div>` : ''}
  ${kicker ? `<div class="kicker" style="${big ? 'margin-top:40px' : ''}">${kicker}</div>` : ''}
  <div class="title">${title}</div>
  ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
  <div class="bar"></div>
</div>
${note ? `<div class="note">${note}</div>` : ''}
</body></html>`
}

export async function recordCard(page, rec, dir, card, ms) {
  mkdirSync(dir, { recursive: true })
  const file = `${dir}/${card.id}.html`
  writeFileSync(file, html(card))
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await rec.start(page, `card-${card.id}`)
  await page.evaluate(() => document.body.classList.add('go'))
  rec.noteCaption(card.srt ?? `${card.kicker ? card.kicker + ' — ' : ''}${card.title.replace(/<[^>]+>/g, '')}`)
  await page.waitForTimeout(ms)
  return rec.stop()
}
