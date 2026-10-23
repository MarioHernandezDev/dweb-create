import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * post_revision_notes + approve_post/request_post_changes (ver
 * supabase/migrations/20261025140000_post_revision_notes.sql) — a
 * diferencia de collaboration_ratings, aquí SÍ se prueba el camino feliz
 * completo (incluida una carrera real de dos peticiones a la vez) porque
 * se hace sobre publicaciones de prueba AISLADAS, creadas y borradas por
 * el propio test (con service_role) — nunca sobre un post de demo ya
 * existente, así no hace falta guardar/restaurar nada ajeno.
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('post_revision_notes (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let outsider: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  let collaborationId: string | null
  let postId: string
  let concurrencyPostId: string

  async function makeTestPost(title: string) {
    const { data, error } = await admin
      .from('posts')
      .insert({
        creator_id: creatorRowId,
        collaboration_id: collaborationId,
        title,
        content_type: 'image',
        platform: 'instagram',
        status: 'ready_for_review',
        due_date: new Date(Date.now() + 86_400_000).toISOString()
      })
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: string }).id
  }

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

    const { data: collab } = await admin
      .from('collaborations')
      .select('id')
      .eq('creator_id', creatorRowId)
      .eq('partner_id', partnerRowId)
      .limit(1)
      .maybeSingle()
    collaborationId = (collab as { id: string } | null)?.id ?? null

    postId = await makeTestPost('[TEST post-revisions] ' + Date.now())
    concurrencyPostId = await makeTestPost('[TEST post-revisions concurrency] ' + Date.now())
  })

  afterAll(async () => {
    if (!admin) return
    for (const id of [postId, concurrencyPostId].filter(Boolean)) {
      await admin.from('post_revision_notes').delete().eq('post_id', id)
      await admin.from('posts').delete().eq('id', id)
    }
  })

  it('las tres cuentas se autentican y los posts de prueba quedan creados', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
    expect(outsider).not.toBeNull()
    expect(postId).toBeTruthy()
    expect(concurrencyPostId).toBeTruthy()
  })

  it('el propio creador no puede aprobar ni devolver su publicación (no es la parte partner)', async () => {
    if (!creator) return
    const { error } = await creator.client.rpc('request_post_changes', { target_post_id: postId, p_comment: 'intento ajeno' })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/no tienes una colaboración/i)
  })

  it('un comentario vacío en "pedir cambios" se rechaza', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('request_post_changes', { target_post_id: postId, p_comment: '   ' })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/obligatorio/i)
  })

  it('camino feliz: el partner pide cambios con un comentario real', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('request_post_changes', { target_post_id: postId, p_comment: 'Falta el logo de la marca en la miniatura.' })
    expect(error).toBeNull()

    const { data: post } = await admin.from('posts').select('status').eq('id', postId).single()
    expect((post as { status: string }).status).toBe('in_production')

    const { data: notes } = await admin.from('post_revision_notes').select('kind, comment, author_profile_id').eq('post_id', postId)
    expect(notes).toHaveLength(1)
    expect((notes as { kind: string }[])[0].kind).toBe('changes_requested')
    expect((notes as { author_profile_id: string }[])[0].author_profile_id).toBe(partner.userId)
  })

  it('no se puede pedir cambios dos veces sobre la misma publicación ya devuelta', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('request_post_changes', { target_post_id: postId, p_comment: 'segundo intento' })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/ya no está pendiente/i)
  })

  it('un perfil ajeno no ve el historial; las dos partes implicadas sí', async () => {
    if (!outsider || !creator || !partner) return
    const { data: outsiderView } = await outsider.client.from('post_revision_notes').select('id').eq('post_id', postId)
    expect(outsiderView).toEqual([])

    const { data: creatorView } = await creator.client.from('post_revision_notes').select('id').eq('post_id', postId)
    expect(creatorView?.length).toBe(1)

    const { data: partnerView } = await partner.client.from('post_revision_notes').select('id').eq('post_id', postId)
    expect(partnerView?.length).toBe(1)
  })

  it('un insert directo sobre post_revision_notes está bloqueado (sin policy de insert)', async () => {
    if (!partner) return
    const { error } = await partner.client.from('post_revision_notes').insert({
      post_id: postId, author_profile_id: partner.userId, kind: 'approved', comment: 'me lo invento'
    } as never)
    expect(error).not.toBeNull()
  })

  it('concurrencia real: dos acciones a la vez sobre el mismo post, solo una gana', async () => {
    if (!partner) return
    const [a, b] = await Promise.all([
      partner.client.rpc('approve_post', { target_post_id: concurrencyPostId, p_comment: 'aprobado ganador?' }),
      partner.client.rpc('request_post_changes', { target_post_id: concurrencyPostId, p_comment: 'cambios ganador?' })
    ])

    const results = [a, b]
    const succeeded = results.filter((r) => !r.error)
    const failed = results.filter((r) => r.error)
    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(1)
    expect(failed[0].error?.message).toMatch(/ya no está pendiente/i)

    const { data: post } = await admin.from('posts').select('status').eq('id', concurrencyPostId).single()
    const { data: notes } = await admin.from('post_revision_notes').select('kind').eq('post_id', concurrencyPostId)

    // El ganador fue "approve" o "request changes" — el estado y el número
    // de notas tienen que ser coherentes entre sí en cualquiera de los dos casos,
    // nunca un estado intermedio ni dos notas por una sola acción exitosa.
    expect(notes).toHaveLength(1)
    const status = (post as { status: string }).status
    const kind = (notes as { kind: string }[])[0].kind
    if (kind === 'approved') expect(status).toBe('scheduled')
    else expect(status).toBe('in_production')
  })
})
