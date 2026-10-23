import { describe, expect, it, beforeAll } from 'vitest'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/**
 * `respond_offer` es el fix más importante de la Fase 1: aceptar una oferta
 * de chat tiene que crear una colaboración cobrable de verdad cuando las dos
 * partes son un creador y un partner. Esto lo comprueba de principio a fin
 * contra el proyecto real: crea un paquete, hace una oferta sobre él,
 * la acepta, y confirma que aparece una `collaborations` nueva con el
 * importe correcto — igual que ya se vio en el vídeo grabado con Playwright,
 * pero aquí queda como una comprobación repetible, no solo una captura.
 */
describe.skipIf(!hasSupabaseEnv)('offers: create_offer / respond_offer (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
  })

  it('create_offer rechaza un paquete que no existe', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('create_offer', {
      p_package_id: '00000000-0000-0000-0000-000000000000',
      p_proposed_price_cents: 100,
      p_message: null
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/no existe o ya no está disponible/i)
  })

  it('create_offer rechaza un precio propuesto <= 0', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('create_offer', {
      p_package_id: '00000000-0000-0000-0000-000000000000',
      p_proposed_price_cents: 0,
      p_message: null
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/mayor que 0/i)
  })

  it('ciclo completo: crear paquete -> ofertar -> aceptar -> aparece una collaboration cobrable', async () => {
    if (!creator || !partner) return

    // 1. El creador publica un paquete de prueba (desechable, con un título
    //    que lo identifica como generado por tests).
    const { data: creatorRow } = await creator.client.from('creators').select('id').eq('profile_id', creator.userId).single()
    const creatorId = (creatorRow as { id: string } | null)?.id
    expect(creatorId).toBeTruthy()

    const title = `[test-integración] ${Date.now()}`
    const { data: pkg, error: pkgErr } = await creator.client
      .from('packages')
      .insert({ profile_id: creator.userId, title, price_cents: 12345, deliverables: ['test'] } as never)
      .select('id')
      .single()
    expect(pkgErr).toBeNull()
    const packageId = (pkg as { id: string } | null)?.id
    expect(packageId).toBeTruthy()

    try {
      // 2. El partner hace una oferta sobre ese paquete.
      const proposedPrice = 11111
      const { data: offer, error: offerErr } = await partner.client.rpc('create_offer', {
        p_package_id: packageId,
        p_proposed_price_cents: proposedPrice,
        p_message: 'oferta de test de integración'
      })
      expect(offerErr).toBeNull()
      const offerId = (offer as { id: string } | null)?.id
      expect(offerId).toBeTruthy()

      // 3. El creador la acepta.
      const { data: responded, error: respondErr } = await creator.client.rpc('respond_offer', {
        p_offer_id: offerId,
        p_accept: true
      })
      expect(respondErr).toBeNull()
      expect((responded as { status: string } | null)?.status).toBe('accepted')

      // 4. Debe existir una collaboration nueva, ligada a esa oferta, con el
      //    importe EXACTO que se propuso — el fix central de la Fase 1.
      const { data: collab, error: collabErr } = await creator.client
        .from('collaborations')
        .select('status, budget_cents, offer_id')
        .eq('offer_id', offerId)
        .maybeSingle()
      expect(collabErr).toBeNull()
      expect(collab).not.toBeNull()
      expect((collab as { status: string }).status).toBe('accepted')
      expect((collab as { budget_cents: number }).budget_cents).toBe(proposedPrice)

      // 4b. El aviso "ya puedes pagarla" tiene que apuntar a /partner/requests
      //     (antes apuntaba a /partner/profile, la pestaña retirada en la
      //     Fase 3 de la reorganización de navegación — ver 20261025190000_
      //     fix_notification_links.sql).
      const { data: payNotif } = await partner.client
        .from('notifications')
        .select('link')
        .eq('type', 'collaboration_requested')
        .order('created_at', { ascending: false })
        .limit(1)
      expect((payNotif as { link: string }[] | null)?.[0]?.link).toBe('/partner/requests')

      // 5. Llamar a respond_offer otra vez sobre la misma oferta (ya no está
      //    "pending") debe fallar — y no debe crear una SEGUNDA collaboration.
      const { error: secondRespondErr } = await creator.client.rpc('respond_offer', { p_offer_id: offerId, p_accept: true })
      expect(secondRespondErr).not.toBeNull()

      const { data: allCollabsForOffer } = await creator.client.from('collaborations').select('id').eq('offer_id', offerId)
      expect(allCollabsForOffer ?? []).toHaveLength(1)
    } finally {
      // Limpieza: borra el paquete de prueba (cascada sobre offers/collaborations
      // vía FK, ver la migración de chat/packages/offers) para no dejar basura
      // de test mezclada con datos de demo reales.
      await creator.client.from('packages').delete().eq('id', packageId)
    }
  })

  it('un creador no puede ofertar sobre su propio paquete', async () => {
    if (!creator) return
    const { data: pkg } = await creator.client
      .from('packages')
      .insert({ profile_id: creator.userId, title: `[test-self-offer] ${Date.now()}`, price_cents: 100, deliverables: [] } as never)
      .select('id')
      .single()
    const packageId = (pkg as { id: string } | null)?.id
    if (!packageId) return

    try {
      const { error } = await creator.client.rpc('create_offer', {
        p_package_id: packageId,
        p_proposed_price_cents: 100,
        p_message: null
      })
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/no puedes ofertar en tu propio paquete/i)
    } finally {
      await creator.client.from('packages').delete().eq('id', packageId)
    }
  })
})
