import { test as setup, expect } from '@playwright/test'
import { creds, hasCreator, hasPartner } from './helpers'

/** Inicia sesión una vez por rol y guarda el estado. Las credenciales salen de E2E_* (nunca del código). */
async function login(page: import('@playwright/test').Page, who: 'creator' | 'partner', home: RegExp) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle') // hidratación completa antes de rellenar
  await page.getByLabel('Email').fill(creds[who].email!)
  await page.getByLabel('Contraseña', { exact: true }).fill(creds[who].password!)
  await page.getByRole('button', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(home, { timeout: 30_000 })
  await page.context().storageState({ path: `tests/e2e/.auth/${who}.json` })
}

setup('sesión de creador', async ({ page }) => {
  setup.skip(!hasCreator, 'Faltan E2E_CREATOR_EMAIL / E2E_CREATOR_PASSWORD')
  await login(page, 'creator', /\/creator/)
})
setup('sesión de partner', async ({ page }) => {
  setup.skip(!hasPartner, 'Faltan E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD')
  await login(page, 'partner', /\/partner/)
})
