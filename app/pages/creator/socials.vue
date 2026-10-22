<script setup lang="ts">
import { localPhotos } from '~/utils/images'
import { platformMeta, VERIFIED_SOCIAL_PLATFORMS } from '~/utils/mock-data'
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
const { confirm } = useConfirm()

async function toggle(acc: SocialAccount) {
  if (acc.connected) {
    const ok = await confirm({
      title: `¿Desconectar ${acc.platform}?`,
      message: 'Dejarás de ver sus seguidores y de poder usarla para predicciones hasta que la vuelvas a conectar.',
      confirmLabel: 'Desconectar', tone: 'danger', icon: 'ph:plugs-fill'
    })
    if (!ok) return
  } else if (!VERIFIED_SOCIAL_PLATFORMS.includes(acc.platform)) {
    // Para el resto, "conectar" aún no verifica nada de verdad. Mejor
    // decirlo claro aquí que dejar que parezca una cuenta real conectada.
    const ok = await confirm({
      title: 'Esta red todavía no verifica tu cuenta',
      message: 'Por ahora solo se guarda como "conectada" sin seguidores reales ni datos de verdad — la integración completa todavía no está lista. Instagram y YouTube sí son conexiones reales.',
      confirmLabel: 'Conectar igualmente', icon: 'ph:info-fill'
    })
    if (!ok) return
  }

  busyPlatform.value = acc.platform
  try {
    if (acc.connected) await disconnect(acc.platform)
    else await connect(acc.platform)
  } finally {
    busyPlatform.value = null
  }
}

async function syncAccount(acc: SocialAccount) {
  syncingPlatform.value = acc.platform
  syncError.value = ''
  try {
    await sync(acc.platform)
  } catch (err) {
    console.error(`[creator/socials] fallo al sincronizar ${acc.platform}:`, err)
    syncError.value = 'No se han podido actualizar los seguidores. Si la conexión es antigua, reconecta la cuenta.'
  } finally {
    syncingPlatform.value = null
  }
}

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

    <p v-if="syncError" class="mb-4 text-[0.8125rem] text-[var(--color-status-alert)] md:max-w-xl">{{ syncError }}</p>

    <div class="flex flex-col gap-2.5 md:max-w-xl">
      <SocialAccountRow
        v-for="acc in accounts" :key="acc.platform" :account="acc" :busy="busyPlatform === acc.platform"
        :syncing="syncingPlatform === acc.platform"
        @connect="toggle(acc)" @disconnect="toggle(acc)" @sync="syncAccount(acc)"
      />
    </div>
  </AppShell>
</template>
