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
  coverUrl: string | null
  /** Límite de WIP por fase del tablero (ej. `{ in_production: 3 }`) — sin entrada = sin límite. */
  boardWipLimits: Record<string, number>
  /** Publicaciones/semana que el propio creador se ha fijado como objetivo (ver creator/index.vue). */
  weeklyPostTarget: number
  headline: string | null
  location: string | null
  /** Audiencia declarada (jsonb crudo; ver utils/audience.ts). */
  audience: Record<string, unknown>
  showCollaborations: boolean
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
  cover_url: string | null
  board_wip_limits: Record<string, number> | null
  weekly_post_target: number | null
  headline: string | null
  location: string | null
  audience: Record<string, unknown> | null
  show_collaborations: boolean | null
}

const CREATOR_SELECT =
  'id, display_name, niche, stripe_connect_onboarded, bio, categories, min_rate_cents, max_rate_cents, looking_for, cover_url, board_wip_limits, weekly_post_target, headline, location, audience, show_collaborations'

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
    lookingFor: data.looking_for,
    coverUrl: data.cover_url,
    boardWipLimits: data.board_wip_limits ?? {},
    weeklyPostTarget: data.weekly_post_target ?? 5,
    headline: data.headline,
    location: data.location,
    audience: data.audience ?? {},
    showCollaborations: data.show_collaborations ?? true
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
    weeklyPostTarget?: number
    headline?: string | null
    location?: string | null
    audience?: Record<string, unknown>
    showCollaborations?: boolean
  }) {
    const me = creator.value ?? (await ensureCreator())
    if (!me) throw new Error('No hay ficha de creador que actualizar.')

    const payload: Record<string, unknown> = {}
    if (patch.bio !== undefined) payload.bio = patch.bio
    if (patch.categories !== undefined) payload.categories = patch.categories
    if (patch.minRateCents !== undefined) payload.min_rate_cents = patch.minRateCents
    if (patch.maxRateCents !== undefined) payload.max_rate_cents = patch.maxRateCents
    if (patch.lookingFor !== undefined) payload.looking_for = patch.lookingFor
    if (patch.weeklyPostTarget !== undefined) payload.weekly_post_target = patch.weeklyPostTarget
    if (patch.headline !== undefined) payload.headline = patch.headline
    if (patch.location !== undefined) payload.location = patch.location
    if (patch.audience !== undefined) payload.audience = patch.audience
    if (patch.showCollaborations !== undefined) payload.show_collaborations = patch.showCollaborations

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

  /**
   * Foto de portada de la ficha — la que se ve grande en las cards de
   * /partner/discover. Reutiliza el bucket `post-media` (ver
   * `useMyPosts.uploadCover` y la migración `20261021160000_discovery_cover_photos.sql`):
   * mismo patrón, nombre de archivo estable (`profile-cover.<ext>`, `upsert`)
   * con un `?v=` para evitar que el navegador sirva la versión cacheada.
   */
  async function uploadCoverPhoto(file: File) {
    const me = creator.value ?? (await ensureCreator())
    if (!me) throw new Error('No hay ficha de creador que actualizar.')

    const client = useSupabaseClient()
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) throw userError ?? new Error('No hay sesión activa.')

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userData.user.id}/profile-cover.${ext}`

    const { error: uploadError } = await client.storage.from('post-media').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = client.storage.from('post-media').getPublicUrl(path)
    const coverUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    const { data, error } = await client.from('creators').update({ cover_url: coverUrl } as never).eq('id', me.id).select(CREATOR_SELECT).single<CreatorFichaRow>()
    if (error) throw error

    creator.value = mapCreatorRow(data)
    return coverUrl
  }

  /** Vuelve al degradado de portada por defecto — no borra el archivo del bucket, solo la referencia. */
  async function removeCoverPhoto() {
    const me = creator.value ?? (await ensureCreator())
    if (!me) throw new Error('No hay ficha de creador que actualizar.')

    const { data, error } = await useSupabaseClient().from('creators').update({ cover_url: null } as never).eq('id', me.id).select(CREATOR_SELECT).single<CreatorFichaRow>()
    if (error) throw error

    creator.value = mapCreatorRow(data)
  }

  /**
   * Límite de WIP de una fase del tablero (ver PhaseBoard.vue) — `limit`
   * nulo o <= 0 quita el límite en vez de guardar un 0 sin sentido. Se
   * reescribe el JSONB entero (lee-modifica-escribe): solo el propio
   * creador lo toca, no hay concurrencia real que lo haga arriesgado.
   */
  async function setWipLimit(phase: string, limit: number | null) {
    const me = creator.value ?? (await ensureCreator())
    if (!me) throw new Error('No hay ficha de creador que actualizar.')

    const next = { ...me.boardWipLimits }
    if (limit && limit > 0) next[phase] = limit
    else delete next[phase]

    const { data, error } = await useSupabaseClient()
      .from('creators')
      .update({ board_wip_limits: next } as never)
      .eq('id', me.id)
      .select(CREATOR_SELECT)
      .single<CreatorFichaRow>()
    if (error) throw error

    creator.value = mapCreatorRow(data)
  }

  function reset() {
    creator.value = undefined
  }

  return { creator, ensureCreator, updateFicha, uploadCoverPhoto, removeCoverPhoto, setWipLimit, reset }
}
