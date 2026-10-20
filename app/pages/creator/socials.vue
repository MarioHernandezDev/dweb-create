<script setup lang="ts">
import { localPhotos } from '~/utils/images'
import type { SocialAccount } from '~/types'

useHead({ title: 'Redes' })

const banner = localPhotos.socials

const { accounts, ensureLoaded, connect, disconnect } = useMySocialAccounts()
await ensureLoaded()

const route = useRoute()
// Vuelta del OAuth real de Instagram (server/api/auth/instagram/callback.get.ts
// redirige aquí con uno de estos dos). No hace falta guardar nada: `accounts`
// ya se recargó arriba con el resultado real tras el redirect.
const connectResult = route.query.instagram === 'connected'
  ? { ok: true as const }
  : route.query.instagram === 'error'
    ? { ok: false as const, reason: typeof route.query.reason === 'string' ? route.query.reason : 'No se ha podido conectar.' }
    : null

const busyPlatform = ref<SocialAccount['platform'] | null>(null)

async function toggle(acc: SocialAccount) {
  busyPlatform.value = acc.platform
  try {
    if (acc.connected) await disconnect(acc.platform)
    else await connect(acc.platform)
  } finally {
    busyPlatform.value = null
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
      Cuenta de Instagram conectada.
    </p>
    <p
      v-else-if="connectResult && !connectResult.ok" class="mb-4 text-[0.8125rem] text-[var(--color-status-alert)] md:max-w-xl"
    >
      {{ connectResult.reason }}
    </p>

    <div class="flex flex-col gap-2.5 md:max-w-xl">
      <SocialAccountRow
        v-for="acc in accounts" :key="acc.platform" :account="acc" :busy="busyPlatform === acc.platform"
        @connect="toggle(acc)" @disconnect="toggle(acc)"
      />
    </div>
  </AppShell>
</template>
