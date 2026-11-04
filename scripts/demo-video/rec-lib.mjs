// Librería de grabación de la demo: capa visual (cursor, rótulos, resaltado), acciones
// con movimiento suave y captura de fotogramas por CDP (Page.startScreencast).
import { mkdirSync, writeFileSync } from 'node:fs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Capa visual inyectada en cada documento (no intercepta clics: pointer-events none).
// ---------------------------------------------------------------------------
export function overlayInitScript() {
  // Recorrido de bienvenida dado por visto (clave feedma:tour:v1:<usuario>).
  const get = Storage.prototype.getItem
  Storage.prototype.getItem = function (k) { return String(k).startsWith('feedma:tour:v1:') ? '2026-01-01T00:00:00.000Z' : get.call(this, k) }

  const install = () => {
    if (document.getElementById('__demo-root')) return
    const css = document.createElement('style')
    css.textContent = `
      #__demo-root{position:fixed;inset:0;pointer-events:none;z-index:2147483646;font-family:'Hanken Grotesk',system-ui,sans-serif}
      #__demo-cursor{position:fixed;left:0;top:0;width:30px;height:30px;transform:translate(-4px,-3px);transition:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));z-index:3}
      .__demo-ripple{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #8a5ced;background:rgba(138,92,237,.25);animation:__demoRip .55s ease-out forwards;z-index:2}
      @keyframes __demoRip{to{transform:scale(3.4);opacity:0}}
      #__demo-cap{position:fixed;left:50%;bottom:18px;transform:translate(-50%,12px);opacity:0;transition:opacity .28s ease,transform .28s ease;display:flex;align-items:center;gap:12px;
        max-width:1000px;padding:11px 20px 11px 12px;border-radius:999px;background:rgba(25,14,65,.92);color:#fff;font-size:19px;font-weight:600;line-height:1.25;box-shadow:0 12px 30px -10px rgba(25,14,65,.6);white-space:nowrap}
      #__demo-cap.on{opacity:1;transform:translate(-50%,0)}
      #__demo-cap.top{bottom:auto;top:96px}
      #__demo-cap .who{flex:none;padding:5px 12px;border-radius:999px;font-size:14px;font-weight:700;letter-spacing:.02em}
      #__demo-cap .who.nova{background:#c9f264;color:#0e0b16}
      #__demo-cap .who.arezz{background:linear-gradient(135deg,#ff9a62,#d9479a);color:#fff}
      #__demo-cap .n{flex:none;color:#d9c9fb;font-weight:700;font-size:15px}
      #__demo-badge{position:fixed;right:22px;top:118px;padding:8px 14px;border-radius:12px;background:#fff7d6;color:#5b4300;border:1px solid #f1d78a;font-size:14px;font-weight:700;opacity:0;transition:opacity .3s;box-shadow:0 6px 18px -8px rgba(0,0,0,.25)}
      #__demo-badge.on{opacity:1}
      #__demo-hl{position:fixed;border:3px solid #8a5ced;border-radius:16px;box-shadow:0 0 0 7px rgba(138,92,237,.22),0 10px 30px -6px rgba(112,64,232,.45);opacity:0;transition:opacity .25s ease,left .35s ease,top .35s ease,width .35s ease,height .35s ease}
      #__demo-hl.on{opacity:1}`
    document.documentElement.appendChild(css)
    const root = document.createElement('div')
    root.id = '__demo-root'
    root.innerHTML = `<div id="__demo-hl"></div><div id="__demo-badge"></div><div id="__demo-cap"></div>
      <svg id="__demo-cursor" viewBox="0 0 24 24"><path d="M4 2.5 L4 20 L8.6 15.6 L11.6 22.2 L14.6 20.9 L11.7 14.4 L18 14.4 Z" fill="#fff" stroke="#130b30" stroke-width="1.6" stroke-linejoin="round"/></svg>`
    document.documentElement.appendChild(root)
    const cur = root.querySelector('#__demo-cursor')
    const pos = JSON.parse(sessionStorage.getItem('__demo-pos') || '{"x":640,"y":400}')
    cur.style.left = pos.x + 'px'; cur.style.top = pos.y + 'px'
    addEventListener('mousemove', (e) => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; try { sessionStorage.setItem('__demo-pos', JSON.stringify({ x: e.clientX, y: e.clientY })) } catch {} }, true)
    addEventListener('mousedown', (e) => window.__demo.ripple(e.clientX, e.clientY), true)
  }
  window.__demo = {
    ripple(x, y) { const r = document.createElement('div'); r.className = '__demo-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.getElementById('__demo-root')?.appendChild(r); setTimeout(() => r.remove(), 700) },
    caption(c) {
      install()
      const el = document.getElementById('__demo-cap')
      if (!c) { el.classList.remove('on'); return }
      const html = `${c.n ? `<span class="n">${c.n}</span>` : ''}${c.who ? `<span class="who ${c.who}">${c.who === 'nova' ? 'NOVA STUDIO · marca' : 'AREZZ · creador'}</span>` : ''}<span>${c.text}</span>`
      el.classList.toggle('top', !!c.top)
      if (el.dataset.html === html && el.classList.contains('on')) return
      el.classList.remove('on')
      setTimeout(() => { el.innerHTML = html; el.dataset.html = html; el.classList.add('on') }, el.dataset.html ? 180 : 0)
    },
    badge(text) { install(); const b = document.getElementById('__demo-badge'); if (text) { b.textContent = text; b.classList.add('on') } else b.classList.remove('on') },
    highlight(r) {
      install(); const h = document.getElementById('__demo-hl')
      if (!r) { h.classList.remove('on'); return }
      const p = 8; Object.assign(h.style, { left: r.x - p + 'px', top: r.y - p + 'px', width: r.width + 2 * p + 'px', height: r.height + 2 * p + 'px' }); h.classList.add('on')
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install()
}

// ---------------------------------------------------------------------------
// Grabación por CDP: fotogramas JPEG con su marca de tiempo.
// ---------------------------------------------------------------------------
export class Recorder {
  constructor(outDir) { this.outDir = outDir; this.sessions = new Map(); this.clips = [] }
  async cdp(page) {
    if (!this.sessions.has(page)) {
      const s = await page.context().newCDPSession(page)
      s.on('Page.screencastFrame', async (f) => {
        s.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
        const clip = this.current
        if (!clip || clip.page !== page) return
        const file = `${clip.dir}/f${String(clip.frames.length).padStart(5, '0')}.jpg`
        clip.frames.push({ file, t: Date.now() / 1000 })
        writeFileSync(file, Buffer.from(f.data, 'base64'))
      })
      this.sessions.set(page, s)
    }
    return this.sessions.get(page)
  }
  async start(page, name) {
    const dir = `${this.outDir}/${String(this.clips.length + 1).padStart(2, '0')}-${name}`
    mkdirSync(dir, { recursive: true })
    this.current = { name, dir, page, frames: [], captions: [], t0: Date.now() / 1000 }
    const s = await this.cdp(page)
    await s.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
    // Fuerza un primer fotograma aunque la página esté quieta.
    await page.evaluate(() => { document.documentElement.style.outline = '0px solid transparent'; requestAnimationFrame(() => { document.documentElement.style.outline = '' }) }).catch(() => {})
  }
  noteCaption(text) {
    const c = this.current; if (!c) return
    const t = Date.now() / 1000 - c.t0
    const last = c.captions[c.captions.length - 1]
    if (last && last.end === null) last.end = t
    if (text) c.captions.push({ start: t, end: null, text })
  }
  async stop() {
    const c = this.current; if (!c) return
    await sleep(250)
    const s = await this.cdp(c.page)
    await s.send('Page.stopScreencast').catch(() => {})
    c.t1 = Date.now() / 1000
    for (const cap of c.captions) if (cap.end === null) cap.end = c.t1 - c.t0
    this.clips.push({ name: c.name, dir: c.dir, frames: c.frames, t0: c.t0, t1: c.t1, captions: c.captions })
    this.current = null
    return this.clips[this.clips.length - 1]
  }
}

// ---------------------------------------------------------------------------
// Actor: acciones con cursor suave sobre una página.
// ---------------------------------------------------------------------------
export class Actor {
  constructor(page, who, rec) { this.page = page; this.who = who; this.rec = rec; this.pos = { x: 640, y: 400 }; this.cap = null; this.badgeText = null }
  async reapply() {
    await this.page.evaluate(([c, b]) => { window.__demo?.caption(c); window.__demo?.badge(b) }, [this.cap, this.badgeText]).catch(() => {})
  }
  async goto(url) {
    await this.page.goto(url, { waitUntil: 'networkidle' })
    await this.page.waitForTimeout(300)
    await this.reapply()
  }
  async caption(text, opts = {}) {
    this.cap = text ? { text, who: this.who, n: opts.n, top: opts.top } : null
    this.rec.noteCaption(text ? `${opts.n ? opts.n + ' · ' : ''}${text}` : null)
    await this.page.evaluate((c) => window.__demo?.caption(c), this.cap)
    await sleep(opts.wait ?? 0)
  }
  async badge(text) { this.badgeText = text; await this.page.evaluate((b) => window.__demo?.badge(b), text) }
  async moveTo(x, y, ms = 650) {
    const steps = Math.max(12, Math.round(ms / 16))
    const { x: x0, y: y0 } = this.pos
    for (let i = 1; i <= steps; i++) {
      const k = i / steps; const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      await this.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
      await sleep(ms / steps)
    }
    this.pos = { x, y }
  }
  async reveal(loc) {
    await loc.waitFor({ state: 'visible', timeout: 15000 })
    const box = await loc.boundingBox()
    const vh = this.page.viewportSize().height
    if (!box || box.y < 70 || box.y + box.height > vh - 90) {
      await loc.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      await sleep(750)
    }
    return loc.boundingBox()
  }
  async point(loc, { dx = 0.5, dy = 0.5, ms } = {}) {
    const b = await this.reveal(loc)
    await this.moveTo(b.x + b.width * dx, b.y + b.height * dy, ms)
    return b
  }
  async click(loc, opts = {}) {
    await this.point(loc, opts)
    await sleep(opts.pause ?? 220)
    await this.page.mouse.down(); await sleep(90); await this.page.mouse.up()
    await sleep(opts.after ?? 500)
  }
  async type(loc, text, { delay = 30, clear = false } = {}) {
    await this.click(loc, { after: 200 })
    if (clear) { await this.page.keyboard.press('Control+A'); await this.page.keyboard.press('Backspace') }
    await this.page.keyboard.type(text, { delay })
    await sleep(350)
  }
  async select(loc, label) {
    await this.point(loc); await sleep(200)
    const b = await loc.boundingBox()
    await this.page.evaluate(([x, y]) => window.__demo?.ripple(x, y), [b.x + b.width / 2, b.y + b.height / 2])
    await loc.selectOption({ label }); await sleep(600)
  }
  async fill(loc, value) {
    await this.point(loc); await sleep(200)
    const b = await loc.boundingBox()
    await this.page.evaluate(([x, y]) => window.__demo?.ripple(x, y), [b.x + b.width / 2, b.y + b.height / 2])
    await loc.fill(value); await sleep(600)
  }
  async upload(loc, file) {
    const chooser = this.page.waitForEvent('filechooser')
    await this.click(loc, { after: 100 })
    await (await chooser).setFiles(file)
    await sleep(2200)
  }
  async highlight(loc, ms = 1600) {
    const b = await this.reveal(loc)
    await this.page.evaluate((r) => window.__demo?.highlight(r), b)
    await sleep(ms)
    await this.page.evaluate(() => window.__demo?.highlight(null))
    await sleep(250)
  }
  // Resalta el primer antepasado del elemento con al menos minW×minH (la tarjeta o el bloque que lo contiene).
  async highlightBlock(loc, { minW = 220, minH = 80, ms = 1700 } = {}) {
    await this.reveal(loc)
    const r = await loc.evaluate((el, [mw, mh]) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const b = e.getBoundingClientRect()
        if (b.width >= mw && b.height >= mh) return { x: b.x, y: b.y, width: b.width, height: b.height }
      }
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }
    }, [minW, minH])
    await this.page.evaluate((rr) => window.__demo?.highlight(rr), r)
    await sleep(ms)
    await this.page.evaluate(() => window.__demo?.highlight(null))
    await sleep(250)
  }
  async scroll(dy, ms = 900) {
    const steps = Math.max(10, Math.round(ms / 25))
    for (let i = 0; i < steps; i++) { await this.page.mouse.wheel(0, dy / steps); await sleep(ms / steps) }
    await sleep(300)
  }
  async scrollTop() { await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(700) }
  dwell(ms) { return sleep(ms) }
}
