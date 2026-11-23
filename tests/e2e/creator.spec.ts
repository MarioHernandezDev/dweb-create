import { test, expect } from '@playwright/test'
import { auditar, creds, hasCreator, PNG_1PX, sinDesborde, vigilarConsola } from './helpers'

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

test.describe('Creador · ayuda dentro de la app', () => {
  test('«Ayuda» está en el menú y abre los manuales dentro del panel', async ({ page }) => {
    await page.goto('/creator')
    await page.waitForLoadState('networkidle')
    await page.locator('.shell__rail').getByRole('link', { name: 'Ayuda' }).click()
    await expect(page).toHaveURL(/\/ayuda/)
    await expect(page.locator('.shell__rail').first()).toBeVisible() // sigue dentro del panel, no en la portada
    await expect(page.locator('[data-help-doc]')).toHaveCount(3)
  })

  test('la paleta (Ctrl+K) encuentra «Ayuda»', async ({ page }) => {
    await page.goto('/creator')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    const paleta = page.locator('[data-command-palette]')
    await paleta.locator('input').fill('ayuda')
    await expect(paleta.getByText('Ayuda').first()).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/ayuda/)
  })
})

test.describe('Creador · borrador de publicación', () => {
  test('lo escrito sobrevive a cerrar la ventana y se puede descartar', async ({ page }) => {
    await page.goto('/creator/timeline')
    await page.waitForLoadState('networkidle')
    const titulo = `${TAG} borrador`
    await page.getByRole('button', { name: 'Nueva publicación' }).first().click()
    const hoja = page.getByRole('dialog')
    await expect(hoja).toBeVisible()
    await hoja.getByLabel('Título interno').fill(titulo)
    await page.waitForTimeout(900) // el autoguardado espera medio segundo tras escribir

    await page.keyboard.press('Escape')
    await expect(hoja).toBeHidden()

    await page.getByRole('button', { name: 'Nueva publicación' }).first().click()
    await expect(page.locator('[data-draft-restored]')).toBeVisible()
    await expect(page.getByRole('dialog').getByLabel('Título interno')).toHaveValue(titulo)

    await page.locator('[data-draft-discard]').click()
    await expect(page.locator('[data-draft-restored]')).toBeHidden()
    await expect(page.getByRole('dialog').getByLabel('Título interno')).toHaveValue('')

    // Y descartado de verdad: al cerrar y reabrir ya no vuelve.
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Nueva publicación' }).first().click()
    await expect(page.locator('[data-draft-restored]')).toHaveCount(0)
  })
})

test.describe('Creador · acceso a la cuenta', () => {
  test('el perfil muestra el email y valida los formularios sin enviar nada', async ({ page }) => {
    await page.goto('/creator/profile')
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: /Privacidad y cuenta/ }).or(page.getByRole('button', { name: /Privacidad y cuenta/ })).or(page.getByText('Privacidad y cuenta', { exact: true })).first().click()
    const card = page.locator('[data-account-access]')
    await expect(card).toBeVisible()
    await expect(card.locator('[data-account-email]')).toContainText('@')

    // Contraseña, paso 1: sin la actual no avanza; con una incorrecta, el servidor la rechaza (no se envía ningún código).
    await card.locator('[data-change-password-open]').click()
    const form = card.locator('[data-password-form][data-step=verify]')
    await expect(form).toContainText('Paso 1 de 2')
    await form.getByRole('button', { name: 'Enviar código al correo' }).click()
    await expect(form.getByRole('alert')).toContainText('contraseña actual')
    await form.getByLabel('Contraseña actual', { exact: true }).fill('lo-que-sea-123')
    await form.getByRole('button', { name: 'Enviar código al correo' }).click()
    await expect(form.getByRole('alert')).toContainText('no es correcta', { timeout: 20_000 })
    await expect(card.locator('[data-password-form][data-step=code]')).toHaveCount(0)

    await card.locator('[data-change-email-open]').click()
    const emailForm = card.locator('[data-email-form]')
    await emailForm.getByLabel('Email nuevo').fill('no-es-un-email')
    await emailForm.getByRole('button', { name: /Enviar enlace/ }).click()
    await expect(emailForm.getByRole('alert')).toContainText('email válido')
  })
})

