import type { Page } from '@playwright/test'

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
