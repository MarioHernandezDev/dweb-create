import type { WorkEvent } from '~/utils/collaboration-work'

interface EventRow {
  collaboration_id: string
  kind: string
  post_id: string | null
  actor_profile_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

export interface CollabEvent extends WorkEvent {
  id: string
}

/**
 * Cronología de colaboraciones (tabla `collaboration_events`, rellenada por
 * triggers: ver supabase/migrations/20261104130000_collaboration_events.sql).
 * Solo lectura desde el cliente — la RLS deja leerla únicamente a las dos
 * partes y no hay ninguna vía de escritura. Una consulta por colaboración
 * (la página de detalle) o una sola para todas (la bandeja «Qué me toca»).
 */
export function useCollabEvents() {
  const client = useSupabaseClient()
  const eventsByCollab = useState<Record<string, CollabEvent[]>>('collab-events-by-collab', () => ({}))
  const error = useState<string>('collab-events-error', () => '')

  function map(rows: (EventRow & { id: string })[]): CollabEvent[] {
    return rows.map((r) => ({
      id: r.id, collaborationId: r.collaboration_id, kind: r.kind, postId: r.post_id,
      actorProfileId: r.actor_profile_id, detail: r.detail ?? {}, createdAt: r.created_at
    }))
  }

  /** `force` vuelve a leer aunque ya haya caché (tras una acción que genera eventos). */
  async function load(collaborationId: string, force = false) {
    if (!force && eventsByCollab.value[collaborationId]) return eventsByCollab.value[collaborationId]
    const { data, error: e } = await client
      .from('collaboration_events')
      .select('id, collaboration_id, kind, post_id, actor_profile_id, detail, created_at')
      .eq('collaboration_id', collaborationId)
      .order('created_at', { ascending: true })
      .order('seq', { ascending: true })
    if (e) {
      error.value = 'No se ha podido cargar la cronología.'
      console.error('[useCollabEvents] fallo al cargar la cronología:', e.message)
      return eventsByCollab.value[collaborationId] ?? []
    }
    error.value = ''
    const list = map(data as (EventRow & { id: string })[])
    eventsByCollab.value = { ...eventsByCollab.value, [collaborationId]: list }
    return list
  }

  /** Todas las colaboraciones de una vez (para la bandeja): se agrupan en cliente. */
  async function loadMany(collaborationIds: string[]) {
    if (!collaborationIds.length) return
    const { data, error: e } = await client
      .from('collaboration_events')
      .select('id, collaboration_id, kind, post_id, actor_profile_id, detail, created_at')
      .in('collaboration_id', collaborationIds)
      .order('created_at', { ascending: true })
      .order('seq', { ascending: true })
      .limit(2000)
    if (e) {
      console.error('[useCollabEvents] fallo al cargar las cronologías:', e.message)
      return
    }
    const grouped: Record<string, CollabEvent[]> = Object.fromEntries(collaborationIds.map((id) => [id, []]))
    for (const ev of map(data as (EventRow & { id: string })[])) grouped[ev.collaborationId]?.push(ev)
    eventsByCollab.value = { ...eventsByCollab.value, ...grouped }
  }

  return { eventsByCollab, error, load, loadMany }
}
