import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { creds, hasCreator, hasPartner } from './helpers'

/**
 * Negociación vista desde el partner: la solicitud del creador se siembra con la clave de servicio
 * (mismo patrón que tests/integration/chat-fixture.ts) y el partner responde por la interfaz.
 * Todo con el prefijo «[E2E]» y se borra al final. Se salta sin cuentas E2E o sin clave de servicio.
 */
const puedeSembrar = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
test.skip(!(hasPartner && hasCreator && puedeSembrar), 'Faltan cuentas E2E o SUPABASE_SERVICE_ROLE_KEY (ver docs/18-TESTS-E2E.md)')

let admin: SupabaseClient
let creatorId: string
let partnerId: string
const creadas: string[] = []

async function idDe(email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase())
  if (!u) throw new Error(`No existe la cuenta E2E ${email}`)
  return u.id
}

async function sembrar(nombre: string) {
  const { data, error } = await admin.from('collaborations').insert({
    partner_id: partnerId, creator_id: creatorId, status: 'requested', initiated_by: 'creator',
    brief: `${nombre}: solicitud automática de pruebas.`, budget_cents: 10000, campaign_name: nombre
  }).select('id').single()
  if (error) throw error
  creadas.push(data.id)
  return data.id as string
}
const estado = async (id: string) => (await admin.from('collaborations').select('status').eq('id', id).single()).data?.status

test.beforeAll(async () => {
  admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  // `collaborations` apunta a creators.id / partners.id, que NO son el id del usuario: se enlazan por profile_id.
  const fila = async (tabla: 'creators' | 'partners', email: string) => {
    const { data, error } = await admin.from(tabla).select('id').eq('profile_id', await idDe(email)).single()
    if (error) throw new Error(`La cuenta ${email} no tiene fila en ${tabla}: ${error.message}`)
    return data.id as string
  }
  creatorId = await fila('creators', creds.creator.email!)
  partnerId = await fila('partners', creds.partner.email!)
})
test.afterAll(async () => { if (creadas.length) await admin.from('collaborations').delete().in('id', creadas) })

test('el partner puede cancelar el rechazo y luego rechazar la solicitud', async ({ page }) => {
  const id = await sembrar(`[E2E] rechazo ${Date.now()}`)
  await page.goto(`/partner/collaborations/${id}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Pendiente de respuesta').first()).toBeVisible()

  await page.getByRole('button', { name: 'Rechazar solicitud' }).click()
  await expect(page.getByText('No se puede deshacer')).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rechazar solicitud' })).toBeVisible()
  expect(await estado(id)).toBe('requested')

  await page.getByRole('button', { name: 'Rechazar solicitud' }).click()
  await page.getByRole('button', { name: 'Sí, rechazar' }).click()
  await expect(page).toHaveURL(/\/partner\/requests/, { timeout: 20_000 })
  await expect(page.locator('[data-toast]').filter({ hasText: 'Solicitud rechazada' }).first()).toBeVisible()
  expect(await estado(id)).toBe('declined')
})

test('el partner puede aceptar una solicitud y pasa a aceptada', async ({ page }) => {
  const id = await sembrar(`[E2E] aceptar ${Date.now()}`)
  await page.goto(`/partner/collaborations/${id}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^Aceptar · 100/ }).click()
  await expect.poll(() => estado(id), { timeout: 20_000 }).toBe('accepted')
})

test('la solicitud aparece en el buscador (Ctrl+K) del partner', async ({ page }) => {
  const nombre = `[E2E] buscador ${Date.now()}`
  await sembrar(nombre)
  await page.goto('/partner')
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Control+k')
  const paleta = page.locator('[data-command-palette]')
  await paleta.locator('input').fill('[E2E] buscador')
  await expect(paleta.getByText(nombre)).toBeVisible({ timeout: 15_000 })
})
