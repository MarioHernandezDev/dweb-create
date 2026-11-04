<script setup lang="ts">
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

const pending = computed(() => props.items.filter((i) => !i.done))
</script>

<template>
  <!-- A sangre: el banner toca los bordes superior y laterales del contenedor
       (compensa el relleno de la página con márgenes negativos). -->
  <section class="profile-hero yt-reveal" data-profile-hero>
    <div class="profile-hero__cover" aria-hidden="true">
      <img v-if="coverUrl" :src="coverUrl" alt="" class="profile-hero__img">
      <CoverArt v-else :seed="coverSeed" />
    </div>

    <div class="profile-hero__body">
      <div class="profile-hero__row">
        <div class="profile-hero__avatar">
          <AvatarUploader :avatar-url="avatarUrl" :initials="initials" :hue="hue" :upload="upload" :remove="remove" fluid />
        </div>
        <div class="profile-hero__who">
          <h2 class="profile-hero__name" data-hero-name>{{ name }}</h2>
          <p class="profile-hero__sub">{{ subtitle }}</p>
        </div>
        <div class="profile-hero__actions" data-hero-actions>
          <slot name="actions" />
        </div>
      </div>

      <div class="profile-hero__meta">
        <div class="flex flex-wrap items-center gap-2" data-hero-facts>
          <slot name="facts" />
        </div>

        <div data-hero-completion>
          <div class="flex items-center justify-between mb-1.5">
            <p class="text-sm font-medium text-[var(--text-muted)]">
              Ficha completa al <span class="font-semibold text-[var(--text-strong)]">{{ percent }}%</span>
            </p>
            <Icon v-if="percent >= 100" name="ph:check-circle-fill" class="size-4 text-[var(--color-phase-published)]" />
          </div>
          <div class="h-2 rounded-full bg-[var(--surface-sunken)] overflow-hidden" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100" aria-label="Ficha completa">
            <div
              class="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]"
              :class="percent >= 100 ? 'bg-[var(--color-phase-published)]' : 'bg-[var(--color-tinta-950)]'"
              :style="{ width: `${percent}%` }"
            />
          </div>
          <p v-if="pending.length" class="mt-2 text-sm text-[var(--text-muted)]">
            Te falta:
            <template v-for="(p, i) in pending" :key="p.label">
              <button v-if="p.tab" type="button" class="underline hover:text-[var(--text-strong)]" data-pending-link @click="emit('select-tab', p.tab)">{{ p.label }}</button>
              <span v-else>{{ p.label }}</span><span v-if="i < pending.length - 1">, </span>
            </template>.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