test.describe('Creador · cambio de contraseña (paso 2)', () => {
  test('con el código simulado: valida código, fortaleza y coincidencia sin cambiar nada', async ({ page }) => {
    test.skip(!creds.creator.password, 'Falta E2E_CREATOR_PASSWORD')
    // Solo se simula el ENVÍO del código (no sale ningún correo). Lo demás es real: la contraseña actual se comprueba en Supabase.
    await page.route('**/auth/v1/reauthenticate', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await page.goto('/creator/profile')
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: /Privacidad y cuenta/ }).or(page.getByRole('button', { name: /Privacidad y cuenta/ })).or(page.getByText('Privacidad y cuenta', { exact: true })).first().click()
    const card = page.locator('[data-account-access]')
    await card.locator('[data-change-password-open]').click()
    await card.locator('[data-password-form]').getByLabel('Contraseña actual', { exact: true }).fill(creds.creator.password!)
    await card.getByRole('button', { name: 'Enviar código al correo' }).click()

    const form = card.locator('[data-password-form][data-step=code]')
    await expect(form).toContainText('Paso 2 de 2', { timeout: 20_000 })
    await expect(form.getByRole('status')).toContainText('código de 6 dígitos')
    await expect(form.locator('[data-resend-code]')).toBeDisabled()
    await expect(form.locator('[data-resend-code]')).toContainText(/Reenviar código \(\d+ s\)/)

    // El código solo admite dígitos (admite pegar «12-34»).
    await form.locator('[data-otp]').fill('12ab-34')
    await expect(form.locator('[data-otp]')).toHaveValue('1234')
    await form.locator('[data-otp]').fill('123-456-789') // pegar el código tal y como llega, con guiones: no se pierde ningún dígito
    await expect(form.locator('[data-otp]')).toHaveValue('123456')
    await form.locator('[data-otp]').fill('12-34')
    await form.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(form.getByRole('alert')).toContainText('6 dígitos')

    // Medidor de fortaleza y rechazo de lo evidente.
    await form.locator('[data-otp]').fill('123456')
    await form.locator('[data-new-password]').fill('password123')
    await expect(form.locator('[data-pw-meter]')).toHaveAttribute('data-score', '0')
    await expect(form.locator('[data-pw-meter]')).toContainText('Muy débil')
    await form.getByLabel('Repite la contraseña nueva').fill('password123')
    await form.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(form.getByRole('alert')).toContainText('fácil de adivinar')

    await form.locator('[data-new-password]').fill('Tomate-2027-azul')
    await expect(form.locator('[data-pw-meter]')).toContainText('Excelente')
    await expect(form.locator('[data-sign-out-others]')).toBeChecked()
    await form.getByRole('button', { name: 'Cambiar contraseña' }).click() // la repetición aún no coincide: no llega a cambiar nada
    await expect(form.getByRole('alert')).toContainText('no coinciden')

    await auditar(page, 'cambio de contraseña (paso 2, con medidor)', '[data-account-access]')
    await form.getByRole('button', { name: 'Cancelar' }).click()
    await expect(card.locator('[data-password-form]')).toHaveCount(0)
  })
})

test.describe('Creador · selector de la biblioteca', () => {
  test('se puede subir una imagen desde el propio selector y queda elegida', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/creator/packages')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-add-package]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.locator('[data-pick-library]').click()
    const selector = page.locator('[data-media-picker]')
    await expect(selector).toBeVisible()
    await expect(selector.locator('[data-picker-upload]').first()).toBeVisible()
    try {
      await page.locator('[data-picker-file]').setInputFiles({ name: 'e2e-selector.png', mimeType: 'image/png', buffer: PNG_1PX })
      // Una sola imagen subida: se elige sola y el selector se cierra.
      await expect(selector).toBeHidden({ timeout: 30_000 })
    } finally {
      await page.goto('/creator/library')
      await page.waitForLoadState('networkidle')
      await limpiarBiblioteca(page)
    }
  })
})

