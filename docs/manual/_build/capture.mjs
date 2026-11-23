/**
 * Capturas del manual de usuario. SOLO LECTURA: navega, abre pestañas y hojas, pero nunca envía nada.
 * Usa las sesiones guardadas por los tests E2E (tests/e2e/.auth/*.json) y sustituye en pantalla los nombres,
 * emails y marcas de prueba por datos ficticios antes de capturar (el resto es la interfaz real).
 * Uso: node docs/manual/_build/capture.mjs [filtro]   (la app debe estar en http://localhost:3000)
 */
import { chromium } from '../../../node_modules/@playwright/test/index.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const OUT = path.resolve(import.meta.dirname, '../img')
const BASE = process.env.MANUAL_BASE_URL || 'http://localhost:3000'
const filtro = process.argv[2] || ''
const IDS = JSON.parse(process.env.MANUAL_IDS || '{}') // { collab, post, creatorProfile }

const REEMPLAZOS = [
  ['Alejandro Suárez Durán', 'Lucía Martín'], ['Auditoria UX Creador', 'Creador Demo'], ['Marca Auditoria UX', 'Marca Demo'],
  ['Cuenta de Mexo', 'Cuenta de Marca Ejemplo'], ['asuadur14@gmail.com', 'lucia@ejemplo.com'], ['mexplorer63@gmail.com', 'contacto@marcaejemplo.com'],
  ['mexo', 'Marca Ejemplo'], ['Mexo', 'Marca Ejemplo'], ['Mario', 'Carlos Ruiz'], [' (prueba)', ''], ['(prueba)', ''], [' de prueba', ''], ['Contraoferta Marca', 'Contraoferta']
]
const INICIALES = { AS: 'LM', AU: 'CD', M: 'ME', IA: 'ME' }

const anonimizar = ({ reemplazos, iniciales }) => {
  const aplicar = () => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n
    while ((n = w.nextNode())) {
      let t = n.nodeValue
      const tr = t.trim()
      if (iniciales[tr] && n.parentElement && n.parentElement.children.length === 0 && getComputedStyle(n.parentElement).display !== 'inline') { n.nodeValue = t.replace(tr, iniciales[tr]); continue }
      let c = t
      for (const [a, b] of reemplazos) if (c.includes(a)) c = c.split(a).join(b)
      if (c !== t) n.nodeValue = c
    }
    document.querySelectorAll('[aria-label],[title],[placeholder]').forEach((e) => {
      for (const at of ['aria-label', 'title', 'placeholder']) {
        const v = e.getAttribute(at); if (!v) continue
        let c = v; for (const [a, b] of reemplazos) if (c.includes(a)) c = c.split(a).join(b)
        if (c !== v) e.setAttribute(at, c)
      }
    })
  }
  const iniciar = () => { aplicar(); setInterval(aplicar, 250) }
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar)
}

/** Dibuja marcadores numerados sobre elementos (por selector CSS o por texto visible). */
const marcar = (items) => {
  document.querySelectorAll('[data-manual-mark]').forEach((e) => e.remove())
  for (const it of items) {
    let el = null
    if (it.sel) el = document.querySelector(it.sel)
    if (!el && it.text) {
      const cand = [...document.querySelectorAll('button,a,h1,h2,h3,h4,label,span,p,div,li,input,textarea')]
        .filter((e) => e.offsetParent !== null && (e.innerText || e.getAttribute('aria-label') || e.placeholder || '').trim().toLowerCase().includes(it.text.toLowerCase()))
      cand.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)
      el = cand[0] || null
    }
    if (!el) { console.warn('marca no encontrada:', it.sel || it.text); continue }
    const r = el.getBoundingClientRect()
    if (r.bottom > innerHeight - 4 || r.top < 0 || r.right > innerWidth) { console.warn('marca fuera de pantalla:', it.n, it.sel || it.text); continue }
    const box = document.createElement('div')
    box.setAttribute('data-manual-mark', '1')
    box.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:2.5px solid #7c3aed;border-radius:10px;pointer-events:none;z-index:2147483646;box-shadow:0 0 0 3px rgba(124,58,237,.18)`
    const num = document.createElement('div')
    num.textContent = String(it.n)
    num.style.cssText = `position:absolute;left:-14px;top:-14px;width:26px;height:26px;border-radius:50%;background:#7c3aed;color:#fff;font:700 14px/26px system-ui,sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.35)`
    box.appendChild(num); document.body.appendChild(box)
  }
}

