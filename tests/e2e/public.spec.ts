import { test, expect } from '@playwright/test'
import { sinDesborde, vigilarConsola } from './helpers'

test.describe('Páginas públicas', () => {
  test('la landing carga sin errores de JavaScript', async ({ page }) => {
    const errores = vigilarConsola(page)
    const res = await page.goto('/')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(errores).toEqual([])
  })

  test('login: muestra el formulario y no deja entrar con datos vacíos', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Accede a tu cuenta' })).toBeVisible()
    await page.getByRole('button', { name: 'Acceder' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('login: credenciales inexistentes muestran un error y no inician sesión', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle') // espera a la hidratación: si no, el formulario se envía sin JS
    await page.getByLabel('Email').fill('no-existe-e2e@example.com')
    await page.getByLabel('Contraseña', { exact: true }).fill('contraseña-incorrecta-1')
    await page.getByRole('button', { name: 'Acceder' }).click()
    await expect(page.getByRole('alert').or(page.locator('[data-toast=error]')).first()).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('login enlaza a «olvidé mi contraseña» y a crear cuenta', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-forgot-link]').click()
    await expect(page).toHaveURL(/\/forgot-password/)
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test('páginas legales accesibles', async ({ page }) => {
    for (const ruta of ['/privacidad', '/terminos']) {
      const res = await page.goto(ruta)
      expect(res?.status(), ruta).toBeLessThan(400)
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })

  test('una ruta inexistente sin sesión lleva al login', async ({ page }) => {
    await page.goto('/esta-ruta-no-existe-e2e')
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })
})

test.describe('Ayuda y manuales', () => {
  test('/ayuda es pública y lista los tres documentos con su destinatario', async ({ page }) => {
    const res = await page.goto('/ayuda')
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(/\/ayuda/)
    await expect(page.getByRole('heading', { name: 'Ayuda y manuales.' })).toBeVisible()
    const docs = page.locator('[data-help-doc]')
    await expect(docs).toHaveCount(3)
    await expect(docs.nth(0)).toContainText('Para: Creadores y partners')
    await expect(page.locator('[data-help-doc=creadores]')).toContainText('Para: Creadores de contenido')
    await expect(page.locator('[data-help-doc=partners]')).toContainText('Para: Marcas, empresas y agencias')
  })

  test('cada botón «Descargar PDF» devuelve un PDF', async ({ page, request }) => {
    await page.goto('/ayuda')
    const hrefs = await page.locator('[data-help-download]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')))
    expect(hrefs).toHaveLength(3)
    for (const href of hrefs) {
      const res = await request.get(href!)
      expect(res.status(), href!).toBe(200)
      expect(res.headers()['content-type'], href!).toContain('pdf')
    }
  })

  test('se llega desde el menú y el pie de la landing', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ayuda' }).click()
    await expect(page).toHaveURL(/\/ayuda/)
    await page.goto('/')
    await expect(page.locator('footer').getByRole('link', { name: 'Ayuda y manuales' })).toBeVisible()
  })
})

test.describe('Guardas de ruta (sin sesión)', () => {
  for (const ruta of ['/creator', '/creator/library', '/creator/packages', '/partner', '/partner/requests', '/inbox', '/chat']) {
    test(`${ruta} redirige al login`, async ({ page }) => {
      await page.goto(ruta)
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    })
  }
})

test.describe('Responsive (móvil 375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  for (const ruta of ['/', '/login', '/forgot-password', '/privacidad', '/ayuda']) {
    test(`${ruta} no tiene scroll horizontal`, async ({ page }) => {
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')
      expect(await sinDesborde(page)).toBe(true)
    })
  }
})
