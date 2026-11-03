import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Fixture compartido de los tests de integración del chat: una conversación
 * entre el creador demo y el creador "ajeno" (mateo), con un paquete de mateo.
 * Todo con el prefijo `[TEST ...]` y borrado al final (la conversación borra en
 * cascada sus mensajes y ofertas). Si ya existe una conversación demo entre las
 * dos cuentas, NO toca nada y devuelve `null` (los tests se saltan).
 */
export async function createChatFixture(tag: string, creatorUserId: string, otherUserId: string) {
  const admin: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const lo = creatorUserId < otherUserId ? creatorUserId : otherUserId
  const hi = creatorUserId < otherUserId ? otherUserId : creatorUserId

  const { data: existing } = await admin.from('conversations').select('id').eq('participant_one_id', lo).eq('participant_two_id', hi).maybeSingle()
  if (existing) return null

  const { data: prof } = await admin.from('profiles').select('chat_privacy').eq('id', otherUserId).single()
  const originalPrivacy = (prof as { chat_privacy: string }).chat_privacy
  await admin.from('profiles').update({ chat_privacy: 'everyone' }).eq('id', otherUserId)

  const { data: conv, error } = await admin.from('conversations').insert({ participant_one_id: lo, participant_two_id: hi, last_message_at: new Date().toISOString() }).select('id').single()
  if (error) throw error
  const { data: pkg } = await admin.from('packages').insert({ profile_id: otherUserId, title: `[TEST ${tag}] Paquete`, price_cents: 10000, deliverables: ['1 Reel'], active: true }).select('id').single()

  const startedAt = new Date().toISOString()
  return {
    admin,
    conversationId: (conv as { id: string }).id,
    packageId: (pkg as { id: string }).id,
    async cleanup() {
      await admin.from('conversations').delete().eq('id', (conv as { id: string }).id)
      await admin.from('packages').delete().eq('id', (pkg as { id: string }).id)
      await admin.from('notifications').delete().in('profile_id', [creatorUserId, otherUserId]).gte('created_at', startedAt)
      await admin.from('profiles').update({ chat_privacy: originalPrivacy }).eq('id', otherUserId)
    }
  }
}
