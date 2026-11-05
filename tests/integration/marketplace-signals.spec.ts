import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'
import { PROPOSAL_VALID_DAYS } from '../../app/utils/collab-expiry'

/**
 * Migración 20261105130000 (señales del marketplace): caducidad de propuestas,
 * tipos de colaboración editables por la marca y verificación que NO puede
 * ponerse la propia marca. Crea y borra sus filas ([test-señales]).
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('señales del marketplace (Supabase)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  const collabIds: string[] = []

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    if (!creator || !partner) return
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data: c } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data: p } = await admin.from('partners').select('id').eq('profile_id', partner.userId).single()
    creatorRowId = (c as { id: string }).id
    partnerRowId = (p as { id: string }).id
  })

  afterAll(async () => {
    if (!admin) return
    for (const id of collabIds) await admin.from('collaborations').delete().eq('id', id)
    if (partnerRowId) await admin.from('partners').update({ collaboration_types: [], verified_at: null }).eq('id', partnerRowId)
  })

  async function createRequest() {
    // Como lo hace la app: el creador inserta con su sesión (sin expires_at: lo pone el trigger).
    const { data, error } = await creator!.client.from('collaborations').insert({
      creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: 'creator', brief: `[test-señales] ${Date.now()}`, budget_cents: 30000
    } as never).select('id').single()
    if (error) throw error
    const id = (data as { id: string }).id
    collabIds.push(id)
    return id
  }

  it('una solicitud nueva caduca a los 7 días y el creador no puede fijar la fecha', async () => {
    if (!creator || !partner) return
    const id = await createRequest()
    const { data } = await admin.from('collaborations').select('expires_at, created_at').eq('id', id).single()
    const row = data as { expires_at: string; created_at: string }
    const days = (Date.parse(row.expires_at) - Date.parse(row.created_at)) / 86_400_000
    expect(Math.round(days)).toBe(PROPOSAL_VALID_DAYS)

    // Intentar colar su propia fecha en el alta: la columna no está concedida.
    const { error } = await creator.client.from('collaborations').insert({
      creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: 'creator', brief: '[test-señales] fecha', expires_at: '2099-01-01T00:00:00Z'
    } as never)
    expect(error).not.toBeNull()
  })

  it('no se puede aceptar una solicitud caducada, y una vigente sí', async () => {
    if (!creator || !partner) return
    const expired = await createRequest()
    await admin.from('collaborations').update({ expires_at: new Date(Date.now() - 3_600_000).toISOString() }).eq('id', expired)
    const rejected = await partner.client.rpc('accept_collaboration_request' as never, { p_collaboration_id: expired } as never)
    expect(rejected.error?.message).toMatch(/caducado/i)
    const { data: still } = await admin.from('collaborations').select('status').eq('id', expired).single()
    expect((still as { status: string }).status).toBe('requested')

    const valid = await createRequest()
    const accepted = await partner.client.rpc('accept_collaboration_request' as never, { p_collaboration_id: valid } as never)
    expect(accepted.error).toBeNull()
  })

  it('una solicitud sin fecha (anterior a la migración) nunca caduca', async () => {
    if (!creator || !partner) return
    const old = await createRequest()
    await admin.from('collaborations').update({ expires_at: null }).eq('id', old)
    const res = await partner.client.rpc('accept_collaboration_request' as never, { p_collaboration_id: old } as never)
    expect(res.error).toBeNull()
  })

  it('la marca edita sus tipos de colaboración (solo valores válidos) pero no se verifica sola', async () => {
    if (!creator || !partner) return
    const ok = await partner.client.from('partners').update({ collaboration_types: ['reel', 'stories'] } as never).eq('id', partnerRowId)
    expect(ok.error).toBeNull()
    const bad = await partner.client.from('partners').update({ collaboration_types: ['spam'] } as never).eq('id', partnerRowId)
    expect(bad.error).not.toBeNull()

    const self = await partner.client.from('partners').update({ verified_at: new Date().toISOString() } as never).eq('id', partnerRowId)
    expect(self.error).not.toBeNull()
    const { data } = await admin.from('partners').select('verified_at, collaboration_types').eq('id', partnerRowId).single()
    expect((data as { verified_at: string | null }).verified_at).toBeNull()
    expect((data as { collaboration_types: string[] }).collaboration_types).toEqual(['reel', 'stories'])
  })
})
