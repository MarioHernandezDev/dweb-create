export interface MyInfluencer {
  id: string
  displayName: string
  niche: string | null
  managerId: string | null
  managerName: string | null
  stripeConnectOnboarded: boolean
}

/**
 * La ficha de `influencers` del usuario logueado (rol "creator" en el
 * frontend). Se resuelve una vez por sesión de pestaña — ver
 * `role-guard.global.ts`, que la deja lista antes de que cualquier página
 * del rol "creator" se monte, igual que hace con `useMyRole`.
 */
export function useMyInfluencer() {
  const influencer = useState<MyInfluencer | null | undefined>('my-influencer', () => undefined)

  async function ensureInfluencer(userId?: string) {
    if (influencer.value !== undefined) return influencer.value

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
    // deja `influencer.value` en `undefined` para que la siguiente llamada
    // lo reintente de verdad en vez de darlo por perdido.
    if (!id) return null

    const { data } = await client
      .from('influencers')
      .select('id, display_name, niche, manager_id, stripe_connect_onboarded, managers(agency_name)')
      .eq('profile_id', id)
      .maybeSingle<{
        id: string; display_name: string; niche: string | null; manager_id: string | null
        stripe_connect_onboarded: boolean; managers: { agency_name: string } | null
      }>()

    influencer.value = data
      ? {
          id: data.id,
          displayName: data.display_name,
          niche: data.niche,
          managerId: data.manager_id,
          managerName: data.managers?.agency_name ?? null,
          stripeConnectOnboarded: data.stripe_connect_onboarded
        }
      : null
    return influencer.value
  }

  function reset() {
    influencer.value = undefined
  }

  return { influencer, ensureInfluencer, reset }
}
