import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * Registro compartido de incidencias y cambios acordados (ver
 * supabase/migrations/20261025170000_collaboration_log.sql) — distinto de
 * `reports` (confidencial al admin, no se toca aquí). Sobre una
 * colaboración de prueba aislada, creada y borrada por el propio test con
 * service_role.
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('collaboration_log_entries (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let outsider: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  let creatorProfileId: string
  let partnerProfileId: string
  let collaborationId: string
  let firstEntryId: string

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    outsider = await unrelatedCreatorSession()
    if (!creator || !partner) return

    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

    const { data: creatorRow } = await admin.from('creators').select('id, profile_id').eq('profile_id', creator.userId).single()
    const { data: partnerRow } = await admin.from('partners').select('id, profile_id').eq('profile_id', partner.userId).single()
    creatorRowId = (creatorRow as { id: string }).id
    creatorProfileId = (creatorRow as { profile_id: string }).profile_id
    partnerRowId = (partnerRow as { id: string }).id
    partnerProfileId = (partnerRow as { profile_id: string }).profile_id

    const { data: collab, error } = await admin
      .from('collaborations')
      .insert({
        creator_id: creatorRowId,
        partner_id: partnerRowId,
        initiated_by: 'partner',
        brief: '[TEST collaboration-log] ' + Date.now(),
        budget_cents: 10000
      })
      .select('id')
      .single()
    if (error) throw error
    collaborationId = (collab as { id: string }).id
  })

  afterAll(async () => {
    if (!admin || !collaborationId) return
    await admin.from('collaboration_log_entries').delete().eq('collaboration_id', collaborationId)
    await admin.from('notifications').delete().ilike('body', '[TEST collaboration-log]%')
    await admin.from('collaborations').delete().eq('id', collaborationId)
  })

  it('la colaboración de prueba queda creada', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
    expect(collaborationId).toBeTruthy()
  })

  it('un detalle vacío o solo espacios se rechaza, y no queda ninguna fila', async () => {
    if (!partner) return
    const { error } = await partner.client.from('collaboration_log_entries').insert({
      collaboration_id: collaborationId, author_profile_id: partnerProfileId, kind: 'incident', detail: '   '
    } as never)
    expect(error).not.toBeNull()
    const { data } = await admin.from('collaboration_log_entries').select('id').eq('collaboration_id', collaborationId)
    expect(data).toEqual([])
  })

  it('un detalle de más de 1000 caracteres se rechaza', async () => {
    if (!partner) return
    const { error } = await partner.client.from('collaboration_log_entries').insert({
      collaboration_id: collaborationId, author_profile_id: partnerProfileId, kind: 'incident', detail: 'x'.repeat(1001)
    } as never)
    expect(error).not.toBeNull()
  })

  it('nadie puede suplantar author_profile_id', async () => {
    if (!partner) return
    const { error } = await partner.client.from('collaboration_log_entries').insert({
      collaboration_id: collaborationId, author_profile_id: creatorProfileId, kind: 'incident', detail: '[TEST collaboration-log] suplantación'
    } as never)
    expect(error).not.toBeNull()
  })

  it('un perfil ajeno no puede leer ni insertar en esta colaboración', async () => {
    if (!outsider) return
    const { data } = await outsider.client.from('collaboration_log_entries').select('id').eq('collaboration_id', collaborationId)
    expect(data).toEqual([])

    const { error } = await outsider.client.from('collaboration_log_entries').insert({
      collaboration_id: collaborationId, author_profile_id: outsider.userId, kind: 'incident', detail: '[TEST collaboration-log] ajeno'
    } as never)
    expect(error).not.toBeNull()
  })

  it('camino feliz: el creador registra una incidencia; solo el partner es notificado, no el propio creador', async () => {
    if (!creator || !partner) return
    const beforeInsert = new Date().toISOString()

    const { data: entry, error } = await creator.client.from('collaboration_log_entries').insert({
      collaboration_id: collaborationId, author_profile_id: creatorProfileId, kind: 'incident',
      detail: '[TEST collaboration-log] retraso de dos días'
    } as never).select('id').single()
    expect(error).toBeNull()
    firstEntryId = (entry as { id: string }).id

    const { data: partnerNotifs } = await admin
      .from('notifications')
      .select('id, type, link')
      .eq('profile_id', partnerProfileId)
      .eq('type', 'collaboration_incident_logged')
      .gte('created_at', beforeInsert)
    expect(partnerNotifs).toHaveLength(1)
    expect((partnerNotifs as { link: string }[])[0].link).toBe('/partner/requests')

    const { data: creatorNotifs } = await admin
      .from('notifications')
      .select('id')
      .eq('profile_id', creatorProfileId)
      .eq('type', 'collaboration_incident_logged')
      .gte('created_at', beforeInsert)
    expect(creatorNotifs).toEqual([])
  })

  it('camino feliz en la otra dirección: el partner registra un cambio acordado; solo el creador es notificado', async () => {
    if (!creator || !partner) return
    const beforeInsert = new Date().toISOString()

    const { error } = await partner.client.from('collaboration_log_entries').insert({
      collaboration_id: collaborationId, author_profile_id: partnerProfileId, kind: 'agreed_change',
      detail: '[TEST collaboration-log] movemos la fecha dos días'
    } as never)
    expect(error).toBeNull()

    const { data: creatorNotifs } = await admin
      .from('notifications')
      .select('id, type, link')
      .eq('profile_id', creatorProfileId)
      .eq('type', 'collaboration_change_logged')
      .gte('created_at', beforeInsert)
    expect(creatorNotifs).toHaveLength(1)
    expect((creatorNotifs as { link: string }[])[0].link).toBe('/creator/requests')

    const { data: partnerNotifs } = await admin
      .from('notifications')
      .select('id')
      .eq('profile_id', partnerProfileId)
      .eq('type', 'collaboration_change_logged')
      .gte('created_at', beforeInsert)
    expect(partnerNotifs).toEqual([])
  })

  it('las dos partes leen las dos entradas, en el mismo orden en dos lecturas distintas', async () => {
    if (!creator || !partner) return
    const read1 = await creator.client.from('collaboration_log_entries').select('id').eq('collaboration_id', collaborationId).order('created_at').order('seq')
    const read2 = await partner.client.from('collaboration_log_entries').select('id').eq('collaboration_id', collaborationId).order('created_at').order('seq')
    expect(read1.data).toHaveLength(2)
    expect((read1.data as { id: string }[]).map((r) => r.id)).toEqual((read2.data as { id: string }[]).map((r) => r.id))
  })

  it('inmutabilidad real: update y delete desde el cliente autenticado no tienen ningún efecto', async () => {
    if (!creator || !partner) return
    await creator.client.from('collaboration_log_entries').update({ detail: 'INTENTO MODIFICAR' } as never).eq('id', firstEntryId)
    await partner.client.from('collaboration_log_entries').delete().eq('id', firstEntryId)

    const { data } = await admin.from('collaboration_log_entries').select('detail').eq('id', firstEntryId).single()
    expect((data as { detail: string } | null)?.detail).toBe('[TEST collaboration-log] retraso de dos días')
  })
})
