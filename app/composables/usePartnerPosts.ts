import type { ContentType, Platform, Post, PostStatus } from '~/types'

interface PostRow {
  id: string
  creator_id: string
  collaboration_id: string
  title: string
  caption: string | null
  content_type: ContentType
  platform: Platform
  status: PostStatus
  due_date: string
  metadata: { hashtags?: string[] } | null
}

// Mismo truco que en useMyPosts: el esquema no guarda gradiente de portada,
// se deriva del id para que sea estable entre recargas.
function coverFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return { from: `hsl(${hue} 78% 54%)`, to: `hsl(${(hue + 36) % 360} 70% 40%)`, angle: 135 }
}

function mapRow(row: PostRow): Post {
  const dueInDays = Math.round((new Date(row.due_date).getTime() - Date.now()) / 86_400_000)
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    caption: row.caption ?? '',
    contentType: row.content_type,
    platform: row.platform,
    status: row.status,
    dueInDays,
    hashtags: row.metadata?.hashtags ?? [],
    cover: coverFromId(row.id)
  }
}

/**
 * Los posts visibles para el partner logueado: solo los atados a una de sus
 * colaboraciones — la RLS de `posts` ya lo garantiza (`posts_select_scoped`),
 * esto además filtra la consulta por eficiencia. Aprobar/pedir cambios usa
 * las funciones `approve_post`/`request_post_changes` en vez de un UPDATE
 * directo: el partner nunca tiene permiso de escritura sobre `posts`, a
 * propósito (ver supabase/migrations).
 */
export function usePartnerPosts() {
  const client = useSupabaseClient()
  const { collaborations, ensureLoaded: ensureCollaborationsLoaded } = useMyCollaborations()

  const posts = useState<Post[]>('partner-posts', () => [])
  const loaded = useState<boolean>('partner-posts-loaded', () => false)

  async function refresh() {
    const myCollabs = await ensureCollaborationsLoaded()
    const collabIds = myCollabs.map((c) => c.id)
    if (!collabIds.length) {
      posts.value = []
      loaded.value = true
      return
    }

    const { data, error } = await client
      .from('posts')
      .select('*')
      .in('collaboration_id', collabIds)
      .order('due_date', { ascending: true })
    if (error) {
      console.error('[usePartnerPosts] fallo al cargar posts:', error.message)
      return
    }
    posts.value = (data as PostRow[]).map(mapRow)
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return posts.value
  }

  async function approvePost(id: string) {
    const { error } = await client.rpc('approve_post', { target_post_id: id } as never)
    if (error) throw error
    const local = posts.value.find((p) => p.id === id)
    if (local) local.status = 'scheduled'
  }

  async function requestChanges(id: string) {
    const { error } = await client.rpc('request_post_changes', { target_post_id: id } as never)
    if (error) throw error
    const local = posts.value.find((p) => p.id === id)
    if (local) local.status = 'in_production'
  }

  return { posts, loaded, refresh, ensureLoaded, approvePost, requestChanges }
}
