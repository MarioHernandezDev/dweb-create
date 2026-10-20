export interface MyInfluencer {
  id: string
  displayName: string
  niche: string | null
  managerId: string | null
  managerName: string | null
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
    let id = userId ?? useSupabaseUser().value?.id
    if (!id) {
      // `useSupabaseUser()` lo actualiza un listener aparte
      // (`onAuthStateChange`) y puede ir un paso por detrás de la sesión
      // real. `getSession()` espera a que el cliente termine de leerla de
      // verdad (cookies/localStorage) antes de resolver, así que es más
      // fiable que fiarse del ref reactivo justo tras cargar la página o
      // iniciar sesión.
      const { data: sessionData } = await client.auth.getSession()
      id = sessionData.session?.user.id
    }
    // Si de verdad no hay id ni en la sesión, NO se cachea `null` aquí —
    // sería indistinguible de "este usuario de verdad no tiene ficha" y, al
    // ser `useState`, quedaría atascado el resto de la sesión de pestaña. Se
    // deja `influencer.value` en `undefined` para que la siguiente llamada
    // lo reintente de verdad en vez de darlo por perdido.
    if (!id) return null

    const { data } = await client
      .from('influencers')
      .select('id, display_name, niche, manager_id, managers(agency_name)')
      .eq('profile_id', id)
      .maybeSingle<{ id: string; display_name: string; niche: string | null; manager_id: string | null; managers: { agency_name: string } | null }>()

    influencer.value = data
      ? { id: data.id, displayName: data.display_name, niche: data.niche, managerId: data.manager_id, managerName: data.managers?.agency_name ?? null }
      : null
    return influencer.value
  }

  function reset() {
    influencer.value = undefined
  }

  return { influencer, ensureInfluencer, reset }
}
