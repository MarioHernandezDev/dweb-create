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

    const id = userId ?? useSupabaseUser().value?.id
    if (!id) {
      brandClient.value = null
      return null
    }

    const client = useSupabaseClient()
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
