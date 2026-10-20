import type { Role } from '~/types'

export interface CollabOffer {
  id: string
  collaborationId: string
  proposedBy: Role
  budgetCents: number
  message: string | null
  createdAt: string
}

interface CollabOfferRow {
  id: string
  collaboration_id: string
  proposed_by: Role
  budget_cents: number
  message: string | null
  created_at: string
}

function mapRow(row: CollabOfferRow): CollabOffer {
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    proposedBy: row.proposed_by,
    budgetCents: row.budget_cents,
    message: row.message,
    createdAt: row.created_at
  }
}

/**
 * Historial de contraofertas de una colaboración (ver
 * supabase/migrations/20261021140000_collaboration_offers_and_reports.sql)
 * — compartido entre `creator/requests.vue` y `partner/requests.vue` a
 * través de `NegotiationPanel.vue`, así la lógica de "quién hizo la última
 * oferta" vive en un solo sitio para los dos roles.
 */
export function useCollaborationOffers() {
  const client = useSupabaseClient()

  const offersByCollaboration = useState<Record<string, CollabOffer[]>>('collab-offers', () => ({}))
  const posting = useState<boolean>('collab-offers-posting', () => false)

  async function ensureOffers(collaborationId: string) {
    if (offersByCollaboration.value[collaborationId]) return offersByCollaboration.value[collaborationId]

    const { data, error } = await client
      .from('collaboration_offers')
      .select('*')
      .eq('collaboration_id', collaborationId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[useCollaborationOffers] fallo al cargar el historial:', error.message)
      return []
    }

    const mapped = (data as CollabOfferRow[]).map(mapRow)
    offersByCollaboration.value = { ...offersByCollaboration.value, [collaborationId]: mapped }
    return mapped
  }

  async function proposeOffer(params: { collaborationId: string; proposedBy: Role; budgetCents: number; message?: string }) {
    posting.value = true
    try {
      const { data, error } = await client
        .from('collaboration_offers')
        .insert({
          collaboration_id: params.collaborationId,
          proposed_by: params.proposedBy,
          budget_cents: params.budgetCents,
          message: params.message || null
        } as never)
        .select()
        .single<CollabOfferRow>()
      if (error) throw error

      const current = offersByCollaboration.value[params.collaborationId] ?? []
      offersByCollaboration.value = { ...offersByCollaboration.value, [params.collaborationId]: [...current, mapRow(data)] }
    } finally {
      posting.value = false
    }
  }

  return { offersByCollaboration, posting, ensureOffers, proposeOffer }
}
