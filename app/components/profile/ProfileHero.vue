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
  /** Si se pasan, aparecen los controles para cambiar la portada encima de ella. */
  uploadCover?: (file: File) => Promise<string>
  removeCover?: () => Promise<void>
  percent: number
  items: HeroCompletionItem[]
}>()
const emit = defineEmits<{ 'select-tab': [tab: string] }>()

const pending = computed(() => props.items.filter((i) => !i.done))
// Para no abrumar, solo se enseñan los tres primeros pendientes; el resto va en «y N más».
const PENDING_SHOWN = 3
const pendingShown = computed(() => pending.value.slice(0, PENDING_SHOWN))
const pendingHidden = computed(() => Math.max(0, pending.value.length - PENDING_SHOWN))
</script>

<template>
  <!-- A sangre: el banner toca los bordes superior y laterales del contenedor
       (compensa el relleno de la página con márgenes negativos). -->
  <section class="profile-hero yt-reveal" data-profile-hero>
    <div class="profile-hero__cover">
      <div class="profile-hero__art" aria-hidden="true">
        <SmartImage v-if="coverUrl" :src="coverUrl" :width="1600" :height="480" priority class="profile-hero__img" />
        <CoverArt v-else :seed="coverSeed" />
      </div>
      <ProfileCoverEdit v-if="uploadCover" :cover-url="coverUrl" :upload="uploadCover" :remove="removeCover" />
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

        <div class="profile-hero__progress" data-hero-completion>
          <div class="profile-hero__progress-head">
            <p class="profile-hero__progress-label">
              Ficha completa al <span class="profile-hero__progress-pct">{{ percent }}%</span>
            </p>
            <Icon v-if="percent >= 100" name="ph:check-circle-fill" class="size-4 text-[var(--color-phase-published)]" />
          </div>
          <div class="profile-hero__bar" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100" aria-label="Ficha completa">
            <div class="profile-hero__bar-fill" :class="percent >= 100 && 'is-done'" :style="{ '--progress': `${percent}%` }" />
          </div>
          <p v-if="pending.length" class="profile-hero__pending">
            Te falta:
            <template v-for="(p, i) in pendingShown" :key="p.label">
              <button v-if="p.tab" type="button" class="profile-hero__pending-link" data-pending-link @click="emit('select-tab', p.tab)">{{ p.label }}</button>
              <span v-else>{{ p.label }}</span><span v-if="i < pendingShown.length - 1">, </span>
            </template><template v-if="pendingHidden"> y {{ pendingHidden }} más</template>.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
