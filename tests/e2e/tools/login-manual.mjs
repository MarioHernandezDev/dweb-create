/**
 * Inicio de sesión MANUAL para los tests E2E: abre una ventana de Chrome, la persona inicia sesión ella misma y, cuando entra
 * en su panel, se guarda el estado de la sesión en tests/e2e/.auth/<rol>.json. Así no hace falta que ninguna contraseña esté
 * en un archivo ni la teclee un programa. Uso: node tests/e2e/tools/login-manual.mjs creator|partner
 */
import { chromium } from '../../../node_modules/@playwright/test/index.mjs'
import path from 'node:path'

const rol = process.argv[2]
if (!['creator', 'partner'].includes(rol)) { console.error('Uso: node tests/e2e/tools/login-manual.mjs creator|partner'); process.exit(1) }
const base = process.env.E2E_BASE_URL || 'http://localhost:3000'
const destino = path.resolve(import.meta.dirname, `../.auth/${rol}.json`)

const browser = await chromium.launch({ channel: 'chrome', headless: false })
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'es-ES' })
const page = await ctx.newPage()
await page.goto(`${base}/login`)
console.log(`Inicia sesión como ${rol} en la ventana abierta (tienes 10 minutos)…`)
try {
  await page.waitForURL(new RegExp(`/${rol}(/|$|\\?)`), { timeout: 10 * 60_000 })
  await page.waitForLoadState('networkidle')
  await ctx.storageState({ path: destino })
  console.log(`Sesión guardada en ${destino}`)
} catch {
  console.error('No se detectó el inicio de sesión a tiempo: no se ha guardado nada.')
  process.exitCode = 2
}
await browser.close()
