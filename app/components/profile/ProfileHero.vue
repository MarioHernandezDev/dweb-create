<script setup lang="ts">
import { coverArtFromString } from '~/utils/avatar'

/**
 * Cabecera de "Tu perfil" (A-R18b) para creador y partner: portada, avatar,
 * nombre, datos reales y acciones, con el estado de la ficha a la derecha.
 * Es la ÚNICA presentación del porcentaje de ficha completa (antes se repetía
 * encima de las pestañas) y cada elemento que falta lleva a la pestaña donde
 * se arregla. No inventa datos: lo que no existe no se muestra; los datos
 * (chips) y las acciones llegan por slot desde cada página.
 *
 * Distinto de ProfileHeaderCard.vue a propósito: aquel es la tarjeta PÚBLICA
 * (lo que ve otro usuario) y no se toca.
 */
export interface HeroCompletionItem { label: string; done: boolean; tab?: string }

const props = defineProps<{
  name: string
  subtitle: string
  coverUrl: string | null
  coverSeed: string
  avatarUrl: string | null
  initials: string
  hue: number
  upload: (file: File) => Promise<string>
  remove?: () => Promise<void>
  percent: number
  items: HeroCompletionItem[]
}>()
const emit = defineEmits<{ 'select-tab': [tab: string] }>()

const art = computed(() => coverArtFromString(props.coverSeed))
const coverStyle = computed(() => props.coverUrl
  ? { backgroundImage: `url("${props.coverUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
  : { background: `linear-gradient(${art.value.angle}deg, ${art.value.from}, ${art.value.to})` })
const pending = computed(() => props.items.filter((i) => !i.done))
</script>

<template>
  <section class="rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)] overflow-hidden yt-reveal" data-profile-hero>
    <div class="h-28 md:h-40" :style="coverStyle" aria-hidden="true" />

    <div class="px-5 md:px-8 pb-5 md:pb-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex items-end gap-4 min-w-0">
          <div class="shrink-0 -mt-10 md:-mt-12 rounded-full ring-4 ring-[var(--color-paper)]">
            <AvatarUploader :avatar-url="avatarUrl" :initials="initials" :hue="hue" :upload="upload" :remove="remove" />
          </div>
          <div class="min-w-0 pt-3 pb-1">
            <h2 class="font-display text-[1.375rem] md:text-[1.75rem] leading-tight text-[var(--color-text)] truncate" data-hero-name>{{ name }}</h2>
            <p class="text-[0.875rem] text-[var(--color-text-muted)] truncate">{{ subtitle }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2" data-hero-actions>
          <slot name="actions" />
        </div>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div class="flex flex-wrap items-center gap-2" data-hero-facts>
          <slot name="facts" />
        </div>

        <div data-hero-completion>
          <div class="flex items-center justify-between mb-1.5">
            <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">
              Ficha completa al <span class="font-semibold text-[var(--color-text)]">{{ percent }}%</span>
            </p>
            <Icon v-if="percent >= 100" name="ph:check-circle-fill" class="size-4 text-[var(--color-status-published)]" />
          </div>
          <div class="h-2 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100" aria-label="Ficha completa">
            <div
              class="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-spring)]"
              :class="percent >= 100 ? 'bg-[var(--color-status-published)]' : 'bg-[var(--color-primary-500)]'"
              :style="{ width: `${percent}%` }"
            />
          </div>
          <p v-if="pending.length" class="mt-2 text-[0.75rem] text-[var(--color-text-faint)]">
            Te falta:
            <template v-for="(p, i) in pending" :key="p.label">
              <button v-if="p.tab" type="button" class="underline underline-offset-2 hover:text-[var(--color-text)]" data-pending-link @click="emit('select-tab', p.tab)">{{ p.label }}</button>
              <span v-else>{{ p.label }}</span><span v-if="i < pending.length - 1">, </span>
            </template>.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