// OJO: no pulsar el botón «Chat» de la cabecera de una colaboración: abre (y crea) la conversación entre las dos cuentas.
const click = async (page, loc) => { try { await loc.first().click({ timeout: 4000 }); await page.waitForTimeout(700); return true } catch { console.warn('  ! no se pudo pulsar'); return false } }
const T = (page, t, opts) => page.getByText(t, opts)
const tab = (p, name) => p.getByRole('tab', { name, exact: true }).or(p.getByRole('radio', { name, exact: true })).or(p.getByRole('button', { name, exact: true })).or(p.getByText(name, { exact: true }))
const B = (page, name) => page.getByRole('button', { name })

const D = { width: 1280, height: 860 }
const M = { width: 390, height: 844 }
const T1 = { width: 1280, height: 1250 } // pestañas largas
const T2 = { width: 1280, height: 1450 }

const SHOTS = [
  // ---- públicas
  { id: 'pub-landing', role: null, path: '/' },
  { id: 'pub-onboarding-rol', role: null, path: '/onboarding', marks: [{ text: 'Creador de contenido', n: 1 }, { text: 'Partner', n: 2 }] },
  { id: 'pub-login', role: null, path: '/login', marks: [{ text: 'Email', n: 1 }, { text: '¿Olvidaste tu contraseña?', n: 2 }, { sel: 'button[type=submit]', n: 3 }] },
  { id: 'pub-olvido', role: null, path: '/forgot-password' },
  { id: 'pub-instalar', role: null, path: '/instalaciones' },
  // ---- creador
  { id: 'c-inicio', role: 'creator', path: '/creator', marks: [{ text: 'Nueva publicación', n: 1 }, { text: 'Colaboraciones activas', n: 2 }, { text: 'Buscar y acciones', n: 3 }] },
  { id: 'c-inicio-movil', role: 'creator', path: '/creator', vp: M },
  { id: 'c-menu-movil', role: 'creator', path: '/creator', vp: M, act: async (p) => { await click(p, p.getByRole('button', { name: /^Más/ })) } },
  { id: 'c-perfil', role: 'creator', path: '/creator/profile', marks: [{ text: 'Editar ficha', n: 1 }, { text: 'Ver perfil público', n: 2 }, { text: 'Ficha completa al', n: 3 }] },
  { id: 'c-perfil-ficha', vp: T2, scrollText: 'Presentación', role: 'creator', path: '/creator/profile', act: async (p) => { await click(p, tab(p, 'Ficha pública')) } },
  { id: 'c-perfil-privacidad', vp: T2, scrollText: 'Privacidad del chat', role: 'creator', path: '/creator/profile', act: async (p) => { await click(p, tab(p, /Privacidad/)) } },
  { id: 'c-perfil-acceso', scrollText: 'Acceso a la cuenta', vp: T1, role: 'creator', path: '/creator/profile', act: async (p) => { await click(p, tab(p, /Privacidad/)) } },
  { id: 'c-calendario-suscribir', role: 'creator', path: '/creator/requests?vista=calendario', act: async (p) => {
    await click(p, p.locator('[data-calendar-subscribe]')); await p.waitForTimeout(1200)
    // Solo en pantalla: se enmascara el enlace privado real antes de capturar.
    await p.evaluate(() => { const i = document.querySelector('[data-calendar-url]'); if (i) i.value = 'https://tu-dominio.es/api/calendar/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.ics' })
  } },
  { id: 'c-tour', role: 'creator', path: '/creator/profile', act: async (p) => { await click(p, B(p, 'Ver el recorrido de bienvenida')) } },
  { id: 'c-descubrir', role: 'creator', path: '/creator/discover', marks: [{ text: 'Buscar marca por nombre', n: 1 }, { text: 'Filtros', n: 2 }, { text: 'Ordenar', n: 3 }, { text: 'Proponer', n: 4 }] },
  { id: 'c-proponer', role: 'creator', path: '/creator/discover', act: async (p) => { await click(p, B(p, 'Proponer')); await p.waitForTimeout(700) } },
  { id: 'c-colabs-tablero', role: 'creator', path: '/creator/requests', marks: [{ text: 'Tablero', n: 1 }, { text: 'Solicitudes', n: 2 }, { text: 'Exportar CSV', n: 3 }] },
  { id: 'c-colabs-lista', role: 'creator', path: '/creator/requests', act: async (p) => { await click(p, tab(p, 'Lista')) } },
  { id: 'c-colabs-calendario', scrollText: 'Calendario', role: 'creator', path: '/creator/requests', act: async (p) => { await click(p, tab(p, 'Calendario')) } },
  { id: 'c-colabs-solicitudes', role: 'creator', path: '/creator/requests', act: async (p) => { await click(p, tab(p, 'Solicitudes')) } },
  { id: 'c-colab-resumen', role: 'creator', path: '/creator/collaborations/:collab', marks: [{ text: 'Siguiente paso', n: 1 }, { text: 'Entregables', n: 2 }] },
  { id: 'c-colab-entregables', vp: T1, scrollText: 'Acuerdo y archivos', role: 'creator', path: '/creator/collaborations/:collab', act: async (p) => { await click(p, p.getByRole('tab', { name: 'Entregables' }).or(B(p, 'Entregables'))) } },
  { id: 'c-colab-acuerdo', vp: T1, scrollText: 'Acuerdo y archivos', role: 'creator', path: '/creator/collaborations/:collab', act: async (p) => { await click(p, p.getByRole('tab', { name: 'Acuerdo y archivos' }).or(B(p, 'Acuerdo y archivos'))) } },
  { id: 'c-colab-actividad', vp: T1, scrollText: 'Acuerdo y archivos', role: 'creator', path: '/creator/collaborations/:collab', act: async (p) => { await click(p, p.getByRole('tab', { name: 'Actividad' }).or(B(p, 'Actividad'))) } },
  { id: 'c-colab-mas-acciones', role: 'creator', path: '/creator/collaborations/:collab', act: async (p) => { await click(p, T(p, 'Más acciones')) } },
  { id: 'c-pub-tablero', role: 'creator', path: '/creator/timeline', marks: [{ text: 'Nueva publicación', n: 1 }, { text: 'Calendario', n: 2 }, { text: 'Todas las redes', n: 3 }] },
  { id: 'c-pub-calendario', scrollText: 'Noviembre 2026', role: 'creator', path: '/creator/timeline', act: async (p) => { await click(p, tab(p, 'Calendario')) } },
  { id: 'c-pub-lista', role: 'creator', path: '/creator/timeline', act: async (p) => { await click(p, tab(p, 'Lista')) } },
  { id: 'c-pub-nueva', role: 'creator', path: '/creator/timeline', act: async (p) => { await click(p, B(p, 'Nueva publicación')); await p.waitForTimeout(900) } },
  { id: 'c-pub-detalle', role: 'creator', path: '/creator/post/:post', full: true },
  { id: 'c-pub-detalle-arriba', role: 'creator', path: '/creator/post/:post', marks: [{ text: 'Marcar como publicada', n: 1 }, { text: 'Texto de la publicación', n: 2 }, { text: 'Qué toca ahora', n: 3 }] },
  { id: 'c-biblioteca', role: 'creator', path: '/creator/library', marks: [{ text: 'Subir imágenes', n: 1 }, { text: 'Buscar en la biblioteca', n: 2 }, { text: 'Editar nombre y etiquetas', n: 3 }] },
  { id: 'c-biblioteca-selector', role: 'creator', path: '/creator/packages', act: async (p) => { await click(p, B(p, /Añadir paquete/)); await p.waitForTimeout(700); await click(p, p.locator('[data-pick-library]')); await p.waitForTimeout(900); /* solo en pantalla: se ocultan imágenes ajenas al ejemplo (pueden ser fotos reales) */ await p.evaluate(() => document.querySelectorAll('[data-media-pick]').forEach((b) => { if (!/otoño/i.test(b.getAttribute('aria-label') || '')) b.remove() })) } },
  { id: 'c-paquetes', role: 'creator', path: '/creator/packages', marks: [{ text: 'Añadir paquete', n: 1 }, { text: 'Destacado', n: 2 }, { text: 'Editar', n: 3 }] },
  { id: 'c-paquete-nuevo', role: 'creator', path: '/creator/packages', act: async (p) => { await click(p, B(p, /Añadir paquete/)); await p.waitForTimeout(900) } },
  { id: 'c-resultados', role: 'creator', path: '/creator/insights' },
  { id: 'c-metricas', role: 'creator', path: '/creator/metrics' },
  { id: 'c-bandeja', role: 'creator', path: '/inbox' },
  { id: 'c-chat', role: 'creator', path: '/chat' },
  { id: 'c-guardados', role: 'creator', path: '/favorites' },
  { id: 'c-paleta', role: 'creator', path: '/creator', act: async (p) => { await p.keyboard.press('Control+k'); await p.waitForTimeout(700) } },
  { id: 'c-paleta-buscar', role: 'creator', path: '/creator', act: async (p) => { await p.keyboard.press('Control+k'); await p.waitForTimeout(500); await p.keyboard.type('biblio'); await p.waitForTimeout(700) } },
  // ---- partner
  { id: 'p-inicio', role: 'partner', path: '/partner', marks: [{ text: 'Descubrir creadores', n: 1 }, { text: 'Por responder', n: 2 }] },
  { id: 'p-descubrir', role: 'partner', path: '/partner/discover', marks: [{ text: 'Buscar creador por nombre', n: 1 }, { text: 'Filtros', n: 2 }, { text: 'Contactar', n: 3 }] },
  { id: 'p-contactar', role: 'partner', path: '/partner/discover', act: async (p) => { await click(p, B(p, 'Contactar')); await p.waitForTimeout(900) } },
  { id: 'p-colabs-tablero', role: 'partner', path: '/partner/requests' },
  { id: 'p-colab-resumen', role: 'partner', path: '/partner/collaborations/:collab', marks: [{ text: 'Siguiente paso', n: 1 }, { text: 'Completar brief', n: 2 }] },
  { id: 'p-colab-entregables', vp: T1, scrollText: 'Acuerdo y archivos', role: 'partner', path: '/partner/collaborations/:collab', act: async (p) => { await click(p, p.getByRole('tab', { name: 'Entregables' }).or(B(p, 'Entregables'))) } },
  { id: 'p-necesidades', role: 'partner', path: '/partner/packages' },
  { id: 'p-necesidad-nueva', role: 'partner', path: '/partner/packages', act: async (p) => { await click(p, B(p, /Añadir necesidad/)); await p.waitForTimeout(900) } },
  { id: 'p-resultados', role: 'partner', path: '/partner/insights' },
  { id: 'p-perfil', role: 'partner', path: '/partner/profile' },
  { id: 'p-perfil-creador', role: 'partner', path: '/profile/creator/:creatorProfile', full: false },
  { id: 'p-paleta', role: 'partner', path: '/partner', act: async (p) => { await p.keyboard.press('Control+k'); await p.waitForTimeout(700) } },
  { id: 'p-bandeja', role: 'partner', path: '/inbox' }
]

