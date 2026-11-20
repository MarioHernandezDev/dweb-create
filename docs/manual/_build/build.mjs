/**
 * Genera el manual: Markdown (fuente editable) → HTML → PDF (Chrome, con numeración de páginas).
 * Uso: node docs/manual/_build/build.mjs [--sin-pdf]
 * Entradas (docs/manual): MANUAL_USUARIO_CIBERAN.md, GUIA_RAPIDA_CREADORES.md, GUIA_RAPIDA_PARTNERS.md
 * Salidas: .html y .pdf junto a cada .md. Solo documentación: no toca la app.
 */
import { Marked } from 'marked'
import { chromium } from '../../../node_modules/@playwright/test/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import os from 'node:os'

const DIR = path.resolve(import.meta.dirname, '..')
const PUBLICO = path.resolve(DIR, '../../public/manuales')
const sinPdf = process.argv.includes('--sin-pdf')
const DOCS = [
  { md: 'MANUAL_USUARIO_CIBERAN', toc: true, cover: true },
  { md: 'GUIA_RAPIDA_CREADORES', toc: false, cover: true, corta: true },
  { md: 'GUIA_RAPIDA_PARTNERS', toc: false, cover: true, corta: true }
]

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const CALLOUTS = {
  consejo: ['tip', 'Consejo'], atencion: ['warn', 'Atención'], atención: ['warn', 'Atención'], importante: ['warn', 'Importante'],
  aviso: ['info', 'Aviso'], nota: ['info', 'Nota'], ejemplo: ['example', 'Ejemplo'], 'no disponible': ['off', 'No disponible'],
  'próximamente': ['off', 'Próximamente'], 'captura pendiente': ['todo', 'Captura pendiente'], 'sin verificar': ['todo', 'Sin verificar']
}

function parseFront(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = {}
  if (m) for (const l of m[1].split('\n')) { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim() }
  return { meta, body: m ? src.slice(m[0].length) : src }
}

function render(body, opts) {
  const toc = []
  const marked = new Marked({ gfm: true, breaks: false })
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        const id = slug(text)
        if (depth <= 2) toc.push({ depth, text: text.replace(/<[^>]+>/g, ''), id })
        return `<h${depth} id="${id}">${text}</h${depth}>\n`
      },
      image({ href, title, text }) {
        const cap = text ? `<figcaption>${esc(text)}</figcaption>` : ''
        return `<figure><img src="${href}" alt="${esc(text || '')}" loading="lazy">${cap}</figure>`
      },
      blockquote({ tokens }) {
        const html = this.parser.parse(tokens)
        const m = html.match(/^<p><strong>([^<:]+):?<\/strong>:?\s*/i)
        const key = m && m[1].trim().toLowerCase().replace(/:$/, '')
        if (key && CALLOUTS[key]) {
          const [cls, label] = CALLOUTS[key]
          return `<aside class="callout callout--${cls}"><div class="callout__label">${label}</div>${html.replace(m[0], '<p>').replace(/^<p>([a-záéíóúñ])/, (_, c) => '<p>' + c.toUpperCase())}</aside>\n`
        }
        return `<blockquote>${html}</blockquote>\n`
      },
      table(tok) {
        const head = tok.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('')
        const rows = tok.rows.map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('')
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`
      }
    }
  })
  return { html: marked.parse(body), toc }
}

function pagina({ meta, html, toc, cfg }) {
  const nivel1 = toc.filter((t) => t.depth === 1)
  const indice = cfg.toc
    ? `<section class="toc" id="indice"><h2 class="toc__title">Índice</h2><ol>${toc.map((t) => `<li class="toc__${t.depth === 1 ? 'part' : 'sec'}"><a href="#${t.id}">${t.text}</a></li>`).join('')}</ol></section>`
    : ''
  const nav = cfg.toc
    ? `<nav class="sidenav" aria-label="Índice"><a class="sidenav__brand" href="#top">ciberan</a>${toc.map((t) => `<a class="sidenav__${t.depth === 1 ? 'part' : 'sec'}" href="#${t.id}">${t.text}</a>`).join('')}</nav>`
    : ''
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta.title || 'Manual CIBERAN')}</title>
<link rel="stylesheet" href="fonts/fonts.css"><link rel="stylesheet" href="_build/manual.css">
</head><body id="top" class="${cfg.corta ? 'doc--corta' : 'doc--manual'}">
${nav}
<main class="doc">
<section class="cover">
  <div class="cover__top"><span class="cover__logo">ciberan</span><span class="cover__tag">${esc(meta.etiqueta || 'Manual de usuario')}</span></div>
  <div class="cover__mid">
    <p class="cover__kicker">${esc(meta.kicker || 'Guía oficial')}</p>
    <h1 class="cover__title">${esc(meta.title || '')}</h1>
    <p class="cover__sub">${esc(meta.subtitle || '')}</p>
    <div class="cover__bar"></div>
  </div>
  <div class="cover__bottom">
    <dl><div><dt>Elaborado</dt><dd>${esc(meta.fecha || '')}</dd></div><div><dt>Versión del manual</dt><dd>${esc(meta.version || '')}</dd></div><div><dt>Aplicación documentada</dt><dd>${esc(meta.app || '')}</dd></div></dl>
  </div>
</section>
${indice}
<article class="content">${html}</article>
</main></body></html>`
}

const browser = sinPdf ? null : await chromium.launch({ channel: 'chrome' })
for (const cfg of DOCS) {
  const file = path.join(DIR, `${cfg.md}.md`)
  if (!fs.existsSync(file)) { console.warn('· falta', cfg.md); continue }
  const { meta, body } = parseFront(fs.readFileSync(file, 'utf8'))
  const { html, toc } = render(body, cfg)
  const out = path.join(DIR, `${cfg.md}.html`)
  fs.writeFileSync(out, pagina({ meta, html, toc, cfg }))
  console.log('✓', `${cfg.md}.html`)
  if (browser) {
    const page = await browser.newPage()
    await page.goto('file://' + out)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    // La portada va sin pie de página y no cuenta en la numeración: se imprime aparte y se une al resto.
    const pdfOut = path.join(DIR, `${cfg.md}.pdf`)
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-pdf-'))
    const estilo = await page.addStyleTag({ content: '@media print{.toc,.content{display:none!important}}' })
    await page.pdf({ path: path.join(tmp, 'cover.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false })
    await estilo.evaluate((n) => n.remove())
    await page.addStyleTag({ content: '@media print{.cover{display:none!important}@page:first{margin:16mm 16mm 18mm}}' })
    await page.pdf({
      path: path.join(tmp, 'resto.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font:500 8.5px 'Hanken Grotesk',Arial,sans-serif;color:#66606f;padding:0 16mm;display:flex;justify-content:space-between"><span>${esc(meta.pie || 'CIBERAN · Manual de usuario')}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`
    })
    try { execFileSync('pdfunite', [path.join(tmp, 'cover.pdf'), path.join(tmp, 'resto.pdf'), pdfOut]) }
    catch { fs.copyFileSync(path.join(tmp, 'resto.pdf'), pdfOut); console.warn('  (sin pdfunite: el PDF sale sin portada)') }
    fs.rmSync(tmp, { recursive: true, force: true })
    // La web pública (/ayuda) sirve los PDF desde public/manuales.
    fs.mkdirSync(PUBLICO, { recursive: true })
    fs.copyFileSync(pdfOut, path.join(PUBLICO, `${cfg.md}.pdf`))
    await page.close()
    console.log('✓', `${cfg.md}.pdf`)
  }
}
if (browser) await browser.close()
