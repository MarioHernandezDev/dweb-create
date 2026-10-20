import type { CollaborationStatus } from '~/types'

export interface CollabRequest {
  id: string
  status: CollaborationStatus
  brief: string
  budgetCents: number | null
  partnerName: string
  createdAt: string
  updatedAt: string
}

interface CollabRequestRow {
  id: string
  status: string
  brief: string
  budget_cents: number | null
  created_at: string
  updated_at: string
  partners: { company_name: string } | null
}

function mapRow(row: CollabRequestRow): CollabRequest {
  return {
    id: row.id,
    status: row.status as CollaborationStatus,
    brief: row.brief,
    budgetCents: row.budget_cents,
    partnerName: row.partners?.company_name ?? 'Partner',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * Solicitudes de colaboración dirigidas al creador logueado — `partner/
 * discover.vue` ya las crea de verdad (`status: 'requested'`), esto es la
 * bandeja donde el creador las ve y responde. La RLS de `collaborations` ya
 * lo permitía desde el principio (`collaborations_update_involved_parties`).
 */
export function useCollabRequests() {
  const client = useSupabaseClient()
  const { creator, ensureCreator } = useMyCreator()

  const requests = useState<CollabRequest[]>('my-collab-requests', () => [])
  const loaded = useState<boolean>('my-collab-requests-loaded', () => false)
  const acting = useState<string | null>('my-collab-requests-acting', () => null)

  async function refresh() {
    const me = creator.value ?? (await ensureCreator())
    if (!me) return

    const { data, error } = await client
      .from('collaborations')
      .select('id, status, brief, budget_cents, created_at, updated_at, partners(company_name)')
      .eq('creator_id', me.id)
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

  // `agreedBudgetCents` sincroniza `collaborations.budget_cents` con la
  // última contraoferta aceptada (si hubo negociación) — el presupuesto que
  // lee el cobro de Stripe es esta columna (server/api/stripe/pay-
  // collaboration.post.ts), no el historial de `collaboration_offers`.
  async function accept(id: string, agreedBudgetCents?: number | null) {
    acting.value = id
    try {
      const payload: Record<string, unknown> = { status: 'accepted' }
      if (agreedBudgetCents !== undefined) payload.budget_cents = agreedBudgetCents
      const { error } = await client.from('collaborations').update(payload as never).eq('id', id)
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

  return { requests, loaded, acting, pendingCount, refresh, ensureLoaded, accept, decline, reset }
}
