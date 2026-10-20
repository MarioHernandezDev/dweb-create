export interface MyCollaboration {
  id: string
  status: string
  influencerId: string | null
  influencerName: string | null
  managerId: string | null
  managerName: string | null
  budgetCents: number | null
  paidAt: string | null
}

interface CollaborationRow {
  id: string
  status: string
  influencer_id: string | null
  manager_id: string | null
  budget_cents: number | null
  paid_at: string | null
  influencers: { display_name: string } | null
  managers: { agency_name: string } | null
}

/**
 * Las colaboraciones de la marca logueada (rol "client"), con el nombre del
 * influencer y/o manager ya resueltos — evita que `client/index.vue` y
 * `client/profile.vue` repitan el mismo join.
 */
export function useMyCollaborations() {
  const client = useSupabaseClient()
  const { brandClient, ensureBrandClient } = useMyBrandClient()

  const collaborations = useState<MyCollaboration[]>('my-collaborations', () => [])
  const loaded = useState<boolean>('my-collaborations-loaded', () => false)
  const paying = useState<string | null>('my-collaborations-paying', () => null)

  async function refresh() {
    const me = brandClient.value ?? (await ensureBrandClient())
    if (!me) return

    const { data, error } = await client
      .from('collaborations')
      .select('id, status, influencer_id, manager_id, budget_cents, paid_at, influencers(display_name), managers(agency_name)')
      .eq('brand_client_id', me.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[useMyCollaborations] fallo al cargar colaboraciones:', error.message)
      return
    }

    collaborations.value = (data as CollaborationRow[]).map((r) => ({
      id: r.id,
      status: r.status,
      influencerId: r.influencer_id,
      influencerName: r.influencers?.display_name ?? null,
      managerId: r.manager_id,
      managerName: r.managers?.agency_name ?? null,
      budgetCents: r.budget_cents,
      paidAt: r.paid_at
    }))
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return collaborations.value
  }

  async function payForCollaboration(collaborationId: string) {
    paying.value = collaborationId
    try {
      const { url } = await $fetch('/api/stripe/pay-collaboration', { method: 'POST', body: { collaborationId } })
      await navigateTo(url, { external: true })
    } finally {
      paying.value = null
    }
  }

  return { collaborations, loaded, paying, refresh, ensureLoaded, payForCollaboration }
}
