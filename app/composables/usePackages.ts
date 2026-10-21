export interface Package {
  id: string
  profileId: string
  title: string
  description: string | null
  priceCents: number
  deliverables: string[]
  active: boolean
  createdAt: string
}

interface PackageRow {
  id: string
  profile_id: string
  title: string
  description: string | null
  price_cents: number
  deliverables: string[] | null
  active: boolean
  created_at: string
}

const PACKAGE_SELECT = 'id, profile_id, title, description, price_cents, deliverables, active, created_at'

function mapRow(row: PackageRow): Package {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    deliverables: row.deliverables ?? [],
    active: row.active,
    createdAt: row.created_at
  }
}

/**
 * Catálogo de "paquetes" de un perfil — igual de cerca para un creador
 * (lo que ofrece) que para un partner (lo que necesita), ver migración
 * 20261021160000_chat_packages_offers.sql. El copy ("Tus paquetes" vs "Tus
 * necesidades") lo decide la página, no este composable.
 */
export function usePackages() {
  const client = useSupabaseClient()

  const myPackages = useState<Package[] | undefined>('my-packages', () => undefined)
  const saving = useState<boolean>('packages-saving', () => false)

  async function ensureMyPackages(profileId: string) {
    if (myPackages.value !== undefined) return myPackages.value

    const { data, error } = await client
      .from('packages')
      .select(PACKAGE_SELECT)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[usePackages] fallo al cargar tus paquetes:', error.message)
      return []
    }
    myPackages.value = (data as PackageRow[]).map(mapRow)
    return myPackages.value
  }

  /**
   * Paquetes activos de OTRO perfil (para su página pública y para el botón
   * "+" del chat) — directorio de solo lectura. Siempre en fresco: sin
   * caché, a propósito. Un `useState` cacheado por profileId se quedaba
   * pegado a un array vacío la primera vez que alguien no tenía paquetes
   * todavía ([] es "verdadero" en JS, así que `if (cache[id])` nunca volvía
   * a disparar la consulta aunque luego se publicara un paquete de verdad).
   */
  async function listPackagesOf(profileId: string) {
    const { data, error } = await client
      .from('packages')
      .select(PACKAGE_SELECT)
      .eq('profile_id', profileId)
      .eq('active', true)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[usePackages] fallo al cargar los paquetes del perfil:', error.message)
      return []
    }
    return (data as PackageRow[]).map(mapRow)
  }

  async function createPackage(params: { profileId: string; title: string; description?: string | null; priceCents: number; deliverables?: string[] }) {
    saving.value = true
    try {
      const { data, error } = await client
        .from('packages')
        .insert({
          profile_id: params.profileId,
          title: params.title,
          description: params.description || null,
          price_cents: params.priceCents,
          deliverables: params.deliverables ?? []
        } as never)
        .select(PACKAGE_SELECT)
        .single<PackageRow>()
      if (error) throw error

      const mapped = mapRow(data)
      myPackages.value = [...(myPackages.value ?? []), mapped]
      return mapped
    } finally {
      saving.value = false
    }
  }

  async function updatePackage(id: string, patch: { title?: string; description?: string | null; priceCents?: number; deliverables?: string[]; active?: boolean }) {
    saving.value = true
    try {
      const payload: Record<string, unknown> = {}
      if (patch.title !== undefined) payload.title = patch.title
      if (patch.description !== undefined) payload.description = patch.description
      if (patch.priceCents !== undefined) payload.price_cents = patch.priceCents
      if (patch.deliverables !== undefined) payload.deliverables = patch.deliverables
      if (patch.active !== undefined) payload.active = patch.active

      const { data, error } = await client
        .from('packages')
        .update(payload as never)
        .eq('id', id)
        .select(PACKAGE_SELECT)
        .single<PackageRow>()
      if (error) throw error

      const mapped = mapRow(data)
      myPackages.value = (myPackages.value ?? []).map((p) => (p.id === id ? mapped : p))
      return mapped
    } finally {
      saving.value = false
    }
  }

  async function deletePackage(id: string) {
    const { error } = await client.from('packages').delete().eq('id', id)
    if (error) {
      console.error('[usePackages] fallo al borrar el paquete:', error.message)
      return
    }
    myPackages.value = (myPackages.value ?? []).filter((p) => p.id !== id)
  }

  return { myPackages, saving, ensureMyPackages, listPackagesOf, createPackage, updatePackage, deletePackage }
}
