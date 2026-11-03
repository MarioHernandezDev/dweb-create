import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { creatorSession, hasSupabaseEnv, unrelatedCreatorSession } from './supabase-setup'
import { createChatFixture } from './chat-fixture'

/**
 * A-R20i: supabase/migrations/20261103110000_offers_keep_on_package_delete.sql
 * Al borrar un paquete se conservan las ofertas aceptadas y rechazadas (con el
 * título del paquete) y solo se eliminan las pendientes.
 *
 * ANTES de aplicar deben FALLAR los tests de conservación (el borrado era en
 * cascada); DESPUÉS, pasar todos. Solo corre con RUN_SOCIAL_ACCOUNTS_RLS=1.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY

describe.skipIf(!enabled)('ofertas: conservar al borrar un paquete (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let other: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let fx: Awaited<ReturnType<typeof createChatFixture>> = null
  const ids: Record<string, string> = {}

  beforeAll(async () => {
    creator = await creatorSession()
    other = await unrelatedCreatorSession()
    if (!creator || !other) return
    fx = await createChatFixture('offers-pkg', creator.userId, other.userId)
    if (!fx) return
    const mk = (status: string) => ({
      package_id: fx!.packageId, conversation_id: fx!.conversationId, from_profile_id: creator!.userId, to_profile_id: other!.userId,
      proposed_price_cents: 10000, status, package_title: '[TEST offers-pkg] Paquete'
    })
    for (const status of ['accepted', 'declined', 'pending']) {
      const { data, error } = await fx.admin.from('offers').insert(mk(status) as never).select('id').single()
      // Antes de la migración falla aquí: la columna `package_title` todavía no existe.
      if (error) throw new Error(`no se pudo crear la oferta de prueba (${status}): ${error.message}`)
      ids[status] = (data as { id: string }).id
    }
  })
  afterAll(async () => { await fx?.cleanup() })

  it('precondiciones', () => {
    expect(creator).not.toBeNull()
    expect(fx).not.toBeNull()
    expect(Object.keys(ids)).toHaveLength(3)
  })

  it('create_offer guarda el título del paquete en la oferta', async () => {
    const r = await creator!.client.rpc('create_offer', { p_package_id: fx!.packageId, p_proposed_price_cents: 10000 } as never)
    expect(r.error).toBeNull()
    const { data } = await fx!.admin.from('offers').select('package_title').eq('id', (r.data as { id: string }).id).single()
    expect((data as { package_title: string | null }).package_title).toBe('[TEST offers-pkg] Paquete')
  })

  it('CONSERVACIÓN: borrar el paquete deja las ofertas aceptada y rechazada, sin paquete y con su título', async () => {
    const del = await fx!.admin.from('packages').delete().eq('id', fx!.packageId)
    expect(del.error).toBeNull()
    for (const status of ['accepted', 'declined'] as const) {
      const { data } = await fx!.admin.from('offers').select('package_id, package_title, status').eq('id', ids[status]).maybeSingle()
      expect(data).not.toBeNull()
      expect((data as { package_id: string | null }).package_id).toBeNull()
      expect((data as { package_title: string | null }).package_title).toBe('[TEST offers-pkg] Paquete')
    }
  })

  it('las ofertas pendientes de ese paquete sí se eliminan', async () => {
    const { data } = await fx!.admin.from('offers').select('id').eq('id', ids.pending).maybeSingle()
    expect(data).toBeNull()
  })

  it('la conversación y sus mensajes siguen existiendo', async () => {
    const { data } = await fx!.admin.from('conversations').select('id').eq('id', fx!.conversationId).maybeSingle()
    expect(data).not.toBeNull()
  })
})
