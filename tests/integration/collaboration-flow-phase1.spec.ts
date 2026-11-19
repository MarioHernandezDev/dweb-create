import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/**
 * Flujo de colaboraciones · Fase 1 (migración 20261104100000, ver
 * docs/audit/08_COLLABORATION_FLOW_AUDIT.md):
 *  - C-04: la marca recibe un aviso al enviar y al reenviar una entrega a
 *    revisión, una sola vez por transición, y solo si la colaboración está activa.
 *  - C-05: aceptar una oferta del chat no avisa al creador de una «nueva solicitud».
 *  - C-14: aceptar una solicitud avisa a la otra parte, no siempre al partner.
 *  - C-09: aceptar y rechazar a la vez no se pisan (solo una gana).
 * Crea y borra sus propias filas (marcadas con [test-fase1]).
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('flujo de colaboraciones · fase 1 (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  const collabIds: string[] = []
  const packageIds: string[] = []
  const offerIds: string[] = []

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
    for (const id of offerIds) {
      await admin.from('messages').delete().eq('offer_id', id)
      await admin.from('offers').delete().eq('id', id)
    }
    for (const id of packageIds) await admin.from('packages').delete().eq('id', id)
  })

  // Punto de partida con la hora del SERVIDOR (último aviso guardado), no la del equipo:
  // con un reloj local adelantado (p. ej. Docker tras suspender el equipo) un `since`
  // del cliente dejaba fuera avisos que sí se habían creado.
  async function serverMark() {
    const { data } = await admin.from('notifications').select('created_at').order('created_at', { ascending: false }).limit(1)
    return (data as { created_at: string }[] | null)?.[0]?.created_at ?? '1970-01-01T00:00:00Z'
  }

  async function makeCollab(status: 'requested' | 'accepted', initiatedBy: 'partner' | 'creator' = 'partner') {
    const { data, error } = await admin.from('collaborations').insert({
      creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: initiatedBy,
      brief: `[test-fase1] ${Date.now()}`, budget_cents: 10000, status
    }).select('id').single()
    if (error) throw error
    const id = (data as { id: string }).id
    collabIds.push(id)
    return id
  }
  async function makePost(collaborationId: string | null, status = 'in_production') {
    const { data, error } = await creator!.client.from('posts').insert({
      creator_id: creatorRowId, collaboration_id: collaborationId, title: `[test-fase1] pieza ${Date.now()}`,
      content_type: 'reel', platform: 'instagram', status, due_date: new Date(Date.now() + 5 * 86400000).toISOString()
    } as never).select('id').single()
    if (error) throw error
    return (data as { id: string }).id
  }
  const notificationsFor = async (profileId: string, type: string, since: string) => {
    const { data } = await admin.from('notifications').select('title, body, link').eq('profile_id', profileId).eq('type', type).gt('created_at', since)
    return (data ?? []) as { title: string; body: string; link: string }[]
  }
  const setStatus = (postId: string, status: string) => creator!.client.from('posts').update({ status } as never).eq('id', postId)

  it('las dos cuentas de demo se autentican', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
  })

  it('C-04: enviar a revisión avisa a la marca una vez, con enlace a la colaboración y la publicación', async () => {
    if (!creator || !partner) return
    const collabId = await makeCollab('accepted')
    const postId = await makePost(collabId)
    const since = await serverMark()

    expect((await setStatus(postId, 'ready_for_review')).error).toBeNull()
    // Un segundo update que ya parte de "Para revisar" no es una transición: no vuelve a avisar.
    expect((await creator.client.from('posts').update({ caption: 'retoque' } as never).eq('id', postId)).error).toBeNull()
    expect((await setStatus(postId, 'ready_for_review')).error).toBeNull()

    const sent = await notificationsFor(partner.userId, 'post_review_requested', since)
    expect(sent).toHaveLength(1)
    expect(sent[0].title).toBe('Entrega para revisar')
    expect(sent[0].link).toBe(`/partner/requests?collaboration=${collabId}&post=${postId}`)
  })

  it('C-04: reenviar tras pedir cambios avisa con «Nueva versión para revisar»', async () => {
    if (!creator || !partner) return
    const collabId = await makeCollab('accepted')
    const postId = await makePost(collabId)
    await setStatus(postId, 'ready_for_review')
    const { error: reqErr } = await partner.client.rpc('request_post_changes', { target_post_id: postId, p_comment: '[test-fase1] cambia el texto' })
    expect(reqErr).toBeNull()
    const since = await serverMark()

    expect((await setStatus(postId, 'ready_for_review')).error).toBeNull()

    const resent = await notificationsFor(partner.userId, 'post_review_requested', since)
    expect(resent).toHaveLength(1)
    expect(resent[0].title).toBe('Nueva versión para revisar')
  })

  it('C-04: sin aviso para contenido propio ni para colaboraciones que no están activas', async () => {
    if (!creator || !partner) return
    const since = await serverMark()
    const ownPost = await makePost(null)
    await setStatus(ownPost, 'ready_for_review')
    const pendingCollab = await makeCollab('requested')
    const pendingPost = await makePost(pendingCollab)
    await setStatus(pendingPost, 'ready_for_review')

    expect(await notificationsFor(partner.userId, 'post_review_requested', since)).toHaveLength(0)
    await admin.from('posts').delete().eq('id', ownPost)
  })

  it('C-05: aceptar una oferta del chat no avisa al creador de una «nueva solicitud»', async () => {
    if (!creator || !partner) return
    const { data: pkg, error: pkgErr } = await creator.client.from('packages')
      .insert({ profile_id: creator.userId, title: `[test-fase1] paquete ${Date.now()}`, price_cents: 20000, deliverables: ['1 reel'] } as never)
      .select('id').single()
    expect(pkgErr).toBeNull()
    packageIds.push((pkg as { id: string }).id)
    const { data: offer, error: offerErr } = await partner.client.rpc('create_offer', { p_package_id: (pkg as { id: string }).id, p_proposed_price_cents: 18000, p_message: null })
    expect(offerErr).toBeNull()
    const offerId = (offer as { id: string }).id
    offerIds.push(offerId)
    const since = await serverMark()

    expect((await creator.client.rpc('respond_offer', { p_offer_id: offerId, p_accept: true })).error).toBeNull()

    const { data: collab } = await admin.from('collaborations').select('id').eq('offer_id', offerId).single()
    collabIds.push((collab as { id: string }).id)
    expect(await notificationsFor(creator.userId, 'collaboration_requested', since)).toHaveLength(0)
    // La marca sigue recibiendo los avisos de respond_offer (oferta aceptada + colaboración creada).
    expect(await notificationsFor(partner.userId, 'offer_accepted', since)).toHaveLength(1)
  })

  it('C-14: si el partner acepta una solicitud del creador, el aviso va al creador (con enlace directo)', async () => {
    if (!creator || !partner) return
    const collabId = await makeCollab('requested', 'creator')
    const since = await serverMark()

    expect((await partner.client.rpc('accept_collaboration_request', { p_collaboration_id: collabId, p_agreed_budget_cents: null })).error).toBeNull()

    const toCreator = await notificationsFor(creator.userId, 'collaboration_accepted', since)
    expect(toCreator).toHaveLength(1)
    expect(toCreator[0].link).toBe(`/creator/requests?collaboration=${collabId}`)
    expect(await notificationsFor(partner.userId, 'collaboration_accepted', since)).toHaveLength(0)
  })

  it('C-09: aceptar y rechazar a la vez — solo una acción gana y el estado final es el suyo', async () => {
    if (!creator || !partner) return
    const collabId = await makeCollab('requested')
    const [acc, dec] = await Promise.all([
      creator.client.rpc('accept_collaboration_request', { p_collaboration_id: collabId, p_agreed_budget_cents: null }),
      partner.client.rpc('decline_collaboration_request', { p_collaboration_id: collabId })
    ])
    const winners = [acc, dec].filter((r) => !r.error)
    expect(winners).toHaveLength(1)
    const loser = [acc, dec].find((r) => r.error)
    expect(loser?.error?.message).toMatch(/ya no está pendiente/i)

    const { data } = await admin.from('collaborations').select('status').eq('id', collabId).single()
    expect((data as { status: string }).status).toBe(acc.error ? 'declined' : 'accepted')
  })

  it('C-09: completar dos veces — la segunda falla sin tocar nada', async () => {
    if (!creator || !partner) return
    const collabId = await makeCollab('accepted')
    expect((await creator.client.rpc('mark_collaboration_completed', { p_collaboration_id: collabId })).error).toBeNull()
    const again = await partner.client.rpc('mark_collaboration_completed', { p_collaboration_id: collabId })
    expect(again.error?.message).toMatch(/aceptada o en curso/i)
  })
})
