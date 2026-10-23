export interface SavedProfileEntry {
  savedId: string
  kind: 'creator' | 'partner'
  id: string
  name: string
  bio: string | null
  categories: string[]
  coverUrl: string | null
  createdAt: string
}

interface SavedProfileRow {
  id: string
  target_creator_id: string | null
  target_partner_id: string | null
  created_at: string
}

interface CreatorLookupRow {
  id: string
  display_name: string
  bio: string | null
  categories: string[] | null
  cover_url: string | null
}

interface PartnerLookupRow {
  id: string
  company_name: string
  bio: string | null
  categories: string[] | null
  cover_url: string | null
}

/**
 * Favoritos guardados desde Descubrir (ver DiscoveryCard.vue/FeaturedDeck.vue)
 * — pura propiedad del que guarda, sin RPC: `saved_profiles` ya valida con
 * RLS que solo se lee/escribe lo propio. `savedCreatorIds`/`savedPartnerIds`
 * son Sets para que marcar/desmarcar el icono en una card sea instantáneo
 * sin ir a red por cada una.
 */
export function useSavedProfiles() {
  const client = useSupabaseClient()
  const { resolveMyProfileId } = useMyProfileId()

  const savedCreatorIds = useState<Set<string>>('saved-profiles-creator-ids', () => new Set())
  const savedPartnerIds = useState<Set<string>>('saved-profiles-partner-ids', () => new Set())
  const loaded = useState<boolean>('saved-profiles-loaded', () => false)
  const toggling = useState<string | null>('saved-profiles-toggling', () => null)

  async function ensureIdsLoaded() {
    if (loaded.value) return
    const { data, error } = await client.from('saved_profiles').select('target_creator_id, target_partner_id')
    if (error) {
      console.error('[useSavedProfiles] fallo al cargar favoritos:', error.message)
      return
    }
    const rows = data as Pick<SavedProfileRow, 'target_creator_id' | 'target_partner_id'>[]
    savedCreatorIds.value = new Set(rows.map((r) => r.target_creator_id).filter((id): id is string => !!id))
    savedPartnerIds.value = new Set(rows.map((r) => r.target_partner_id).filter((id): id is string => !!id))
    loaded.value = true
  }

  function isSaved(kind: 'creator' | 'partner', id: string) {
    return kind === 'creator' ? savedCreatorIds.value.has(id) : savedPartnerIds.value.has(id)
  }

  /** Alterna guardar/quitar. No depende de `ensureIdsLoaded()` para decidir qué hacer — pregunta siempre al set ya cargado en memoria. */
  async function toggleSave(kind: 'creator' | 'partner', id: string) {
    toggling.value = id
    try {
      if (isSaved(kind, id)) {
        const column = kind === 'creator' ? 'target_creator_id' : 'target_partner_id'
        const { error } = await client.from('saved_profiles').delete().eq(column, id)
        if (error) throw error
        const set = kind === 'creator' ? savedCreatorIds : savedPartnerIds
        set.value = new Set(set.value)
        set.value.delete(id)
      } else {
        const myProfileId = await resolveMyProfileId()
        if (!myProfileId) throw new Error('Sin sesión.')
        const payload = kind === 'creator'
          ? { owner_profile_id: myProfileId, target_creator_id: id }
          : { owner_profile_id: myProfileId, target_partner_id: id }
        const { error } = await client.from('saved_profiles').insert(payload as never)
        if (error) throw error
        const set = kind === 'creator' ? savedCreatorIds : savedPartnerIds
        set.value = new Set(set.value)
        set.value.add(id)
      }
    } catch (e) {
      console.error('[useSavedProfiles] fallo al guardar/quitar favorito:', (e as { message?: string })?.message)
    } finally {
      toggling.value = null
    }
  }

  /** Lista completa con los datos de ficha para pintar `/favorites` — siempre fresca, sin caché (mismo criterio que `usePublicProfile`). */
  async function listSaved(): Promise<SavedProfileEntry[]> {
    const { data, error } = await client
      .from('saved_profiles')
      .select('id, target_creator_id, target_partner_id, created_at')
      .order('created_at', { ascending: false })
    if (error || !data) {
      console.error('[useSavedProfiles] fallo al listar favoritos:', error?.message)
      return []
    }
    const rows = data as SavedProfileRow[]
    const creatorIds = rows.map((r) => r.target_creator_id).filter((id): id is string => !!id)
    const partnerIds = rows.map((r) => r.target_partner_id).filter((id): id is string => !!id)

    const [{ data: creatorRows }, { data: partnerRows }] = await Promise.all([
      creatorIds.length
        ? client.from('creators').select('id, display_name, bio, categories, cover_url').in('id', creatorIds)
        : Promise.resolve({ data: [] as CreatorLookupRow[] }),
      partnerIds.length
        ? client.from('partners').select('id, company_name, bio, categories, cover_url').in('id', partnerIds)
        : Promise.resolve({ data: [] as PartnerLookupRow[] })
    ])

    const creatorById = new Map((creatorRows as CreatorLookupRow[] | null ?? []).map((c) => [c.id, c]))
    const partnerById = new Map((partnerRows as PartnerLookupRow[] | null ?? []).map((p) => [p.id, p]))

    const entries: SavedProfileEntry[] = []
    for (const row of rows) {
      if (row.target_creator_id) {
        const c = creatorById.get(row.target_creator_id)
        // El perfil guardado pudo borrarse después — se omite en vez de romper la lista.
        if (!c) continue
        entries.push({
          savedId: row.id, kind: 'creator', id: c.id, name: c.display_name, bio: c.bio,
          categories: c.categories ?? [], coverUrl: c.cover_url, createdAt: row.created_at
        })
      } else if (row.target_partner_id) {
        const p = partnerById.get(row.target_partner_id)
        if (!p) continue
        entries.push({
          savedId: row.id, kind: 'partner', id: p.id, name: p.company_name, bio: p.bio,
          categories: p.categories ?? [], coverUrl: p.cover_url, createdAt: row.created_at
        })
      }
    }
    return entries
  }

  function reset() {
    savedCreatorIds.value = new Set()
    savedPartnerIds.value = new Set()
    loaded.value = false
    toggling.value = null
  }

  return { savedCreatorIds, savedPartnerIds, loaded, toggling, ensureIdsLoaded, isSaved, toggleSave, listSaved, reset }
}
