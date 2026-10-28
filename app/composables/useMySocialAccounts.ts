import { platformMeta, isComingSoonPlatform } from '~/utils/mock-data'
import type { SocialAccount } from '~/types'

interface SocialAccountRow {
  id: string
  platform: SocialAccount['platform']
  handle: string | null
  followers_count: number
}

/**
 * Las redes conectadas del creador logueado, leídas de `social_accounts`.
 * La tabla solo guarda una fila POR red ya conectada (sin fila = sin
 * conectar) — aquí se completa con el resto de plataformas del catálogo
 * para que la pantalla siga mostrando las 6, conectadas o no, como antes.
 *
 * Conectar de verdad vía OAuth es Fase 4 (ver docs/3-ML-PIPELINE.md). Para
 * Instagram (docs/9-INSTAGRAM-OAUTH-SETUP.md) y YouTube
 * (docs/10-YOUTUBE-OAUTH-SETUP.md) ya está hecho: "Conectar" manda el
 * navegador entero a `/api/auth/<red>/start`, que termina escribiendo la
 * fila de verdad (con token cifrado) tras el OAuth. TikTok, X, Facebook y
 * LinkedIn no tienen OAuth: se muestran como "Próximamente", `connect()` no
 * hace nada para ellas y cualquier fila antigua sin token se ignora aquí
 * (no cuenta como conectada).
 */
export function useMySocialAccounts() {
  const client = useSupabaseClient()
  const { creator, ensureCreator } = useMyCreator()

  const accounts = useState<SocialAccount[]>('my-social-accounts', () => [])
  const loaded = useState<boolean>('my-social-accounts-loaded', () => false)

  function merge(rows: SocialAccountRow[]): SocialAccount[] {
    const byPlatform = new Map(rows.map((r) => [r.platform, r]))
    return Object.keys(platformMeta).map((platform) => {
      const comingSoon = isComingSoonPlatform(platform as SocialAccount['platform'])
      const row = comingSoon ? undefined : byPlatform.get(platform as SocialAccount['platform'])
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
    const me = creator.value ?? (await ensureCreator())
    if (!me) return

    const { data, error } = await client
      .from('social_accounts')
      .select('id, platform, handle, followers_count')
      .eq('creator_id', me.id)
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

  // Plataformas con OAuth real ya montado — "Conectar" sale de la app
  // entera hacia el proveedor (no es un fetch, es una navegación real) en
  // vez de insertar una fila vacía. Ver server/api/auth/<red>/start.get.ts.
  const OAUTH_PLATFORMS: Partial<Record<SocialAccount['platform'], string>> = {
    instagram: '/api/auth/instagram/start',
    youtube: '/api/auth/youtube/start'
  }

  async function connect(platform: SocialAccount['platform']) {
    const startUrl = OAUTH_PLATFORMS[platform]
    if (startUrl) {
      await navigateTo(startUrl, { external: true })
      return
    }

    // Sin OAuth real no se conecta nada: antes aquí se insertaba una fila sin
    // token desde el navegador, que parecía una cuenta conectada y no lo era.
  }

  // Sin cron todavía que lo haga solo (ver docs/9-INSTAGRAM-OAUTH-SETUP.md
  // §5) — este es el único sitio donde el nº de seguidores se refresca tras
  // la conexión inicial, para las plataformas con OAuth real.
  const SYNC_ENDPOINTS: Partial<Record<SocialAccount['platform'], string>> = {
    instagram: '/api/social/instagram-sync',
    youtube: '/api/social/youtube-sync'
  }

  async function sync(platform: SocialAccount['platform']) {
    const endpoint = SYNC_ENDPOINTS[platform]
    if (!endpoint) return
    await $fetch(endpoint, { method: 'POST' })
    await refresh()
  }

  async function disconnect(platform: SocialAccount['platform']) {
    const me = creator.value ?? (await ensureCreator())
    if (!me) return

    const { error } = await client.from('social_accounts').delete().eq('creator_id', me.id).eq('platform', platform)
    if (error) throw error
    await refresh()
  }

  return { accounts, loaded, refresh, ensureLoaded, connect, disconnect, sync }
}
