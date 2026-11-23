import { test } from '@playwright/test'
import { auditar } from './helpers'

test.describe('Accesibilidad · páginas públicas', () => {
  for (const ruta of ['/', '/login', '/forgot-password', '/onboarding', '/ayuda', '/privacidad', '/terminos', '/instalaciones']) {
    test(`${ruta}: sin problemas WCAG A/AA ni de estructura`, async ({ page }) => {
      await page.goto(ruta)
      await auditar(page, ruta, undefined, true)
    })
  }

  test('móvil: landing y login', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const ruta of ['/', '/login', '/ayuda']) {
      await page.goto(ruta)
      await auditar(page, `${ruta} (móvil)`)
    }
  })
})