const browser = await chromium.launch({ channel: 'chrome' })
const ctxs = {}
async function pageFor(role, vp) {
  const key = `${role}|${vp.width}`
  if (!ctxs[key]) {
    const opts = { viewport: vp, locale: 'es-ES', deviceScaleFactor: 1.5, isMobile: vp.width < 500, hasTouch: vp.width < 500 }
    if (role) opts.storageState = path.join(ROOT, `tests/e2e/.auth/${role}.json`)
    const ctx = await browser.newContext(opts)
    await ctx.addInitScript(() => { const st = () => { const e = document.createElement('style'); e.textContent = '#nuxt-devtools-anchor,#nuxt-devtools-container,nuxt-devtools-frame,[id^=nuxt-devtools]{display:none!important}'; (document.head || document.documentElement).appendChild(e) }; if (document.head) st(); else document.addEventListener('DOMContentLoaded', st) })
    await ctx.addInitScript(anonimizar, { reemplazos: REEMPLAZOS, iniciales: INICIALES })
    // Cookies/avisos no deben tapar la captura
    ctxs[key] = ctx
  }
  return ctxs[key].newPage()
}

for (const s of SHOTS) {
  if (filtro && !s.id.includes(filtro)) continue
  const url = BASE + s.path.replace(/:(\w+)/g, (_, k) => IDS[k] || k)
  if (/:\w+/.test(s.path) && s.path.split('/').some((x) => x.startsWith(':') && !IDS[x.slice(1)])) { console.warn(`- ${s.id}: falta MANUAL_IDS`); continue }
  const page = await pageFor(s.role, s.vp || D)
  page.on('console', (m) => { if (m.text().startsWith('marca ')) console.warn('  ', s.id, m.text()) })
  await page.goto(url).catch((e) => console.warn(`  ! ${s.id}: ${e.message}`))
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(1500)
  if (s.act) await s.act(page)
  await page.waitForTimeout(500)
  if (s.scrollText) {
    await page.evaluate((t) => {
      const c = [...document.querySelectorAll('button,a,h1,h2,h3,h4,label,span,p,div,li')].filter((e) => e.offsetParent !== null && (e.innerText || '').trim().toLowerCase() === t.toLowerCase())
      c.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)
      const el = c.find((e) => e.getBoundingClientRect().top > 60) || c[0]
      if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -110) } else console.warn('marca scroll no encontrado:', t)
    }, s.scrollText)
    await page.waitForTimeout(500)
  }
  if (s.marks) await page.evaluate(marcar, s.marks)
  await page.screenshot({ path: path.join(OUT, `${s.id}.jpg`), type: 'jpeg', quality: 84, fullPage: !!s.full })
  const txt = await page.evaluate(() => document.body.innerText).catch(() => '')
  if (process.env.MANUAL_DUMP) fs.writeFileSync(path.join(process.env.MANUAL_DUMP, `${s.id}.txt`), txt)
  console.log(`✓ ${s.id}`)
  await page.close()
}
await browser.close()
