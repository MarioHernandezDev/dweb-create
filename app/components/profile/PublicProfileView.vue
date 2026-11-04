<script setup lang="ts">
import { hueFromString, initialsFromName } from '~/utils/avatar'
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
const keyFacts = computed(() => [
  { label: rangeFieldLabel.value, value: rangeLabel.value },
  ...(props.packages.length ? [{ label: isPartner.value ? 'Necesidades' : 'Catálogo', value: `${props.packages.length} ${packagesCountLabel.value}` }] : []),
  { label: 'En CIBERAN', value: `Desde ${memberSince.value}` }
].filter((f) => f.value))
const hasPresentation = computed(() => !!props.profile.bio || !!props.profile.lookingFor)
const hasRatings = computed(() => props.ratingSummary.ratingCount > 0)
const backHref = computed(() => `/${props.myRole ?? 'creator'}/discover`)
const editHref = computed(() => `/${props.profile.role}/profile?tab=ficha`)

</script>

<template>
  <div class="pub" data-public-profile :data-role="profile.role">
    <!-- Cabecera: banner a sangre y avatar superpuesto, como en «Tu perfil» -->
    <section class="profile-hero pub__hero yt-reveal" data-public-hero>
      <div class="profile-hero__cover" aria-hidden="true">
        <SmartImage v-if="profile.coverUrl" :src="profile.coverUrl" :width="1200" :height="360" priority class="profile-hero__img" />
        <CoverArt v-else :seed="profile.profileId" />
        <NuxtLink :to="backHref" class="pub__back" data-back-link>
          <Icon name="ph:arrow-left-bold" class="size-4" /> Volver a Descubrir
        </NuxtLink>
      </div>

      <div class="profile-hero__body">
        <div class="profile-hero__row">
          <div class="profile-hero__avatar">
            <BaseAvatar :initials="initialsFromName(profile.name)" :src="profile.avatarUrl" :hue="hueFromString(profile.name)" size="fluid" />
          </div>
          <div class="profile-hero__who">
            <h1 class="profile-hero__name" data-public-name>{{ profile.name }}</h1>
            <p class="profile-hero__sub">{{ roleLabel }}<template v-if="sectorChip"> · {{ sectorChip }}</template></p>
          </div>
          <div class="profile-hero__actions" data-public-actions>
            <BaseButton v-if="!isOwnProfile" variant="primary" icon="ph:chat-circle-fill" :loading="startingChat" data-start-chat @click="emit('chat')">
              Iniciar chat
            </BaseButton>
            <BaseButton variant="outline" :icon="linkCopied ? 'ph:check-bold' : 'ph:link-simple-bold'" :aria-label="linkCopied ? 'Enlace copiado' : 'Copiar enlace del perfil'" data-copy-link @click="emit('copy')">
              {{ linkCopied ? 'Copiado' : 'Copiar enlace' }}
            </BaseButton>
          </div>
        </div>

        <p v-if="chatError" class="pub__error" role="alert" data-chat-error>{{ chatError }}</p>
        <p v-if="copyError" class="pub__error" role="alert">No se ha podido copiar el enlace.</p>

        <div v-if="profile.categories.length || profile.verifiedSocials.length" class="pub__facts" data-public-facts>
          <Chip v-for="cat in profile.categories" :key="cat" data-fact="category">{{ cat }}</Chip>
          <span v-for="s in profile.verifiedSocials" :key="s.platform" class="pub__social" :data-platform="s.platform" data-fact="social" :title="`${platformMeta[s.platform].label}: conexión verificada con la red`">
            <Icon :name="platformMeta[s.platform].icon" class="size-4" />
            {{ platformMeta[s.platform].label }} · {{ formatCompactNumber(s.followersCount) }}
            <Icon name="ph:seal-check-fill" class="size-4" aria-label="Verificada" />
          </span>
        </div>
      </div>
    </section>

    <BaseCard v-if="isOwnProfile" tone="overlay" padding="sm" class="pub__own" data-own-banner>
      <p>Así ven tu perfil el resto de usuarios de CIBERAN.</p>
      <BaseButton :to="editHref" variant="outline" size="sm" icon="ph:pencil-simple-bold">Editar mi ficha</BaseButton>
    </BaseCard>

    <div class="pub__layout">
      <div class="pub__main">
        <PanelCard v-if="profile.bio" :title="isPartner ? 'Sobre la empresa' : 'Sobre el creador'" class="yt-reveal" style="--i: 1" data-section="about">
          <p class="prose-text">{{ profile.bio }}</p>
        </PanelCard>

        <PanelCard v-if="profile.lookingFor" :title="lookingForTitle" class="yt-reveal" style="--i: 2" data-section="looking-for">
          <p class="prose-text">{{ profile.lookingFor }}</p>
        </PanelCard>

        <section v-if="!isOwnProfile" class="yt-reveal" style="--i: 3" data-section="packages">
          <SectionTitle :title="packagesTitle" class="mb-4" />
          <EmptyState
            v-if="!packages.length"
            icon="ph:package" title="Sin paquetes publicados"
            :description="`Todavía no se le puede hacer una oferta — ${isPartner ? 'el partner' : 'el creador'} no ha publicado ningún paquete.`"
          />
          <div v-else class="pub__packages">
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

      <aside class="pub__aside" data-sidebar>
        <PanelCard title="Datos clave" class="yt-reveal" style="--i: 2" data-section="facts">
          <DataList :items="keyFacts" />
        </PanelCard>

        <PanelCard title="Reputación" class="yt-reveal" style="--i: 3" data-section="reputation">
          <template v-if="hasRatings">
            <div class="pub__rating">
              <RatingStars v-if="hasEnoughRatingsToShowAverage(ratingSummary.ratingCount)" :model-value="Math.round(ratingSummary.avgStars)" readonly size="sm" />
              <span>{{ formatRatingSummary(ratingSummary) }}</span>
            </div>
            <p class="pub__note">Valoraciones de colaboraciones completadas en CIBERAN.</p>
          </template>
          <p v-else class="pub__note" data-no-ratings>Todavía sin valoraciones: aún no tiene colaboraciones completadas valoradas.</p>
        </PanelCard>

        <p v-if="!isOwnProfile && profile.chatPrivacy === 'accepted_offers_only'" class="pub__note" data-chat-privacy>
          Este perfil solo acepta mensajes de texto tras una oferta aceptada — puedes empezar haciéndole una oferta sobre uno de sus paquetes.
        </p>
      </aside>
    </div>
  </div>
</template>
