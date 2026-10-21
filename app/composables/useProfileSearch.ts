import type { Role } from '~/types'

export interface ProfileSearchResult {
  id: string
  role: Role
  name: string
  subtitle: string
}

const RESULT_LIMIT = 8

/**
 * Buscador de perfiles (barra en TopBar.vue) — sobre los mismos directorios
 * públicos `creators`/`partners` que ya usa "Descubrir" (sin tocar ese
 * código). Devuelve creadores y partners mezclados, por nombre.
 */
export function useProfileSearch() {
  const client = useSupabaseClient()

  const results = useState<ProfileSearchResult[]>('profile-search-results', () => [])
  const loading = useState<boolean>('profile-search-loading', () => false)

  async function search(query: string) {
    const q = query.trim()
    if (!q) {
      results.value = []
      return results.value
    }

    loading.value = true
    try {
      const [creatorsRes, partnersRes] = await Promise.all([
        client
          .from('creators')
          .select('id, display_name, niche')
          .ilike('display_name', `%${q}%`)
          .limit(RESULT_LIMIT),
        client
          .from('partners')
          .select('id, company_name, industry')
          .ilike('company_name', `%${q}%`)
          .limit(RESULT_LIMIT)
      ])

      const creators = (creatorsRes.data ?? []) as { id: string; display_name: string; niche: string | null }[]
      const partners = (partnersRes.data ?? []) as { id: string; company_name: string; industry: string | null }[]

      results.value = [
        ...creators.map((c): ProfileSearchResult => ({ id: c.id, role: 'creator', name: c.display_name, subtitle: c.niche || 'Creador de contenido' })),
        ...partners.map((p): ProfileSearchResult => ({ id: p.id, role: 'partner', name: p.company_name, subtitle: p.industry || 'Partner' }))
      ]
      return results.value
    } finally {
      loading.value = false
    }
  }

  function clear() {
    results.value = []
  }

  return { results, loading, search, clear }
}
