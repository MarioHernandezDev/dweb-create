import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { anonClient, creatorSession, hasSupabaseEnv } from './supabase-setup'

/**
 * H0-03: supabase/migrations/20261103140000_function_execute_privileges.sql
 *
 * Cada llamada usa entradas que, según el cuerpo de la función, NO escriben nada
 * (notify con perfil nulo sale al principio; las demás fallan en su primera
 * validación con ids inexistentes). Así se mide el permiso EXECUTE sin tocar datos:
 *   42501 = sin permiso · cualquier otra respuesta = la función se ejecutó.
 *
 * ANTES de aplicar la migración fallan los de "anon no puede" y "authenticated no
 * puede llamar a notify"; DESPUÉS pasan todos. Inicia sesión con la cuenta demo
 * (límite de autenticación compartido): solo corre con RUN_SOCIAL_ACCOUNTS_RLS=1.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1'

const ghost = () => randomUUID()

// Funciones internas: nadie desde fuera (ni anon ni authenticated).
const INTERNAL: [string, Record<string, unknown>][] = [
  ['notify', { p_profile_id: null, p_type: 'audit_probe', p_title: 'audit_probe' }],
  ['_get_or_create_conversation', { a: null, b: null }],
  ['has_accepted_offer_between', { a: ghost(), b: ghost() }]
]

// RPC del cliente: solo con sesión.
const CLIENT_RPC: [string, Record<string, unknown>][] = [
  ['get_or_create_conversation', { target_profile_id: null }],
  ['send_text_message', { p_conversation_id: ghost(), p_body: '' }],
  ['create_offer', { p_package_id: ghost(), p_proposed_price_cents: 0 }],
  ['respond_offer', { p_offer_id: ghost(), p_accept: false }],
  ['mark_conversation_read', { p_conversation_id: ghost() }],
  ['my_chat_unread_count', {}],
  ['accept_collaboration_request', { p_collaboration_id: ghost() }],
  ['decline_collaboration_request', { p_collaboration_id: ghost() }],
  ['mark_collaboration_completed', { p_collaboration_id: ghost() }],
  ['approve_post', { target_post_id: ghost() }],
  ['request_post_changes', { target_post_id: ghost(), p_comment: '' }],
  ['submit_collaboration_rating', { p_collaboration_id: ghost(), p_stars: 0 }],
  ['profile_rating_summary', { p_profile_id: ghost() }],
  ['get_public_social_accounts', { p_creator_id: ghost() }],
  ['my_credit_balance', {}]
]

describe.skipIf(!enabled)('permisos EXECUTE de funciones SECURITY DEFINER (Supabase real)', () => {
  describe('anon no puede ejecutar ninguna', () => {
    it.each([...INTERNAL, ...CLIENT_RPC])('%s', async (fn, args) => {
      const { error } = await anonClient()!.rpc(fn, args)
      expect(error?.code).toBe('42501')
    })
  })

  describe('authenticated no puede ejecutar las internas', () => {
    it.each(INTERNAL)('%s', async (fn, args) => {
      const session = await creatorSession()
      expect(session).not.toBeNull()
      const { error } = await session!.client.rpc(fn, args)
      expect(error?.code).toBe('42501')
    })
  })

  describe('authenticated sigue pudiendo usar las RPC de la app (control)', () => {
    it('my_credit_balance responde un número', async () => {
      const session = await creatorSession()
      const { data, error } = await session!.client.rpc('my_credit_balance')
      expect(error).toBeNull()
      expect(typeof data).toBe('number')
    })

    it('respond_offer con una oferta inexistente se ejecuta y la rechaza la propia función', async () => {
      const session = await creatorSession()
      const { error } = await session!.client.rpc('respond_offer', { p_offer_id: ghost(), p_accept: false })
      expect(error?.code).toBe('P0001')
    })
  })
})
