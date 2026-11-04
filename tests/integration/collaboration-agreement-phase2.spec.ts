import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * Flujo de colaboraciones · Fase 2 (migración 20261104110000, ver
 * docs/audit/08_COLLABORATION_FLOW_AUDIT.md §8.1):
 *  - Aceptar una oferta del chat guarda la instantánea del paquete.
 *  - `complete_collaboration_brief`: la marca rellena campos vacíos UNA vez;
 *    no sobrescribe uno fijado; el creador y un ajeno no pueden; solo en
 *    colaboraciones aceptadas o en curso.
 *  - Los permisos económicos no cambian (`budget_cents` sigue siendo el importe
 *    de la oferta).
 * Crea y borra sus propias filas (marcadas con [test-fase2]).
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('flujo de colaboraciones · fase 2 (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let outsider: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  const collabIds: string[] = []
  const packageIds: string[] = []
  const offerIds: string[] = []

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    outsider = await unrelatedCreatorSession()
    if (!creator || !partner) return
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data: c } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data: p } = await admin.from('partners').select('id').eq('profile_id', partner.userId).single()
    creatorRowId = (c as { id: string }).id
    partnerRowId = (p as { id: string }).id
  })

  afterAll(async () => {
    if (!admin) return
    for (const id of collabIds) await admin.from('collaborations').delete().eq('id', id)
    for (const id of offerIds) {
      await admin.from('messages').delete().eq('offer_id', id)
      await admin.from('offers').delete().eq('id', id)
    }
    for (const id of packageIds) await admin.from('packages').delete().eq('id', id)
  })

  async function makeCollab(status: 'requested' | 'accepted' | 'completed' = 'accepted') {
    const { data, error } = await admin.from('collaborations').insert({
      creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: 'partner',
      brief: `[test-fase2] ${Date.now()}`, budget_cents: 10000, status
    }).select('id').single()
    if (error) throw error
    const id = (data as { id: string }).id
    collabIds.push(id)
    return id
  }
  const read = async (id: string) => {
    const { data } = await admin.from('collaborations')
      .select('campaign_goal, target_audience, tone, scope_notes, usage_rights, revisions_included, exclusivity').eq('id', id).single()
    return data as Record<string, unknown>
  }
  const completeBrief = (client: NonNullable<typeof partner>['client'], id: string, fields: Record<string, unknown>) =>
    client.rpc('complete_collaboration_brief' as never, { p_collaboration_id: id, ...fields } as never)

  it('las cuentas de demo se autentican', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
  })

  it('aceptar una oferta del chat guarda la instantánea del paquete y no cambia el importe', async () => {
    if (!creator || !partner) return
    const { data: pkg, error: pkgErr } = await creator.client.from('packages').insert({
      profile_id: creator.userId, title: `[test-fase2] paquete ${Date.now()}`, description: 'Descripción del paquete',
      price_cents: 12345, deliverables: ['1 reel', '3 stories']
    } as never).select('id').single()
    expect(pkgErr).toBeNull()
    const packageId = (pkg as { id: string }).id
    packageIds.push(packageId)

    const { data: offer, error: offerErr } = await partner.client.rpc('create_offer', {
      p_package_id: packageId, p_proposed_price_cents: 11111, p_message: '[test-fase2]'
    })
    expect(offerErr).toBeNull()
    const offerId = (offer as { id: string }).id
    offerIds.push(offerId)

    const { error: respErr } = await creator.client.rpc('respond_offer', { p_offer_id: offerId, p_accept: true })
    expect(respErr).toBeNull()

    const { data: c } = await admin.from('collaborations')
      .select('id, budget_cents, package_title, package_description, package_deliverables').eq('offer_id', offerId).single()
    const row = c as { id: string; budget_cents: number; package_title: string; package_description: string; package_deliverables: string[] }
    collabIds.push(row.id)
    expect(row.budget_cents).toBe(11111)
    expect(row.package_title).toMatch(/^\[test-fase2\] paquete/)
    expect(row.package_description).toBe('Descripción del paquete')
    expect(row.package_deliverables).toEqual(['1 reel', '3 stories'])

    // El paquete cambia después: la instantánea no.
    await admin.from('packages').update({ title: 'otro título', deliverables: ['9 reels'] }).eq('id', packageId)
    const { data: after } = await admin.from('collaborations').select('package_title, package_deliverables').eq('id', row.id).single()
    expect((after as { package_title: string }).package_title).toMatch(/^\[test-fase2\] paquete/)
    expect((after as { package_deliverables: string[] }).package_deliverables).toEqual(['1 reel', '3 stories'])
  })

  it('la marca completa campos vacíos y el creador recibe un aviso con enlace', async () => {
    if (!creator || !partner) return
    const id = await makeCollab('accepted')
    const { data: last } = await admin.from('notifications').select('created_at').order('created_at', { ascending: false }).limit(1)
    const since = (last as { created_at: string }[] | null)?.[0]?.created_at ?? '1970-01-01T00:00:00Z'

    const { error } = await completeBrief(partner.client, id, {
      p_campaign_goal: 'Lanzar la colección', p_tone: 'Cercano', p_revisions_included: 2, p_exclusivity: true
    })
    expect(error).toBeNull()
    const row = await read(id)
    expect(row.campaign_goal).toBe('Lanzar la colección')
    expect(row.tone).toBe('Cercano')
    expect(row.revisions_included).toBe(2)
    expect(row.exclusivity).toBe(true)
    expect(row.target_audience).toBeNull()

    const { data: n } = await admin.from('notifications').select('link').eq('profile_id', creator.userId)
      .eq('type', 'collaboration_brief_added').gt('created_at', since)
    expect((n ?? []).map((x) => (x as { link: string }).link)).toEqual([`/creator/requests?collaboration=${id}`])
  })

  it('un campo ya fijado no se sobrescribe y no se aplica nada a medias', async () => {
    if (!partner) return
    const id = await makeCollab('accepted')
    expect((await completeBrief(partner.client, id, { p_tone: 'Cercano' })).error).toBeNull()

    const { error } = await completeBrief(partner.client, id, { p_tone: 'Formal', p_campaign_goal: 'Nuevo objetivo' })
    expect(error?.message).toMatch(/ya estaban fijados/i)
    const row = await read(id)
    expect(row.tone).toBe('Cercano')
    expect(row.campaign_goal).toBeNull()

    // Repetir el mismo valor no es un cambio: falla porque no hay nada que completar.
    const again = await completeBrief(partner.client, id, { p_tone: 'Cercano' })
    expect(again.error?.message).toMatch(/ningún campo vacío/i)
  })

  it('el trigger impide cambiar un valor fijado aunque sea con service_role, y permite NULL → valor', async () => {
    const id = await makeCollab('accepted')
    expect((await admin.from('collaborations').update({ tone: 'Primero' } as never).eq('id', id)).error).toBeNull()
    const { error } = await admin.from('collaborations').update({ tone: 'Segundo' } as never).eq('id', id)
    expect(error?.message).toMatch(/no se pueden modificar/i)
    const { error: exclErr } = await admin.from('collaborations').update({ exclusivity: true } as never).eq('id', id)
    expect(exclErr).toBeNull()
    const { error: exclBack } = await admin.from('collaborations').update({ exclusivity: false } as never).eq('id', id)
    expect(exclBack?.message).toMatch(/no se pueden modificar/i)
  })

  it('el creador y un usuario ajeno no pueden completar el brief', async () => {
    if (!creator) return
    const id = await makeCollab('accepted')
    const asCreator = await completeBrief(creator.client, id, { p_tone: 'Intento del creador' })
    expect(asCreator.error?.message).toMatch(/solo la marca/i)
    if (outsider) {
      const asOutsider = await completeBrief(outsider.client, id, { p_tone: 'Intento ajeno' })
      expect(asOutsider.error).not.toBeNull()
    }
    expect((await read(id)).tone).toBeNull()
  })

  it('solo en colaboraciones aceptadas o en curso; rango de revisiones validado', async () => {
    if (!partner) return
    const requested = await makeCollab('requested')
    expect((await completeBrief(partner.client, requested, { p_tone: 'x' })).error?.message).toMatch(/aceptada o en curso/i)
    const done = await makeCollab('completed')
    expect((await completeBrief(partner.client, done, { p_tone: 'x' })).error?.message).toMatch(/aceptada o en curso/i)
    const ok = await makeCollab('accepted')
    expect((await completeBrief(partner.client, ok, { p_revisions_included: 99 })).error?.message).toMatch(/entre 0 y 20/i)
    expect((await completeBrief(partner.client, ok, {})).error?.message).toMatch(/ningún campo vacío/i)
  })
})
