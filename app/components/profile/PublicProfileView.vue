<script setup lang="ts">
import { coverArtFromString, hueFromString, initialsFromName } from '~/utils/avatar'
import { formatCompactNumber, formatEuros, platformMeta } from '~/utils/mock-data'
import { formatRatingSummary, hasEnoughRatingsToShowAverage, type RatingSummary } from '~/utils/ratings'
import type { Package } from '~/composables/usePackages'
import type { PublicProfile } from '~/composables/usePublicProfile'
import type { Role } from '~/types'

/**
 * Perfil público a ancho completo (A-R19) de un creador o de un partner:
 * cabecera de identidad, presentación a la izquierda y datos + reputación a la
 * derecha. Solo pinta datos que ya devuelve `usePublicProfile` (sin vías
 * nuevas de acceso): lo que no existe no se muestra, y las insignias de
 * verificación salen únicamente de `verifiedSocials` (redes con OAuth real).
 * Las acciones respetan los flujos existentes: chat y ofertas siguen siendo
 * los mismos; en el perfil propio no hay ninguna.
 *
 * `ProfileHeaderCard` NO se usa aquí: sigue siendo la tarjeta compacta de la
 * vista previa del editor.
 */
const props = defineProps<{
  profile: PublicProfile
  packages: Package[]
  ratingSummary: RatingSummary
  isOwnProfile: boolean
  myRole: Role | null
  startingChat: boolean
  chatError: string
  linkCopied: boolean
  copyError: boolean
}>()
const emit = defineEmits<{ chat: []; offer: [pkg: Package]; copy: [] }>()

const isPartner = computed(() => props.profile.role === 'partner')
const art = computed(() => coverArtFromString(props.profile.profileId))
const coverStyle = computed(() => props.profile.coverUrl
  ? { backgroundImage: `url("${props.profile.coverUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
  : { background: `linear-gradient(${art.value.angle}deg, ${art.value.from}, ${art.value.to})` })

const roleLabel = computed(() => (isPartner.value ? 'Empresa' : 'Creador de contenido'))
const rangeFieldLabel = computed(() => (isPartner.value ? 'Presupuesto por colaboración' : 'Tarifa orientativa'))
const rangeLabel = computed(() => {
  const { minCents, maxCents } = props.profile
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'}–${maxCents ? formatEuros(maxCents) : '…'}`
})
const lookingForTitle = computed(() => (isPartner.value ? 'Qué tipo de creador busca' : 'Qué tipo de marcas busca'))
const packagesTitle = computed(() => (isPartner.value ? 'Necesidades publicadas' : 'Catálogo'))
const packagesCountLabel = computed(() => {
  const one = props.packages.length === 1
  return isPartner.value ? (one ? 'necesidad publicada' : 'necesidades publicadas') : (one ? 'paquete publicado' : 'paquetes publicados')
})
const sectorChip = computed(() => (isPartner.value && props.profile.industry && !props.profile.categories.includes(props.profile.industry) ? props.profile.industry : null))
const memberSince = computed(() => new Date(props.profile.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))
const hasPresentation = computed(() => !!props.profile.bio || !!props.profile.lookingFor)
const hasRatings = computed(() => props.ratingSummary.ratingCount > 0)
const backHref = computed(() => `/${props.myRole ?? 'creator'}/discover`)
const editHref = computed(() => `/${props.profile.role}/profile?tab=ficha`)

const card = 'rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 md:p-6'
const eyebrow = 'text-sm font-semibold text-[var(--text-muted)]'
</script>

