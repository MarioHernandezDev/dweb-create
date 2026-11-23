import { test, expect } from '@playwright/test'
import { auditar, hasCreator } from './helpers'

test.skip(!hasCreator, 'Faltan E2E_CREATOR_EMAIL / E2E_CREATOR_PASSWORD (ver docs/18-TESTS-E2E.md)')

test.describe('Accesibilidad · creador', () => {
  for (const ruta of ['/creator', '/creator/timeline', '/creator/discover', '/creator/requests', '/creator/packages', '/creator/library', '/creator/profile', '/creator/insights', '/creator/metrics', '/inbox', '/chat', '/favorites', '/ayuda']) {
    test(`${ruta}: sin problemas WCAG A/AA`, async ({ page }) => {
      await page.goto(ruta)
      await auditar(page, ruta)
    })
  }

  test('detalle de una colaboración (si hay alguna)', async ({ page }) => {
    await page.goto('/creator/requests')
    await page.waitForLoadState('networkidle')
    const enlace = page.locator('a[href*="/creator/collaborations/"]').first()
    test.skip(!(await enlace.count()), 'No hay colaboraciones')
    await page.goto((await enlace.getAttribute('href'))!)
    await auditar(page, 'detalle de colaboración')
  })

  test('paleta de comandos abierta', async ({ page }) => {
    await page.goto('/creator')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-command-palette]')).toBeVisible()
    await auditar(page, 'paleta de comandos', '[data-command-palette]')
  })

  test('formularios de contraseña y de email abiertos', async ({ page }) => {
    await page.goto('/creator/profile')
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: /Privacidad y cuenta/ }).or(page.getByRole('button', { name: /Privacidad y cuenta/ })).or(page.getByText('Privacidad y cuenta', { exact: true })).first().click()
    const card = page.locator('[data-account-access]')
    await card.locator('[data-change-password-open]').click()
    await expect(card.locator('[data-password-form]')).toBeVisible()
    await auditar(page, 'cambio de contraseña (paso 1)', '[data-account-access]')
    await card.locator('[data-change-email-open]').click()
    await expect(card.locator('[data-email-form]')).toBeVisible()
    await auditar(page, 'cambio de email', '[data-account-access]')
  })

  test('ventana «Nueva publicación» abierta', async ({ page }) => {
    await page.goto('/creator/timeline')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Nueva publicación' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await auditar(page, 'Nueva publicación', '[role=dialog]')
  })

  test('ventana «Suscribirme al calendario» abierta', async ({ page }) => {
    await page.goto('/creator/requests?vista=calendario')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-calendar-subscribe]').click()
    await expect(page.locator('[data-calendar-url]')).toBeVisible()
    await auditar(page, 'Suscribirme al calendario', '[role=dialog]')
  })

  test('móvil: inicio y publicaciones', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const ruta of ['/creator', '/creator/timeline']) {
      await page.goto(ruta)
      await auditar(page, `${ruta} (móvil)`)
    }
  })
})
