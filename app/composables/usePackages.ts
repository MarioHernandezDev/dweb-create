export interface Package {
  id: string
  profileId: string
  title: string
  description: string | null
  priceCents: number
  deliverables: string[]
  active: boolean
  coverUrl: string | null
  sortOrder: number
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
  cover_url: string | null
  sort_order: number
  created_at: string
}

const PACKAGE_SELECT = 'id, profile_id, title, description, price_cents, deliverables, active, cover_url, sort_order, created_at'

function mapRow(row: PackageRow): Package {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    deliverables: row.deliverables ?? [],
    active: row.active,
    coverUrl: row.cover_url,
    sortOrder: row.sort_order,
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

  // `sort_order asc, created_at desc`: los paquetes sin reordenar a mano
  // (todos a 0 por defecto, ver la migración) caen todos en el mismo grupo
  // y ahí se desempata por fecha — el más reciente arriba, sin necesidad de
  // tocar nada. En cuanto alguien reordena con reorderPackages(), esos
  // valores explícitos mandan.
  const ORDER = [
    { column: 'sort_order', ascending: true },
    { column: 'created_at', ascending: false }
  ] as const

  async function ensureMyPackages(profileId: string) {
    if (myPackages.value !== undefined) return myPackages.value

    let query = client.from('packages').select(PACKAGE_SELECT).eq('profile_id', profileId)
    for (const o of ORDER) query = query.order(o.column, { ascending: o.ascending })
    const { data, error } = await query
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
    let query = client.from('packages').select(PACKAGE_SELECT).eq('profile_id', profileId).eq('active', true)
    for (const o of ORDER) query = query.order(o.column, { ascending: o.ascending })
    const { data, error } = await query
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
      myPackages.value = [mapped, ...(myPackages.value ?? [])]
      return mapped
    } finally {
      saving.value = false
    }
  }

  /** Copia rápida de un paquete existente — mismo contenido, título con "(copia)", sin su portada (empieza sin foto, a propósito: no se duplica el archivo de Storage). */
  async function duplicatePackage(pkg: Package) {
    return createPackage({
      profileId: pkg.profileId,
      title: `${pkg.title} (copia)`,
      description: pkg.description,
      priceCents: pkg.priceCents,
      deliverables: [...pkg.deliverables]
    })
  }

  async function updatePackage(
    id: string,
    patch: { title?: string; description?: string | null; priceCents?: number; deliverables?: string[]; active?: boolean; coverUrl?: string | null }
  ) {
    saving.value = true
    try {
      const payload: Record<string, unknown> = {}
      if (patch.title !== undefined) payload.title = patch.title
      if (patch.description !== undefined) payload.description = patch.description
      if (patch.priceCents !== undefined) payload.price_cents = patch.priceCents
      if (patch.deliverables !== undefined) payload.deliverables = patch.deliverables
      if (patch.active !== undefined) payload.active = patch.active
      if (patch.coverUrl !== undefined) payload.cover_url = patch.coverUrl

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

  /**
   * Portada de un paquete concreto — mismo patrón que uploadCoverPhoto en
   * useMyCreator.ts/useMyPartner.ts, reutilizando el bucket `post-media`
   * (sus policies solo miran la carpeta `<auth.uid()>`, no qué es el archivo).
   */
  async function uploadPackageCover(packageId: string, file: File) {
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) throw userError ?? new Error('No hay sesión activa.')

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userData.user.id}/package-${packageId}.${ext}`

    const { error: uploadError } = await client.storage.from('post-media').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = client.storage.from('post-media').getPublicUrl(path)
    const coverUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    await updatePackage(packageId, { coverUrl })
    return coverUrl
  }

  /**
   * Persiste el nuevo orden tras arrastrar en la lista de "Tus paquetes"/
   * "Tus necesidades" — valores 1..n (nunca 0, ver ORDER arriba) para que un
   * paquete recién creado siga apareciendo arriba hasta que también se
   * reordene. Actualiza el local al instante; cada escritura de verdad va
   * aparte, sin bloquear la UI a que termine la última.
   */
  async function reorderPackages(orderedIds: string[]) {
    const current = myPackages.value ?? []
    const byId = new Map(current.map((p) => [p.id, p]))
    myPackages.value = orderedIds.map((id, i) => {
      const pkg = byId.get(id)
      return pkg ? { ...pkg, sortOrder: i + 1 } : pkg
    }).filter((p): p is Package => !!p)

    for (const [i, id] of orderedIds.entries()) {
      const { error } = await client.from('packages').update({ sort_order: i + 1 } as never).eq('id', id)
      if (error) console.error('[usePackages] fallo al guardar el nuevo orden:', error.message)
    }
  }

  async function deletePackage(id: string) {
    const { error } = await client.from('packages').delete().eq('id', id)
    if (error) {
      console.error('[usePackages] fallo al borrar el paquete:', error.message)
      // Antes se tragaba el error en silencio: el paquete seguía en la
      // lista y nadie sabía por qué "Eliminar" no había hecho nada.
      throw error
    }
    myPackages.value = (myPackages.value ?? []).filter((p) => p.id !== id)
  }

  /**
   * Resumen de los paquetes activos de varios perfiles de una sola vez (cuántos y desde cuánto), para enseñarlo en las
   * tarjetas de Descubrir sin una consulta por tarjeta. Solo lectura; los perfiles sin paquetes no aparecen.
   */
  async function summarizePackagesOf(profileIds: string[]): Promise<Record<string, { count: number; minCents: number }>> {
    const ids = [...new Set(profileIds)].filter(Boolean)
    if (!ids.length) return {}
    const { data, error } = await client.from('packages').select('profile_id, price_cents').in('profile_id', ids).eq('active', true)
    if (error) {
      console.error('[usePackages] fallo al resumir paquetes:', error.message)
      return {}
    }
    const out: Record<string, { count: number; minCents: number }> = {}
    for (const row of data as { profile_id: string; price_cents: number }[]) {
      const cur = out[row.profile_id]
      out[row.profile_id] = cur ? { count: cur.count + 1, minCents: Math.min(cur.minCents, row.price_cents) } : { count: 1, minCents: row.price_cents }
    }
    return out
  }

  return {
    myPackages,
    saving,
    ensureMyPackages,
    listPackagesOf,
    summarizePackagesOf,
    createPackage,
    duplicatePackage,
    updatePackage,
    uploadPackageCover,
    reorderPackages,
    deletePackage
  }
}
