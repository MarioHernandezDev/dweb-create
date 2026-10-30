import { coverArtFromString } from '~/utils/avatar'
import type { ContentType, Platform, Post, PostStatus, Suggestion } from '~/types'

interface PostRow {
  id: string
  creator_id: string
  collaboration_id: string | null
  title: string
  caption: string | null
  content_type: ContentType
  platform: Platform
  status: PostStatus
  due_date: string
  created_at: string | null
  updated_at: string | null
  media_url: string | null
  metadata: { hashtags?: string[] } | null
  ml_predictions: { success_score: number; model_version: string | null; suggestions: Suggestion[] | null; created_at: string }[] | null
  post_labels: { label_id: string }[] | null
  checklist_items: { done: boolean }[] | null
}

const POST_SELECT = '*, ml_predictions(success_score, model_version, suggestions, created_at), post_labels(label_id), checklist_items(done)'

function latestPrediction(predictions: PostRow['ml_predictions']) {
  if (!predictions?.length) return undefined
  return [...predictions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}

function mapRow(row: PostRow): Post {
  const dueInDays = Math.round((new Date(row.due_date).getTime() - Date.now()) / 86_400_000)
  const prediction = latestPrediction(row.ml_predictions)
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
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    hashtags: row.metadata?.hashtags ?? [],
    cover: coverArtFromString(row.id),
    mediaUrl: row.media_url,
    successScore: prediction?.success_score,
    aiEvaluated: prediction?.model_version ? prediction.model_version.includes('llm') : undefined,
    // La IA que enriquece la predicción es opcional (ver docs/8-AI-SUGGESTIONS-SETUP.md):
    // si no había OPENROUTER_API_KEY cuando se predijo, esto llega vacío y la
    // pantalla cae en el texto fijo de `suggestionsForDraft`.
    suggestions: prediction?.suggestions?.length ? prediction.suggestions : undefined,
    labelIds: (row.post_labels ?? []).map((pl) => pl.label_id),
    checklist: {
      total: row.checklist_items?.length ?? 0,
      done: row.checklist_items?.filter((i) => i.done).length ?? 0
    }
  }
}

export interface NewPostInput {
  title: string
  caption: string
  contentType: ContentType
  platform: Platform
  /** Fecha de entrega ("YYYY-MM-DD", de un `<input type="date">`) — si no se indica, +3 días desde hoy, como antes. */
  dueDate?: string
  /** Colaboración activa a la que pertenece — opcional, contenido propio si no se indica. */
  collaborationId?: string | null
  hashtags?: string[]
}

// `T12:00:00`, no medianoche: una fecha sin hora ("2026-10-25") se
// interpreta como UTC — en zonas con offset negativo, medianoche UTC cae
// en el día anterior en local, y el date picker mostraría un día distinto
// al que se eligió. Mediodía evita ese desajuste en cualquier zona horaria real.
function parseDueDate(dueDate: string | undefined): Date {
  return dueDate ? new Date(`${dueDate}T12:00:00`) : new Date(Date.now() + 3 * 86_400_000)
}

/**
 * Los posts del creador logueado, leídos de verdad de Supabase (sustituye
 * a `useCreatorPosts`, que vivía solo de `mock-data.ts`). Cacheados en
 * `useState` como el resto de la app; `useLogout`/`login.vue` los vacían al
 * cambiar de cuenta.
 */
export function useMyPosts() {
  const client = useSupabaseClient()
  const { creator, ensureCreator } = useMyCreator()

  const posts = useState<Post[]>('my-posts', () => [])
  const loading = useState<boolean>('my-posts-loading', () => false)
  const loaded = useState<boolean>('my-posts-loaded', () => false)

  async function refresh() {
    const me = creator.value ?? (await ensureCreator())
    if (!me) return

    loading.value = true
    const { data, error } = await client
      .from('posts')
      .select(POST_SELECT)
      .eq('creator_id', me.id)
      .order('due_date', { ascending: true })
      // Tope de cordura — sin esto la consulta crece sin límite con el
      // historial acumulado de años; un creador real no gestiona 500
      // publicaciones a la vez en este tablero.
      .limit(300)
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

  async function updatePost(
    id: string,
    patch: { title?: string; caption?: string; status?: PostStatus; hashtags?: string[]; mediaUrl?: string | null; dueDate?: string }
  ) {
    const payload: Record<string, unknown> = {}
    if (patch.title !== undefined) payload.title = patch.title
    if (patch.caption !== undefined) payload.caption = patch.caption
    if (patch.status !== undefined) payload.status = patch.status
    if (patch.hashtags !== undefined) payload.metadata = { hashtags: patch.hashtags }
    if (patch.mediaUrl !== undefined) payload.media_url = patch.mediaUrl
    if (patch.dueDate !== undefined) payload.due_date = parseDueDate(patch.dueDate).toISOString()

    // Sin tipos generados de la base de datos todavía (como en useMyRole),
    // el cliente no puede inferir las columnas de `posts` por sí solo.
    const { error } = await client.from('posts').update(payload as never).eq('id', id)
    if (error) throw error

    const local = posts.value.find((p) => p.id === id)
    if (local) {
      const { dueDate, ...rest } = patch
      Object.assign(local, rest)
      if (dueDate !== undefined) {
        local.dueDate = dueDate
        local.dueInDays = Math.round((parseDueDate(dueDate).getTime() - Date.now()) / 86_400_000)
      }
    }
  }

  // Portada real del post (bucket "post-media", ver
  // supabase/migrations/20261021130000_post_media_bucket.sql). La carpeta
  // es el auth.uid() del creador — es justo lo que comprueban las políticas
  // RLS de storage.objects, así que tiene que venir de la sesión, no de
  // `creator.value.id` (ese es el id de la fila `creators`, no el de auth).
  async function uploadCover(postId: string, file: File) {
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) throw userError ?? new Error('No hay sesión activa.')

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userData.user.id}/${postId}.${ext}`

    const { error: uploadError } = await client.storage
      .from('post-media')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    // Bucket público + upsert: la URL pública es estable, pero el navegador
    // la cachearía tal cual si no se le añade algo que cambie en cada subida.
    const { data: publicUrlData } = client.storage.from('post-media').getPublicUrl(path)
    const mediaUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    await updatePost(postId, { mediaUrl })
    return mediaUrl
  }

  async function deletePost(id: string) {
    const { error } = await client.from('posts').delete().eq('id', id)
    if (error) throw error
    posts.value = posts.value.filter((p) => p.id !== id)
  }

  async function createPost(input: NewPostInput) {
    const me = creator.value ?? (await ensureCreator())
    if (!me) throw new Error('No se ha encontrado tu ficha de creador.')

    const { data, error } = await client
      .from('posts')
      .insert({
        creator_id: me.id,
        collaboration_id: input.collaborationId ?? null,
        title: input.title,
        caption: input.caption,
        content_type: input.contentType,
        platform: input.platform,
        status: 'idea',
        due_date: parseDueDate(input.dueDate).toISOString(),
        metadata: input.hashtags?.length ? { hashtags: input.hashtags } : {}
      } as never)
      .select(POST_SELECT)
      .single<PostRow>()
    if (error) throw error

    const mapped = mapRow(data)
    posts.value = [...posts.value, mapped]
    return mapped
  }

  return { posts, loading, loaded, refresh, ensureLoaded, updatePost, deletePost, createPost, uploadCover }
}
