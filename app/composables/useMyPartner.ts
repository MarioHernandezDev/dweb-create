export interface MyPartner {
  id: string
  name: string
  industry: string | null
}

/**
 * La ficha de `partners` del usuario logueado (rol "partner"). Mismo patrón
 * que `useMyCreator` — resuelta por `role-guard.global.ts` antes de montar
 * cualquier página de ese rol.
 */
export function useMyPartner() {
  const partner = useState<MyPartner | null | undefined>('my-partner', () => undefined)

  async function ensurePartner(userId?: string) {
    if (partner.value !== undefined) return partner.value

    const client = useSupabaseClient()
    // `getUser()` en vez de `useSupabaseUser().value`: ver useMyCreator.ts
    // y role-guard.global.ts para el detalle del fallo que esto evita.
    const id = userId ?? (await client.auth.getUser()).data.user?.id
    // No cachear `null` aquí si solo falta el id todavía (ver el mismo caso
    // en useMyRole.ts/useMyCreator.ts) — se dejaría atascado el resto de la
    // sesión de pestaña en vez de poder reintentarlo.
    if (!id) return null

    const { data } = await client
      .from('partners')
      .select('id, company_name, industry')
      .eq('profile_id', id)
      .maybeSingle<{ id: string; company_name: string; industry: string | null }>()

    partner.value = data ? { id: data.id, name: data.company_name, industry: data.industry } : null
    return partner.value
  }

  function reset() {
    partner.value = undefined
  }

  return { partner, ensurePartner, reset }
}