<template>
  <div class="flex flex-col gap-5" data-public-profile :data-role="profile.role">
    <NuxtLink :to="backHref" class="inline-flex items-center gap-1.5 self-start min-h-11 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" data-back-link>
      <Icon name="ph:arrow-left-bold" class="size-3.5" /> Volver a Descubrir
    </NuxtLink>

    <div v-if="isOwnProfile" class="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-ink-overlay)] px-4 py-3" data-own-banner>
      <p class="text-sm text-[var(--color-text-muted)]">Así ven tu perfil el resto de usuarios de CIBERAN.</p>
      <NuxtLink :to="editHref" class="inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]">
        <Icon name="ph:pencil-simple-bold" class="size-3.5" /> Editar mi ficha
      </NuxtLink>
    </div>

    <!-- CABECERA -->
    <section class="rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)] overflow-hidden yt-reveal" data-public-hero>
      <div class="h-36 md:h-52" :style="coverStyle" aria-hidden="true" />
      <div class="px-5 md:px-8 pb-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex items-end gap-4 md:gap-5 min-w-0">
            <div class="shrink-0 -mt-12 md:-mt-16">
              <BaseAvatar
                :initials="initialsFromName(profile.name)" :src="profile.avatarUrl" :hue="hueFromString(profile.name)" size="lg"
                class="!size-24 md:!size-32 ring-4 ring-[var(--color-paper)] shadow-sm" :class="isPartner && '!rounded-[var(--radius-lg)]'"
              />
            </div>
            <div class="min-w-0 pt-3 pb-1">
              <h1 class="font-display text-[1.5rem] md:text-[2rem] leading-tight text-[var(--color-text)] break-words" data-public-name>{{ profile.name }}</h1>
              <p class="text-sm text-[var(--color-text-muted)]">
                {{ roleLabel }}<template v-if="sectorChip"> · {{ sectorChip }}</template>
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2" data-public-actions>
            <BaseButton v-if="!isOwnProfile" variant="primary" size="md" icon="ph:chat-circle-fill" :icon-spin="startingChat" :disabled="startingChat" data-start-chat @click="emit('chat')">
              Iniciar chat
            </BaseButton>
            <button
              type="button" class="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-[var(--color-hairline-strong)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)] transition-colors"
              :aria-label="linkCopied ? 'Enlace copiado' : 'Copiar enlace del perfil'" data-copy-link @click="emit('copy')"
            >
              <Icon :name="linkCopied ? 'ph:check-bold' : 'ph:link-simple-bold'" class="size-4" /> {{ linkCopied ? 'Copiado' : 'Copiar enlace' }}
            </button>
          </div>
        </div>
        <p v-if="chatError" class="mt-3 text-sm text-[var(--color-status-alert)]" role="alert" data-chat-error>{{ chatError }}</p>
        <p v-if="copyError" class="mt-3 text-micro text-[var(--color-status-alert)]" role="alert">No se ha podido copiar el enlace.</p>

        <div v-if="profile.categories.length || profile.verifiedSocials.length" class="mt-5 flex flex-wrap items-center gap-2" data-public-facts>
          <span v-for="cat in profile.categories" :key="cat" class="inline-flex items-center h-8 px-3 rounded-full bg-[var(--color-primary-500)]/10 text-micro font-medium text-[var(--color-primary-500)]" data-fact="category">{{ cat }}</span>
          <span
            v-for="s in profile.verifiedSocials" :key="s.platform"
            class="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] text-micro font-medium text-[var(--color-text)]"
            :title="`${platformMeta[s.platform].label}: conexión verificada con la red`" data-fact="social"
          >
            <Icon :name="platformMeta[s.platform].icon" class="size-3.5 shrink-0" :style="{ color: platformMeta[s.platform].colorVar }" />
            {{ platformMeta[s.platform].label }} · {{ formatCompactNumber(s.followersCount) }}
            <Icon name="ph:seal-check-fill" class="size-3.5 shrink-0 text-[var(--color-primary-500)]" />
          </span>
        </div>
      </div>
    </section>

    <!-- CUERPO -->
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div class="flex flex-col gap-5 min-w-0">
        <section v-if="profile.bio" :class="card" class="yt-reveal" style="--i: 1" data-section="about">
          <h2 :class="eyebrow" class="mb-3">{{ isPartner ? 'Sobre la empresa' : 'Sobre el creador' }}</h2>
          <p class="text-[1rem] text-[var(--color-text)] leading-relaxed whitespace-pre-line">{{ profile.bio }}</p>
        </section>

        <section v-if="profile.lookingFor" :class="card" class="yt-reveal" style="--i: 2" data-section="looking-for">
          <h2 :class="eyebrow" class="mb-3">{{ lookingForTitle }}</h2>
          <p class="text-base text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">{{ profile.lookingFor }}</p>
        </section>

        <section v-if="!isOwnProfile" class="yt-reveal" style="--i: 3" data-section="packages">
          <div class="flex items-baseline justify-between gap-3 mb-3">
            <h2 :class="eyebrow">{{ packagesTitle }}</h2>
          </div>
          <EmptyState
            v-if="!packages.length"
            icon="ph:package" title="Sin paquetes publicados"
            :description="`Todavía no se le puede hacer una oferta — ${isPartner ? 'el partner' : 'el creador'} no ha publicado ningún paquete.`"
          />
          <div v-else class="grid gap-3 md:grid-cols-2">
            <PackageCard v-for="pkg in packages" :key="pkg.id" :pkg="pkg" @offer="emit('offer', $event)" />
          </div>
        </section>

        <EmptyState
          v-if="!hasPresentation && isOwnProfile"
          icon="ph:identification-card" title="Tu presentación está vacía"
          description="Añade una biografía y qué buscas en tu ficha para que otros te conozcan."
        />
        <EmptyState
          v-else-if="!hasPresentation && !profile.categories.length && !profile.verifiedSocials.length"
          icon="ph:identification-card" :title="isPartner ? 'La empresa aún no ha completado su presentación' : 'El creador aún no ha completado su presentación'"
          description="Todavía no ha añadido descripción ni categorías."
        />
      </div>

      <aside class="flex flex-col gap-5 lg:sticky lg:top-24" data-sidebar>
        <section :class="card" class="yt-reveal" style="--i: 2" data-section="facts">
          <h2 :class="eyebrow" class="mb-4">Datos clave</h2>
          <dl class="flex flex-col gap-4">
            <div v-if="rangeLabel" class="flex items-start gap-3" data-fact-row="range">
              <span class="shrink-0 size-9 rounded-full bg-[var(--color-primary-500)]/12 flex items-center justify-center"><Icon name="ph:coins-fill" class="size-4 text-[var(--color-primary-500)]" /></span>
              <div>
                <dt class="text-micro text-[var(--color-text-faint)]">{{ rangeFieldLabel }}</dt>
                <dd class="text-[1rem] font-medium text-[var(--color-text)]">{{ rangeLabel }}</dd>
              </div>
            </div>
            <div v-if="packages.length" class="flex items-start gap-3" data-fact-row="packages">
              <span class="shrink-0 size-9 rounded-full bg-[var(--color-ink-overlay)] flex items-center justify-center"><Icon name="ph:package-fill" class="size-4 text-[var(--color-text-muted)]" /></span>
              <div>
                <dt class="text-micro text-[var(--color-text-faint)]">{{ isPartner ? 'Necesidades' : 'Catálogo' }}</dt>
                <dd class="text-[1rem] font-medium text-[var(--color-text)]">{{ packages.length }} {{ packagesCountLabel }}</dd>
              </div>
            </div>
            <div class="flex items-start gap-3" data-fact-row="member">
              <span class="shrink-0 size-9 rounded-full bg-[var(--color-ink-overlay)] flex items-center justify-center"><Icon name="ph:calendar-check-fill" class="size-4 text-[var(--color-text-muted)]" /></span>
              <div>
                <dt class="text-micro text-[var(--color-text-faint)]">En CIBERAN</dt>
                <dd class="text-[1rem] font-medium text-[var(--color-text)]">Desde {{ memberSince }}</dd>
              </div>
            </div>
          </dl>
        </section>

        <section :class="card" class="yt-reveal" style="--i: 3" data-section="reputation">
          <h2 :class="eyebrow" class="mb-3">Reputación</h2>
          <template v-if="hasRatings">
            <div class="flex items-center gap-2.5">
              <RatingStars v-if="hasEnoughRatingsToShowAverage(ratingSummary.ratingCount)" :model-value="Math.round(ratingSummary.avgStars)" readonly size="sm" />
              <span class="text-sm text-[var(--color-text)]">{{ formatRatingSummary(ratingSummary) }}</span>
            </div>
            <p class="mt-2 text-micro text-[var(--color-text-faint)]">Valoraciones de colaboraciones completadas en CIBERAN.</p>
          </template>
          <p v-else class="text-sm text-[var(--color-text-muted)]" data-no-ratings>Todavía sin valoraciones: aún no tiene colaboraciones completadas valoradas.</p>
        </section>

        <p v-if="!isOwnProfile && profile.chatPrivacy === 'accepted_offers_only'" class="px-1 text-micro text-[var(--color-text-faint)]" data-chat-privacy>
          Este perfil solo acepta mensajes de texto tras una oferta aceptada — puedes empezar haciéndole una oferta sobre uno de sus paquetes.
        </p>
      </aside>
    </div>
  </div>
</template>
