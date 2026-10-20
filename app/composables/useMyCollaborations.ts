import type { CollaborationStatus } from '~/types'

export interface MyCollaboration {
  id: string
  status: CollaborationStatus
  creatorId: string
  creatorName: string | null
  brief: string
  budgetCents: number | null
  paidAt: string | null
  createdAt: string
}

interface CollaborationRow {
  id: string
  status: string
  creator_id: string
  brief: string
  budget_cents: number | null
  paid_at: string | null
  created_at: string
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
  const acting = useState<string | null>('my-collaborations-acting', () => null)

  async function refresh() {
    const me = partner.value ?? (await ensurePartner())
    if (!me) return

    const { data, error } = await client
      .from('collaborations')
      .select('id, status, creator_id, brief, budget_cents, paid_at, created_at, creators(display_name)')
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
      brief: r.brief,
      budgetCents: r.budget_cents,
      paidAt: r.paid_at,
      createdAt: r.created_at
    }))
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return collaborations.value
  }

  // Mismo patrón que useCollabRequests (lado creador): `agreedBudgetCents`
  // sincroniza el presupuesto con la última oferta aceptada.
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

  async function payForCollaboration(collaborationId: string) {
    paying.value = collaborationId
    try {
      const { url } = await $fetch('/api/stripe/pay-collaboration', { method: 'POST', body: { collaborationId } })
      await navigateTo(url, { external: true })
    } finally {
      paying.value = null
    }
  }

  return { collaborations, loaded, paying, acting, refresh, ensureLoaded, payForCollaboration, accept, decline }
}
