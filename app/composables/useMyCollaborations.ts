import type { CollaborationStatus } from '~/types'

export interface MyCollaboration {
  id: string
  status: CollaborationStatus
  creatorId: string
  creatorName: string | null
  budgetCents: number | null
  paidAt: string | null
}

interface CollaborationRow {
  id: string
  status: string
  creator_id: string
  budget_cents: number | null
  paid_at: string | null
  creators: { display_name: string } | null
}

/**
 * Las colaboraciones del partner logueado, con el nombre del creador ya
 * resuelto — evita que `partner/index.vue` y `partner/profile.vue` repitan
 * el mismo join.
 */
export function useMyCollaborations() {
  const client = useSupabaseClient()
  const { partner, ensurePartner } = useMyPartner()

  const collaborations = useState<MyCollaboration[]>('my-collaborations', () => [])
  const loaded = useState<boolean>('my-collaborations-loaded', () => false)
  const paying = useState<string | null>('my-collaborations-paying', () => null)

  async function refresh() {
    const me = partner.value ?? (await ensurePartner())
    if (!me) return

    const { data, error } = await client
      .from('collaborations')
      .select('id, status, creator_id, budget_cents, paid_at, creators(display_name)')
      .eq('partner_id', me.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[useMyCollaborations] fallo al cargar colaboraciones:', error.message)
      return
    }

    collaborations.value = (data as CollaborationRow[]).map((r) => ({
      id: r.id,
      status: r.status as CollaborationStatus,
      creatorId: r.creator_id,
      creatorName: r.creators?.display_name ?? null,
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
