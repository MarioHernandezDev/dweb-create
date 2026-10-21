<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
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

const rangeLabel = computed(() => {
  if (!profile!.minCents && !profile!.maxCents) return null
  return `${profile!.minCents ? formatEuros(profile!.minCents) : '…'}–${profile!.maxCents ? formatEuros(profile!.maxCents) : '…'}`
})

const packagesSectionTitle = computed(() => (targetRole === 'creator' ? 'Catálogo' : 'Necesidades'))
const catalogCountLabel = computed(() => (targetRole === 'creator' ? 'paquetes publicados' : 'necesidades publicadas'))
</script>

<template>
  <AppShell :role="myRole ?? 'creator'" title="Perfil">
    <div class="md:max-w-xl">
      <ProfileHeaderCard
        :name="profile.name" :role-label="targetRole === 'creator' ? 'Creador de contenido' : 'Partner'"
        :avatar-url="profile.avatarUrl" :cover-url="profile.coverUrl" :cover-seed="profile.profileId"
        :categories="profile.categories" :bio="profile.bio" :range-label="rangeLabel"
        :range-field-label="targetRole === 'creator' ? 'Tarifa orientativa' : 'Presupuesto'"
        :looking-for="profile.lookingFor" :verified-socials="profile.verifiedSocials"
        :member-since="profile.createdAt" :catalog-count="packages.length" :catalog-label="catalogCountLabel"
      />

      <template v-if="!isOwnProfile">
        <div class="flex flex-col gap-2 mb-7">
          <BaseButton variant="primary" size="lg" icon="ph:chat-circle-fill" :icon-spin="startingChat" :disabled="startingChat" @click="startChat">
            Iniciar chat
          </BaseButton>
          <p v-if="chatError" class="text-[0.8125rem] text-[var(--color-status-alert)]">{{ chatError }}</p>
          <p v-else-if="profile.chatPrivacy === 'accepted_offers_only'" class="text-[0.75rem] text-[var(--color-text-faint)]">
            Este perfil solo acepta mensajes de texto tras una oferta aceptada — puedes empezar haciéndole una oferta sobre uno de sus paquetes.
          </p>
        </div>

        <section>
          <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2.5">{{ packagesSectionTitle }}</h2>
          <EmptyState
            v-if="!packages.length"
            icon="ph:package" title="Sin paquetes publicados"
            :description="`Todavía no se le puede hacer una oferta — ${targetRole === 'creator' ? 'el creador' : 'el partner'} no ha publicado ningún paquete.`"
          />
          <div v-else class="flex flex-col gap-2.5">
            <PackageCard v-for="pkg in packages" :key="pkg.id" :pkg="pkg" @offer="openOffer" />
          </div>
        </section>
      </template>

      <OfferSheet v-model="offerSheetOpen" :pkg="offerTarget" />
    </div>
  </AppShell>
</template>
