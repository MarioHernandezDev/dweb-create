import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'
import { isActiveCollaborationStatus, isUnresolvedCollaborationStatus } from '../../app/utils/status'

/**
 * Hallazgo #1/N1 de la auditoría de usabilidad: el Hoy del creador y el
 * Inicio del partner podían mostrar cifras incoherentes de "colaboraciones
 * activas"/"solicitudes pendientes" porque cada página reimplementaba su
 * propio filtro inline, sin nada que garantizara que decían lo mismo.
 * `useCollabRequests` (creador) y `useMyCollaborations` (partner) llaman
 * ahora a las mismas dos funciones de `utils/status.ts` — esta prueba
 * compara, sobre el MISMO conjunto de colaboraciones reales de demo, que
 * la cuenta de cada lado coincide con la definición compartida.
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('contadores de colaboraciones: creador y partner coinciden (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  const testIds: string[] = []

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    if (!creator || !partner) return

    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

    const { data: creatorRow } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data: partnerRow } = await admin.from('partners').select('id').eq('profile_id', partner.userId).single()
    creatorRowId = (creatorRow as { id: string }).id
    partnerRowId = (partnerRow as { id: string }).id

    // Un escenario fijo y conocido: una de cada estado, con las dos
    // direcciones de "quién propuso" representadas entre las "requested".
    const fixtures = [
      { status: 'requested', initiated_by: 'creator' as const },
      { status: 'requested', initiated_by: 'partner' as const },
      { status: 'accepted', initiated_by: 'creator' as const },
      { status: 'in_progress', initiated_by: 'partner' as const },
      { status: 'completed', initiated_by: 'creator' as const },
      { status: 'declined', initiated_by: 'partner' as const }
    ]
    for (const f of fixtures) {
      const { data, error } = await admin
        .from('collaborations')
        .insert({
          creator_id: creatorRowId,
          partner_id: partnerRowId,
          initiated_by: f.initiated_by,
          status: f.status,
          brief: `[TEST collaboration-counters] ${f.status}/${f.initiated_by} ${Date.now()}`,
          budget_cents: 10000
        } as never)
        .select('id')
        .single()
      if (error) throw error
      testIds.push((data as { id: string }).id)
    }
  })

  afterAll(async () => {
    if (!admin) return
    for (const id of testIds) await admin.from('collaborations').delete().eq('id', id)
  })

  it('el creador y el partner ven el mismo número de "activas" sobre el mismo escenario', async () => {
    if (!creator || !partner) return

    const { data: creatorRows } = await creator.client
      .from('collaborations')
      .select('status')
      .in('id', testIds)
    const { data: partnerRows } = await partner.client
      .from('collaborations')
      .select('status')
      .in('id', testIds)

    expect(creatorRows).toHaveLength(testIds.length)
    expect(partnerRows).toHaveLength(testIds.length)

    const creatorActive = (creatorRows as { status: string }[]).filter((r) => isActiveCollaborationStatus(r.status as never)).length
    const partnerActive = (partnerRows as { status: string }[]).filter((r) => isActiveCollaborationStatus(r.status as never)).length

    // Del escenario fijo: 'accepted' + 'in_progress' = 2 activas, sin contar
    // las 'requested', 'completed' ni 'declined'.
    expect(creatorActive).toBe(2)
    expect(partnerActive).toBe(2)
  })

  it('"pendientes" (todas las sin resolver) coincide en los dos lados, pero "por responder" (dirección) es distinto a propósito', async () => {
    if (!creator || !partner) return

    const { data: rows } = await admin.from('collaborations').select('status, initiated_by').in('id', testIds)
    const typed = rows as { status: string; initiated_by: 'creator' | 'partner' }[]

    const pendingTotal = typed.filter((r) => isUnresolvedCollaborationStatus(r.status as never)).length
    expect(pendingTotal).toBe(2) // las dos 'requested' del escenario

    // "Por responder" del PARTNER: de las 'requested', solo la que propuso el
    // creador (la otra, que propuso el propio partner, espera al creador).
    const awaitingPartnerResponse = typed.filter((r) => isUnresolvedCollaborationStatus(r.status as never) && r.initiated_by === 'creator').length
    // "Por responder" del CREADOR (simétrico, aunque hoy no se muestra en Hoy):
    // de las 'requested', solo la que propuso el partner.
    const awaitingCreatorResponse = typed.filter((r) => isUnresolvedCollaborationStatus(r.status as never) && r.initiated_by === 'partner').length

    expect(awaitingPartnerResponse).toBe(1)
    expect(awaitingCreatorResponse).toBe(1)
    // Las dos cuentas direccionales suman exactamente el total sin resolver
    // — confirma que no hay solapamiento ni hueco entre las dos definiciones.
    expect(awaitingPartnerResponse + awaitingCreatorResponse).toBe(pendingTotal)
  })
})
