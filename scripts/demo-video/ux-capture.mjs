// Fase 4 (UX): capturas por resolución y análisis de accesibilidad con axe-core
// en la app de DEMO. Uso: node ux-capture.mjs <depsVideoDir> <demoAppDir> <outDir>
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const [depsDir, demoAppDir, outDir] = process.argv.slice(2)
const { chromium } = createRequire(`${depsDir}/package.json`)('playwright-core')
const password = readFileSync(`${demoAppDir}/.env`, 'utf8').match(/^DEMO_PASSWORD=(.+)$/m)[1]
const BASE = 'http://localhost:3300'
const AXE = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'
mkdirSync(outDir, { recursive: true })
const SIZES = { movil: { width: 390, height: 844, dsf: 2 }, tableta: { width: 768, height: 1024, dsf: 2 }, portatil: { width: 1024, height: 768, dsf: 1 }, escritorio: { width: 1440, height: 900, dsf: 1 } }
const PAGES = {
  publico: ['/', '/login', '/onboarding'],
  creador: ['/creator', '/creator/timeline', '/creator/metrics', '/creator/profile', '/creator/requests', '/chat', '/inbox'],
  partner: ['/partner', '/partner/discover', '/partner/requests', '__perfil_arezz__']
}
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = { axe: {}, overflow: [] }
let arezzProfile = null

for (const [sizeName, s] of Object.entries(SIZES)) {
  for (const [who, routes] of Object.entries(PAGES)) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.dsf, locale: 'es-ES', timezoneId: 'Europe/Madrid', isMobile: sizeName === 'movil', hasTouch: sizeName === 'movil' })
    await ctx.addInitScript(() => {
      const get = Storage.prototype.getItem
      Storage.prototype.getItem = function (k) { return String(k).startsWith('ciberan:tour:v1:') ? '2026-01-01T00:00:00.000Z' : get.call(this, k) }
    })
    const page = await ctx.newPage()
    if (who !== 'publico') {
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type=email]', who === 'creador' ? 'arezz@demo.ciberan.test' : 'nova@demo.ciberan.test')
      await page.fill('input[type=password]', password)
      await page.locator('button[type=submit]').first().click()
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
    }
    for (let route of routes) {
      if (route === '__perfil_arezz__') {
        if (!arezzProfile) {
          await page.goto(`${BASE}/partner/discover`, { waitUntil: 'networkidle' })
          await page.locator(':text-is("AREZZ")').first().click()
          await page.waitForURL(/\/profile\/creator\//)
          arezzProfile = new URL(page.url()).pathname
        }
        route = arezzProfile
      }
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(700)
      const name = `${sizeName}-${who}-${route.replace(/\/profile\/creator\/.*/, '/perfil-publico').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'landing'}`
      await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow > 1) report.overflow.push(`${name}: desborda ${overflow}px en horizontal`)
      if (sizeName !== 'tableta') {
        try {
          await page.addScriptTag({ url: AXE })
          const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, ejemplo: v.nodes[0]?.target?.join(' ') })))
          report.axe[name] = res
        } catch (e) { report.axe[name] = [{ id: 'error-axe', help: e.message.slice(0, 120) }] }
      }
      console.log(`captura ${name}`)
    }
    await ctx.close()
  }
}
writeFileSync(`${outDir}/ux-report.json`, JSON.stringify(report, null, 1))
const byRule = {}
for (const [pageName, vs] of Object.entries(report.axe)) for (const v of vs) { (byRule[v.id] ??= { impact: v.impact, help: v.help, paginas: [], nodos: 0, ejemplo: v.ejemplo }).paginas.push(pageName); byRule[v.id].nodos += v.n ?? 0 }
console.log('\nAXE (reglas incumplidas):')
for (const [id, r] of Object.entries(byRule).sort((a, b) => b[1].paginas.length - a[1].paginas.length)) console.log(`  [${r.impact}] ${id}: ${r.help} · ${r.paginas.length} páginas · ${r.nodos} nodos · p. ej. ${r.ejemplo}`)
console.log('\nDESBORDAMIENTO:', report.overflow.length ? '\n  ' + report.overflow.join('\n  ') : 'ninguno')
await browser.close()
