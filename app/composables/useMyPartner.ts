export interface MyPartner {
  id: string
  name: string
  industry: string | null
  bio: string | null
  categories: string[]
  minBudgetCents: number | null
  maxBudgetCents: number | null
  lookingFor: string | null
}

interface PartnerFichaRow {
  id: string
  company_name: string
  industry: string | null
  bio: string | null
  categories: string[] | null
  min_budget_cents: number | null
  max_budget_cents: number | null
  looking_for: string | null
}

const PARTNER_SELECT = 'id, company_name, industry, bio, categories, min_budget_cents, max_budget_cents, looking_for'

function mapPartnerRow(data: PartnerFichaRow): MyPartner {
  return {
    id: data.id,
    name: data.company_name,
    industry: data.industry,
    bio: data.bio,
    categories: data.categories ?? [],
    minBudgetCents: data.min_budget_cents,
    maxBudgetCents: data.max_budget_cents,
    lookingFor: data.looking_for
  }
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

    const { data } = await client.from('partners').select(PARTNER_SELECT).eq('profile_id', id).maybeSingle<PartnerFichaRow>()

    partner.value = data ? mapPartnerRow(data) : null
    return partner.value
  }

  /** Actualiza la ficha pública (la que ve un creador en /creator/discover). */
  async function updateFicha(patch: {
    bio?: string | null
    categories?: string[]
    minBudgetCents?: number | null
    maxBudgetCents?: number | null
    lookingFor?: string | null
  }) {
    const me = partner.value ?? (await ensurePartner())
    if (!me) throw new Error('No hay ficha de partner que actualizar.')

    const payload: Record<string, unknown> = {}
    if (patch.bio !== undefined) payload.bio = patch.bio
    if (patch.categories !== undefined) payload.categories = patch.categories
    if (patch.minBudgetCents !== undefined) payload.min_budget_cents = patch.minBudgetCents
    if (patch.maxBudgetCents !== undefined) payload.max_budget_cents = patch.maxBudgetCents
    if (patch.lookingFor !== undefined) payload.looking_for = patch.lookingFor

    const { data, error } = await useSupabaseClient()
      .from('partners')
      .update(payload as never)
      .eq('id', me.id)
      .select(PARTNER_SELECT)
      .single<PartnerFichaRow>()
    if (error) throw error

    partner.value = mapPartnerRow(data)
    return partner.value
  }

  function reset() {
    partner.value = undefined
  }

  return { partner, ensurePartner, updateFicha, reset }
}
