import { platformMeta, isComingSoonPlatform } from '~/utils/mock-data'
import type { SocialAccount } from '~/types'

/**
 * Acciones sobre las redes conectadas (conectar, desconectar, sincronizar) con
 * sus avisos. Antes vivían en la página Redes (`/creator/socials`), que se
 * eliminó por redundante: ahora las usa Métricas. Mismo comportamiento:
 *  - Desconectar pide confirmación y dice lo que de verdad se sabe de la
 *    revocación en el proveedor (nunca afirma una revocación que no se confirmó).
 *  - Si no se pudo confirmar la revocación, no se desconecta sin que el usuario lo decida.
 *  - Solo se pide reconectar si el servidor dice que el acceso está caducado,
 *    revocado o sin permiso; un fallo pasajero no le pide nada al usuario.
 */
export function useSocialAccountActions() {
  const { accounts, connect, disconnect, sync } = useMySocialAccounts()
  const { confirm } = useConfirm()
  const route = useRoute()

  // Vuelta del OAuth real de Instagram/YouTube (el callback de cada red redirige
  // aquí con su propio nombre de query). `accounts` ya se recargó con el resultado real.
  const oauthPlatformParam = route.query.instagram ? 'instagram' : route.query.youtube ? 'youtube' : null
  const oauthQueryValue = oauthPlatformParam ? route.query[oauthPlatformParam] : null
  const connectResult = oauthQueryValue === 'connected'
    ? { ok: true as const, platform: oauthPlatformParam! }
    : oauthQueryValue === 'error'
      ? { ok: false as const, reason: typeof route.query.reason === 'string' ? route.query.reason : 'No se ha podido conectar.' }
      : null

  const busyPlatform = ref<SocialAccount['platform'] | null>(null)
  const syncingPlatform = ref<SocialAccount['platform'] | null>(null)
  const syncError = ref('')
  const syncReconnect = ref<SocialAccount['platform'] | null>(null)
  const disconnectNotice = ref<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null)

  function noticeFor(platform: SocialAccount['platform'], revocation: DisconnectRevocation) {
    const label = platformMeta[platform].label
    switch (revocation) {
      case 'revoked': return { tone: 'ok' as const, text: `${label} desconectado y acceso revocado en Google.` }
      case 'already_invalid': return { tone: 'ok' as const, text: `${label} desconectado. El acceso ya no era válido en Google.` }
      case 'unconfirmed':
        return { tone: 'warn' as const, text: `${label} desconectado, pero NO se pudo confirmar la revocación en Google. Quita el acceso a mano en myaccount.google.com/permissions.` }
      case 'not_supported':
        return { tone: 'warn' as const, text: `${label} desconectado de FEEDMA. FEEDMA no puede retirar el acceso en Instagram: para quitarlo del todo, hazlo desde los ajustes de tu cuenta de Instagram.` }
      default: return { tone: 'ok' as const, text: `${label} desconectado.` }
    }
  }

  async function disconnectAccount(acc: SocialAccount) {
    const isYoutube = acc.platform === 'youtube'
    const ok = await confirm({
      title: `¿Desconectar ${platformMeta[acc.platform].label}?`,
      message: isYoutube
        ? 'Dejarás de ver sus métricas y de poder usarla para predicciones hasta que la vuelvas a conectar. Revocaremos también el acceso de FEEDMA en tu cuenta de Google.'
        : 'Dejarás de ver sus métricas y de poder usarla para predicciones hasta que la vuelvas a conectar. Instagram no permite que FEEDMA retire el acceso: para quitarlo del todo tendrás que hacerlo desde los ajustes de tu cuenta de Instagram.',
      confirmLabel: 'Desconectar', tone: 'danger', icon: 'ph:plugs-fill'
    })
    if (!ok) return

    try {
      disconnectNotice.value = noticeFor(acc.platform, await disconnect(acc.platform))
    } catch (err) {
      const { code } = readSocialApiError(err)
      if (code !== 'revoke_unconfirmed') {
        console.error(`[social-actions] fallo al desconectar ${acc.platform}:`, err)
        disconnectNotice.value = { tone: 'error', text: 'No se ha podido desconectar la cuenta. Inténtalo de nuevo.' }
        return
      }
      const force = await confirm({
        title: 'No se ha podido confirmar la revocación',
        message: 'No hemos podido confirmar con Google que se haya retirado el acceso (puede ser un problema temporal). Puedes cancelar y reintentarlo, o desconectar igualmente y quitar el acceso tú a mano en myaccount.google.com/permissions.',
        confirmLabel: 'Desconectar igualmente', tone: 'danger', icon: 'ph:warning-fill'
      })
      if (!force) return
      try {
        disconnectNotice.value = noticeFor(acc.platform, await disconnect(acc.platform, true))
      } catch (err2) {
        console.error(`[social-actions] fallo al desconectar ${acc.platform} (forzado):`, err2)
        disconnectNotice.value = { tone: 'error', text: 'No se ha podido desconectar la cuenta. Inténtalo de nuevo.' }
      }
    }
  }

  /** Conecta o desconecta según el estado de la cuenta. */
  async function toggle(acc: SocialAccount) {
    if (isComingSoonPlatform(acc.platform)) return
    disconnectNotice.value = null
    busyPlatform.value = acc.platform
    try {
      if (acc.connected) await disconnectAccount(acc)
      else await connect(acc.platform)
    } finally {
      busyPlatform.value = null
    }
  }

  async function syncAccount(acc: SocialAccount) {
    syncingPlatform.value = acc.platform
    syncError.value = ''
    syncReconnect.value = null
    try {
      await sync(acc.platform)
    } catch (err) {
      console.error(`[social-actions] fallo al sincronizar ${acc.platform}:`, err)
      const { code, message } = readSocialApiError(err)
      if (code === 'reconnect_required') syncReconnect.value = acc.platform
      syncError.value = message ?? 'No se han podido actualizar los seguidores. Inténtalo de nuevo en unos minutos.'
    } finally {
      syncingPlatform.value = null
    }
  }

  // Si la fila ya muestra "Reconectar" por el estado guardado, el aviso solo repetiría lo mismo.
  const rowAlreadyShowsReconnect = computed(() => {
    const acc = accounts.value.find((a) => a.platform === syncReconnect.value)
    return !!acc && acc.connected && !!acc.status && acc.status !== 'connected'
  })

  return {
    connect, connectResult, busyPlatform, syncingPlatform, syncError, syncReconnect, disconnectNotice, rowAlreadyShowsReconnect,
    toggle, syncAccount
  }
}
