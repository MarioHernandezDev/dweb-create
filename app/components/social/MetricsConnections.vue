<script setup lang="ts">
import type { SocialAccount } from '~/types'

/**
 * Sección "Conexiones" de Métricas: una fila por red con conectar, actualizar y
 * desconectar. Presentacional: las acciones y sus avisos viven en
 * `useSocialAccountActions`. En pantallas anchas las filas se reparten en dos
 * columnas dentro de su contenedor.
 */
defineProps<{
  accounts: SocialAccount[]
  connectedCount: number
  busyPlatform: SocialAccount['platform'] | null
  syncingPlatform: SocialAccount['platform'] | null
}>()
defineEmits<{ toggle: [acc: SocialAccount]; sync: [acc: SocialAccount]; reconnect: [platform: SocialAccount['platform']] }>()
</script>

<template>
  <section id="conexiones" class="scroll-mt-24" aria-labelledby="conexiones-titulo">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 mb-1">
      <h2 id="conexiones-titulo" class="font-display text-[1.25rem] text-[var(--color-text)]">Conexiones</h2>
      <p class="text-[0.75rem] text-[var(--color-text-faint)]">{{ connectedCount }} de {{ accounts.length }} conectadas</p>
    </div>
    <p class="text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed mb-4">
      Conecta tus cuentas para que tus métricas se actualicen solas y podamos calcular predicciones con tu historial real.
    </p>
    <div class="flex flex-col gap-2.5">
      <SocialAccountRow
        v-for="acc in accounts" :key="acc.platform" :account="acc" :busy="busyPlatform === acc.platform"
        :syncing="syncingPlatform === acc.platform"
        @connect="$emit('toggle', acc)" @disconnect="$emit('toggle', acc)" @sync="$emit('sync', acc)" @reconnect="$emit('reconnect', acc.platform)"
      />
    </div>
  </section>
</template>
