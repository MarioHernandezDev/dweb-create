import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/**
 * Favoritos (supabase/migrations/20261025130000_saved_profiles.sql) — a
 * diferencia de collaboration_ratings, aquí SÍ se prueba el camino feliz
 * completo: guardar/quitar es reversible por diseño (hay policy de delete
 * para lo propio), así que no deja contaminación permanente sobre las
 * cuentas de demo compartidas. afterAll limpia por si algún `expect` falla
 * a mitad y deja algo sin borrar.
 */
describe.skipIf(!hasSupabaseEnv)('saved_profiles: RLS (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let creatorRowId: string
  let partnerRowId: string

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    if (!creator || !partner) return
    const { data: creatorRow } = await creator.client.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data: partnerRow } = await partner.client.from('partners').select('id').eq('profile_id', partner.userId).single()
    creatorRowId = (creatorRow as { id: string }).id
    partnerRowId = (partnerRow as { id: string }).id
  })

  afterAll(async () => {
    if (!partner || !creatorRowId) return
    await partner.client.from('saved_profiles').delete().eq('target_creator_id', creatorRowId)
  })

  it('las dos cuentas de demo se autentican correctamente', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
  })

  it('el partner puede guardar al creador de demo', async () => {
    if (!partner) return
    const { error } = await partner.client.from('saved_profiles').insert({ owner_profile_id: partner.userId, target_creator_id: creatorRowId } as never)
    expect(error).toBeNull()
  })

  it('guardar dos veces el mismo perfil se rechaza (índice único)', async () => {
    if (!partner) return
    const { error } = await partner.client.from('saved_profiles').insert({ owner_profile_id: partner.userId, target_creator_id: creatorRowId } as never)
    expect(error).not.toBeNull()
  })

  it('el creador no ve el favorito del partner (RLS de solo lo propio)', async () => {
    if (!creator) return
    const { data } = await creator.client.from('saved_profiles').select('id').eq('target_creator_id', creatorRowId)
    expect(data).toEqual([])
  })

  it('no se puede insertar un favorito a nombre de otro perfil (owner_profile_id ajeno)', async () => {
    if (!creator || !partner) return
    const { error } = await creator.client.from('saved_profiles').insert({
      owner_profile_id: partner.userId,
      target_partner_id: partnerRowId
    } as never)
    expect(error).not.toBeNull()
  })

  it('el partner puede quitar su propio favorito', async () => {
    if (!partner) return
    const { error } = await partner.client.from('saved_profiles').delete().eq('target_creator_id', creatorRowId)
    expect(error).toBeNull()
    const { data } = await partner.client.from('saved_profiles').select('id').eq('target_creator_id', creatorRowId)
    expect(data).toEqual([])
  })
})
