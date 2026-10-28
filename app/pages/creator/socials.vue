<script setup lang="ts">
import { localPhotos } from '~/utils/images'
import { platformMeta, isComingSoonPlatform } from '~/utils/mock-data'
import type { SocialAccount } from '~/types'

useHead({ title: 'Redes' })

const banner = localPhotos.socials

const { accounts, ensureLoaded, connect, disconnect, sync } = useMySocialAccounts()
await ensureLoaded()

const route = useRoute()
// Vuelta del OAuth real de Instagram/YouTube (callback.get.ts de cada red
// redirige aquí con uno de estos dos, con su propio nombre de query). No
// hace falta guardar nada: `accounts` ya se recargó arriba con el resultado
// real tras el redirect.
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
const { confirm } = useConfirm()

// Resultado de la última desconexión: lo que de verdad se sabe del proveedor.
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
      console.error(`[creator/socials] fallo al desconectar ${acc.platform}:`, err)
      disconnectNotice.value = { tone: 'error', text: 'No se ha podido desconectar la cuenta. Inténtalo de nuevo.' }
      return
    }
    // No se pudo confirmar la revocación: no se desconecta sin que el usuario lo decida.
    const force = await confirm({
      title: 'No se ha podido confirmar la revocación',
      message: 'No hemos podido confirmar con Google que se haya retirado el acceso (puede ser un problema temporal). Puedes cancelar y reintentarlo, o desconectar igualmente y quitar el acceso tú a mano en myaccount.google.com/permissions.',
      confirmLabel: 'Desconectar igualmente', tone: 'danger', icon: 'ph:warning-fill'
    })
    if (!force) return
    try {
      disconnectNotice.value = noticeFor(acc.platform, await disconnect(acc.platform, true))
    } catch (err2) {
      console.error(`[creator/socials] fallo al desconectar ${acc.platform} (forzado):`, err2)
      disconnectNotice.value = { tone: 'error', text: 'No se ha podido desconectar la cuenta. Inténtalo de nuevo.' }
    }
  }
}

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
    console.error(`[creator/socials] fallo al sincronizar ${acc.platform}:`, err)
    // Solo se pide reconectar si el servidor dice que el acceso está caducado,
    // revocado o sin permiso; un fallo pasajero no debe pedirle nada al usuario.
    const { code, message } = readSocialApiError(err)
    if (code === 'reconnect_required') syncReconnect.value = acc.platform
    syncError.value = message ?? 'No se han podido actualizar los seguidores. Inténtalo de nuevo en unos minutos.'
  } finally {
    syncingPlatform.value = null
  }
}

// Si la fila ya muestra "Reconectar" por el estado guardado, el aviso de
// arriba solo repetiría lo mismo.
const rowAlreadyShowsReconnect = computed(() => {
  const acc = accounts.value.find((a) => a.platform === syncReconnect.value)
  return !!acc && acc.connected && !!acc.status && acc.status !== 'connected'
})

const connectedCount = computed(() => accounts.value.filter((a) => a.connected).length)
</script>

<template>
  <AppShell role="creator" title="Redes conectadas" :subtitle="`${connectedCount} de ${accounts.length} conectadas`">
    <div class="relative h-32 md:h-40 rounded-[var(--radius-lg)] overflow-hidden mb-6 md:max-w-xl">
      <CoverImage :photo="banner" :width="800" :height="320" scrim="tint" class="absolute inset-0" />
    </div>

    <p class="text-[0.9375rem] text-[var(--color-text-muted)] leading-relaxed mb-6 max-w-[48ch]">
      Conecta tus cuentas para que tus métricas se actualicen solas y podamos calcular predicciones con tu historial real.
    </p>

    <p
      v-if="connectResult?.ok" class="mb-4 text-[0.8125rem] text-[var(--color-status-published)] md:max-w-xl"
    >
      Cuenta de {{ platformMeta[connectResult.platform].label }} conectada.
    </p>
    <p
      v-else-if="connectResult && !connectResult.ok" class="mb-4 text-[0.8125rem] text-[var(--color-status-alert)] md:max-w-xl"
    >
      {{ connectResult.reason }}
    </p>

    <p
      v-if="disconnectNotice" class="mb-4 text-[0.8125rem] md:max-w-xl"
      :class="disconnectNotice.tone === 'ok' ? 'text-[var(--color-status-published)]' : disconnectNotice.tone === 'warn' ? 'text-[var(--color-text)]' : 'text-[var(--color-status-alert)]'"
    >
      {{ disconnectNotice.text }}
    </p>

    <div v-if="syncError && !rowAlreadyShowsReconnect" class="mb-4 flex flex-wrap items-center gap-3 md:max-w-xl">
      <p class="text-[0.8125rem] text-[var(--color-status-alert)]">{{ syncError }}</p>
      <BaseButton v-if="syncReconnect" variant="primary" size="sm" @click="connect(syncReconnect)">Reconectar</BaseButton>
    </div>

    <div class="flex flex-col gap-2.5 md:max-w-xl">
      <SocialAccountRow
        v-for="acc in accounts" :key="acc.platform" :account="acc" :busy="busyPlatform === acc.platform"
        :syncing="syncingPlatform === acc.platform"
        @connect="toggle(acc)" @disconnect="toggle(acc)" @sync="syncAccount(acc)" @reconnect="connect(acc.platform)"
      />
    </div>
  </AppShell>
</template>
