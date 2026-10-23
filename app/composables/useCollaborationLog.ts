export type CollaborationLogKind = 'incident' | 'agreed_change'

export interface CollaborationLogEntry {
  id: string
  collaborationId: string
  authorProfileId: string
  kind: CollaborationLogKind
  detail: string
  createdAt: string
}

interface LogEntryRow {
  id: string
  collaboration_id: string
  author_profile_id: string
  kind: CollaborationLogKind
  detail: string
  created_at: string
}

function mapRow(row: LogEntryRow): CollaborationLogEntry {
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    authorProfileId: row.author_profile_id,
    kind: row.kind,
    detail: row.detail,
    createdAt: row.created_at
  }
}

/**
 * Registro compartido de incidencias y cambios acordados de una
 * colaboración (ver supabase/migrations/20261025170000_collaboration_log.sql)
 * — distinto de `reports`/`useReports.ts` (confidencial al admin): esto lo
 * leen las dos partes. Append-only: no hay `updateEntry`/`deleteEntry` a
 * propósito, la base de datos tampoco lo permite para el cliente.
 */
export function useCollaborationLog() {
  const client = useSupabaseClient()

  const entriesByCollaboration = useState<Record<string, CollaborationLogEntry[]>>('collaboration-log-by-collab', () => ({}))
  const loading = useState<string | null>('collaboration-log-loading', () => null)

  async function ensureLoaded(collaborationId: string) {
    if (entriesByCollaboration.value[collaborationId]) return entriesByCollaboration.value[collaborationId]
    loading.value = collaborationId
    try {
      const { data, error } = await client
        .from('collaboration_log_entries')
        .select('id, collaboration_id, author_profile_id, kind, detail, created_at')
        .eq('collaboration_id', collaborationId)
        .order('created_at', { ascending: true })
        .order('seq', { ascending: true })
      if (error) {
        console.error('[useCollaborationLog] fallo al cargar el registro:', error.message)
        return []
      }
      const entries = (data as LogEntryRow[]).map(mapRow)
      entriesByCollaboration.value = { ...entriesByCollaboration.value, [collaborationId]: entries }
      return entries
    } finally {
      loading.value = null
    }
  }

  // Nunca optimista: si el insert falla, no se añade nada al estado local —
  // quien llama recibe el error y lo muestra, en vez de que la entrada
  // parezca guardada cuando no lo está.
  async function addEntry(collaborationId: string, kind: CollaborationLogKind, detail: string) {
    const { resolveMyProfileId } = useMyProfileId()
    const myProfileId = await resolveMyProfileId()
    if (!myProfileId) throw new Error('No hay sesión activa.')

    const { data, error } = await client
      .from('collaboration_log_entries')
      .insert({ collaboration_id: collaborationId, author_profile_id: myProfileId, kind, detail: detail.trim() } as never)
      .select('id, collaboration_id, author_profile_id, kind, detail, created_at')
      .single<LogEntryRow>()
    if (error) throw error

    const mapped = mapRow(data)
    const existing = entriesByCollaboration.value[collaborationId] ?? []
    entriesByCollaboration.value = { ...entriesByCollaboration.value, [collaborationId]: [...existing, mapped] }
    return mapped
  }

  function reset() {
    entriesByCollaboration.value = {}
    loading.value = null
  }

  return { entriesByCollaboration, loading, ensureLoaded, addEntry, reset }
}
