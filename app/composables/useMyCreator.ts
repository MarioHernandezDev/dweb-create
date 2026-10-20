export interface MyCreator {
  id: string
  displayName: string
  niche: string | null
  stripeConnectOnboarded: boolean
}

/**
 * La ficha de `creators` del usuario logueado (rol "creator"). Se resuelve
 * una vez por sesión de pestaña — ver `role-guard.global.ts`, que la deja
 * lista antes de que cualquier página del rol "creator" se monte, igual que
 * hace con `useMyRole`.
 */
export function useMyCreator() {
  const creator = useState<MyCreator | null | undefined>('my-creator', () => undefined)

  async function ensureCreator(userId?: string) {
    if (creator.value !== undefined) return creator.value

    const client = useSupabaseClient()
    // `getUser()` en vez de `useSupabaseUser().value`: ese ref lo rellena un
    // listener aparte (`onAuthStateChange`) y puede ir un paso por detrás de
    // la sesión real — no solo justo tras el login, también en una recarga
    // normal (ver role-guard.global.ts). Solo hace falta cuando no llega
    // `userId` ya resuelto desde el middleware.
    const id = userId ?? (await client.auth.getUser()).data.user?.id
    // Si de verdad no hay id, NO se cachea `null` aquí — sería
    // indistinguible de "este usuario de verdad no tiene ficha" y, al ser
    // `useState`, quedaría atascado el resto de la sesión de pestaña. Se
    // deja `creator.value` en `undefined` para que la siguiente llamada lo
    // reintente de verdad.
    if (!id) return null

    const { data } = await client
      .from('creators')
      .select('id, display_name, niche, stripe_connect_onboarded')
      .eq('profile_id', id)
      .maybeSingle<{ id: string; display_name: string; niche: string | null; stripe_connect_onboarded: boolean }>()

    creator.value = data
      ? { id: data.id, displayName: data.display_name, niche: data.niche, stripeConnectOnboarded: data.stripe_connect_onboarded }
      : null
    return creator.value
  }

  function reset() {
    creator.value = undefined
  }

  return { creator, ensureCreator, reset }
}
