import type { CollaborationStatus } from '~/types'

export interface CollabRequest {
  id: string
  status: CollaborationStatus
  brief: string
  budgetCents: number | null
  brandName: string
  createdAt: string
}

interface CollabRequestRow {
  id: string
  status: string
  brief: string
  budget_cents: number | null
  created_at: string
  brand_clients: { company_name: string } | null
}

function mapRow(row: CollabRequestRow): CollabRequest {
  return {
    id: row.id,
    status: row.status as CollaborationStatus,
    brief: row.brief,
    budgetCents: row.budget_cents,
    brandName: row.brand_clients?.company_name ?? 'Marca',
    createdAt: row.created_at
  }
}

/**
 * Solicitudes de colaboración dirigidas al influencer o manager logueado
 * (ver README Fase 4, "circuito de relaciones") — hasta ahora
 * `client/discover.vue` ya las creaba de verdad (`status: 'requested'`),
 * pero no existía ningún sitio donde la otra parte pudiera verlas ni
 * responder. La RLS de `collaborations` ya permitía esto desde el principio
 * (`collaborations_update_involved_parties`) — solo faltaba la pantalla.
 */
export function useCollabRequests() {
  const client = useSupabaseClient()
  const { influencer, ensureInfluencer } = useMyInfluencer()
  const { manager, ensureManager } = useMyManager()

  const requests = useState<CollabRequest[]>('my-collab-requests', () => [])
  const loaded = useState<boolean>('my-collab-requests-loaded', () => false)
  const acting = useState<string | null>('my-collab-requests-acting', () => null)

  // Resuelve quién pregunta sin que el composable tenga que saber de
  // antemano si lo llama una página de creador o de manager — solo uno de
  // los dos resuelve a una ficha real para la cuenta logueada.
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
      .from('collaborations')
      .select('id, status, brief, budget_cents, created_at, brand_clients(company_name)')
      .eq(owner.column, owner.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[useCollabRequests] fallo al cargar las solicitudes:', error.message)
      return
    }
    requests.value = (data as CollabRequestRow[]).map(mapRow)
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return requests.value
  }

  const pendingCount = computed(() => requests.value.filter((r) => r.status === 'requested').length)

  /** El influencer acepta una solicitud dirigida directamente a él. */
  async function acceptAsInfluencer(id: string) {
    acting.value = id
    try {
      const { error } = await client.from('collaborations').update({ status: 'accepted' } as never).eq('id', id)
      if (error) throw error
      await refresh()
    } finally {
      acting.value = null
    }
  }

  /**
   * El manager acepta una solicitud dirigida a su agencia — tiene que
   * asignarla a alguien de su plantilla a la vez, porque la colaboración
   * todavía no tiene ningún influencer concreto encima (ver
   * `collaboration_has_a_target`: hoy mismo la tiene como `manager_id`, no
   * `influencer_id`).
   */
  async function acceptAsManager(id: string, assignInfluencerId: string) {
    acting.value = id
    try {
      const { error } = await client
        .from('collaborations')
        .update({ status: 'accepted', influencer_id: assignInfluencerId } as never)
        .eq('id', id)
      if (error) throw error
      await refresh()
    } finally {
      acting.value = null
    }
  }

  async function decline(id: string) {
    acting.value = id
    try {
      const { error } = await client.from('collaborations').update({ status: 'declined' } as never).eq('id', id)
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

  return { requests, loaded, acting, pendingCount, refresh, ensureLoaded, acceptAsInfluencer, acceptAsManager, decline, reset }
}
