import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { creatorSession, hasSupabaseEnv, unrelatedCreatorSession } from './supabase-setup'
import { createChatFixture } from './chat-fixture'

/**
 * A-R20h: supabase/migrations/20261103100000_chat_limits.sql
 * Límites de longitud (2000 / 500) y de frecuencia (30 mensajes por minuto,
 * 20 ofertas por hora) en send_text_message y create_offer.
 *
 * ANTES de aplicar la migración deben FALLAR los tests de "RECHAZO"; DESPUÉS,
 * pasar todos. Solo corre con RUN_SOCIAL_ACCOUNTS_RLS=1.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY

describe.skipIf(!enabled)('chat: límites de longitud y frecuencia (Supabase real)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let fx: Awaited<ReturnType<typeof createChatFixture>> = null
  let creatorProfileId: string

  beforeAll(async () => {
    creator = await creatorSession()
    const other = await unrelatedCreatorSession()
    if (!creator || !other) return
    creatorProfileId = creator.userId
    fx = await createChatFixture('chat-limits', creator.userId, other.userId)
  })
  afterAll(async () => { await fx?.cleanup() })

  it('precondiciones: sesiones y conversación de prueba', () => {
    expect(creator).not.toBeNull()
    expect(fx).not.toBeNull()
  })

  it('un mensaje normal y uno de exactamente 2000 caracteres se aceptan', async () => {
    const a = await creator!.client.rpc('send_text_message', { p_conversation_id: fx!.conversationId, p_body: 'hola' } as never)
    expect(a.error).toBeNull()
    const b = await creator!.client.rpc('send_text_message', { p_conversation_id: fx!.conversationId, p_body: 'x'.repeat(2000) } as never)
    expect(b.error).toBeNull()
  })

  it('RECHAZO: un mensaje de más de 2000 caracteres', async () => {
    const r = await creator!.client.rpc('send_text_message', { p_conversation_id: fx!.conversationId, p_body: 'x'.repeat(2001) } as never)
    expect(r.error).not.toBeNull()
    expect(r.error?.message).toMatch(/demasiado largo/i)
  })

  it('RECHAZO: más de 30 mensajes de texto en un minuto', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ conversation_id: fx!.conversationId, sender_id: creatorProfileId, kind: 'text', body: `ráfaga ${i}` }))
    await fx!.admin.from('messages').insert(rows)
    const r = await creator!.client.rpc('send_text_message', { p_conversation_id: fx!.conversationId, p_body: 'uno más' } as never)
    expect(r.error).not.toBeNull()
    expect(r.error?.message).toMatch(/demasiado rápido/i)
  })

  it('RECHAZO: el mensaje de una oferta de más de 500 caracteres', async () => {
    const ok = await creator!.client.rpc('create_offer', { p_package_id: fx!.packageId, p_proposed_price_cents: 10000, p_message: 'y'.repeat(500) } as never)
    expect(ok.error).toBeNull()
    const r = await creator!.client.rpc('create_offer', { p_package_id: fx!.packageId, p_proposed_price_cents: 10000, p_message: 'y'.repeat(501) } as never)
    expect(r.error).not.toBeNull()
    expect(r.error?.message).toMatch(/demasiado largo/i)
  })

  it('RECHAZO: más de 20 ofertas en una hora', async () => {
    const { data: conv } = await fx!.admin.from('conversations').select('participant_one_id, participant_two_id').eq('id', fx!.conversationId).single()
    const c = conv as { participant_one_id: string; participant_two_id: string }
    const otherId = c.participant_one_id === creatorProfileId ? c.participant_two_id : c.participant_one_id
    const rows = Array.from({ length: 20 }, () => ({ package_id: fx!.packageId, conversation_id: fx!.conversationId, from_profile_id: creatorProfileId, to_profile_id: otherId, proposed_price_cents: 10000 }))
    await fx!.admin.from('offers').insert(rows)
    const r = await creator!.client.rpc('create_offer', { p_package_id: fx!.packageId, p_proposed_price_cents: 10000 } as never)
    expect(r.error).not.toBeNull()
    expect(r.error?.message).toMatch(/demasiadas ofertas/i)
  })
})
