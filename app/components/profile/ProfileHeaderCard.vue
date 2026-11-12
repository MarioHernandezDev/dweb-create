<script setup lang="ts">
import { initialsFromName, hueFromString, coverArtFromString } from '~/utils/avatar'

/**
 * Cabecera de "tarjeta de presentación" — la usan TANTO
 * profile/[role]/[id].vue (lo que ve otro usuario) COMO la vista previa en
 * vivo de creator/profile.vue y partner/profile.vue. Es el mismo componente
 * a propósito: así la vista previa no puede desincronizarse de cómo se ve
 * de verdad el perfil público, porque es literalmente el mismo código.
 *
 * La portada es el fondo de verdad de la cabecera (no una tira aparte):
 * avatar + nombre + rol van ENCIMA, sobre un degradado translúcido abajo
 * para que el texto blanco se siga leyendo sea cual sea la foto.
 */
withDefaults(
  defineProps<{
    name: string
    roleLabel: string
    avatarUrl: string | null
    coverUrl: string | null
    /** Para el degradado de portada cuando no hay foto — algo estable (id del perfil), no el nombre, para que no cambie si se edita el nombre. */
    coverSeed: string
    categories: string[]
    bio: string | null
    rangeLabel: string | null
    rangeFieldLabel: string
    lookingFor: string | null
    /** ISO de cuándo se creó la ficha — "Miembro desde…". Se omite en la vista previa del editor (no aporta nada ver tu propia fecha de alta mientras editas). */
    memberSince?: string | null
    catalogCount?: number
    catalogLabel?: string
    /** Vista reducida para la columna de vista previa del editor (portada/avatar más pequeños, sin fila de "más información"). */
    compact?: boolean
  }>(),
  { memberSince: null, catalogCount: 0, catalogLabel: 'publicados', compact: false }
)

function coverArt(seed: string) {
  return coverArtFromString(seed)
}

function memberSinceLabel(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}
</script>

<template>
  <div>
    <div class="relative rounded-[var(--radius-lg)] overflow-hidden" :class="compact ? 'h-28 mb-4' : 'h-44 sm:h-52 mb-5'">
      <SmartImage v-if="coverUrl" :src="coverUrl" :width="960" :height="320" priority class="absolute inset-0 size-full object-cover" />
      <div
        v-else class="absolute inset-0"
        :style="{ background: `linear-gradient(${coverArt(coverSeed).angle}deg, ${coverArt(coverSeed).from}, ${coverArt(coverSeed).to})` }"
      />

      <!-- Degradado translúcido abajo: sin él el nombre se perdería contra fotos claras. -->
      <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      <div class="absolute inset-x-0 bottom-0 flex items-center gap-3" :class="compact ? 'p-3' : 'p-4'">
        <BaseAvatar
          :initials="initialsFromName(name)" :src="avatarUrl" :hue="hueFromString(name)" :size="compact ? 'md' : 'lg'"
          class="ring-2 ring-white/85 shrink-0"
        />
        <div class="min-w-0">
          <p
            class="font-display text-white truncate" :class="compact ? 'text-base' : 'text-[1.1875rem]'"
            style="text-shadow: 0 1px 8px rgba(0,0,0,0.4)"
          >
            {{ name }}
          </p>
          <p class="text-white/85" :class="compact ? 'text-micro' : 'text-sm'" style="text-shadow: 0 1px 6px rgba(0,0,0,0.4)">
            {{ roleLabel }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="!compact && (memberSince || catalogCount > 0)"
      class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 mb-5 text-sm text-[var(--color-text-muted)]"
    >
      <span v-if="memberSince" class="inline-flex items-center gap-1.5">
        <Icon name="ph:calendar-check-fill" class="size-4 text-[var(--color-text-faint)]" />
        Miembro desde {{ memberSinceLabel(memberSince) }}
      </span>
      <span v-if="catalogCount > 0" class="inline-flex items-center gap-1.5">
        <Icon name="ph:package-fill" class="size-4 text-[var(--color-text-faint)]" />
        {{ catalogCount }} {{ catalogLabel }}
      </span>
    </div>

    <section v-if="bio || categories.length" :class="compact ? 'mt-3 mb-4' : 'mt-5 mb-6'">
      <h2 class="text-sm font-semibold text-[var(--text-muted)] mb-2.5">Bio</h2>
      <p v-if="bio" class="text-base text-[var(--color-text)] leading-relaxed">{{ bio }}</p>
      <div v-if="categories.length" class="flex flex-wrap gap-1.5" :class="bio && 'mt-3'">
        <span
          v-for="cat in categories" :key="cat"
          class="px-2.5 h-7 flex items-center rounded-full text-micro font-medium bg-[var(--color-ink-overlay)] text-[var(--color-text-muted)] border border-[var(--color-hairline)]"
        >
          {{ cat }}
        </span>
      </div>
    </section>

    <section v-if="rangeLabel || lookingFor" :class="compact ? 'mb-4' : 'mb-6'">
      <h2 class="text-sm font-semibold text-[var(--text-muted)] mb-2.5">Datos clave</h2>
      <BaseCard radius="lg" padding="md" class="flex flex-col gap-3">
        <div v-if="rangeLabel" class="flex items-center gap-3">
          <span class="shrink-0 size-9 rounded-full bg-[var(--color-primary-500)]/12 flex items-center justify-center">
            <Icon name="ph:coins-fill" class="size-4 text-[var(--color-primary-500)]" />
          </span>
          <div class="min-w-0">
            <p class="text-micro text-[var(--color-text-faint)]">{{ rangeFieldLabel }}</p>
            <p class="text-base font-medium text-[var(--color-text)]">{{ rangeLabel }}</p>
          </div>
        </div>
        <div v-if="rangeLabel && lookingFor" class="h-px bg-[var(--color-hairline)]" />
        <p v-if="lookingFor" class="text-sm text-[var(--color-text-muted)] leading-relaxed">{{ lookingFor }}</p>
      </BaseCard>
    </section>
  </div>
</template>
