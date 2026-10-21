import type { ChatPrivacy, Role } from '~/types'

export interface PublicProfile {
  profileId: string
  role: Role
  name: string
  bio: string | null
  categories: string[]
  minCents: number | null
  maxCents: number | null
  lookingFor: string | null
  chatPrivacy: ChatPrivacy
}

interface ProfileRow {
  id: string
  chat_privacy: ChatPrivacy
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
}

interface PartnerRow {
  id: string
  profile_id: string
  company_name: string
  bio: string | null
  categories: string[] | null
  min_budget_cents: number | null
  max_budget_cents: number | null
  looking_for: string | null
}

/**
 * Ficha pública de OTRO perfil (creador o partner), para
 * app/pages/profile/[role]/[id].vue — reusa los directorios públicos de
 * `creators`/`partners` que ya existían para "Descubrir" (no se toca
 * ese código, solo se lee de las mismas tablas).
 */
export function usePublicProfile() {
  const client = useSupabaseClient()

  const profilesById = useState<Record<string, PublicProfile>>('public-profiles-by-id', () => ({}))
  const loading = useState<boolean>('public-profile-loading', () => false)

  /** `id` es el id de la fila `creators`/`partners` (el mismo que usa /creator/discover y /partner/discover). */
  async function loadProfile(role: Role, id: string) {
    const cacheKey = `${role}:${id}`
    if (profilesById.value[cacheKey]) return profilesById.value[cacheKey]

    loading.value = true
    try {
      if (role === 'creator') {
        const { data, error } = await client
          .from('creators')
          .select('id, profile_id, display_name, bio, categories, min_rate_cents, max_rate_cents, looking_for')
          .eq('id', id)
          .maybeSingle<CreatorRow>()
        if (error || !data) return null

        const { data: profileRow } = await client.from('profiles').select('id, chat_privacy').eq('id', data.profile_id).maybeSingle<ProfileRow>()

        const mapped: PublicProfile = {
          profileId: data.profile_id,
          role: 'creator',
          name: data.display_name,
          bio: data.bio,
          categories: data.categories ?? [],
          minCents: data.min_rate_cents,
          maxCents: data.max_rate_cents,
          lookingFor: data.looking_for,
          chatPrivacy: profileRow?.chat_privacy ?? 'everyone'
        }
        profilesById.value = { ...profilesById.value, [cacheKey]: mapped }
        return mapped
      }

      const { data, error } = await client
        .from('partners')
        .select('id, profile_id, company_name, bio, categories, min_budget_cents, max_budget_cents, looking_for')
        .eq('id', id)
        .maybeSingle<PartnerRow>()
      if (error || !data) return null

      const { data: profileRow } = await client.from('profiles').select('id, chat_privacy').eq('id', data.profile_id).maybeSingle<ProfileRow>()

      const mapped: PublicProfile = {
        profileId: data.profile_id,
        role: 'partner',
        name: data.company_name,
        bio: data.bio,
        categories: data.categories ?? [],
        minCents: data.min_budget_cents,
        maxCents: data.max_budget_cents,
        lookingFor: data.looking_for,
        chatPrivacy: profileRow?.chat_privacy ?? 'everyone'
      }
      profilesById.value = { ...profilesById.value, [cacheKey]: mapped }
      return mapped
    } finally {
      loading.value = false
    }
  }

  return { profilesById, loading, loadProfile }
}
