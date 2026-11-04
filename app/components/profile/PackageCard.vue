<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import type { Package } from '~/composables/usePackages'

const props = defineProps<{ pkg: Package; editable?: boolean; pendingOffers?: number; dragHandle?: boolean }>()
defineEmits<{ edit: [pkg: Package]; delete: [pkg: Package]; offer: [pkg: Package]; toggleActive: [pkg: Package]; duplicate: [pkg: Package] }>()

// Mismo truco de matiz-por-hash que BoardCard.vue, para la miniatura cuando
// no hay portada subida — ver avatar.ts coverArtFromString.
function hueFromId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash % 360
}
</script>

<template>
  <!-- Ticket de encargo, no una card más: el precio es un talón aparte,
       no un dato más dentro de la fila — es lo primero que se lee, como en
       una entrada de verdad. `overflow: visible` a propósito: las muescas
       de la costura perforada sobresalen de la caja. -->
  <div class="flex rounded-[var(--radius-sm)] border border-[var(--color-hairline-strong)] bg-[var(--color-paper)]">
    <div class="min-w-0 flex-1">
      <div class="flex items-start gap-3 p-4">
        <Icon v-if="dragHandle" name="ph:dots-six-vertical-bold" class="size-4 shrink-0 mt-1 text-[var(--color-text-faint)] cursor-grab active:cursor-grabbing" />

        <div
          class="relative size-12 shrink-0 rounded-[var(--radius-xs)] overflow-hidden flex items-center justify-center"
          :class="!pkg.active && 'opacity-50'"
          :style="{ backgroundColor: `hsl(${hueFromId(pkg.id)} 24% 93%)`, backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 6px, transparent 6px 12px)' }"
        >
          <img v-if="pkg.coverUrl" :src="pkg.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
          <Icon v-else name="ph:package-fill" class="size-5 text-[var(--color-text)] opacity-30" />
        </div>

        <div class="min-w-0 flex-1" :class="!pkg.active && 'opacity-60'">
          <p class="text-base font-semibold text-[var(--color-text)] truncate">{{ pkg.title }}</p>
          <p v-if="pkg.description" class="text-sm text-[var(--color-text-muted)] mt-0.5 leading-relaxed line-clamp-2">{{ pkg.description }}</p>
          <ul v-if="pkg.deliverables.length" class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <li v-for="d in pkg.deliverables" :key="d" class="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
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

      <div class="flex items-center gap-2 px-4 pb-3.5 pt-3 border-t border-[var(--color-hairline)]">
        <template v-if="editable">
          <span v-if="pendingOffers" class="inline-flex items-center gap-1 px-2 h-7 rounded-full text-micro font-medium bg-[var(--color-status-review)]/15 text-[var(--color-status-review)]">
            <Icon name="ph:hourglass-fill" class="size-3.5" /> {{ pendingOffers }} pendiente{{ pendingOffers > 1 ? 's' : '' }}
          </span>
          <span v-else-if="!pkg.active" class="text-micro text-[var(--color-text-faint)]">Inactivo</span>
          <BaseButton variant="secondary" size="sm" class="ml-auto" @click="$emit('edit', pkg)">Editar</BaseButton>
          <BaseButton variant="ghost" size="sm" icon="ph:copy-fill" icon-only aria-label="Duplicar" @click="$emit('duplicate', pkg)" />
          <BaseButton variant="danger" size="sm" @click="$emit('delete', pkg)">Eliminar</BaseButton>
        </template>
        <BaseButton v-else variant="primary" size="sm" class="w-full" @click="$emit('offer', pkg)">Hacer oferta</BaseButton>
      </div>
    </div>

    <!-- Costura perforada -->
    <div class="relative w-0.5 shrink-0" style="background-image: repeating-linear-gradient(to bottom, var(--color-hairline-strong) 0 6px, transparent 6px 13px)">
      <span class="absolute -top-2 -left-2 size-4 rounded-full bg-[var(--color-ink)] border border-[var(--color-hairline-strong)] border-l-0" />
      <span class="absolute -bottom-2 -left-2 size-4 rounded-full bg-[var(--color-ink)] border border-[var(--color-hairline-strong)] border-l-0" />
    </div>

    <!-- Talón de precio -->
    <div class="w-24 shrink-0 rounded-r-[var(--radius-sm)] flex flex-col items-center justify-center gap-0.5 p-2.5 bg-[var(--color-slate)]">
      <p class="font-display text-[1.375rem] text-white leading-none">{{ formatEuros(pkg.priceCents) }}</p>
      <p class="text-micro text-white/55">precio</p>
    </div>
  </div>
</template>
