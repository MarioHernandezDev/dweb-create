import { platformMeta } from '~/utils/mock-data'
import type { SocialAccount } from '~/types'

interface SocialAccountRow {
  id: string
  platform: SocialAccount['platform']
  handle: string | null
  followers_count: number
}

/**
 * Las redes conectadas del influencer logueado, leídas de `social_accounts`.
 * La tabla solo guarda una fila POR red ya conectada (sin fila = sin
 * conectar) — aquí se completa con el resto de plataformas del catálogo
 * para que la pantalla siga mostrando las 6, conectadas o no, como antes.
 *
 * Conectar de verdad vía OAuth es Fase 4 (ver docs/3-ML-PIPELINE.md); por
 * ahora "Conectar" crea la fila (sin token) y "..." la borra, que ya es un
 * camino de escritura real contra Supabase, no una simulación local.
 */
export function useMySocialAccounts() {
  const client = useSupabaseClient()
  const { influencer, ensureInfluencer } = useMyInfluencer()

  const accounts = useState<SocialAccount[]>('my-social-accounts', () => [])
  const loaded = useState<boolean>('my-social-accounts-loaded', () => false)

  function merge(rows: SocialAccountRow[]): SocialAccount[] {
    const byPlatform = new Map(rows.map((r) => [r.platform, r]))
    return Object.keys(platformMeta).map((platform) => {
      const row = byPlatform.get(platform as SocialAccount['platform'])
      return {
        id: row?.id ?? platform,
        platform: platform as SocialAccount['platform'],
        handle: row?.handle ?? '',
        followers: row?.followers_count ?? 0,
        deltaPct: 0,
        connected: !!row
      }
    })
  }

  async function refresh() {
    const me = influencer.value ?? (await ensureInfluencer())
    if (!me) return

    const { data, error } = await client
      .from('social_accounts')
      .select('id, platform, handle, followers_count')
      .eq('influencer_id', me.id)
    if (error) {
      console.error('[useMySocialAccounts] fallo al cargar redes:', error.message)
      return
    }
    accounts.value = merge(data as SocialAccountRow[])
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return accounts.value
  }

  async function connect(platform: SocialAccount['platform']) {
    const me = influencer.value ?? (await ensureInfluencer())
    if (!me) return

    const { error } = await client.from('social_accounts').insert({ influencer_id: me.id, platform } as never)
    if (error) throw error
    await refresh()
  }

  async function disconnect(platform: SocialAccount['platform']) {
    const me = influencer.value ?? (await ensureInfluencer())
    if (!me) return

    const { error } = await client.from('social_accounts').delete().eq('influencer_id', me.id).eq('platform', platform)
    if (error) throw error
    await refresh()
  }

  return { accounts, loaded, refresh, ensureLoaded, connect, disconnect }
}
