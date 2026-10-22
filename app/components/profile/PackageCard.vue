<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import type { Package } from '~/composables/usePackages'

const props = defineProps<{ pkg: Package; editable?: boolean; pendingOffers?: number; dragHandle?: boolean }>()
defineEmits<{ edit: [pkg: Package]; delete: [pkg: Package]; offer: [pkg: Package]; toggleActive: [pkg: Package]; duplicate: [pkg: Package] }>()
</script>

<template>
  <BaseCard radius="lg" padding="md">
    <div class="flex items-start gap-3">
      <Icon v-if="dragHandle" name="ph:dots-six-vertical-bold" class="size-4 shrink-0 mt-1 text-[var(--color-text-faint)] cursor-grab active:cursor-grabbing" />

      <div
        class="relative size-14 shrink-0 rounded-[var(--radius-sm)] overflow-hidden flex items-center justify-center bg-[var(--color-ink-overlay)]"
        :class="!pkg.active && 'opacity-50'"
      >
        <img v-if="pkg.coverUrl" :src="pkg.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
        <Icon v-else name="ph:package-fill" class="size-5 text-[var(--color-text-faint)]" />
      </div>

      <div class="min-w-0 flex-1" :class="!pkg.active && 'opacity-60'">
        <div class="flex items-start justify-between gap-3">
          <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ pkg.title }}</p>
          <p class="shrink-0 text-[1.0625rem] font-display text-[var(--color-text)]">{{ formatEuros(pkg.priceCents) }}</p>
        </div>
        <p v-if="pkg.description" class="text-[0.8125rem] text-[var(--color-text-muted)] mt-0.5 leading-relaxed line-clamp-2">{{ pkg.description }}</p>
        <ul v-if="pkg.deliverables.length" class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <li v-for="d in pkg.deliverables" :key="d" class="flex items-center gap-1 text-[0.8125rem] text-[var(--color-text-muted)]">
            <Icon name="ph:check-bold" class="size-3.5 text-[var(--color-primary-500)] shrink-0" /> {{ d }}
          </li>
        </ul>
      </div>

      <button
        v-if="editable" type="button" role="switch" :aria-checked="pkg.active"
        :aria-label="pkg.active ? 'Pausar paquete' : 'Activar paquete'"
        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 shrink-0 mt-0.5"
        :class="pkg.active ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-hairline-strong)]'"
        @click="$emit('toggleActive', pkg)"
      >
        <span
          class="inline-block size-4 rounded-full bg-white shadow transition-transform duration-200"
          :class="pkg.active ? 'translate-x-4' : 'translate-x-0.5'"
        />
      </button>
    </div>

    <div class="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-[var(--color-hairline)]">
      <template v-if="editable">
        <span v-if="pendingOffers" class="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[0.75rem] font-medium bg-[var(--color-status-review)]/15 text-[var(--color-status-review)]">
          <Icon name="ph:hourglass-fill" class="size-3.5" /> {{ pendingOffers }} pendiente{{ pendingOffers > 1 ? 's' : '' }}
        </span>
        <span v-else-if="!pkg.active" class="text-[0.75rem] text-[var(--color-text-faint)]">Inactivo</span>
        <BaseButton variant="secondary" size="sm" class="ml-auto" @click="$emit('edit', pkg)">Editar</BaseButton>
        <BaseButton variant="ghost" size="sm" icon="ph:copy-fill" icon-only aria-label="Duplicar" @click="$emit('duplicate', pkg)" />
        <BaseButton variant="danger" size="sm" @click="$emit('delete', pkg)">Eliminar</BaseButton>
      </template>
      <BaseButton v-else variant="primary" size="sm" class="w-full" @click="$emit('offer', pkg)">Hacer oferta</BaseButton>
    </div>
  </BaseCard>
</template>
