export interface MyManager {
  id: string
  agencyName: string
  focus: string | null
  stripeConnectOnboarded: boolean
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
    // `getUser()` en vez de `useSupabaseUser().value`: ver useMyInfluencer.ts
    // y role-guard.global.ts para el detalle del fallo que esto evita.
    const id = userId ?? (await client.auth.getUser()).data.user?.id
    // No cachear `null` aquí si solo falta el id todavía (ver el mismo caso
    // en useMyRole.ts/useMyInfluencer.ts) — se dejaría atascado el resto de
    // la sesión de pestaña en vez de poder reintentarlo.
    if (!id) return null

    const { data } = await client
      .from('managers')
      .select('id, agency_name, focus, stripe_connect_onboarded')
      .eq('profile_id', id)
      .maybeSingle<{ id: string; agency_name: string; focus: string | null; stripe_connect_onboarded: boolean }>()

    manager.value = data
      ? { id: data.id, agencyName: data.agency_name, focus: data.focus, stripeConnectOnboarded: data.stripe_connect_onboarded }
      : null
    return manager.value
  }

  function reset() {
    manager.value = undefined
  }

  return { manager, ensureManager, reset }
}
