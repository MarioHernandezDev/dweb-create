import type { ChatPrivacy } from '~/types'

/**
 * Privacidad de chat del usuario logueado (`profiles.chat_privacy`) — ver
 * migración 20261021160000_chat_packages_offers.sql. Se lee/escribe con el
 * cliente directo, igual que cualquier otro campo de la ficha de perfil:
 * no hay validación cruzada que justifique una función RPC aquí.
 */
export function useChatSettings() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const chatPrivacy = useState<ChatPrivacy | undefined>('my-chat-privacy', () => undefined)
  const chatPrivacyError = useState<string>('my-chat-privacy-error', () => '')

  async function ensureChatPrivacy() {
    if (chatPrivacy.value !== undefined) return chatPrivacy.value
    const id = await myId()
    if (!id) return 'everyone' as ChatPrivacy

    const { data } = await client.from('profiles').select('chat_privacy').eq('id', id).maybeSingle<{ chat_privacy: ChatPrivacy }>()
    chatPrivacy.value = data?.chat_privacy ?? 'everyone'
    return chatPrivacy.value
  }

  // useSupabaseUser() son los claims del JWT: el id va en `sub`. Con `.id`
  // setChatPrivacy salía sin guardar nada (id siempre undefined).
  async function myId() {
    return user.value?.sub ?? (await client.auth.getUser()).data.user?.id
  }

  async function setChatPrivacy(value: ChatPrivacy) {
    const id = await myId()
    if (!id) return
    chatPrivacyError.value = ''
    const { error } = await client.from('profiles').update({ chat_privacy: value } as never).eq('id', id)
    if (error) {
      console.error('[useChatSettings] fallo al guardar la privacidad:', error.message)
      // Sin esto, el radio-botón simplemente no se movía y nadie se
      // enteraba de que su elección no se había guardado de verdad.
      chatPrivacyError.value = 'No se ha podido guardar — inténtalo de nuevo.'
      return
    }
    chatPrivacy.value = value
  }

  return { chatPrivacy, chatPrivacyError, ensureChatPrivacy, setChatPrivacy }
}
