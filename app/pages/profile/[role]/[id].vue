<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
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
await ensureRole()

const { loadProfile } = usePublicProfile()
const profile = await loadProfile(targetRole, targetId)

if (!profile) {
  throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })
}

const { listPackagesOf } = usePackages()
const packages = ref<Package[]>(await listPackagesOf(profile.profileId))

// `useSupabaseUser().value` puede seguir vacío justo al cargar la página
// (ver role-guard.global.ts) — se resuelve una vez de forma fiable en vez
// de leer el ref directamente, para no mostrar botones de "propio perfil"
// de forma incorrecta en el primer render.
const { resolveMyProfileId } = useMyProfileId()
const myProfileId = await resolveMyProfileId()
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

const packagesSectionTitle = computed(() => (targetRole === 'creator' ? 'Paquetes' : 'Necesidades'))
</script>

<template>
  <AppShell :role="myRole ?? 'creator'" title="Perfil">
    <div class="md:max-w-xl">
      <section class="flex items-center gap-4 mb-6">
        <BaseAvatar :initials="initialsFromName(profile.name)" :hue="hueFromString(profile.name)" size="lg" />
        <div class="min-w-0 flex-1">
          <p class="font-display text-[1.25rem] text-[var(--color-text)] truncate">{{ profile.name }}</p>
          <p class="text-[0.875rem] text-[var(--color-text-muted)]">{{ targetRole === 'creator' ? 'Creador de contenido' : 'Partner' }}</p>
        </div>
      </section>

      <p v-if="profile.bio" class="text-[0.9375rem] text-[var(--color-text)] leading-relaxed mb-5">{{ profile.bio }}</p>

      <div v-if="profile.categories.length" class="flex flex-wrap gap-1.5 mb-5">
        <span v-for="cat in profile.categories" :key="cat" class="px-2.5 h-7 flex items-center rounded-full text-[0.75rem] font-medium bg-[var(--color-ink-overlay)] text-[var(--color-text-muted)] border border-[var(--color-hairline)]">
          {{ cat }}
        </span>
      </div>

      <BaseCard v-if="rangeLabel || profile.lookingFor" radius="lg" padding="md" class="mb-6 flex flex-col gap-2">
        <p v-if="rangeLabel" class="text-[0.875rem] text-[var(--color-text)]">
          {{ targetRole === 'creator' ? 'Tarifa orientativa' : 'Presupuesto' }}: <span class="font-medium">{{ rangeLabel }}</span>
        </p>
        <p v-if="profile.lookingFor" class="text-[0.8125rem] text-[var(--color-text-muted)]">{{ profile.lookingFor }}</p>
      </BaseCard>

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
          <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-3">{{ packagesSectionTitle }}</h2>
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
