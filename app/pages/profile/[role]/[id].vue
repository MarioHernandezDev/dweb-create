<script setup lang="ts">
import type { Role } from '~/types'
import type { Package } from '~/composables/usePackages'

// Fuera de /creator y /partner a propósito: lo visita gente de los DOS
// roles (un partner viendo un creador, o viceversa) y role-guard.global.ts
// bloquearía la sección contraria si viviera bajo esos prefijos — mismo
// motivo por el que inbox.vue vive en la raíz.
const route = useRoute()
const router = useRouter()
const targetRole = route.params.role as Role
const targetId = route.params.id as string

useHead({ title: 'Perfil' })

const { role: myRole, ensureRole } = useMyRole()
const { loadProfile } = usePublicProfile()
// `useSupabaseUser().value` puede seguir vacío justo al cargar la página
// (ver role-guard.global.ts) — se resuelve una vez de forma fiable en vez
// de leer el ref directamente, para no mostrar botones de "propio perfil"
// de forma incorrecta en el primer render.
const { resolveMyProfileId } = useMyProfileId()

// Las tres son independientes entre sí — en paralelo en vez de en cascada.
const [, profile, myProfileId] = await Promise.all([ensureRole(), loadProfile(targetRole, targetId), resolveMyProfileId()])

if (!profile) {
  throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })
}

const { listPackagesOf } = usePackages()
const packages = ref<Package[]>(await listPackagesOf(profile.profileId))

const { fetchSummary } = useRatings()
const ratingSummary = ref(await fetchSummary(profile.profileId))

const isOwnProfile = computed(() => profile!.profileId === myProfileId)

const { openConversationWith } = useChat()
const startingChat = ref(false)
const chatError = ref('')

async function startChat() {
  chatError.value = ''
  startingChat.value = true
  try {
    const conversationId = await openConversationWith(profile!.profileId)
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

// Copiar el enlace del perfil — no había ninguna forma de compartirlo hasta
// ahora, ni siquiera el tuyo propio para mandárselo a alguien (ver también
// el botón "Compartir" en la pestaña Cuenta de creator/profile.vue y
// partner/profile.vue, que usa este mismo composable).
const { copied: linkCopied, error: copyError, copy: copyLink } = useClipboard()
function copyProfileLink() {
  copyLink(window.location.href)
}
</script>

<template>
  <AppShell :role="myRole ?? 'creator'" title="Perfil" full-width>
    <PublicProfileView
      :profile="profile" :packages="packages" :rating-summary="ratingSummary" :is-own-profile="isOwnProfile" :my-role="myRole ?? null"
      :starting-chat="startingChat" :chat-error="chatError" :link-copied="linkCopied" :copy-error="copyError"
      @chat="startChat" @offer="openOffer" @copy="copyProfileLink"
    />
    <ChatOfferSheet v-model="offerSheetOpen" :packages="offerTarget ? [offerTarget] : []" />
  </AppShell>
</template>
