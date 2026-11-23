import { test, expect } from '@playwright/test'
import { hasPartner, sinDesborde, vigilarConsola } from './helpers'

test.skip(!hasPartner, 'Faltan E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD (ver docs/18-TESTS-E2E.md)')

test.describe('Partner · navegación y guardas', () => {
  test('el inicio carga sin errores de JavaScript', async ({ page }) => {
    const errores = vigilarConsola(page)
    await page.goto('/partner')
    await expect(page).toHaveURL(/\/partner/)
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(errores).toEqual([])
  })

  test('no puede entrar en la sección del creador (ni en su biblioteca)', async ({ page }) => {
    for (const ruta of ['/creator', '/creator/library']) {
      await page.goto(ruta)
      await expect(page, ruta).toHaveURL(/\/partner/, { timeout: 15_000 })
    }
  })

  test('el listado de solicitudes carga', async ({ page }) => {
    await page.goto('/partner/requests')
    await expect(page).toHaveURL(/\/partner\/requests/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  for (const ruta of ['/partner', '/partner/requests', '/inbox']) {
    test(`móvil: ${ruta} sin scroll horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')
      expect(await sinDesborde(page)).toBe(true)
    })
  }
})

test.describe('Partner · paleta de comandos (Ctrl+K)', () => {
  test('ofrece las rutas del partner y no las del creador', async ({ page }) => {
    await page.goto('/partner')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    const paleta = page.locator('[data-command-palette]')
    await expect(paleta).toBeVisible()
    await expect(paleta.getByText('Necesidades')).toBeVisible()
    await paleta.locator('input').fill('biblio')
    await expect(paleta.getByText(/Nada coincide/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(paleta).toBeHidden()
  })
})

test.describe('Partner · ayuda dentro de la app', () => {
  test('«Ayuda» está en el menú y abre los manuales dentro del panel', async ({ page }) => {
    await page.goto('/partner')
    await page.waitForLoadState('networkidle')
    await page.locator('.shell__rail').getByRole('link', { name: 'Ayuda' }).click()
    await expect(page).toHaveURL(/\/ayuda/)
    await expect(page.locator('[data-help-doc]')).toHaveCount(3)
  })
})
