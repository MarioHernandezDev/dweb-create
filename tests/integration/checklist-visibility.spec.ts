import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * "Seguimiento del progreso" — el partner ahora puede LEER el checklist de
 * una publicación de su colaboración (ver supabase/migrations/
 * 20261025160000_checklist_partner_visibility.sql), pero sigue sin poder
 * escribirlo (insert/update/delete siguen exigiendo ser el creador dueño).
 * Sobre un post + item de prueba aislados, creados y borrados por el
 * propio test con service_role.
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('checklist_items: visibilidad del partner (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let outsider: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  let collaborationId: string | null
  let postId: string
  let itemId: string

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

    const { data: post, error: postError } = await admin
      .from('posts')
      .insert({
        creator_id: creatorRowId,
        collaboration_id: collaborationId,
        title: '[TEST checklist-visibility] post',
        content_type: 'image',
        platform: 'instagram',
        status: 'in_production',
        due_date: new Date(Date.now() + 86_400_000).toISOString()
      })
      .select('id')
      .single()
    if (postError) throw postError
    postId = (post as { id: string }).id

    const { data: item, error: itemError } = await admin
      .from('checklist_items')
      .insert({ post_id: postId, text: '[TEST] grabar el reel', done: false })
      .select('id')
      .single()
    if (itemError) throw itemError
    itemId = (item as { id: string }).id
  })

  afterAll(async () => {
    if (!admin) return
    if (postId) {
      await admin.from('checklist_items').delete().eq('post_id', postId)
      await admin.from('posts').delete().eq('id', postId)
    }
  })

  it('el post y el item de checklist de prueba quedan creados, ligados a una colaboración real', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
    expect(collaborationId).toBeTruthy()
    expect(postId).toBeTruthy()
    expect(itemId).toBeTruthy()
  })

  it('el partner con la colaboración activa SÍ puede leer el checklist del post', async () => {
    if (!partner) return
    const { data, error } = await partner.client.from('checklist_items').select('id, text, done').eq('post_id', postId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((data as { text: string }[])[0].text).toBe('[TEST] grabar el reel')
  })

  it('el propio creador sigue viendo su checklist (la rama "own" no se rompió)', async () => {
    if (!creator) return
    const { data, error } = await creator.client.from('checklist_items').select('id').eq('post_id', postId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('un perfil ajeno (sin colaboración con este post) no puede leer el checklist', async () => {
    if (!outsider) return
    const { data } = await outsider.client.from('checklist_items').select('id').eq('post_id', postId)
    expect(data).toEqual([])
  })

  it('el partner sigue sin poder escribir: insert/update/delete bloqueados', async () => {
    if (!partner) return
    const insertAttempt = await partner.client.from('checklist_items').insert({ post_id: postId, text: 'INTENTO PARTNER' } as never)
    const updateAttempt = await partner.client.from('checklist_items').update({ done: true } as never).eq('id', itemId)
    const deleteAttempt = await partner.client.from('checklist_items').delete().eq('id', itemId)

    const { data } = await admin.from('checklist_items').select('id, done').eq('id', itemId).single()
    expect((data as { done: boolean }).done).toBe(false)
    const { count } = await admin.from('checklist_items').select('id', { count: 'exact', head: true }).eq('post_id', postId)
    expect(count).toBe(1)

    // No se exige que cada llamada venga con `error` (una policy ausente
    // puede devolver 0 filas afectadas sin marcar error) — lo que de verdad
    // importa, y ya se comprobó arriba, es que nada cambió en la base real.
    void insertAttempt
    void updateAttempt
    void deleteAttempt
  })
})
