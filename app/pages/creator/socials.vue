<script setup lang="ts">
import { socialAccounts as initialAccounts } from '~/utils/mock-data'
import { localPhotos } from '~/utils/images'

useHead({ title: 'Redes' })

const banner = localPhotos.socials

const accounts = ref(initialAccounts.map((a) => ({ ...a })))

function toggle(id: string) {
  const acc = accounts.value.find((a) => a.id === id)
  if (acc) acc.connected = !acc.connected
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

    <div class="flex flex-col gap-2.5 md:max-w-xl">
      <SocialAccountRow
        v-for="acc in accounts" :key="acc.id" :account="acc"
        @connect="toggle(acc.id)" @disconnect="toggle(acc.id)"
      />
    </div>
  </AppShell>
</template>
