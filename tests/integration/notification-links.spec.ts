import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/**
 * Verifica los enlaces de notificación corregidos en 20261025190000_fix_
 * notification_links.sql — `notify_collaboration_updated()` (completar) y
 * `submit_collaboration_rating()` (valorar, que además tenía los enlaces
 * CRUZADOS entre roles). `respond_offer()` se verifica en offers.spec.ts,
 * reutilizando su propio ciclo completo.
 *
 * Sobre colaboraciones de prueba aisladas, nunca sobre las cuentas de demo
 * compartidas: `collaboration_ratings` no tiene policy de delete (una fila
 * real ahí sería irreversible), así que cada valoración de este archivo
 * vive en su propia colaboración desechable, borrada por completo al
 * terminar (colaboración + su fila de valoración).
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('enlaces de notificación (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  let creatorProfileId: string
  let partnerProfileId: string
  const collabIds: string[] = []

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    if (!creator || !partner) return

    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

    const { data: creatorRow } = await admin.from('creators').select('id, profile_id').eq('profile_id', creator.userId).single()
    const { data: partnerRow } = await admin.from('partners').select('id, profile_id').eq('profile_id', partner.userId).single()
    creatorRowId = (creatorRow as { id: string }).id
    creatorProfileId = (creatorRow as { profile_id: string }).profile_id
    partnerRowId = (partnerRow as { id: string }).id
    partnerProfileId = (partnerRow as { profile_id: string }).profile_id
  })

  afterAll(async () => {
    if (!admin) return
    for (const id of collabIds) {
      await admin.from('collaboration_ratings').delete().eq('collaboration_id', id)
      await admin.from('collaborations').delete().eq('id', id)
    }
  })

  // Punto de partida con la hora del SERVIDOR (último aviso guardado), no la del equipo:
  // con un reloj local adelantado (p. ej. Docker tras suspender el equipo) un `since`
  // del cliente dejaba fuera avisos que sí se habían creado.
  async function serverMark() {
    const { data } = await admin.from('notifications').select('created_at').order('created_at', { ascending: false }).limit(1)
    return (data as { created_at: string }[] | null)?.[0]?.created_at ?? '1970-01-01T00:00:00Z'
  }

  async function makeCollab(status: 'accepted' | 'completed') {
    const { data, error } = await admin
      .from('collaborations')
      .insert({
        creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: 'partner',
        brief: '[TEST notification-links] ' + Date.now(), budget_cents: 10000, status
      })
      .select('id')
      .single()
    if (error) throw error
    const id = (data as { id: string }).id
    collabIds.push(id)
    return id
  }

  it('las dos cuentas de demo se autentican correctamente', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
  })

  it('mark_collaboration_completed por el CREADOR notifica al partner con link a la colaboración', async () => {
    if (!creator) return
    const id = await makeCollab('accepted')
    const since = await serverMark()

    const { error } = await creator.client.rpc('mark_collaboration_completed', { p_collaboration_id: id })
    expect(error).toBeNull()

    const { data } = await admin
      .from('notifications')
      .select('link')
      .eq('profile_id', partnerProfileId)
      .eq('type', 'collaboration_completed')
      .gt('created_at', since)
    expect(data).toHaveLength(1)
    expect((data as { link: string }[])[0].link).toBe(`/partner/requests?collaboration=${id}`)
  })

  it('mark_collaboration_completed por el PARTNER notifica al creador con link a la colaboración', async () => {
    if (!partner) return
    const id = await makeCollab('accepted')
    const since = await serverMark()

    const { error } = await partner.client.rpc('mark_collaboration_completed', { p_collaboration_id: id })
    expect(error).toBeNull()

    const { data } = await admin
      .from('notifications')
      .select('link')
      .eq('profile_id', creatorProfileId)
      .eq('type', 'collaboration_completed')
      .gt('created_at', since)
    expect(data).toHaveLength(1)
    expect((data as { link: string }[])[0].link).toBe(`/creator/requests?collaboration=${id}`)
  })

  it('submit_collaboration_rating por el CREADOR notifica al partner con link /partner/requests (antes cruzado a /partner/profile)', async () => {
    if (!creator) return
    const id = await makeCollab('completed')
    const since = await serverMark()

    const { error } = await creator.client.rpc('submit_collaboration_rating', { p_collaboration_id: id, p_stars: 5 })
    expect(error).toBeNull()

    const { data } = await admin
      .from('notifications')
      .select('link')
      .eq('profile_id', partnerProfileId)
      .eq('type', 'rating_received')
      .gt('created_at', since)
    expect(data).toHaveLength(1)
    expect((data as { link: string }[])[0].link).toBe('/partner/requests')
  })

  it('submit_collaboration_rating por el PARTNER notifica al creador con link /creator/requests (antes cruzado)', async () => {
    if (!partner) return
    const id = await makeCollab('completed')
    const since = await serverMark()

    const { error } = await partner.client.rpc('submit_collaboration_rating', { p_collaboration_id: id, p_stars: 4 })
    expect(error).toBeNull()

    const { data } = await admin
      .from('notifications')
      .select('link')
      .eq('profile_id', creatorProfileId)
      .eq('type', 'rating_received')
      .gt('created_at', since)
    expect(data).toHaveLength(1)
    expect((data as { link: string }[])[0].link).toBe('/creator/requests')
  })
})
