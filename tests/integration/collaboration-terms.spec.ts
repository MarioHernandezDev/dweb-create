import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * "Condiciones pactadas" + "brief estructurado" (ver supabase/migrations/
 * 20261025150000_collaboration_terms.sql y 20261025180000_collaboration_
 * brief_fields.sql — misma fila, mismo trigger de inmutabilidad ampliado).
 * Se fijan al crear la colaboración y quedan congeladas por un trigger. Se
 * prueba sobre DOS colaboraciones de prueba aisladas (creadas y borradas
 * por el propio test con service_role): una con las 4 condiciones + los 3
 * campos de brief puestos a valores explícitos (incluido
 * `revisions_included = 0`, para no confundirlo con "sin límite"), y otra
 * sin ninguno de los 7 (caso "colaboración antigua", todo null/false).
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('collaboration_terms (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let outsider: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  let withTermsId: string
  let withoutTermsId: string
  let postId: string

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    outsider = await unrelatedCreatorSession()
    if (!creator || !partner) return

    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

    const { data: creatorRow } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data: partnerRow } = await admin.from('partners').select('id').eq('profile_id', partner.userId).single()
    creatorRowId = (creatorRow as { id: string }).id
    partnerRowId = (partnerRow as { id: string }).id

    const { data: withTerms, error: e1 } = await admin
      .from('collaborations')
      .insert({
        creator_id: creatorRowId,
        partner_id: partnerRowId,
        initiated_by: 'partner',
        brief: '[TEST collaboration-terms] con condiciones ' + Date.now(),
        budget_cents: 10000,
        scope_notes: '1 reel + 2 stories',
        revisions_included: 0,
        exclusivity: true,
        usage_rights: 'Uso en redes propias durante 6 meses',
        campaign_goal: 'Dar a conocer la nueva colección',
        target_audience: 'Mujeres 25-35, moda sostenible',
        tone: 'Cercano y divertido'
      })
      .select('id')
      .single()
    if (e1) throw e1
    withTermsId = (withTerms as { id: string }).id

    const { data: withoutTerms, error: e2 } = await admin
      .from('collaborations')
      .insert({
        creator_id: creatorRowId,
        partner_id: partnerRowId,
        initiated_by: 'partner',
        brief: '[TEST collaboration-terms] sin condiciones ' + Date.now(),
        budget_cents: 10000
      })
      .select('id')
      .single()
    if (e2) throw e2
    withoutTermsId = (withoutTerms as { id: string }).id

    const { data: post } = await admin
      .from('posts')
      .insert({
        creator_id: creatorRowId,
        collaboration_id: withTermsId,
        title: '[TEST collaboration-terms] post',
        content_type: 'image',
        platform: 'instagram',
        status: 'ready_for_review',
        due_date: new Date(Date.now() + 86_400_000).toISOString()
      })
      .select('id')
      .single()
    postId = (post as { id: string }).id
  })

  afterAll(async () => {
    if (!admin) return
    if (postId) {
      await admin.from('post_revision_notes').delete().eq('post_id', postId)
      await admin.from('posts').delete().eq('id', postId)
    }
    for (const id of [withTermsId, withoutTermsId].filter(Boolean)) {
      await admin.from('collaborations').delete().eq('id', id)
    }
  })

  it('las dos colaboraciones de prueba quedan creadas', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
    expect(withTermsId).toBeTruthy()
    expect(withoutTermsId).toBeTruthy()
  })

  it('las dos partes autorizadas leen los valores exactos puestos, incluido revisions_included = 0 (no confundido con null)', async () => {
    if (!creator || !partner) return
    for (const client of [creator.client, partner.client]) {
      const { data } = await client
        .from('collaborations')
        .select('scope_notes, revisions_included, exclusivity, usage_rights, campaign_goal, target_audience, tone')
        .eq('id', withTermsId)
        .single()
      const row = data as {
        scope_notes: string; revisions_included: number; exclusivity: boolean; usage_rights: string
        campaign_goal: string; target_audience: string; tone: string
      }
      expect(row.scope_notes).toBe('1 reel + 2 stories')
      expect(row.revisions_included).toBe(0)
      expect(row.exclusivity).toBe(true)
      expect(row.usage_rights).toBe('Uso en redes propias durante 6 meses')
      expect(row.campaign_goal).toBe('Dar a conocer la nueva colección')
      expect(row.target_audience).toBe('Mujeres 25-35, moda sostenible')
      expect(row.tone).toBe('Cercano y divertido')
    }
  })

  it('una colaboración sin condiciones ni brief (caso "antigua") lee null/false, no un error', async () => {
    if (!creator) return
    const { data, error } = await creator.client
      .from('collaborations')
      .select('scope_notes, revisions_included, exclusivity, usage_rights, campaign_goal, target_audience, tone')
      .eq('id', withoutTermsId)
      .single()
    expect(error).toBeNull()
    const row = data as {
      scope_notes: string | null; revisions_included: number | null; exclusivity: boolean; usage_rights: string | null
      campaign_goal: string | null; target_audience: string | null; tone: string | null
    }
    expect(row.scope_notes).toBeNull()
    expect(row.revisions_included).toBeNull()
    expect(row.exclusivity).toBe(false)
    expect(row.usage_rights).toBeNull()
    expect(row.campaign_goal).toBeNull()
    expect(row.target_audience).toBeNull()
    expect(row.tone).toBeNull()
  })

  it('un perfil ajeno no puede leer ninguna de las dos colaboraciones', async () => {
    if (!outsider) return
    const { data: a } = await outsider.client.from('collaborations').select('id').eq('id', withTermsId)
    const { data: b } = await outsider.client.from('collaborations').select('id').eq('id', withoutTermsId)
    expect(a).toEqual([])
    expect(b).toEqual([])
  })

  it('intento de modificación directa por el partner: no cambia nada en la base de datos', async () => {
    if (!partner) return
    await partner.client.from('collaborations').update({ scope_notes: 'INTENTO MODIFICAR' } as never).eq('id', withTermsId)
    await partner.client.from('collaborations').update({ revisions_included: 99 } as never).eq('id', withTermsId)
    await partner.client.from('collaborations').update({ exclusivity: false } as never).eq('id', withTermsId)
    await partner.client.from('collaborations').update({ usage_rights: 'INTENTO MODIFICAR' } as never).eq('id', withTermsId)
    await partner.client.from('collaborations').update({ campaign_goal: 'INTENTO MODIFICAR' } as never).eq('id', withTermsId)
    await partner.client.from('collaborations').update({ target_audience: 'INTENTO MODIFICAR' } as never).eq('id', withTermsId)
    await partner.client.from('collaborations').update({ tone: 'INTENTO MODIFICAR' } as never).eq('id', withTermsId)

    const { data } = await admin
      .from('collaborations')
      .select('scope_notes, revisions_included, exclusivity, usage_rights, campaign_goal, target_audience, tone')
      .eq('id', withTermsId)
      .single()
    const row = data as {
      scope_notes: string; revisions_included: number; exclusivity: boolean; usage_rights: string
      campaign_goal: string; target_audience: string; tone: string
    }
    expect(row.scope_notes).toBe('1 reel + 2 stories')
    expect(row.revisions_included).toBe(0)
    expect(row.exclusivity).toBe(true)
    expect(row.usage_rights).toBe('Uso en redes propias durante 6 meses')
    expect(row.campaign_goal).toBe('Dar a conocer la nueva colección')
    expect(row.target_audience).toBe('Mujeres 25-35, moda sostenible')
    expect(row.tone).toBe('Cercano y divertido')
  })

  it('intento de modificación directa con service_role (sin RLS de por medio): el trigger lo bloquea igual', async () => {
    const { error } = await admin.from('collaborations').update({ scope_notes: 'INTENTO ADMIN' } as never).eq('id', withTermsId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/no se pueden modificar/i)

    const { data } = await admin.from('collaborations').select('scope_notes').eq('id', withTermsId).single()
    expect((data as { scope_notes: string }).scope_notes).toBe('1 reel + 2 stories')
  })

  it('intento de modificación directa de un campo del brief con service_role: el trigger ampliado también lo bloquea', async () => {
    const { error } = await admin.from('collaborations').update({ tone: 'INTENTO ADMIN' } as never).eq('id', withTermsId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/no se pueden modificar/i)

    const { data } = await admin.from('collaborations').select('tone').eq('id', withTermsId).single()
    expect((data as { tone: string }).tone).toBe('Cercano y divertido')
  })

  it('una actualización legítima de status (vía RPC) sigue funcionando y no toca las condiciones', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('decline_collaboration_request' as never, { p_collaboration_id: withoutTermsId } as never)
    expect(error).toBeNull()

    const { data } = await admin
      .from('collaborations')
      .select('status, scope_notes, revisions_included, exclusivity, usage_rights, campaign_goal, target_audience, tone')
      .eq('id', withoutTermsId)
      .single()
    const row = data as {
      status: string; scope_notes: string | null; revisions_included: number | null; exclusivity: boolean; usage_rights: string | null
      campaign_goal: string | null; target_audience: string | null; tone: string | null
    }
    expect(row.status).toBe('declined')
    expect(row.scope_notes).toBeNull()
    expect(row.revisions_included).toBeNull()
    expect(row.exclusivity).toBe(false)
    expect(row.usage_rights).toBeNull()
    expect(row.campaign_goal).toBeNull()
    expect(row.target_audience).toBeNull()
    expect(row.tone).toBeNull()
  })

  it('el recuento de solicitudes de cambios de la colaboración cuenta notas reales, y 0 en una sin ninguna', async () => {
    if (!partner) return
    await partner.client.rpc('request_post_changes', { target_post_id: postId, p_comment: '[TEST] falta el logo' })

    const { count } = await partner.client
      .from('post_revision_notes')
      .select('id, posts!inner(collaboration_id)', { count: 'exact', head: true })
      .eq('kind', 'changes_requested')
      .eq('posts.collaboration_id', withTermsId)
    expect(count).toBe(1)

    const { count: zeroCount } = await partner.client
      .from('post_revision_notes')
      .select('id, posts!inner(collaboration_id)', { count: 'exact', head: true })
      .eq('kind', 'changes_requested')
      .eq('posts.collaboration_id', withoutTermsId)
    expect(zeroCount).toBe(0)
  })
})
