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
  initiatedBy: 'creator' | 'partner'
}

interface CollaborationRow {
  id: string
  status: string
  creator_id: string
  brief: string
  budget_cents: number | null
  paid_at: string | null
  created_at: string
  initiated_by: 'creator' | 'partner'
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
  const payError = useState<string>('my-collaborations-pay-error', () => '')

  async function refresh() {
    const me = partner.value ?? (await ensurePartner())
    if (!me) return

    const { data, error } = await client
      .from('collaborations')
      .select('id, status, creator_id, brief, budget_cents, paid_at, created_at, initiated_by, creators(display_name)')
      .eq('partner_id', me.id)
      .order('created_at', { ascending: false })
      .limit(300)
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
      createdAt: r.created_at,
      initiatedBy: r.initiated_by
    }))
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return collaborations.value
  }

  // Mismo patrón que useCollabRequests (lado creador): `agreedBudgetCents`
  // sincroniza el presupuesto con la última oferta aceptada. Pasa por RPC
  // (no un update directo) — el servidor valida el importe contra la
  // negociación real, nunca se fía de lo que mande el cliente.
  async function accept(id: string, agreedBudgetCents?: number | null) {
    acting.value = id
    try {
      const { error } = await client.rpc('accept_collaboration_request' as never, {
        p_collaboration_id: id,
        p_agreed_budget_cents: agreedBudgetCents ?? null
      } as never)
      if (error) throw error
      await refresh()
    } finally {
      acting.value = null
    }
  }

  async function decline(id: string) {
    acting.value = id
    try {
      const { error } = await client.rpc('decline_collaboration_request' as never, { p_collaboration_id: id } as never)
      if (error) throw error
      await refresh()
    } finally {
      acting.value = null
    }
  }

  async function markCompleted(id: string) {
    acting.value = id
    try {
      const { error } = await client.rpc('mark_collaboration_completed' as never, { p_collaboration_id: id } as never)
      if (error) throw error
      await refresh()
    } finally {
      acting.value = null
    }
  }

  // El servidor ya explica en español exactamente por qué falla un pago
  // (Stripe no conectado, colaboración no aceptada, ya pagada...) — antes
  // ese mensaje se perdía porque nadie capturaba el error: el botón solo
  // dejaba de girar, sin explicación, y el usuario no sabía qué había pasado.
  async function payForCollaboration(collaborationId: string) {
    paying.value = collaborationId
    payError.value = ''
    try {
      const { url } = await $fetch('/api/stripe/pay-collaboration', { method: 'POST', body: { collaborationId } })
      await navigateTo(url, { external: true })
    } catch (e) {
      payError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage
        ?? (e instanceof Error ? e.message : 'No se ha podido iniciar el pago. Inténtalo de nuevo.')
    } finally {
      paying.value = null
    }
  }

  return { collaborations, loaded, paying, acting, payError, refresh, ensureLoaded, payForCollaboration, accept, decline, markCompleted }
}
