import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/**
 * Cronología de colaboraciones (migración 20261104130000): los triggers
 * registran cada hecho real de la colaboración, las dos partes la leen y nadie
 * puede escribirla ni borrarla desde el cliente.
 * Crea y borra sus propias filas (marcadas con [test-eventos]).
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('cronología de colaboraciones (Supabase real)', () => {
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
    for (const id of collabIds) {
      await admin.from('posts').delete().eq('collaboration_id', id)
      await admin.from('collaborations').delete().eq('id', id)
    }
  })

  type Ev = { kind: string; actor_profile_id: string | null; post_id: string | null; detail: Record<string, unknown> }
  const eventsOf = async (client: SupabaseClient, id: string) => {
    const { data, error } = await client.from('collaboration_events').select('kind, actor_profile_id, post_id, detail').eq('collaboration_id', id).order('created_at').order('seq')
    if (error) throw error
    return data as Ev[]
  }

  it('registra el recorrido completo, con su autor y sin exponer la nota de la valoración', async () => {
    if (!creator || !partner) return
    const { data, error } = await admin.from('collaborations').insert({
      creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: 'partner',
      brief: `[test-eventos] ${Date.now()}`, budget_cents: 20000, status: 'requested'
    }).select('id').single()
    if (error) throw error
    const id = (data as { id: string }).id
    collabIds.push(id)

    let evs = await eventsOf(admin, id)
    expect(evs.map((e) => e.kind)).toEqual(['requested'])
    expect(evs[0]!.actor_profile_id).toBe(partner.userId)
    expect(evs[0]!.detail.budgetCents).toBe(20000)

    // Contraoferta del creador y aceptación (el creador acepta lo que propuso el partner)
    const accept = await creator.client.rpc('accept_collaboration_request' as never, { p_collaboration_id: id, p_agreed_budget_cents: null } as never)
    expect(accept.error).toBeNull()

    // Entrega: envío, cambios pedidos, reenvío, aprobación
    const post = await creator.client.from('posts').insert({
      creator_id: creatorRowId, collaboration_id: id, title: '[test-eventos] pieza', content_type: 'reel', platform: 'instagram',
      status: 'in_production', due_date: new Date(Date.now() + 5 * 86400000).toISOString()
    } as never).select('id').single()
    expect(post.error).toBeNull()
    const postId = (post.data as { id: string }).id

    expect((await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', postId)).error).toBeNull()
    expect((await partner.client.rpc('request_post_changes' as never, { target_post_id: postId, p_comment: 'Cambia el primer plano' } as never)).error).toBeNull()
    expect((await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', postId)).error).toBeNull()
    expect((await partner.client.rpc('approve_post' as never, { target_post_id: postId, p_comment: 'Perfecto' } as never)).error).toBeNull()

    expect((await partner.client.rpc('mark_collaboration_completed' as never, { p_collaboration_id: id } as never)).error).toBeNull()
    expect((await creator.client.rpc('submit_collaboration_rating' as never, { p_collaboration_id: id, p_stars: 5, p_comment: 'Genial' } as never)).error).toBeNull()

    evs = await eventsOf(partner.client, id)
    expect(evs.map((e) => e.kind)).toEqual([
      'requested', 'accepted', 'deliverable_sent', 'changes_requested', 'deliverable_sent', 'approved', 'completed', 'rated'
    ])
    const byKind = (k: string) => evs.filter((e) => e.kind === k)
    expect(byKind('accepted')[0]!.actor_profile_id).toBe(creator.userId)
    expect(byKind('deliverable_sent')[0]!.detail.resubmission).toBe(false)
    expect(byKind('deliverable_sent')[1]!.detail.resubmission).toBe(true)
    expect(byKind('changes_requested')[0]).toMatchObject({ actor_profile_id: partner.userId, post_id: postId, detail: { comment: 'Cambia el primer plano' } })
    expect(byKind('approved')[0]!.detail.comment).toBe('Perfecto')
    expect(byKind('completed')[0]!.actor_profile_id).toBe(partner.userId)
    expect(JSON.stringify(byKind('rated')[0])).not.toContain('stars')

    // Las dos partes ven lo mismo
    expect((await eventsOf(creator.client, id)).length).toBe(evs.length)
  })

  it('una oferta aceptada en el chat deja un único evento «accepted» con su origen', async () => {
    if (!creator || !partner) return
    const { data, error } = await admin.from('collaborations').insert({
      creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: 'partner',
      brief: `[test-eventos] oferta ${Date.now()}`, budget_cents: 15000, status: 'accepted'
    }).select('id').single()
    if (error) throw error
    const id = (data as { id: string }).id
    collabIds.push(id)
    const evs = await eventsOf(admin, id)
    expect(evs.map((e) => e.kind)).toEqual(['accepted'])
    expect(evs[0]!.actor_profile_id).toBeNull()
  })

  it('el cliente no puede escribir, modificar ni borrar la cronología', async () => {
    if (!creator || !partner) return
    const id = collabIds[0]!
    const ins = await creator.client.from('collaboration_events').insert({ collaboration_id: id, kind: 'note', detail: {} } as never)
    expect(ins.error).not.toBeNull()
    await creator.client.from('collaboration_events').update({ kind: 'declined' } as never).eq('collaboration_id', id)
    await partner.client.from('collaboration_events').delete().eq('collaboration_id', id)
    const evs = await eventsOf(admin, id)
    expect(evs.some((e) => e.kind === 'declined')).toBe(false)
    expect(evs.length).toBeGreaterThanOrEqual(8)
  })
})