test.describe('Creador · calendario suscribible', () => {
  test('el enlace sirve un .ics, se renueva y el anterior deja de valer', async ({ page, request }) => {
    await page.goto('/creator/requests?vista=calendario')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-calendar-subscribe]').click()
    const hoja = page.locator('[data-calendar-sheet]')
    await expect(hoja).toBeVisible()
    const input = hoja.locator('[data-calendar-url]')
    await expect(input).toHaveValue(/\/api\/calendar\/[0-9a-f-]{36}\.ics$/)
    const url1 = await input.inputValue()
    await expect(hoja.locator('[data-calendar-webcal]')).toHaveAttribute('href', /^webcal:/)

    const ok = await request.get(url1)
    expect(ok.status()).toBe(200)
    expect(ok.headers()['content-type']).toContain('text/calendar')
    const cuerpo = await ok.text()
    expect(cuerpo).toContain('BEGIN:VCALENDAR')
    expect(cuerpo).toContain('END:VCALENDAR')
    expect(cuerpo).not.toMatch(/token|password|apikey/i)

    // Renovar: pide confirmación; el enlace nuevo funciona y el anterior da 404.
    await hoja.locator('[data-calendar-rotate]').click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Generar enlace nuevo' }).click()
    await expect(input).not.toHaveValue(url1, { timeout: 15_000 })
    const url2 = await input.inputValue()
    expect((await request.get(url2)).status()).toBe(200)
    expect((await request.get(url1)).status()).toBe(404)
  })

  test('el enlace del calendario no cambia al recargar (mismo token)', async ({ page }) => {
    await page.goto('/creator/requests?vista=calendario')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-calendar-subscribe]').click()
    const a = await page.locator('[data-calendar-url]').inputValue()
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.locator('[data-calendar-subscribe]').click()
    await expect(page.locator('[data-calendar-url]')).toHaveValue(a)
  })
})

test.describe('Creador · textos largos sin espacios', () => {
  test('un paquete con 80 letras seguidas no ensancha ninguna pantalla (ni en móvil)', async ({ page }) => {
    test.setTimeout(120_000)
    const largo = 'W'.repeat(80)
    await page.goto('/creator/packages')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-add-package]').first().click()
    const hoja = page.getByRole('dialog')
    await hoja.getByLabel('Título').fill(largo)
    await hoja.getByLabel('Precio del paquete').fill('123')
    await hoja.locator('[data-save-package]').click()
    const tarjeta = page.locator('.package', { hasText: largo })
    try {
      await expect(tarjeta).toBeVisible({ timeout: 20_000 })
      for (const [ancho, ruta] of [[1280, '/creator/packages'], [1280, '/creator'], [375, '/creator/packages'], [375, '/creator'], [375, '/creator/profile']] as const) {
        await page.setViewportSize({ width: ancho, height: 800 })
        await page.goto(ruta)
        await page.waitForLoadState('networkidle')
        expect(await sinDesborde(page), `${ruta} a ${ancho}px se ensancha con un título de 80 letras seguidas`).toBe(true)
      }
    } finally {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/creator/packages')
      await page.waitForLoadState('networkidle')
      const t = page.locator('.package', { hasText: largo })
      if (await t.count()) {
        await t.getByRole('button', { name: /Borrar|Eliminar/ }).first().click()
        await page.getByRole('alertdialog').or(page.getByRole('dialog')).getByRole('button', { name: 'Borrar', exact: true }).click()
        await expect(t).toHaveCount(0, { timeout: 20_000 })
      }
    }
  })
})
