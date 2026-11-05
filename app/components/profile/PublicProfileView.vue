<script setup lang="ts">
import { hueFromString } from '~/utils/avatar'
import { formatCompactNumber, formatEuros, platformMeta } from '~/utils/mock-data'
import { PLATFORM_SHORT, responseLabel, COLLAB_TYPES } from '~/utils/discover-view'
import { audienceFromDb, hasAudience } from '~/utils/audience'
import { formatRatingSummary, hasEnoughRatingsToShowAverage, type RatingSummary } from '~/utils/ratings'
import type { Package } from '~/composables/usePackages'
import type { PublicProfile } from '~/composables/usePublicProfile'
import type { PublicStat, PublicContentItem, PublicCollab, PublicActivity, SimilarProfile } from '~/composables/usePublicProfileExtras'
import type { Platform, Role } from '~/types'

/**
 * Perfil público de un creador o de una marca. Cabecera oscura con la identidad, tarjeta lateral con lo esencial y
 * contacto, y pestañas con el detalle. Todo sale de datos reales (ficha, redes verificadas con OAuth, métricas medias,
 * contenido que el dueño destaca, colaboraciones completadas); lo que no existe, no se enseña. La audiencia es
 * declarada por el creador y se rotula así.
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
  stats: PublicStat[]
  content: PublicContentItem[]
  collabs: PublicCollab[]
  activity: PublicActivity
  similar: SimilarProfile[]
}>()
const emit = defineEmits<{ chat: []; offer: [pkg: Package]; copy: []; collaborate: [] }>()

const isPartner = computed(() => props.profile.role === 'partner')
const counterpartRole = computed<Role>(() => (isPartner.value ? 'creator' : 'partner'))
const canCollaborate = computed(() => !props.isOwnProfile && !!props.myRole && props.myRole !== props.profile.role)
const collaborateLabel = computed(() => (props.myRole === 'partner' ? 'Invitar a colaborar' : 'Proponer colaboración'))
const backHref = computed(() => `/${props.myRole ?? 'creator'}/discover`)
const editHref = computed(() => `/${props.profile.role}/profile?tab=ficha`)

// ---- Cabecera ----
const mainHandle = computed(() => props.profile.verifiedSocials.find((s) => s.handle?.startsWith('@'))?.handle ?? null)
const subline = computed(() => [mainHandle.value, props.profile.headline || (isPartner.value ? props.profile.industry : null)].filter(Boolean).join(' · '))
const initial = computed(() => (props.profile.name.trim()[0] ?? '?').toUpperCase())
const heroTint = computed(() => hueFromString(props.profile.profileId))
const rangeLabel = computed(() => {
  const { minCents, maxCents } = props.profile
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'} – ${maxCents ? formatEuros(maxCents) : '…'}`
})
const response = computed(() => responseLabel(props.activity.responseHours))

// ---- Guardar ----
const { isSaved, toggleSave, toggling, ensureIdsLoaded } = useSavedProfiles()
onMounted(() => ensureIdsLoaded())
const saved = computed(() => isSaved(props.profile.role, props.profile.id))

// ---- Pestañas ----
type Tab = 'stats' | 'about' | 'audience' | 'packages' | 'collabs' | 'similar'
const tabs = computed(() => {
  const t: { value: Tab; label: string }[] = isPartner.value
    ? [{ value: 'about', label: 'Sobre la marca' }]
    : [{ value: 'stats', label: 'Estadísticas y contenido' }, { value: 'audience', label: 'Audiencia' }]
  if (!props.isOwnProfile || props.packages.length) t.push({ value: 'packages', label: isPartner.value ? 'Necesidades' : 'Catálogo' })
  t.push({ value: 'collabs', label: isPartner.value ? 'Creadores colaboradores' : 'Marcas colaboradoras' })
  t.push({ value: 'similar', label: isPartner.value ? 'Marcas similares' : 'Creadores similares' })
  return t
})
const route = useRoute()
const router = useRouter()
const tab = ref<Tab>(tabs.value.find((t) => t.value === route.query.seccion)?.value ?? tabs.value[0]!.value)
function setTab(v: string) { tab.value = v as Tab; router.replace({ query: { ...route.query, seccion: v } }) }

// ---- Estadísticas por red ----
const platform = ref<Platform | null>(null)
watchEffect(() => { if (!platform.value || !props.stats.some((s) => s.platform === platform.value)) platform.value = props.stats[0]?.platform ?? null })
const stat = computed(() => props.stats.find((s) => s.platform === platform.value) ?? null)
const dash = '—'
const compact = (n: number | null) => (n == null ? dash : formatCompactNumber(n))
const statCells = computed(() => {
  const s = stat.value
  if (!s) return []
  return [
    { label: 'Seguidores', value: compact(s.followers) },
    { label: 'Media de likes', value: compact(s.avgLikes) },
    { label: 'Media de comentarios', value: compact(s.avgComments) },
    { label: 'Media de vistas', value: compact(s.avgViews) },
    { label: 'Engagement', value: s.engagement == null ? dash : `${String(s.engagement).replace('.', ',')} %` },
    { label: 'Publicaciones', value: String(s.postsPublished) },
    { label: 'Colaboraciones', value: String(props.activity.collabCount) },
    { label: 'Responde en', value: response.value ?? dash }
  ]
})

// ---- Contenido destacado ----
const typeFilter = ref('')
const sort = ref<'recent' | 'views' | 'likes'>('recent')
const typeOptions = computed(() => [...new Set(props.content.map((c) => c.contentType))])
const TYPE_LABEL: Record<string, string> = { video: 'Vídeo', reel: 'Reel', carousel: 'Carrusel', image: 'Imagen', story: 'Story' }
const shownContent = computed(() => {
  const list = props.content.filter((c) => !typeFilter.value || c.contentType === typeFilter.value)
  const by = (k: 'views' | 'likes') => (a: PublicContentItem, b: PublicContentItem) => (b[k] ?? -1) - (a[k] ?? -1)
  return sort.value === 'views' ? [...list].sort(by('views')) : sort.value === 'likes' ? [...list].sort(by('likes')) : list
})
const isVideo = (c: PublicContentItem) => c.contentType === 'video' || c.contentType === 'reel'

// ---- Audiencia declarada ----
const audience = computed(() => audienceFromDb(props.profile.audience))
const audienceDeclared = computed(() => hasAudience(props.profile.audience))
const genderRows = computed(() => [{ k: 'Mujeres', v: audience.value.gender.female }, { k: 'Hombres', v: audience.value.gender.male }, { k: 'Otros', v: audience.value.gender.other }].filter((g) => g.v > 0))

const fmtMonth = (d: string) => new Date(d).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
const typeLabels = computed(() => props.profile.collaborationTypes.map((v) => COLLAB_TYPES.find((c) => c.value === v)?.label ?? v))
const websiteHost = computed(() => { try { return new URL(props.profile.website ?? '').host.replace(/^www\./, '') } catch { return props.profile.website } })
const socialHref = (s: { platform: Platform; handle: string | null }) => (s.platform === 'instagram' && s.handle?.startsWith('@') ? `https://instagram.com/${s.handle.slice(1)}` : null)
</script>

<template>
  <div class="pp" data-public-profile :data-role="profile.role">
    <div class="pp__bg" aria-hidden="true">
      <SmartImage v-if="profile.coverUrl" :src="profile.coverUrl" :width="1400" :height="420" priority class="pp__bg-img" />
      <div v-else class="pp__bg-art" :style="{ '--h': heroTint }" />
    </div>

    <div class="pp__top">
      <NuxtLink :to="backHref" class="pp__back" data-back-link><Icon name="ph:caret-left-bold" class="size-4" /> Descubrir</NuxtLink>
      <NuxtLink v-if="isOwnProfile" :to="editHref" class="pp__edit" data-own-banner><Icon name="ph:pencil-simple-bold" class="size-4" /> Editar perfil</NuxtLink>
    </div>

    <div class="pp__grid">
      <!-- Tarjeta lateral -->
      <aside class="pp__card" data-sidebar>
        <div class="pp__photo">
          <SmartImage v-if="profile.avatarUrl" :src="profile.avatarUrl" :width="480" :height="480" class="pp__photo-img" />
          <template v-else><CoverArt :seed="profile.profileId" /><span class="pp__initial" aria-hidden="true">{{ initial }}</span></template>
          <button
            v-if="!isOwnProfile" type="button" class="pp__save" :class="saved && 'is-saved'" :aria-pressed="saved" :disabled="toggling === profile.id"
            :aria-label="saved ? `Quitar a ${profile.name} de guardados` : `Guardar a ${profile.name}`" @click="toggleSave(profile.role, profile.id)"
          ><Icon :name="saved ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple-bold'" class="size-4" /></button>
        </div>

        <p v-if="profile.location" class="pp__loc" data-fact="location"><Icon name="ph:map-pin" class="size-4" />{{ profile.location }}</p>
        <p v-if="profile.bio" class="pp__bio prose-text" data-section="about">{{ profile.bio }}</p>

        <dl class="pp__facts" data-section="facts">
          <div v-if="response"><dt><Icon name="ph:clock" class="size-4" />Responde en</dt><dd>{{ response }}</dd></div>
          <div v-if="activity.collabCount"><dt><Icon name="ph:check-bold" class="size-4" />Colaboraciones</dt><dd>{{ activity.collabCount }}</dd></div>
          <div v-if="rangeLabel"><dt><Icon name="ph:currency-eur" class="size-4" />{{ isPartner ? 'Presupuesto' : 'Tarifa' }}</dt><dd>{{ rangeLabel }}</dd></div>
          <div data-section="reputation">
            <dt><Icon name="ph:star" class="size-4" />Valoración</dt>
            <dd v-if="ratingSummary.ratingCount > 0" class="pp__stars" :title="formatRatingSummary(ratingSummary)"><RatingStars v-if="hasEnoughRatingsToShowAverage(ratingSummary.ratingCount)" :model-value="Math.round(ratingSummary.avgStars)" readonly size="sm" /><span>{{ hasEnoughRatingsToShowAverage(ratingSummary.ratingCount) ? `${String(Math.round(ratingSummary.avgStars * 10) / 10).replace('.', ',')} (${ratingSummary.ratingCount})` : `${ratingSummary.ratingCount} valoración${ratingSummary.ratingCount === 1 ? '' : 'es'}` }}</span></dd>
            <dd v-else class="pp__muted" data-no-ratings>Sin valoraciones</dd>
          </div>
        </dl>

        <div v-if="profile.verifiedSocials.length || profile.website" class="pp__nets">
          <h2 class="pp__h">Redes</h2>
          <ul>
            <li v-for="s in profile.verifiedSocials" :key="s.platform" data-fact="social" :data-platform="s.platform" :title="`${platformMeta[s.platform].label}: conexión verificada con la red`">
              <component :is="socialHref(s) ? 'a' : 'div'" :href="socialHref(s) ?? undefined" :target="socialHref(s) ? '_blank' : undefined" rel="noopener noreferrer" class="pp__net">
                <span class="pp__net-badge">{{ PLATFORM_SHORT[s.platform] ?? s.platform }}</span>
                <span class="pp__net-text"><strong>{{ s.handle ?? platformMeta[s.platform].label }}</strong><small>{{ formatCompactNumber(s.followersCount) }} seguidores <Icon name="ph:seal-check-fill" class="size-3.5" aria-label="Verificada" /></small></span>
                <Icon v-if="socialHref(s)" name="ph:arrow-up-right" class="size-4" />
              </component>
            </li>
            <li v-if="profile.website">
              <a :href="profile.website" target="_blank" rel="noopener noreferrer nofollow" class="pp__net" data-fact="website">
                <span class="pp__net-badge"><Icon name="ph:globe" class="size-4" /></span>
                <span class="pp__net-text"><strong>{{ websiteHost }}</strong><small>Web</small></span><Icon name="ph:arrow-up-right" class="size-4" />
              </a>
            </li>
          </ul>
        </div>

        <div v-if="!isOwnProfile" class="pp__cta" data-public-actions>
          <BaseButton v-if="canCollaborate" variant="primary" size="lg" block data-collaborate @click="emit('collaborate')">{{ collaborateLabel }}</BaseButton>
          <BaseButton variant="outline" size="lg" block :loading="startingChat" data-start-chat @click="emit('chat')">Enviar mensaje</BaseButton>
          <p v-if="chatError" class="pub__error" role="alert" data-chat-error>{{ chatError }}</p>
          <p v-if="profile.chatPrivacy === 'accepted_offers_only'" class="pp__muted" data-chat-privacy>Solo acepta mensajes de texto tras una oferta aceptada: empieza con una oferta sobre uno de sus paquetes.</p>
        </div>
        <button type="button" class="pp__copy" data-copy-link @click="emit('copy')"><Icon :name="linkCopied ? 'ph:check-bold' : 'ph:link-simple-bold'" class="size-4" /> {{ linkCopied ? 'Enlace copiado' : 'Copiar enlace del perfil' }}</button>
        <p v-if="copyError" class="pub__error" role="alert">No se ha podido copiar el enlace.</p>
      </aside>

      <!-- Cabecera -->
      <header class="pp__head">
        <h1 class="pp__name" data-public-name>{{ profile.name }}</h1>
        <p v-if="subline" class="pp__sub">{{ subline }}</p>
        <div v-if="profile.categories.length" class="pp__chips" data-public-facts>
          <span v-for="c in profile.categories" :key="c" class="pp__chip" data-fact="category">{{ c }}</span>
        </div>
        <SegmentedTabs :model-value="tab" :options="tabs" label="Secciones del perfil" class="pp__tabs" @update:model-value="setTab" />
      </header>

      <!-- Contenido -->
      <div class="pp__content">
        <!-- Estadísticas y contenido (creador) -->
        <template v-if="tab === 'stats'">
          <section class="pp__panel" aria-labelledby="pp-stats">
            <header class="pp__panel-head">
              <h2 id="pp-stats">Estadísticas del creador</h2>
              <div v-if="stats.length" class="pp__nets-row" role="group" aria-label="Red">
                <span class="pp__lead">Estadísticas de</span>
                <button v-for="s in stats" :key="s.platform" type="button" class="pp__pill" :class="platform === s.platform && 'is-on'" :aria-pressed="platform === s.platform" @click="platform = s.platform">{{ platformMeta[s.platform].label }}</button>
              </div>
            </header>
            <div v-if="stat" class="pp__stats">
              <div v-for="c in statCells" :key="c.label"><p>{{ c.label }}</p><strong>{{ c.value }}</strong></div>
            </div>
            <p v-else class="pp__empty">Todavía no ha verificado ninguna red con la plataforma, así que no hay estadísticas que enseñar.</p>
            <p v-if="stat" class="pp__foot">{{ stat.measuredPosts ? `Medias sobre ${stat.measuredPosts} publicación${stat.measuredPosts === 1 ? '' : 'es'} con métricas.` : 'Aún no hay publicaciones con métricas medidas en esta red.' }} Seguidores verificados con la red.</p>
          </section>

          <section class="pp__panel" aria-labelledby="pp-content">
            <header class="pp__panel-head">
              <h2 id="pp-content">Contenido del creador</h2>
              <div v-if="content.length" class="pp__filters">
                <label class="pp__sel"><span class="sr-only">Tipo</span>
                  <select v-model="typeFilter" aria-label="Tipo"><option value="">Tipo: Todo</option><option v-for="t in typeOptions" :key="t" :value="t">Tipo: {{ TYPE_LABEL[t] ?? t }}</option></select><Icon name="ph:caret-down-bold" class="size-3" />
                </label>
                <label class="pp__sel"><span class="sr-only">Ordenar</span>
                  <select v-model="sort" aria-label="Ordenar"><option value="recent">Ordenar: Recientes</option><option value="views">Ordenar: Más vistas</option><option value="likes">Ordenar: Más likes</option></select><Icon name="ph:caret-down-bold" class="size-3" />
                </label>
              </div>
            </header>
            <ul v-if="shownContent.length" class="pp__grid-content">
              <li v-for="c in shownContent" :key="c.postId">
                <component :is="c.externalUrl ? 'a' : 'div'" :href="c.externalUrl ?? undefined" :target="c.externalUrl ? '_blank' : undefined" rel="noopener noreferrer" class="pp__tile" :title="c.title">
                  <CoverArt :seed="c.postId" /><SmartImage v-if="c.mediaUrl" :src="c.mediaUrl" :width="320" :height="400" class="pp__tile-img" />
                  <span v-if="isVideo(c)" class="pp__play" aria-hidden="true"><Icon name="ph:play-fill" class="size-5" /></span>
                  <span class="pp__tile-foot"><span v-if="c.views != null"><Icon name="ph:eye" class="size-4" />{{ formatCompactNumber(c.views) }}</span><span v-if="c.likes != null"><Icon name="ph:heart" class="size-4" />{{ formatCompactNumber(c.likes) }}</span><span v-if="c.views == null && c.likes == null" class="pp__tile-title">{{ c.title }}</span></span>
                </component>
              </li>
            </ul>
            <p v-else class="pp__empty" data-content-empty>{{ content.length ? 'Ningún contenido de ese tipo.' : isOwnProfile ? 'Aún no has destacado contenido: elígelo en Tu perfil → Ficha pública → Contenido destacado.' : 'Todavía no ha destacado contenido.' }}</p>
          </section>
        </template>

        <!-- Sobre la marca (partner) -->
        <template v-else-if="tab === 'about'">
          <section v-if="profile.lookingFor" class="pp__panel" data-section="looking-for"><header class="pp__panel-head"><h2>Qué tipo de creador busca</h2></header><p class="prose-text pp__text">{{ profile.lookingFor }}</p></section>
          <section v-if="typeLabels.length" class="pp__panel"><header class="pp__panel-head"><h2>Formatos que ofrece</h2></header><div class="pp__chips pp__chips--dark"><span v-for="t in typeLabels" :key="t" class="pp__chip">{{ t }}</span></div></section>
          <p v-if="!profile.lookingFor && !typeLabels.length" class="pp__empty">La marca aún no ha completado su presentación.</p>
        </template>

        <!-- Audiencia (creador) -->
        <template v-else-if="tab === 'audience'">
          <section v-if="audienceDeclared" class="pp__panel" aria-labelledby="pp-aud">
            <header class="pp__panel-head"><h2 id="pp-aud">Audiencia</h2><span class="pp__tag">Declarada por el creador</span></header>
            <div class="pp__aud">
              <div v-if="audience.countries.filter((c) => c.pct > 0).length"><h3>Países</h3><ul><li v-for="c in audience.countries.filter((x) => x.pct > 0)" :key="c.label"><span>{{ c.label }}</span><span class="pp__meter"><span :style="{ width: `${c.pct}%` }" /></span><b>{{ c.pct }} %</b></li></ul></div>
              <div v-if="audience.ages.some((a) => a.pct > 0)"><h3>Edad</h3><ul><li v-for="a in audience.ages.filter((x) => x.pct > 0)" :key="a.label"><span>{{ a.label }}</span><span class="pp__meter"><span :style="{ width: `${a.pct}%` }" /></span><b>{{ a.pct }} %</b></li></ul></div>
              <div v-if="genderRows.length"><h3>Género</h3><ul><li v-for="g in genderRows" :key="g.k"><span>{{ g.k }}</span><span class="pp__meter"><span :style="{ width: `${g.v}%` }" /></span><b>{{ g.v }} %</b></li></ul></div>
            </div>
          </section>
          <p v-else class="pp__empty" data-audience-empty>{{ isOwnProfile ? 'Aún no has declarado tu audiencia: añádela en Tu perfil → Ficha pública.' : 'El creador aún no ha declarado su audiencia.' }}</p>
        </template>

        <!-- Paquetes / necesidades -->
        <template v-else-if="tab === 'packages'">
          <section data-section="packages">
            <EmptyState v-if="!packages.length" icon="ph:package" title="Sin paquetes publicados" :description="`Todavía no se le puede hacer una oferta — ${isPartner ? 'la marca' : 'el creador'} no ha publicado ningún paquete.`" />
            <div v-else class="pub__packages"><PackageCard v-for="pkg in packages" :key="pkg.id" :pkg="pkg" @offer="emit('offer', $event)" /></div>
          </section>
        </template>

        <!-- Colaboraciones -->
        <template v-else-if="tab === 'collabs'">
          <ul v-if="collabs.length" class="pp__people" data-section="collabs">
            <li v-for="c in collabs" :key="c.id"><NuxtLink :to="`/profile/${counterpartRole}/${c.id}`" class="pp__person"><span class="pp__person-initial">{{ c.name.trim()[0]?.toUpperCase() }}</span><span><strong>{{ c.name }}</strong><small>Completada en {{ fmtMonth(c.completedAt) }}</small></span></NuxtLink></li>
          </ul>
          <p v-else class="pp__empty" data-collabs-empty>Aún sin colaboraciones completadas en CIBERAN, o prefiere no mostrarlas.</p>
        </template>

        <!-- Similares -->
        <template v-else>
          <ul v-if="similar.length" class="pp__similar">
            <li v-for="s in similar" :key="s.id"><NuxtLink :to="`/profile/${profile.role}/${s.id}`" class="pp__sim">
              <span class="pp__sim-cover"><CoverArt :seed="s.id" /><SmartImage v-if="s.coverUrl" :src="s.coverUrl" :width="320" :height="200" class="pp__tile-img" /></span>
              <strong>{{ s.name }}</strong><small>{{ s.categories.slice(0, 2).join(' · ') }}</small></NuxtLink></li>
          </ul>
          <p v-else class="pp__empty">No hay perfiles parecidos todavía.</p>
        </template>
      </div>
    </div>
  </div>
</template>
