import type { ContentType, Platform, Post, PostStatus } from '~/types'

interface PostRow {
  id: string
  influencer_id: string
  title: string
  caption: string | null
  content_type: ContentType
  platform: Platform
  status: PostStatus
  due_date: string
  metadata: { hashtags?: string[] } | null
  ml_predictions: { success_score: number; created_at: string }[] | null
}

// El esquema no guarda gradiente de portada (es puro adorno visual): se
// deriva del id del post, así cada tarjeta tiene un color estable entre
// recargas sin necesitar una columna para ello.
function hashHue(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash % 360
}

function coverFromId(id: string) {
  const hue = hashHue(id)
  return { from: `hsl(${hue} 78% 54%)`, to: `hsl(${(hue + 36) % 360} 70% 40%)`, angle: 135 }
}

function latestScore(predictions: PostRow['ml_predictions']): number | undefined {
  if (!predictions?.length) return undefined
  return [...predictions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.success_score
}

function mapRow(row: PostRow): Post {
  const dueInDays = Math.round((new Date(row.due_date).getTime() - Date.now()) / 86_400_000)
  return {
    id: row.id,
    influencerId: row.influencer_id,
    title: row.title,
    caption: row.caption ?? '',
    contentType: row.content_type,
    platform: row.platform,
    status: row.status,
    dueInDays,
    hashtags: row.metadata?.hashtags ?? [],
    cover: coverFromId(row.id),
    successScore: latestScore(row.ml_predictions)
  }
}

export interface NewPostInput {
  title: string
  caption: string
  contentType: ContentType
  platform: Platform
  dueInDays?: number
}

/**
 * Los posts del influencer logueado, leídos de verdad de Supabase (sustituye
 * a `useCreatorPosts`, que vivía solo de `mock-data.ts`). Cacheados en
 * `useState` como el resto de la app; `useLogout`/`login.vue` los vacían al
 * cambiar de cuenta.
 */
export function useMyPosts() {
  const client = useSupabaseClient()
  const { influencer, ensureInfluencer } = useMyInfluencer()

  const posts = useState<Post[]>('my-posts', () => [])
  const loading = useState<boolean>('my-posts-loading', () => false)
  const loaded = useState<boolean>('my-posts-loaded', () => false)

  async function refresh() {
    const me = influencer.value ?? (await ensureInfluencer())
    if (!me) return

    loading.value = true
    const { data, error } = await client
      .from('posts')
      .select('*, ml_predictions(success_score, created_at)')
      .eq('influencer_id', me.id)
      .order('due_date', { ascending: true })
    loading.value = false

    if (error) {
      console.error('[useMyPosts] fallo al cargar posts:', error.message)
      return
    }
    posts.value = (data as PostRow[]).map(mapRow)
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return posts.value
  }

  async function updatePost(id: string, patch: { title?: string; caption?: string; status?: PostStatus; hashtags?: string[] }) {
    const payload: Record<string, unknown> = {}
    if (patch.title !== undefined) payload.title = patch.title
    if (patch.caption !== undefined) payload.caption = patch.caption
    if (patch.status !== undefined) payload.status = patch.status
    if (patch.hashtags !== undefined) payload.metadata = { hashtags: patch.hashtags }

    // Sin tipos generados de la base de datos todavía (como en useMyRole),
    // el cliente no puede inferir las columnas de `posts` por sí solo.
    const { error } = await client.from('posts').update(payload as never).eq('id', id)
    if (error) throw error

    const local = posts.value.find((p) => p.id === id)
    if (local) Object.assign(local, patch)
  }

  async function deletePost(id: string) {
    const { error } = await client.from('posts').delete().eq('id', id)
    if (error) throw error
    posts.value = posts.value.filter((p) => p.id !== id)
  }

  async function createPost(input: NewPostInput) {
    const me = influencer.value ?? (await ensureInfluencer())
    if (!me) throw new Error('No se ha encontrado tu ficha de influencer.')

    const dueDate = new Date(Date.now() + (input.dueInDays ?? 3) * 86_400_000)
    const { data, error } = await client
      .from('posts')
      .insert({
        influencer_id: me.id,
        title: input.title,
        caption: input.caption,
        content_type: input.contentType,
        platform: input.platform,
        status: 'idea',
        due_date: dueDate.toISOString()
      } as never)
      .select('*, ml_predictions(success_score, created_at)')
      .single<PostRow>()
    if (error) throw error

    const mapped = mapRow(data)
    posts.value = [...posts.value, mapped]
    return mapped
  }

  return { posts, loading, loaded, refresh, ensureLoaded, updatePost, deletePost, createPost }
}
