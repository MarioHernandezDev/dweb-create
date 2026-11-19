import type { Role } from '~/types'

/** Última propuesta de precio de una solicitud (la contraoferta más reciente). */
export interface LastProposal { by: Role; budgetCents: number; message: string | null }

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

  /**
   * Quién hizo la última propuesta de precio de cada solicitud (una sola consulta para varias). Sirve para saber a
   * quién le toca responder en los paneles de Inicio sin abrir cada colaboración. Las que no tienen contraofertas
   * no aparecen: ahí manda quien inició la solicitud.
   */
  async function loadLastProposers(collaborationIds: string[]): Promise<Record<string, LastProposal>> {
    const ids = [...new Set(collaborationIds)].filter(Boolean)
    if (!ids.length) return {}
    const { data, error } = await client
      .from('collaboration_offers')
      .select('collaboration_id, proposed_by, budget_cents, message, created_at')
      .in('collaboration_id', ids)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[useCollaborationOffers] fallo al cargar los turnos:', error.message)
      return {}
    }
    const out: Record<string, LastProposal> = {}
    for (const row of data as { collaboration_id: string; proposed_by: Role; budget_cents: number; message: string | null }[]) {
      out[row.collaboration_id] = { by: row.proposed_by, budgetCents: row.budget_cents, message: row.message }
    }
    return out
  }

  return { offersByCollaboration, posting, ensureOffers, proposeOffer, loadLastProposers }
}
