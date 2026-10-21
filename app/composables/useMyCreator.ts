export interface MyCreator {
  id: string
  displayName: string
  niche: string | null
  stripeConnectOnboarded: boolean
  bio: string | null
  categories: string[]
  minRateCents: number | null
  maxRateCents: number | null
  lookingFor: string | null
}

interface CreatorFichaRow {
  id: string
  display_name: string
  niche: string | null
  stripe_connect_onboarded: boolean
  bio: string | null
  categories: string[] | null
  min_rate_cents: number | null
  max_rate_cents: number | null
  looking_for: string | null
}

const CREATOR_SELECT = 'id, display_name, niche, stripe_connect_onboarded, bio, categories, min_rate_cents, max_rate_cents, looking_for'

function mapCreatorRow(data: CreatorFichaRow): MyCreator {
  return {
    id: data.id,
    displayName: data.display_name,
    niche: data.niche,
    stripeConnectOnboarded: data.stripe_connect_onboarded,
    bio: data.bio,
    categories: data.categories ?? [],
    minRateCents: data.min_rate_cents,
    maxRateCents: data.max_rate_cents,
    lookingFor: data.looking_for
  }
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

    const { data } = await client.from('creators').select(CREATOR_SELECT).eq('profile_id', id).maybeSingle<CreatorFichaRow>()

    creator.value = data ? mapCreatorRow(data) : null
    return creator.value
  }

  /** Actualiza la ficha pública (la que ve un partner en /partner/discover). */
  async function updateFicha(patch: {
    bio?: string | null
    categories?: string[]
    minRateCents?: number | null
    maxRateCents?: number | null
    lookingFor?: string | null
  }) {
    const me = creator.value ?? (await ensureCreator())
    if (!me) throw new Error('No hay ficha de creador que actualizar.')

    const payload: Record<string, unknown> = {}
    if (patch.bio !== undefined) payload.bio = patch.bio
    if (patch.categories !== undefined) payload.categories = patch.categories
    if (patch.minRateCents !== undefined) payload.min_rate_cents = patch.minRateCents
    if (patch.maxRateCents !== undefined) payload.max_rate_cents = patch.maxRateCents
    if (patch.lookingFor !== undefined) payload.looking_for = patch.lookingFor

    const { data, error } = await useSupabaseClient()
      .from('creators')
      .update(payload as never)
      .eq('id', me.id)
      .select(CREATOR_SELECT)
      .single<CreatorFichaRow>()
    if (error) throw error

    creator.value = mapCreatorRow(data)
    return creator.value
  }

  function reset() {
    creator.value = undefined
  }

  return { creator, ensureCreator, updateFicha, reset }
}
