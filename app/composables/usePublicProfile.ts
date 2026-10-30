import type { ChatPrivacy, Platform, Role } from '~/types'

export interface PublicVerifiedSocial {
  platform: Platform
  handle: string | null
  followersCount: number
}

export interface PublicProfile {
  profileId: string
  role: Role
  name: string
  avatarUrl: string | null
  coverUrl: string | null
  createdAt: string
  bio: string | null
  categories: string[]
  /** Solo partners: sector (columna `industry` de `partners`, ya legible por cualquier usuario autenticado). */
  industry: string | null
  minCents: number | null
  maxCents: number | null
  lookingFor: string | null
  chatPrivacy: ChatPrivacy
  /** Solo para creadores — redes con OAuth de verdad detrás (ver get_public_social_accounts), nunca las "conectadas" a mano sin token. Vacío para partners. */
  verifiedSocials: PublicVerifiedSocial[]
}

interface SocialAccountPublicRow {
  platform: Platform
  handle: string | null
  followers_count: number
}

interface ProfileRow {
  id: string
  chat_privacy: ChatPrivacy
  avatar_url: string | null
}

interface CreatorRow {
  id: string
  profile_id: string
  display_name: string
  bio: string | null
  categories: string[] | null
  min_rate_cents: number | null
  max_rate_cents: number | null
  looking_for: string | null
  cover_url: string | null
  created_at: string
}

interface PartnerRow {
  id: string
  profile_id: string
  company_name: string
  industry: string | null
  bio: string | null
  categories: string[] | null
  min_budget_cents: number | null
  max_budget_cents: number | null
  looking_for: string | null
  cover_url: string | null
  created_at: string
}

/**
 * Ficha pública de OTRO perfil (creador o partner), para
 * app/pages/profile/[role]/[id].vue — reusa los directorios públicos de
 * `creators`/`partners` que ya existían para "Descubrir" (no se toca
 * ese código, solo se lee de las mismas tablas).
 *
 * Siempre en fresco: sin caché, a propósito — mismo criterio que
 * `listPackagesOf` en usePackages.ts. Un `useState` cacheado por perfil se
 * quedaba pegado a los datos de la primera visita: si entrabas al perfil de
 * alguien, esa persona actualizaba su bio/foto, y volvías a entrar sin
 * recargar la página entera, seguías viendo lo viejo.
 */
export function usePublicProfile() {
  const client = useSupabaseClient()

  const loading = useState<boolean>('public-profile-loading', () => false)

  /** `id` es el id de la fila `creators`/`partners` (el mismo que usa /creator/discover y /partner/discover). */
  async function loadProfile(role: Role, id: string) {
    loading.value = true
    try {
      if (role === 'creator') {
        const { data, error } = await client
          .from('creators')
          .select('id, profile_id, display_name, bio, categories, min_rate_cents, max_rate_cents, looking_for, cover_url, created_at')
          .eq('id', id)
          .maybeSingle<CreatorRow>()
        if (error || !data) return null

        const [{ data: profileRow }, { data: socialRows }] = await Promise.all([
          client.from('profiles').select('id, chat_privacy, avatar_url').eq('id', data.profile_id).maybeSingle<ProfileRow>(),
          client.rpc('get_public_social_accounts', { p_creator_id: data.id } as never)
        ])

        const mapped: PublicProfile = {
          profileId: data.profile_id,
          role: 'creator',
          name: data.display_name,
          avatarUrl: profileRow?.avatar_url ?? null,
          coverUrl: data.cover_url,
          createdAt: data.created_at,
          bio: data.bio,
          categories: data.categories ?? [],
          industry: null,
          minCents: data.min_rate_cents,
          maxCents: data.max_rate_cents,
          lookingFor: data.looking_for,
          chatPrivacy: profileRow?.chat_privacy ?? 'everyone',
          verifiedSocials: ((socialRows as SocialAccountPublicRow[] | null) ?? []).map((r) => ({
            platform: r.platform,
            handle: r.handle,
            followersCount: r.followers_count
          }))
        }
        return mapped
      }

      const { data, error } = await client
        .from('partners')
        .select('id, profile_id, company_name, industry, bio, categories, min_budget_cents, max_budget_cents, looking_for, cover_url, created_at')
        .eq('id', id)
        .maybeSingle<PartnerRow>()
      if (error || !data) return null

      const { data: profileRow } = await client.from('profiles').select('id, chat_privacy, avatar_url').eq('id', data.profile_id).maybeSingle<ProfileRow>()

      const mapped: PublicProfile = {
        profileId: data.profile_id,
        role: 'partner',
        name: data.company_name,
        avatarUrl: profileRow?.avatar_url ?? null,
        coverUrl: data.cover_url,
        createdAt: data.created_at,
        bio: data.bio,
        categories: data.categories ?? [],
        industry: data.industry,
        minCents: data.min_budget_cents,
        maxCents: data.max_budget_cents,
        lookingFor: data.looking_for,
        chatPrivacy: profileRow?.chat_privacy ?? 'everyone',
        verifiedSocials: []
      }
      return mapped
    } finally {
      loading.value = false
    }
  }

  return { loading, loadProfile }
}
