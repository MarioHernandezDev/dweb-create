<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import type { Package } from '~/composables/usePackages'

const props = defineProps<{ pkg: Package; editable?: boolean }>()
defineEmits<{ edit: [pkg: Package]; delete: [pkg: Package]; offer: [pkg: Package] }>()
</script>

<template>
  <BaseCard radius="lg" padding="md">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ pkg.title }}</p>
        <p v-if="pkg.description" class="text-[0.8125rem] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{{ pkg.description }}</p>
        <ul v-if="pkg.deliverables.length" class="mt-2 flex flex-col gap-1">
          <li v-for="d in pkg.deliverables" :key="d" class="flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-text-muted)]">
            <Icon name="ph:check-bold" class="size-3.5 text-[var(--color-primary-500)] shrink-0" /> {{ d }}
          </li>
        </ul>
      </div>
      <p class="shrink-0 text-[1.0625rem] font-display text-[var(--color-text)]">{{ formatEuros(pkg.priceCents) }}</p>
    </div>

    <div class="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-[var(--color-hairline)]">
      <template v-if="editable">
        <span v-if="!pkg.active" class="text-[0.75rem] text-[var(--color-text-faint)]">Inactivo</span>
        <BaseButton variant="secondary" size="sm" @click="$emit('edit', pkg)">Editar</BaseButton>
        <BaseButton variant="danger" size="sm" @click="$emit('delete', pkg)">Eliminar</BaseButton>
      </template>
      <BaseButton v-else variant="primary" size="sm" class="w-full" @click="$emit('offer', pkg)">Hacer oferta</BaseButton>
    </div>
  </BaseCard>
</template>
