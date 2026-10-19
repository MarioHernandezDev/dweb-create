import type { ContentType, Influencer, Platform, Post, PostStatus } from '~/types'
import { initialsFromName, hueFromString } from '~/utils/avatar'

interface InfluencerRow {
  id: string
  display_name: string
  niche: string | null
}

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

// Mismo truco que en useMyPosts: el esquema no guarda gradiente de portada,
// se deriva del id para que sea estable entre recargas.
function coverFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return { from: `hsl(${hue} 78% 54%)`, to: `hsl(${(hue + 36) % 360} 70% 40%)`, angle: 135 }
}

function latestScore(predictions: PostRow['ml_predictions']): number | undefined {
  if (!predictions?.length) return undefined
  return [...predictions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.success_score
}

function mapPostRow(row: PostRow): Post {
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

/**
 * El roster del manager logueado (sus influencers) y las entregas de todos
 * ellos, leídos de verdad de Supabase (sustituye a `influencers`/
 * `influencerPosts` de `mock-data.ts` en las pantallas de manager).
 *
 * `weeklyTarget` y `followers` no existen como columnas en `influencers`
 * (ver supabase/migrations): hasta que haya sincronización real de redes
 * (Fase 4) van a 0, igual que ya hace `client/discover.vue` con sus propias
 * fichas — 0 es honesto, inventar una cifra no lo sería.
 */
export function useMyRoster() {
  const client = useSupabaseClient()
  const { manager, ensureManager } = useMyManager()

  const influencers = useState<Influencer[]>('my-roster', () => [])
  const posts = useState<Post[]>('my-roster-posts', () => [])
  const loading = useState<boolean>('my-roster-loading', () => false)
  const loaded = useState<boolean>('my-roster-loaded', () => false)

  async function refresh() {
    const me = manager.value ?? (await ensureManager())
    if (!me) return

    loading.value = true

    const { data: influencerRows, error: influencerError } = await client
      .from('influencers')
      .select('id, display_name, niche')
      .eq('manager_id', me.id)

    if (influencerError) {
      console.error('[useMyRoster] fallo al cargar el roster:', influencerError.message)
      loading.value = false
      return
    }

    influencers.value = (influencerRows as InfluencerRow[]).map((r) => ({
      id: r.id,
      name: r.display_name,
      niche: r.niche ?? 'Sin especificar',
      initials: initialsFromName(r.display_name),
      hue: hueFromString(r.display_name),
      weeklyTarget: 0,
      followers: 0,
      managerId: me.id
    }))

    const influencerIds = influencers.value.map((i) => i.id)
    if (!influencerIds.length) {
      posts.value = []
      loading.value = false
      loaded.value = true
      return
    }

    const { data: postRows, error: postError } = await client
      .from('posts')
      .select('*, ml_predictions(success_score, created_at)')
      .in('influencer_id', influencerIds)
      .order('due_date', { ascending: true })
    loading.value = false

    if (postError) {
      console.error('[useMyRoster] fallo al cargar las entregas del roster:', postError.message)
      return
    }
    posts.value = (postRows as PostRow[]).map(mapPostRow)
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return { influencers: influencers.value, posts: posts.value }
  }

  function reset() {
    influencers.value = []
    posts.value = []
    loaded.value = false
  }

  return { influencers, posts, loading, loaded, refresh, ensureLoaded, reset }
}
