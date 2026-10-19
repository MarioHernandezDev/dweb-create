<script setup lang="ts">
import { socialAccounts as initialAccounts } from '~/utils/mock-data'

useHead({ title: 'Redes' })

const accounts = ref(initialAccounts.map((a) => ({ ...a })))

function toggle(id: string) {
  const acc = accounts.value.find((a) => a.id === id)
  if (acc) acc.connected = !acc.connected
}

const connectedCount = computed(() => accounts.value.filter((a) => a.connected).length)
</script>

<template>
  <AppShell role="creator" title="Redes conectadas" :subtitle="`${connectedCount} de ${accounts.length} conectadas`">
    <p class="text-[0.9375rem] text-[var(--color-text-muted)] leading-relaxed mb-6 max-w-[48ch]">
      Conecta tus cuentas para que tus métricas se actualicen solas y podamos calcular predicciones con tu historial real.
    </p>

    <div class="flex flex-col gap-2.5">
      <SocialAccountRow
        v-for="acc in accounts" :key="acc.id" :account="acc"
        @connect="toggle(acc.id)" @disconnect="toggle(acc.id)"
      />
    </div>
  </AppShell>
</template>
