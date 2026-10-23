export interface PostRevisionNote {
  id: string
  postId: string
  authorProfileId: string
  authorName: string
  kind: 'changes_requested' | 'approved'
  comment: string | null
  createdAt: string
}

interface NoteRow {
  id: string
  post_id: string
  author_profile_id: string
  kind: 'changes_requested' | 'approved'
  comment: string | null
  created_at: string
}

/**
 * Historial de revisión de una publicación (`post_revision_notes`, ver
 * supabase/migrations/20261025140000_post_revision_notes.sql) — solo lo
 * escriben `approve_post`/`request_post_changes` (siempre el partner hoy,
 * nunca el cliente a mano), así que el nombre del autor se resuelve contra
 * `partners`. Si algún día un creador también pudiera dejar una nota, este
 * lookup tendría que mirar las dos tablas — no hace falta todavía.
 */
export function usePostRevisions() {
  const client = useSupabaseClient()

  // Cacheado por post, no global — a diferencia de `useRatings`/`useSavedProfiles`
  // aquí cada post tiene su propio historial, no tiene sentido un solo Set/Record plano.
  const notesByPost = useState<Record<string, PostRevisionNote[]>>('post-revisions-by-post', () => ({}))
  const loading = useState<string | null>('post-revisions-loading', () => null)

  async function ensureLoaded(postId: string) {
    if (notesByPost.value[postId]) return notesByPost.value[postId]
    loading.value = postId
    try {
      const { data, error } = await client
        .from('post_revision_notes')
        .select('id, post_id, author_profile_id, kind, comment, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('[usePostRevisions] fallo al cargar el historial:', error.message)
        return []
      }
      const rows = data as NoteRow[]
      const authorIds = [...new Set(rows.map((r) => r.author_profile_id))]
      const { data: partnerRows } = authorIds.length
        ? await client.from('partners').select('profile_id, company_name').in('profile_id', authorIds)
        : { data: [] }
      const nameByProfileId = new Map((partnerRows as { profile_id: string; company_name: string }[] | null ?? []).map((p) => [p.profile_id, p.company_name]))

      const notes: PostRevisionNote[] = rows.map((r) => ({
        id: r.id,
        postId: r.post_id,
        authorProfileId: r.author_profile_id,
        authorName: nameByProfileId.get(r.author_profile_id) ?? 'El partner',
        kind: r.kind,
        comment: r.comment,
        createdAt: r.created_at
      }))
      notesByPost.value = { ...notesByPost.value, [postId]: notes }
      return notes
    } finally {
      loading.value = null
    }
  }

  /** La solicitud de cambios vigente — la última nota, solo si es de ese tipo (si ya hay una `approved` después, o nunca hubo ninguna, no hay nada vigente). */
  function latestPendingChangeRequest(postId: string) {
    const notes = notesByPost.value[postId] ?? []
    const last = notes.at(-1)
    return last?.kind === 'changes_requested' ? last : null
  }

  // Recuento de solicitudes de cambios de TODA la colaboración, no de un
  // post concreto — es el dato que se muestra junto a `revisionsIncluded`
  // (ver app/utils/collaboration-terms.ts) en el detalle de la colaboración.
  // Deliberadamente no es un "cumplido/incumplido": solo cuenta notas
  // `changes_requested` reales vía el `!inner` join (si RLS no deja ver los
  // posts de esa colaboración, el recuento sale 0, nunca un error visible).
  const requestedCountByCollaboration = useState<Record<string, number | null>>('post-revisions-requested-count', () => ({}))

  async function revisionsRequestedForCollaboration(collaborationId: string) {
    if (requestedCountByCollaboration.value[collaborationId] !== undefined) {
      return requestedCountByCollaboration.value[collaborationId]
    }
    const { count, error } = await client
      .from('post_revision_notes')
      .select('id, posts!inner(collaboration_id)', { count: 'exact', head: true })
      .eq('kind', 'changes_requested')
      .eq('posts.collaboration_id', collaborationId)
    if (error) {
      console.error('[usePostRevisions] fallo al contar solicitudes de cambios:', error.message)
      requestedCountByCollaboration.value = { ...requestedCountByCollaboration.value, [collaborationId]: null }
      return null
    }
    requestedCountByCollaboration.value = { ...requestedCountByCollaboration.value, [collaborationId]: count ?? 0 }
    return count ?? 0
  }

  function reset() {
    notesByPost.value = {}
    loading.value = null
    requestedCountByCollaboration.value = {}
  }

  return { notesByPost, loading, ensureLoaded, latestPendingChangeRequest, revisionsRequestedForCollaboration, requestedCountByCollaboration, reset }
}
