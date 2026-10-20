export interface MyManager {
  id: string
  agencyName: string
  focus: string | null
}

/**
 * La ficha de `managers` del usuario logueado (rol "manager"). Mismo patrón
 * que `useMyInfluencer` / `useMyBrandClient` — resuelta por
 * `role-guard.global.ts` antes de montar cualquier página de ese rol.
 */
export function useMyManager() {
  const manager = useState<MyManager | null | undefined>('my-manager', () => undefined)

  async function ensureManager(userId?: string) {
    if (manager.value !== undefined) return manager.value

    const client = useSupabaseClient()
    let id = userId ?? useSupabaseUser().value?.id
    if (!id) {
      // Ver el mismo caso en useMyInfluencer.ts: esperar a la sesión real
      // en vez de fiarse del ref reactivo, que puede ir por detrás.
      const { data: sessionData } = await client.auth.getSession()
      id = sessionData.session?.user.id
    }
    // No cachear `null` aquí si solo falta el id todavía (ver el mismo caso
    // en useMyRole.ts/useMyInfluencer.ts) — se dejaría atascado el resto de
    // la sesión de pestaña en vez de poder reintentarlo.
    if (!id) return null

    const { data } = await client
      .from('managers')
      .select('id, agency_name, focus')
      .eq('profile_id', id)
      .maybeSingle<{ id: string; agency_name: string; focus: string | null }>()

    manager.value = data ? { id: data.id, agencyName: data.agency_name, focus: data.focus } : null
    return manager.value
  }

  function reset() {
    manager.value = undefined
  }

  return { manager, ensureManager, reset }
}
