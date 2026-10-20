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
    // `getUser()` en vez de `useSupabaseUser().value`: ver useMyInfluencer.ts
    // y role-guard.global.ts para el detalle del fallo que esto evita.
    const id = userId ?? (await client.auth.getUser()).data.user?.id
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
