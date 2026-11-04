import { describe, expect, it, beforeAll } from 'vitest'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/**
 * Prueba, contra el proyecto REAL de Supabase, el hallazgo P0 central de la
 * Fase 1 de la auditoría: antes, cualquiera de las dos partes podía hacer
 * un `update` directo sobre `collaborations` y poner el `budget_cents` o el
 * `status` que quisiera — sin pasar por ninguna validación de servidor. La
 * migración 20261025090000_phase1_security_payments.sql cierra esa policy
 * y mueve todo por `accept_collaboration_request`/`decline_collaboration_
 * request`, que SÍ validan. Esto comprueba que de verdad está cerrado en
 * la base de datos real, no solo en el código del cliente.
 */
describe.skipIf(!hasSupabaseEnv)('collaborations: RLS y RPCs de seguridad (Supabase real)', () => {
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

  it('un update directo sobre collaborations.budget_cents ya NO tiene efecto (la policy se retiró)', async () => {
    if (!creator || !partner) return

    // Localiza una colaboración real del creador para intentar manipularla.
    const { data: collabs, error: selErr } = await creator.client
      .from('collaborations')
      .select('id, budget_cents')
      .limit(1)
    expect(selErr).toBeNull()
    if (!collabs?.length) {
      console.warn('[test] el creador de demo no tiene ninguna colaboración — se salta esta comprobación concreta.')
      return
    }

    const target = collabs[0] as { id: string; budget_cents: number | null }
    const tamperedAmount = (target.budget_cents ?? 0) + 999_999

    // Intento de manipulación directa. Desde 20261103170000 (permisos por
    // columna) `authenticated` no tiene UPDATE sobre collaborations: la base lo
    // rechaza con 42501 en vez de "éxito con cero filas" (que era lo que pasaba
    // solo con RLS). Cualquiera de los dos deja el valor intacto.
    const { data: updated, error: updErr } = await creator.client
      .from('collaborations')
      .update({ budget_cents: tamperedAmount } as never)
      .eq('id', target.id)
      .select('id, budget_cents')

    expect(updErr?.code).toBe('42501')
    expect(updated ?? []).toHaveLength(0)

    // Confirma que el valor real en la base de datos no cambió.
    const { data: after } = await creator.client.from('collaborations').select('budget_cents').eq('id', target.id).single()
    expect((after as { budget_cents: number | null } | null)?.budget_cents).not.toBe(tamperedAmount)
  })

  it('accept_collaboration_request rechaza a quien no es parte de la colaboración', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('accept_collaboration_request', {
      p_collaboration_id: '00000000-0000-0000-0000-000000000000',
      p_agreed_budget_cents: null
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/no existe o no tienes permiso/i)
  })

  it('accept_collaboration_request rechaza un importe que no coincide con ninguna propuesta real', async () => {
    if (!creator) return
    const { data: pending } = await creator.client
      .from('collaborations')
      .select('id')
      .eq('status', 'requested')
      .limit(1)

    if (!pending?.length) {
      console.warn('[test] no hay ninguna colaboración en estado "requested" ahora mismo — se salta esta comprobación concreta.')
      return
    }

    const { error } = await creator.client.rpc('accept_collaboration_request', {
      p_collaboration_id: (pending[0] as { id: string }).id,
      p_agreed_budget_cents: 1 // un importe absurdo, casi con certeza no negociado
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/no coincide con ninguna propuesta real/i)
  })

  it('decline_collaboration_request también rechaza a quien no es parte', async () => {
    if (!partner) return
    const { error } = await partner.client.rpc('decline_collaboration_request', {
      p_collaboration_id: '00000000-0000-0000-0000-000000000000'
    })
    expect(error).not.toBeNull()
  })

  it('mark_collaboration_completed rechaza una colaboración que no existe', async () => {
    if (!creator) return
    const { error } = await creator.client.rpc('mark_collaboration_completed', {
      p_collaboration_id: '00000000-0000-0000-0000-000000000000'
    })
    expect(error).not.toBeNull()
  })

  it('my_credit_balance (RPC) devuelve un número y coincide con la suma real del ledger del creador', async () => {
    if (!creator) return
    const { data: balance, error: rpcErr } = await creator.client.rpc('my_credit_balance')
    expect(rpcErr).toBeNull()
    expect(typeof balance).toBe('number')

    const { data: ledgerRows, error: ledgerErr } = await creator.client.from('credit_ledger').select('amount')
    expect(ledgerErr).toBeNull()
    const manualSum = (ledgerRows ?? []).reduce((sum: number, row: { amount: number }) => sum + row.amount, 0)
    expect(balance).toBe(manualSum)
  })

  it('un partner no puede leer el credit_ledger del creador (no es asunto suyo)', async () => {
    if (!creator || !partner) return
    const { data: creatorRow } = await creator.client.from('creators').select('id').eq('profile_id', creator.userId).single()
    const creatorId = (creatorRow as { id: string } | null)?.id
    if (!creatorId) return

    const { data, error } = await partner.client.from('credit_ledger').select('amount').eq('creator_id', creatorId)
    // RLS debe dejar esto vacío (no un error visible, pero tampoco datos reales).
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })
})
