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
  media_url: string | null
  draft_url?: string | null
  result_url?: string | null
  content_version: number | null
  metadata: { hashtags?: string[] } | null
  checklist_items: { done: boolean }[] | null
}

// Mismo truco que en useMyPosts: el esquema no guarda gradiente de portada,
// se deriva del id para que sea estable entre recargas.
function coverFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return { from: `hsl(${hue} 78% 54%)`, to: `hsl(${(hue + 36) % 360} 70% 40%)`, angle: 135 }
}

function mapRow(row: PostRow, checklist?: { total: number; done: number }): Post {
  const dueInDays = Math.round((new Date(row.due_date).getTime() - Date.now()) / 86_400_000)
  return {
    id: row.id,
    creatorId: row.creator_id,
    collaborationId: row.collaboration_id,
    title: row.title,
    caption: row.caption ?? '',
    contentType: row.content_type,
    platform: row.platform,
    status: row.status,
    dueInDays,
    dueDate: row.due_date.slice(0, 10),
    hashtags: row.metadata?.hashtags ?? [],
    cover: coverFromId(row.id),
    mediaUrl: row.media_url,
    draftUrl: row.draft_url ?? null,
    resultUrl: row.result_url ?? null,
    contentVersion: row.content_version ?? 1,
    // Las labels se quedan fuera a propósito — son organización personal
    // del creador, no información de progreso (ver migración
    // 20261025160000_checklist_partner_visibility.sql). El checklist sí es
    // real desde esa migración: RLS ya deja leerlo si el post es de una
    // colaboración activa del partner.
    labelIds: [],
    checklist: checklist ?? { total: 0, done: 0 }
  }
}

/**
 * Los posts visibles para el partner logueado: solo los atados a una de sus
 * colaboraciones — la RLS de `posts` ya lo garantiza (`posts_select_scoped`),
 * esto además filtra la consulta por eficiencia. Desde `20261124100000` el partner solo recibe
 * las publicaciones que ya se enviaron alguna vez a revisión (`submitted_at`); de las demás solo conoce el recuento (`hidden`). Aprobar/pedir cambios usa
 * las funciones `approve_post`/`request_post_changes` en vez de un UPDATE
 * directo: el partner nunca tiene permiso de escritura sobre `posts`, a
 * propósito (ver supabase/migrations).
 */
export interface HiddenPosts { hidden: number; started: number }

export function usePartnerPosts() {
  const client = useSupabaseClient()
  const posts = useState<Post[]>('partner-posts', () => [])
  const loaded = useState<boolean>('partner-posts-loaded', () => false)
  // Recuento (no contenido) de las publicaciones que el partner aún no ve —ideas y borradores—, por colaboración.
  const hidden = useState<Record<string, HiddenPosts>>('partner-posts-hidden', () => ({}))

  async function refresh() {
    // UNA sola consulta, sin esperar antes a la lista de colaboraciones: la RLS de `posts`
    // (`posts_select_scoped`) ya limita lo visible a las publicaciones de las colaboraciones de este
    // partner, y el recuento del checklist viaja incrustado (`checklist_items(done)`), como en
    // useMyPosts. Antes eran tres viajes en serie (colaboraciones → posts → checklist).
    const [hiddenRes, { data, error }] = await Promise.all([
      client.rpc('partner_hidden_posts' as never),
      client
      .from('posts')
      .select('*, checklist_items(done)')
      .not('collaboration_id', 'is', null)
      .order('due_date', { ascending: true })
      // Mismo tope de cordura que useMyPosts.ts — sin esto, un partner con
      // muchas colaboraciones activas durante años acababa trayendo CADA
      // publicación de todas ellas, de siempre, solo para pintar un tablero.
      .limit(300)
    ])
    // Si la función aún no existe (migración sin aplicar) no pasa nada: se queda sin recuentos.
    hidden.value = Object.fromEntries(((hiddenRes.data ?? []) as { collaboration_id: string; hidden: number; started: number }[])
      .map((r) => [r.collaboration_id, { hidden: r.hidden, started: r.started }]))
    if (error) {
      console.error('[usePartnerPosts] fallo al cargar posts:', error.message)
      return
    }
    const rows = data as PostRow[]

    posts.value = rows.map((r) => {
      const items = r.checklist_items ?? []
      return mapRow(r, { total: items.length, done: items.filter((i) => i.done).length })
    })
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return posts.value
  }

  /** `comment` opcional en aprobar ("¡Perfecto!"), nunca obligatorio — a diferencia de `requestChanges`. */
  async function approvePost(id: string, comment?: string, contentVersion?: number) {
    // La versión que la marca estaba viendo: si el creador cambió algo mientras tanto, el servidor lo rechaza.
    const { error } = await client.rpc('approve_post', { target_post_id: id, p_comment: comment?.trim() || null, p_content_version: contentVersion ?? null } as never)
    if (error) throw error
  }

  /** El servidor rechaza un comentario vacío — no es opcional, sin él "pedir cambios" no explica nada de verdad. */
  async function requestChanges(id: string, comment: string, contentVersion?: number) {
    const { error } = await client.rpc('request_post_changes', { target_post_id: id, p_comment: comment, p_content_version: contentVersion ?? null } as never)
    if (error) throw error
  }

  /**
   * Refleja en local el resultado de una revisión YA confirmada por el servidor. Va aparte de las RPC a
   * propósito: cambiar la fase desmonta el formulario de revisión (que se muestra solo «Para revisar»),
   * y un componente desmontado ya no puede emitir `done` — los avisos al padre se perdían.
   */
  function applyReview(id: string, status: PostStatus) {
    const local = posts.value.find((p) => p.id === id)
    if (local) local.status = status
  }

  return { posts, hidden, loaded, refresh, ensureLoaded, approvePost, requestChanges, applyReview }
}
