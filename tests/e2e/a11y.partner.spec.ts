import { test } from '@playwright/test'
import { auditar, hasPartner } from './helpers'

test.skip(!hasPartner, 'Faltan E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD (ver docs/18-TESTS-E2E.md)')

test.describe('Accesibilidad · partner', () => {
  for (const ruta of ['/partner', '/partner/discover', '/partner/requests', '/partner/packages', '/partner/profile', '/partner/insights', '/inbox', '/chat', '/favorites', '/ayuda']) {
    test(`${ruta}: sin problemas WCAG A/AA ni de estructura`, async ({ page }) => {
      await page.goto(ruta)
      await auditar(page, ruta, undefined, true)
    })
  }

  test('detalle de una colaboración (si hay alguna)', async ({ page }) => {
    await page.goto('/partner/requests')
    await page.waitForLoadState('networkidle')
    const enlace = page.locator('a[href*="/partner/collaborations/"]').first()
    test.skip(!(await enlace.count()), 'No hay colaboraciones')
    await page.goto((await enlace.getAttribute('href'))!)
    await auditar(page, 'detalle de colaboración')
  })
})
