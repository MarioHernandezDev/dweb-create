export interface MyBrandClient {
  id: string
  name: string
  industry: string | null
}

/**
 * La ficha de `brand_clients` del usuario logueado (rol "client"). Mismo
 * patrón que `useMyInfluencer` — resuelta por `role-guard.global.ts` antes
 * de montar cualquier página de ese rol.
 */
export function useMyBrandClient() {
  const brandClient = useState<MyBrandClient | null | undefined>('my-brand-client', () => undefined)

  async function ensureBrandClient(userId?: string) {
    if (brandClient.value !== undefined) return brandClient.value

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
      .from('brand_clients')
      .select('id, company_name, industry')
      .eq('profile_id', id)
      .maybeSingle<{ id: string; company_name: string; industry: string | null }>()

    brandClient.value = data ? { id: data.id, name: data.company_name, industry: data.industry } : null
    return brandClient.value
  }

  function reset() {
    brandClient.value = undefined
  }

  return { brandClient, ensureBrandClient, reset }
}
