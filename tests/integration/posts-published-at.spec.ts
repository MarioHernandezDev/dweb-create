import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { creatorSession, hasSupabaseEnv } from './supabase-setup'

/**
 * A-R21: supabase/migrations/20261103120000_posts_published_at.sql
 * `published_at` se rellena la primera vez que una publicación pasa a "published".
 *
 * ANTES de aplicar debe FALLAR el test de "rellena"; DESPUÉS, pasar todos.
 * Solo corre con RUN_SOCIAL_ACCOUNTS_RLS=1; filas `[TEST pub-at]` borradas al terminar.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY
const TITLE = '[TEST pub-at] '

describe.skipIf(!enabled)('posts.published_at (Supabase real)', () => {
  let admin: SupabaseClient
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let postId: string

  beforeAll(async () => {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    creator = await creatorSession()
    if (!creator) return
    const { data: c } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data } = await admin.from('posts').insert({
      creator_id: (c as { id: string }).id, title: TITLE + 'a', content_type: 'reel', platform: 'instagram', status: 'idea',
      due_date: new Date(Date.now() + 86_400_000).toISOString()
    } as never).select('id').single()
    postId = (data as { id: string }).id
  })
  afterAll(async () => { await admin?.from('posts').delete().like('title', `${TITLE}%`) })

  const publishedAt = async () => ((await admin.from('posts').select('published_at').eq('id', postId).single()).data as { published_at: string | null }).published_at

  it('sin publicar no hay fecha de publicación', async () => {
    expect(await publishedAt()).toBeNull()
    const r = await creator!.client.from('posts').update({ status: 'in_production' } as never).eq('id', postId)
    expect(r.error).toBeNull()
    expect(await publishedAt()).toBeNull()
  })

  it('RELLENA: al pasar a published se escribe published_at', async () => {
    const r = await creator!.client.from('posts').update({ status: 'published' } as never).eq('id', postId)
    expect(r.error).toBeNull()
    expect(await publishedAt()).not.toBeNull()
  })

  it('editar otra cosa después no cambia la fecha', async () => {
    const before = await publishedAt()
    await creator!.client.from('posts').update({ title: TITLE + 'b' } as never).eq('id', postId)
    expect(await publishedAt()).toBe(before)
  })
})
