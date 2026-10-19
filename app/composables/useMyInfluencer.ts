export interface MyInfluencer {
  id: string
  displayName: string
  niche: string | null
  managerId: string | null
  managerName: string | null
}

/**
 * La ficha de `influencers` del usuario logueado (rol "creator" en el
 * frontend). Se resuelve una vez por sesión de pestaña — ver
 * `role-guard.global.ts`, que la deja lista antes de que cualquier página
 * del rol "creator" se monte, igual que hace con `useMyRole`.
 */
export function useMyInfluencer() {
  const influencer = useState<MyInfluencer | null | undefined>('my-influencer', () => undefined)

  async function ensureInfluencer(userId?: string) {
    if (influencer.value !== undefined) return influencer.value

    const id = userId ?? useSupabaseUser().value?.id
    if (!id) {
      influencer.value = null
      return null
    }

    const client = useSupabaseClient()
    const { data } = await client
      .from('influencers')
      .select('id, display_name, niche, manager_id, managers(agency_name)')
      .eq('profile_id', id)
      .maybeSingle<{ id: string; display_name: string; niche: string | null; manager_id: string | null; managers: { agency_name: string } | null }>()

    influencer.value = data
      ? { id: data.id, displayName: data.display_name, niche: data.niche, managerId: data.manager_id, managerName: data.managers?.agency_name ?? null }
      : null
    return influencer.value
  }

  function reset() {
    influencer.value = undefined
  }

  return { influencer, ensureInfluencer, reset }
}
