import type { CollaborationStatus } from '~/types'
import type { CollaborationTerms } from '~/utils/collaboration-terms'
import { isActiveCollaborationStatus, isUnresolvedCollaborationStatus } from '~/utils/status'

export interface CollabRequest extends CollaborationTerms {
  id: string
  status: CollaborationStatus
  brief: string
  budgetCents: number | null
  paidAt: string | null
  partnerId: string
  partnerName: string
  /** profiles.id del partner — para abrir el chat desde la colaboración. */
  partnerProfileId: string | null
  createdAt: string
  updatedAt: string
  /** Cuándo caduca la solicitud (solo si está pendiente y es posterior a la migración de caducidad). */
  expiresAt: string | null
  initiatedBy: 'creator' | 'partner'
  packageTitle: string | null
  campaignName: string | null
  packageDescription: string | null
  packageDeliverables: string[] | null
}

interface CollabRequestRow {
  id: string
  status: string
  brief: string
  budget_cents: number | null
  paid_at: string | null
  partner_id: string
  created_at: string
  updated_at: string
  expires_at: string | null
  initiated_by: 'creator' | 'partner'
  scope_notes: string | null
  revisions_included: number | null
  exclusivity: boolean
  usage_rights: string | null
  campaign_goal: string | null
  target_audience: string | null
  tone: string | null
  package_title: string | null
  campaign_name: string | null
  package_description: string | null
  package_deliverables: string[] | null
  partners: { company_name: string; profile_id: string } | null
}

function mapRow(row: CollabRequestRow): CollabRequest {
  return {
    id: row.id,
    status: row.status as CollaborationStatus,
    brief: row.brief,
    budgetCents: row.budget_cents,
    paidAt: row.paid_at,
    partnerId: row.partner_id,
    partnerName: row.partners?.company_name ?? 'Partner',
    partnerProfileId: row.partners?.profile_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    initiatedBy: row.initiated_by,
    scopeNotes: row.scope_notes,
    revisionsIncluded: row.revisions_included,
    exclusivity: row.exclusivity,
    usageRights: row.usage_rights,
    campaignGoal: row.campaign_goal,
    targetAudience: row.target_audience,
    tone: row.tone,
    packageTitle: row.package_title,
    campaignName: row.campaign_name,
    packageDescription: row.package_description,
    packageDeliverables: row.package_deliverables
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
      .select('id, status, brief, budget_cents, paid_at, partner_id, created_at, updated_at, expires_at, initiated_by, scope_notes, revisions_included, exclusivity, usage_rights, campaign_goal, target_audience, tone, campaign_name, package_title, package_description, package_deliverables, partners(company_name, profile_id)')
      .eq('creator_id', me.id)
      .order('created_at', { ascending: false })
      .limit(300)
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

  const pendingCount = computed(() => requests.value.filter((r) => isUnresolvedCollaborationStatus(r.status)).length)
  const activeCount = computed(() => requests.value.filter((r) => isActiveCollaborationStatus(r.status)).length)

  // `agreedBudgetCents` sincroniza `collaborations.budget_cents` con la
  // última contraoferta aceptada (si hubo negociación) — el presupuesto que
  // lee el cobro de Stripe es esta columna (server/api/stripe/pay-
  // collaboration.post.ts), no el historial de `collaboration_offers`.
  // Pasa por una función `security definer` (no un update directo): el
  // servidor valida que el importe coincide con una propuesta real de la
  // negociación, no con lo que el cliente diga que se acordó.
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

  /** Retira una solicitud que envié y que la otra parte aún no ha respondido (se borra; ver withdraw_collaboration_request). */
  async function withdraw(id: string) {
    acting.value = id
    try {
      const { error } = await client.rpc('withdraw_collaboration_request' as never, { p_collaboration_id: id } as never)
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

  function reset() {
    requests.value = []
    loaded.value = false
  }

  return { requests, loaded, acting, pendingCount, activeCount, refresh, ensureLoaded, accept, decline, withdraw, markCompleted, reset }
}
