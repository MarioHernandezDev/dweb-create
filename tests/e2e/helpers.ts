import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const creds = {
  creator: { email: process.env.E2E_CREATOR_EMAIL, password: process.env.E2E_CREATOR_PASSWORD },
  partner: { email: process.env.E2E_PARTNER_EMAIL, password: process.env.E2E_PARTNER_PASSWORD }
}
export const hasCreator = !!(creds.creator.email && creds.creator.password)
export const hasPartner = !!(creds.partner.email && creds.partner.password)

/** PNG válido de 1×1 px, para probar subidas sin ficheros externos. */
export const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

/** Falla el test si la página tiene scroll horizontal (desborde en móvil). */
export async function sinDesborde(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
}

/** Errores de consola graves de la app (ignora ruido de HMR/devtools y fallos de red esperados). */
export function vigilarConsola(page: Page) {
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(e.message))
  return errores
}

/**
 * Auditoría de accesibilidad con axe-core (WCAG 2.0/2.1 A y AA, incluido el contraste). Falla con la lista de problemas y los
 * elementos afectados. `incluir` limita la revisión a una zona (p. ej. una ventana abierta). `buenasPracticas` añade las reglas
 * de estructura de axe (un solo `main`, regiones, orden de títulos…).
 */
export async function auditar(page: Page, nombre: string, incluir?: string, buenasPracticas = false) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
  // El indicador de Nuxt DevTools solo existe en desarrollo y no es de la app.
  let axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', ...(buenasPracticas ? ['best-practice'] : [])]).exclude('nuxt-devtools-frame').exclude('#nuxt-devtools-anchor')
  if (incluir) axe = axe.include(incluir)
  const { violations } = await axe.analyze()
  const resumen = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`).join('\n')
  expect(violations, `Accesibilidad en ${nombre}:\n${resumen}`).toEqual([])
}
