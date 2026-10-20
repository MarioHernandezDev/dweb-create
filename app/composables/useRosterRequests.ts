export type RosterRequestStatus = 'requested' | 'accepted' | 'declined'

export interface RosterRequest {
  id: string
  status: RosterRequestStatus
  createdAt: string
  managerId: string
  managerName: string
  influencerId: string
  influencerName: string
}

interface RosterRequestRow {
  id: string
  status: string
  created_at: string
  influencer_id: string
  manager_id: string
  influencers: { display_name: string } | null
  managers: { agency_name: string } | null
}

function mapRow(row: RosterRequestRow): RosterRequest {
  return {
    id: row.id,
    status: row.status as RosterRequestStatus,
    createdAt: row.created_at,
    managerId: row.manager_id,
    managerName: row.managers?.agency_name ?? 'Agencia',
    influencerId: row.influencer_id,
    influencerName: row.influencers?.display_name ?? 'Influencer'
  }
}

/**
 * Solicitudes para unirse al roster de un manager (ver migración
 * 20261021090000_roster_requests.sql) — hasta ahora no había NINGUNA forma
 * de fijar `influencers.manager_id`, ni para unirse ni para que el manager
 * lo aprobase. El influencer pide unirse desde `/creator/discover`; el
 * manager acepta o rechaza desde `/manager/roster-requests`. Al aceptar, un
 * trigger en la base de datos (no aquí) es quien de verdad mueve
 * `manager_id` — esta sola actualiza el estado de la solicitud.
 */
export function useRosterRequests() {
  const client = useSupabaseClient()
  const { influencer, ensureInfluencer } = useMyInfluencer()
  const { manager, ensureManager } = useMyManager()

  const requests = useState<RosterRequest[]>('my-roster-requests', () => [])
  const loaded = useState<boolean>('my-roster-requests-loaded', () => false)
  const acting = useState<string | null>('my-roster-requests-acting', () => null)
  const sending = useState<string | null>('my-roster-requests-sending', () => null)

  // Mismo truco que en useCollabRequests: no hace falta saber de antemano
  // si llama una página de creador o de manager.
  async function resolveOwner(): Promise<{ column: 'influencer_id' | 'manager_id'; id: string } | null> {
    const inf = influencer.value !== undefined ? influencer.value : await ensureInfluencer()
    if (inf) return { column: 'influencer_id', id: inf.id }
    const mgr = manager.value !== undefined ? manager.value : await ensureManager()
    if (mgr) return { column: 'manager_id', id: mgr.id }
    return null
  }

  async function refresh() {
    const owner = await resolveOwner()
    if (!owner) return

    const { data, error } = await client
      .from('roster_requests')
      .select('id, status, created_at, influencer_id, manager_id, influencers(display_name), managers(agency_name)')
      .eq(owner.column, owner.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[useRosterRequests] fallo al cargar las solicitudes:', error.message)
      return
    }
    requests.value = (data as RosterRequestRow[]).map(mapRow)
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return requests.value
  }

  const pendingCount = computed(() => requests.value.filter((r) => r.status === 'requested').length)

  /** El influencer pide unirse al roster de este manager. */
  async function sendRequest(managerId: string) {
    const me = influencer.value ?? (await ensureInfluencer())
    if (!me) throw new Error('No se ha encontrado tu ficha de influencer.')

    sending.value = managerId
    try {
      const { error } = await client.from('roster_requests').insert({ influencer_id: me.id, manager_id: managerId } as never)
      if (error) throw error
      await refresh()
    } finally {
      sending.value = null
    }
  }

  async function accept(id: string) {
    acting.value = id
    try {
      const { error } = await client.from('roster_requests').update({ status: 'accepted' } as never).eq('id', id)
      if (error) throw error
      await refresh()
      // El trigger de la migración ya movió manager_id en la base — el roster
      // en caché del manager (useMyRoster) se quedó desactualizado, hay que
      // invalidarlo para que la próxima visita a /manager traiga al nuevo.
      useMyRoster().reset()
    } finally {
      acting.value = null
    }
  }

  async function decline(id: string) {
    acting.value = id
    try {
      const { error } = await client.from('roster_requests').update({ status: 'declined' } as never).eq('id', id)
      if (error) throw error
      await refresh()
    } finally {
      acting.value = null
    }
  }

  function reset() {
    requests.value = []
    loaded.value = false
  }

  return { requests, loaded, acting, sending, pendingCount, refresh, ensureLoaded, sendRequest, accept, decline, reset }
}
