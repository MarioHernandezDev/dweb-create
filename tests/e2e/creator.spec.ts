import { test, expect } from '@playwright/test'
import { hasCreator, PNG_1PX, sinDesborde, vigilarConsola } from './helpers'

test.skip(!hasCreator, 'Faltan E2E_CREATOR_EMAIL / E2E_CREATOR_PASSWORD (ver docs/18-TESTS-E2E.md)')

const TAG = `[E2E] ${Date.now()}`

/** Borra de verdad las imágenes de prueba de la biblioteca (espera el plazo de deshacer: cerrar antes lo cancelaría). */
async function limpiarBiblioteca(page: import('@playwright/test').Page) {
  const resto = page.locator('[data-library-item]', { hasText: /e2e/i })
  while (await resto.count()) {
    const antes = await resto.count()
    await resto.first().getByRole('button', { name: /^Borrar / }).click()
    await expect(resto).toHaveCount(antes - 1, { timeout: 20_000 })
    await page.waitForTimeout(9_000)
  }
}

test.describe('Creador · navegación y guardas', () => {
  test('el inicio carga sin errores de JavaScript', async ({ page }) => {
    const errores = vigilarConsola(page)
    await page.goto('/creator')
    await expect(page).toHaveURL(/\/creator/)
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(errores).toEqual([])
  })

  test('no puede entrar en la sección del partner', async ({ page }) => {
    await page.goto('/partner')
    await expect(page).toHaveURL(/\/creator/, { timeout: 15_000 })
  })

  test('una ruta inexistente muestra el 404 en español', async ({ page }) => {
    const res = await page.goto('/creator/no-existe-e2e')
    expect(res?.status()).toBe(404)
    await expect(page.getByText('Página no encontrada')).toBeVisible()
  })

  test('recargar mantiene la sesión', async ({ page }) => {
    await page.goto('/creator/timeline')
    await page.reload()
    await expect(page).toHaveURL(/\/creator\/timeline/)
  })

  for (const ruta of ['/creator', '/creator/timeline', '/creator/library', '/creator/packages', '/inbox']) {
    test(`móvil: ${ruta} sin scroll horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')
      expect(await sinDesborde(page)).toBe(true)
    })
  }
})

test.describe('Creador · paleta de comandos (Ctrl+K)', () => {
  test('abre, filtra, navega con Enter y cierra con Esc', async ({ page }) => {
    await page.goto('/creator')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    const paleta = page.locator('[data-command-palette]')
    await expect(paleta).toBeVisible()
    await paleta.locator('input').fill('biblio')
    await expect(paleta.getByText('Biblioteca').first()).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/creator\/library/)
    await expect(paleta).toBeHidden()

    await page.keyboard.press('Control+k')
    await expect(paleta).toBeVisible()
    await paleta.locator('input').fill('zzzxq-e2e')
    await expect(paleta.getByText(/Nada coincide/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(paleta).toBeHidden()
  })
})

test.describe('Creador · biblioteca de archivos', () => {
  test('subir, renombrar con etiquetas, deshacer y borrar', async ({ page }) => {
    const nombre = `${TAG} imagen`
    await page.goto('/creator/library')
    await page.waitForLoadState('networkidle')

    // Subida: el input es oculto; se rellena directamente.
    await page.locator('[data-library] input[type=file]').setInputFiles({ name: 'e2e.png', mimeType: 'image/png', buffer: PNG_1PX })
    const tile = page.locator('[data-library-item]', { hasText: 'e2e' }).first()
    await expect(tile).toBeVisible({ timeout: 20_000 })

    try {
      // Editar nombre y etiquetas (las etiquetas se normalizan).
      await tile.getByRole('button', { name: /Editar nombre y etiquetas/ }).click()
      const edit = page.locator('[data-library-edit]')
      await expect(edit).toBeVisible()
      await edit.getByRole('textbox').first().fill(nombre)
      await edit.getByPlaceholder('#otoño #producto').fill('#E2E  #Prueba')
      await edit.getByRole('button', { name: /Guardar/ }).click()
      const renombrada = page.locator('[data-library-item]', { hasText: nombre })
      await expect(renombrada).toBeVisible()
      await expect(renombrada).toContainText('#e2e')

      // Borrar → Deshacer la restaura.
      await renombrada.getByRole('button', { name: `Borrar ${nombre}` }).click()
      await expect(page.getByRole('status').filter({ hasText: 'eliminada de la biblioteca' })).toBeVisible()
      await page.locator('[data-toast-action]').click()
      await expect(renombrada).toBeVisible()
    } finally {
      await limpiarBiblioteca(page)
    }
  })

  test('una foto grande se optimiza al subir (pesa mucho menos)', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/creator/library')
    await page.waitForLoadState('networkidle')
    // Foto sintética de 3000×2000 generada en el navegador (degradado + círculos + algo de ruido).
    const base64 = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 3000; c.height = 2000
      const g = c.getContext('2d')!
      const grad = g.createLinearGradient(0, 0, 3000, 2000); grad.addColorStop(0, '#e8c34a'); grad.addColorStop(1, '#2a1f6d')
      g.fillStyle = grad; g.fillRect(0, 0, 3000, 2000)
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
      for (let i = 0; i < 900; i++) { g.fillStyle = `hsla(${Math.floor(rnd() * 360)},70%,55%,.55)`; g.beginPath(); g.arc(rnd() * 3000, rnd() * 2000, 10 + rnd() * 90, 0, 7); g.fill() }
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.98))
      const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ''
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
      return btoa(bin)
    })
    const original = Buffer.from(base64, 'base64')
    expect(original.length, 'la foto de prueba debería pesar bastante').toBeGreaterThan(1_000_000)
    expect(original.length, 'y caber en el límite de subida').toBeLessThan(8 * 1024 * 1024)

    await page.locator('[data-library] input[type=file]').setInputFiles({ name: 'e2e-grande.jpg', mimeType: 'image/jpeg', buffer: original })
    const tile = page.locator('[data-library-item]', { hasText: 'e2e-grande' }).first()
    try {
      await expect(tile).toBeVisible({ timeout: 30_000 })
      const sub = (await tile.locator('.lib__sub').innerText()).replace(',', '.')
      const m = sub.match(/([\d.]+)\s*(KB|MB)/)
      expect(m, `no se pudo leer el tamaño en «${sub}»`).toBeTruthy()
      const bytes = Number(m![1]) * (m![2] === 'MB' ? 1024 * 1024 : 1024)
      expect(bytes, `guardada: ${sub}; original: ${(original.length / 1024).toFixed(0)} KB`).toBeLessThan(original.length / 2)
    } finally {
      await limpiarBiblioteca(page)
    }
  })

  test('rechaza ficheros que no son imagen', async ({ page }) => {
    await page.goto('/creator/library')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-library] input[type=file]').setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') })
    await expect(page.locator('[data-upload-errors]')).toBeVisible()
  })
})

test.describe('Creador · paquetes', () => {
  test('crear un paquete, verlo en la lista y borrarlo', async ({ page }) => {
    const titulo = `${TAG} paquete`
    await page.goto('/creator/packages')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-add-package]').first().click()
    const hoja = page.getByRole('dialog')
    await expect(hoja).toBeVisible()
    await hoja.getByLabel('Título').fill(titulo)
    await hoja.getByLabel('Precio del paquete').fill('123')
    await hoja.locator('[data-save-package]').click()
    const tarjeta = page.locator('.package', { hasText: titulo })
    try {
      await expect(tarjeta).toBeVisible({ timeout: 20_000 })
    } finally {
      if (await tarjeta.count()) {
        await tarjeta.getByRole('button', { name: /Borrar|Eliminar/ }).first().click()
        await page.getByRole('alertdialog').or(page.getByRole('dialog')).getByRole('button', { name: 'Borrar', exact: true }).click()
        await expect(tarjeta).toHaveCount(0, { timeout: 20_000 })
      }
    }
  })

  test('no permite publicar sin título ni precio', async ({ page }) => {
    await page.goto('/creator/packages')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-add-package]').first().click()
    await expect(page.locator('[data-save-package]')).toBeDisabled()
  })
})
