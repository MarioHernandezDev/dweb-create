import { describe, expect, it, beforeAll } from 'vitest'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/**
 * Valoraciones mutuas (supabase/migrations/20261025120000_collaboration_
 * ratings.sql). Solo se prueban aquí los caminos de rechazo/lectura: el
 * camino feliz (`submit_collaboration_rating` con éxito) escribiría una fila
 * real e INMUTABLE (sin policy de delete, a propósito — ver comentario de
 * cabecera de la migración) sobre las cuentas de demo compartidas, sin forma
 * de deshacerlo al terminar el test. Repetir el test runner contaminaría la
 * reputación real de las cuentas de demo y, por la unique (collaboration_id,
 * rater_profile_id), rompería en la segunda ejecución — se deja sin probar
 * en automático a propósito; el camino feliz se verifica a mano en
 * navegador (ver CHANGELOG).
 */
describe.skipIf(!hasSupabaseEnv)('collaboration_ratings: RLS y RPCs (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
  })

  it('las dos cuentas de demo se autentican correctamente', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
  })

  it('un insert directo sobre collaboration_ratings está bloqueado (sin policy de insert)', async () => {
    if (!creator) return
    const { error } = await creator.client.from('collaboration_ratings').insert({
      collaboration_id: '00000000-0000-0000-0000-000000000000',
      rater_profile_id: creator.userId,
      ratee_profile_id: creator.userId,
      stars: 5
    } as never)
    expect(error).not.toBeNull()
  })

  it('submit_collaboration_rating rechaza una colaboración que no existe', async () => {
    if (!creator) return
    const { error } = await creator.client.rpc('submit_collaboration_rating', {
      p_collaboration_id: '00000000-0000-0000-0000-000000000000',
      p_stars: 5
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/no existe/i)
  })

  it('submit_collaboration_rating rechaza una puntuación fuera de 1-5', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('submit_collaboration_rating', {
      p_collaboration_id: '00000000-0000-0000-0000-000000000000',
      p_stars: 9
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/1 a 5 estrellas/i)
  })

  it('profile_rating_summary devuelve media y recuento, nunca null, para cualquier perfil', async () => {
    if (!creator) return
    const { data, error } = await creator.client.rpc('profile_rating_summary', { p_profile_id: creator.userId }).single()
    expect(error).toBeNull()
    const row = data as { avg_stars: number; rating_count: number } | null
    expect(row).not.toBeNull()
    expect(typeof row?.rating_count).toBe('number')
    expect(row?.avg_stars).not.toBeNull()
  })

  it('las filas de collaboration_ratings son legibles por cualquier autenticado (base de la reputación pública)', async () => {
    if (!partner) return
    const { error } = await partner.client.from('collaboration_ratings').select('id').limit(1)
    expect(error).toBeNull()
  })
})
