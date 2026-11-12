<script setup lang="ts">
import type { Role } from '~/types'
import type { Package } from '~/composables/usePackages'
import type { DiscoveryResult } from '~/composables/useDiscover'
import type { PublicProfile } from '~/composables/usePublicProfile'
import { mapPublicContent, type PublicActivity, type PublicCollab, type PublicContentItem, type SimilarProfile } from '~/composables/usePublicProfileExtras'
import type { RatingSummary } from '~/utils/ratings'
import type { GuestProfilePayload } from '~~/server/utils/public-profile'

// Fuera de /creator y /partner a propósito: lo visita gente de los DOS
// roles (un partner viendo un creador, o viceversa) y role-guard.global.ts
// bloquearía la sección contraria si viviera bajo esos prefijos — mismo
// motivo por el que inbox.vue vive en la raíz.
//
// También se abre SIN sesión (enlace compartido): entonces los datos vienen de
// /api/public/profile, que solo devuelve lo público, y la vista va en modo invitado.
const route = useRoute()
const router = useRouter()
const targetRole = route.params.role as Role
const targetId = route.params.id as string
if (targetRole !== 'creator' && targetRole !== 'partner') {
  throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })
}

const { role: myRole, ensureRole } = useMyRole()
const { loadProfile } = usePublicProfile()
// `useSupabaseUser().value` puede seguir vacío justo al cargar la página
// (ver role-guard.global.ts) — se resuelve una vez de forma fiable en vez
// de leer el ref directamente, para no mostrar botones de "propio perfil"
// de forma incorrecta en el primer render.
const { resolveMyProfileId } = useMyProfileId()
const myProfileId = await resolveMyProfileId()
const guest = !myProfileId

let profile: PublicProfile | null = null
const packages = ref<Package[]>([])
const ratingSummary = ref<RatingSummary>({ avgStars: 0, ratingCount: 0 })
let content: PublicContentItem[] = []
let collabs: PublicCollab[] = []
let activity: PublicActivity = { collabCount: 0, responseHours: null }
let similar: SimilarProfile[] = []

if (guest) {
  // useFetch: se pide en el servidor y el resultado viaja con la página (sin segunda petición al hidratar).
  const { data, error } = await useFetch<GuestProfilePayload>(`/api/public/profile/${targetRole}/${targetId}`, { key: `guest-profile-${targetRole}-${targetId}` })
  if (error.value || !data.value) {
    throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado', fatal: true })
  }
  profile = data.value.profile as unknown as PublicProfile
  content = data.value.content.map(mapPublicContent)
  activity = data.value.activity
  ratingSummary.value = data.value.rating
} else {
  // Las dos son independientes entre sí — en paralelo en vez de en cascada.
  const [, loaded] = await Promise.all([ensureRole(), loadProfile(targetRole, targetId)])
  if (!loaded) {
    throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })
  }
  profile = loaded
  const { listPackagesOf } = usePackages()
  const { fetchSummary } = useRatings()
  const { load: loadExtras } = usePublicProfileExtras()
  // Paquetes, valoraciones y los datos del perfil (métricas, contenido, colaboraciones…) son independientes: en paralelo.
  const [packagesList, summary, extras] = await Promise.all([
    listPackagesOf(loaded.profileId), fetchSummary(loaded.profileId), loadExtras(targetRole, loaded.id, loaded.categories)
  ])
  packages.value = packagesList
  ratingSummary.value = summary
  ;({ content, collabs, activity, similar } = extras)
}

const shown = profile!
const roleNoun = shown.role === 'creator' ? 'Creador de contenido' : 'Marca'
const description = (shown.headline || shown.bio || `${roleNoun} en CIBERAN.`).slice(0, 160)
useHead({ title: guest ? `${shown.name} · ${roleNoun}` : 'Perfil' })
if (guest) {
  // Vista previa al compartir el enlace (mensajería, redes): nombre, frase y foto.
  useSeoMeta({
    description,
    ogTitle: `${shown.name} · ${roleNoun} en CIBERAN`,
    ogDescription: description,
    ogType: 'profile',
    ogImage: shown.coverUrl || shown.avatarUrl || undefined,
    twitterCard: shown.coverUrl || shown.avatarUrl ? 'summary_large_image' : 'summary'
  })
}

const isOwnProfile = computed(() => !guest && shown.profileId === myProfileId)

const { openConversationWith } = useChat()
const startingChat = ref(false)
const chatError = ref('')

async function startChat() {
  chatError.value = ''
  startingChat.value = true
  try {
    const conversationId = await openConversationWith(shown.profileId)
    router.push(`/chat/${conversationId}`)
  } catch (e) {
    chatError.value = e instanceof Error ? e.message : 'No se ha podido abrir el chat.'
  } finally {
    startingChat.value = false
  }
}

const offerSheetOpen = ref(false)
const offerTarget = ref<Package | null>(null)

function openOffer(pkg: Package) {
  offerTarget.value = pkg
  offerSheetOpen.value = true
}

// «Invitar a colaborar» (marca → creador) y «Proponer» (creador → marca) reutilizan los diálogos de Descubrir.
const dialogOpen = ref(false)
const dialogTarget = computed<DiscoveryResult>(() => ({
  id: shown.id, name: shown.name, bio: shown.bio, categories: shown.categories, lookingFor: shown.lookingFor,
  minCents: shown.minCents, maxCents: shown.maxCents, 
  coverUrl: shown.coverUrl, score: 0, reason: null, profileId: shown.profileId, collabCount: activity.collabCount,
  responseHours: activity.responseHours, platforms: [], verified: false, collaborationTypes: shown.collaborationTypes
}))

// Copiar el enlace del perfil — el mismo enlace sirve con y sin sesión.
const { copied: linkCopied, error: copyError, copy: copyLink } = useClipboard()
function copyProfileLink() {
  copyLink(window.location.href)
}
</script>

<template>
  <PublicShell v-if="guest">
    <PublicProfileView
      guest :profile="shown" :packages="[]" :rating-summary="ratingSummary" :is-own-profile="false" :my-role="null"
      :starting-chat="false" chat-error="" :link-copied="linkCopied" :copy-error="copyError"
      :content="content" :collabs="[]" :activity="activity" :similar="[]"
      @copy="copyProfileLink"
    />
  </PublicShell>
  <AppShell v-else :role="myRole ?? 'creator'" title="Perfil" full-width>
    <PublicProfileView
      :profile="shown" :packages="packages" :rating-summary="ratingSummary" :is-own-profile="isOwnProfile" :my-role="myRole ?? null"
      :starting-chat="startingChat" :chat-error="chatError" :link-copied="linkCopied" :copy-error="copyError"
      :content="content" :collabs="collabs" :activity="activity" :similar="similar"
      @chat="startChat" @offer="openOffer" @copy="copyProfileLink" @collaborate="dialogOpen = true"
    />
    <InviteDialog v-if="myRole === 'partner' && shown.role === 'creator'" v-model="dialogOpen" :target="dialogTarget" />
    <ProposalDialog v-else-if="myRole === 'creator' && shown.role === 'partner'" v-model="dialogOpen" :target="dialogTarget" />
    <ChatOfferSheet v-model="offerSheetOpen" :packages="offerTarget ? [offerTarget] : []" />
  </AppShell>
</template>
