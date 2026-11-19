export interface MyPartner {
  id: string
  name: string
  industry: string | null
  bio: string | null
  categories: string[]
  minBudgetCents: number | null
  maxBudgetCents: number | null
  lookingFor: string | null
  coverUrl: string | null
  /** Formatos que ofrece (post, reel, stories, ambassador). */
  collaborationTypes: string[]
  headline: string | null
  location: string | null
  website: string | null
  showCollaborations: boolean
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
  cover_url: string | null
  collaboration_types: string[] | null
  headline: string | null
  location: string | null
  website: string | null
  show_collaborations: boolean | null
}

const PARTNER_SELECT = 'id, company_name, industry, bio, categories, min_budget_cents, max_budget_cents, looking_for, cover_url, collaboration_types, headline, location, website, show_collaborations'

function mapPartnerRow(data: PartnerFichaRow): MyPartner {
  return {
    id: data.id,
    name: data.company_name,
    industry: data.industry,
    bio: data.bio,
    categories: data.categories ?? [],
    minBudgetCents: data.min_budget_cents,
    maxBudgetCents: data.max_budget_cents,
    lookingFor: data.looking_for,
    coverUrl: data.cover_url,
    collaborationTypes: data.collaboration_types ?? [],
    headline: data.headline,
    location: data.location,
    website: data.website,
    showCollaborations: data.show_collaborations ?? true
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
    collaborationTypes?: string[]
    headline?: string | null
    location?: string | null
    website?: string | null
    showCollaborations?: boolean
  }) {
    const me = partner.value ?? (await ensurePartner())
    if (!me) throw new Error('No hay ficha de partner que actualizar.')

    const payload: Record<string, unknown> = {}
    if (patch.bio !== undefined) payload.bio = patch.bio
    if (patch.categories !== undefined) payload.categories = patch.categories
    if (patch.minBudgetCents !== undefined) payload.min_budget_cents = patch.minBudgetCents
    if (patch.maxBudgetCents !== undefined) payload.max_budget_cents = patch.maxBudgetCents
    if (patch.lookingFor !== undefined) payload.looking_for = patch.lookingFor
    if (patch.collaborationTypes !== undefined) payload.collaboration_types = patch.collaborationTypes
    if (patch.headline !== undefined) payload.headline = patch.headline
    if (patch.location !== undefined) payload.location = patch.location
    if (patch.website !== undefined) payload.website = patch.website
    if (patch.showCollaborations !== undefined) payload.show_collaborations = patch.showCollaborations

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

  /**
   * Foto de portada de la ficha — la que se ve grande en las cards de
   * /creator/discover. Mismo patrón que `useMyCreator.uploadCoverPhoto`,
   * reutilizando el bucket `post-media` (sus policies solo miran la carpeta
   * `<auth.uid()>`, no el rol).
   */
  async function uploadCoverPhoto(file: File) {
    const me = partner.value ?? (await ensurePartner())
    if (!me) throw new Error('No hay ficha de partner que actualizar.')

    const client = useSupabaseClient()
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) throw userError ?? new Error('No hay sesión activa.')

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userData.user.id}/profile-cover.${ext}`

    const { error: uploadError } = await client.storage.from('post-media').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = client.storage.from('post-media').getPublicUrl(path)
    const coverUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    const { data, error } = await client.from('partners').update({ cover_url: coverUrl } as never).eq('id', me.id).select(PARTNER_SELECT).single<PartnerFichaRow>()
    if (error) throw error

    partner.value = mapPartnerRow(data)
    return coverUrl
  }

  /** Vuelve al degradado de portada por defecto — no borra el archivo del bucket, solo la referencia. */
  async function removeCoverPhoto() {
    const me = partner.value ?? (await ensurePartner())
    if (!me) throw new Error('No hay ficha de partner que actualizar.')

    const { data, error } = await useSupabaseClient().from('partners').update({ cover_url: null } as never).eq('id', me.id).select(PARTNER_SELECT).single<PartnerFichaRow>()
    if (error) throw error

    partner.value = mapPartnerRow(data)
  }

  function reset() {
    partner.value = undefined
  }

  return { partner, ensurePartner, updateFicha, uploadCoverPhoto, removeCoverPhoto, reset }
}
