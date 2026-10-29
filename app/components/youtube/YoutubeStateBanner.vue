<script setup lang="ts">
/**
 * Aviso de estado del dashboard de YouTube. Cada caso dice QUÉ pasa y QUÉ
 * hacer; "reconectar" solo aparece cuando de verdad es la solución, y un fallo
 * pasajero dice expresamente que no hace falta reconectar.
 */
export type YoutubeBannerKind = 'reconnect' | 'temporary' | 'analytics-reconnect' | 'analytics-temporary'

const props = defineProps<{ kind: YoutubeBannerKind; message?: string | null; busy?: boolean }>()
defineEmits<{ reconnect: []; retry: [] }>()

const content = computed(() => {
  switch (props.kind) {
    case 'reconnect':
      return {
        icon: 'ph:plugs-fill', tone: 'alert' as const, action: 'reconnect' as const,
        title: 'Hay que reconectar YouTube',
        text: props.message ?? 'El acceso ha caducado o se ha revocado. Reconecta la cuenta para volver a ver tus estadísticas.'
      }
    case 'temporary':
      return {
        icon: 'ph:cloud-slash-fill', tone: 'warn' as const, action: 'retry' as const,
        title: 'No se han podido cargar las estadísticas ahora mismo',
        text: props.message ?? 'Es un problema pasajero: no hace falta reconectar. Inténtalo de nuevo en unos minutos.'
      }
    case 'analytics-reconnect':
      return {
        icon: 'ph:lock-key-fill', tone: 'warn' as const, action: 'reconnect' as const,
        title: 'Faltan las analíticas del canal',
        text: 'Ves los totales del canal, pero no la evolución: falta el permiso de analíticas o el acceso se ha revocado. Reconecta la cuenta para verla.'
      }
    default:
      return {
        icon: 'ph:cloud-slash-fill', tone: 'warn' as const, action: 'retry' as const,
        title: 'Las analíticas no se han podido cargar ahora',
        text: 'Es un problema pasajero (límite o corte de YouTube): no hace falta reconectar. Los totales del canal sí se ven.'
      }
  }
})
</script>

<template>
  <BaseCard
    radius="lg" padding="md" class="flex items-start gap-3"
    :role="content.tone === 'alert' ? 'alert' : 'status'" aria-live="polite"
  >
    <Icon
      :name="content.icon" class="size-5 shrink-0 mt-0.5"
      :class="content.tone === 'alert' ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-text-faint)]'"
    />
    <div class="min-w-0 flex-1">
      <p class="text-[0.9375rem] font-medium text-[var(--color-text)] mb-1">{{ content.title }}</p>
      <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mb-3">{{ content.text }}</p>
      <BaseButton v-if="content.action === 'reconnect'" variant="primary" size="sm" @click="$emit('reconnect')">Reconectar YouTube</BaseButton>
      <BaseButton v-else variant="secondary" size="sm" :icon-spin="busy" :disabled="busy" @click="$emit('retry')">Reintentar</BaseButton>
    </div>
  </BaseCard>
</template>
