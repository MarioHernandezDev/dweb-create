export type OfferStatus = 'pending' | 'accepted' | 'declined'

export interface Offer {
  id: string
  packageId: string
  conversationId: string
  fromProfileId: string
  toProfileId: string
  proposedPriceCents: number
  message: string | null
  status: OfferStatus
  respondedAt: string | null
  createdAt: string
}

interface OfferRow {
  id: string
  package_id: string
  conversation_id: string
  from_profile_id: string
  to_profile_id: string
  proposed_price_cents: number
  message: string | null
  status: OfferStatus
  responded_at: string | null
  created_at: string
}

function mapRow(row: OfferRow): Offer {
  return {
    id: row.id,
    packageId: row.package_id,
    conversationId: row.conversation_id,
    fromProfileId: row.from_profile_id,
    toProfileId: row.to_profile_id,
    proposedPriceCents: row.proposed_price_cents,
    message: row.message,
    status: row.status,
    respondedAt: row.responded_at,
    createdAt: row.created_at
  }
}

/**
 * Ofertas sobre paquetes (ver migración 20261021160000_chat_packages_offers.sql).
 * Toda escritura pasa por las funciones `create_offer`/`respond_offer`
 * (security definer) — nunca un insert/update directo, así es imposible
 * "inventar" una oferta sobre un paquete que no existe.
 */
export function useOffers() {
  const client = useSupabaseClient()

  const offersById = useState<Record<string, Offer>>('offers-by-id', () => ({}))
  const responding = useState<string | null>('offers-responding', () => null)
  const creating = useState<boolean>('offers-creating', () => false)
  // Título de paquetes ajenos (los que no están en tus propios `myPackages`)
  // — compartido entre todas las OfferCard de un mismo hilo, para no repetir
  // una consulta idéntica por cada tarjeta que referencie el mismo paquete.
  const packageTitleCache = useState<Record<string, string>>('offers-package-title-cache', () => ({}))

  async function ensureOffer(id: string) {
    if (offersById.value[id]) return offersById.value[id]

    const { data, error } = await client.from('offers').select('*').eq('id', id).maybeSingle<OfferRow>()
    if (error || !data) {
      if (error) console.error('[useOffers] fallo al cargar la oferta:', error.message)
      return null
    }
    const mapped = mapRow(data)
    offersById.value = { ...offersById.value, [id]: mapped }
    return mapped
  }

  async function createOffer(params: { packageId: string; proposedPriceCents: number; message?: string | null }) {
    creating.value = true
    try {
      const { data, error } = await client.rpc('create_offer', {
        p_package_id: params.packageId,
        p_proposed_price_cents: params.proposedPriceCents,
        p_message: params.message || null
      } as never)
      if (error) throw error

      const mapped = mapRow(data as OfferRow)
      offersById.value = { ...offersById.value, [mapped.id]: mapped }
      return mapped
    } finally {
      creating.value = false
    }
  }

  async function respondOffer(id: string, accept: boolean) {
    responding.value = id
    try {
      const { data, error } = await client.rpc('respond_offer', { p_offer_id: id, p_accept: accept } as never)
      if (error) throw error

      const mapped = mapRow(data as OfferRow)
      offersById.value = { ...offersById.value, [mapped.id]: mapped }
      return mapped
    } finally {
      responding.value = null
    }
  }

  function setOffer(offer: Offer) {
    offersById.value = { ...offersById.value, [offer.id]: offer }
  }

  /** Título de un paquete ajeno para pintarlo en OfferCard.vue, cacheado por id. */
  async function resolvePackageTitle(packageId: string) {
    if (packageTitleCache.value[packageId]) return packageTitleCache.value[packageId]
    const { data } = await useSupabaseClient().from('packages').select('title').eq('id', packageId).maybeSingle<{ title: string }>()
    const title = data?.title ?? 'Paquete'
    packageTitleCache.value = { ...packageTitleCache.value, [packageId]: title }
    return title
  }

  return { offersById, responding, creating, ensureOffer, createOffer, respondOffer, setOffer, resolvePackageTitle, mapOfferRow: mapRow }
}
