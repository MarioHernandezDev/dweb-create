<script setup lang="ts">
import draggable from 'vuedraggable'
import { initialsFromName, hueFromString, coverArtFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import type { Package } from '~/composables/usePackages'
import type { ChatPrivacy } from '~/types'

useHead({ title: 'Perfil' })

const route = useRoute()
const { partner, ensurePartner, updateFicha, uploadCoverPhoto, removeCoverPhoto } = useMyPartner()

const user = useSupabaseUser()
const { logout } = useLogout()
const { resolveMyProfileId } = useMyProfileId()
const { avatarUrl, uploadAvatar, removeAvatar } = useMyAvatar()

// `user.value?.id` puede seguir vacío justo al cargar la página (ver
// role-guard.global.ts) — se resuelve de forma fiable con useMyProfileId.
const myProfileId = await resolveMyProfileId()

const { myPackages, ensureMyPackages, duplicatePackage, updatePackage, reorderPackages, deletePackage } = usePackages()
const { pendingCountByPackage, refreshPendingCounts } = useOffers()
const { chatPrivacy, chatPrivacyError, ensureChatPrivacy, setChatPrivacy } = useChatSettings()

// Cuatro consultas independientes entre sí — en paralelo en vez de en
// cascada (antes cada una esperaba a la anterior sin necesidad, y con la
// latencia de red real eso se notaba mucho al navegar a esta página).
await Promise.all([
  ensurePartner(),
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([]),
  myProfileId ? refreshPendingCounts(myProfileId) : Promise.resolve(),
  ensureChatPrivacy()
])

// Secciones de "Tu Perfil" — antes era un único scroll larguísimo con 6
// bloques seguidos, cada uno marcado solo con una etiqueta gris diminuta.
// Agrupadas así se navega directo a lo que se busca, en vez de bajar todo.
// "Colaboraciones" vivió aquí hasta la Fase 3 de la reorganización de
// navegación (pagar/completar/valorar) — ahora vive entera en
// /partner/requests, junto al resto del detalle de cada colaboración.
const tabs = [
  { id: 'account', label: 'Cuenta', icon: 'ph:user-circle-fill' },
  { id: 'ficha', label: 'Ficha pública', icon: 'ph:identification-card-fill' },
  { id: 'needs', label: 'Necesidades', icon: 'ph:package-fill' },
  { id: 'privacy', label: 'Privacidad', icon: 'ph:shield-check-fill' }
] as const
const initialTab = route.query.tab as string | undefined
const activeTab = ref<(typeof tabs)[number]['id']>(
  tabs.some((t) => t.id === initialTab) ? (initialTab as (typeof tabs)[number]['id']) : 'ficha'
)

const packageSheetOpen = ref(false)
const editingPackage = ref<Package | null>(null)

function openNewPackage() {
  editingPackage.value = null
  packageSheetOpen.value = true
}

function openEditPackage(pkg: Package) {
  editingPackage.value = pkg
  packageSheetOpen.value = true
}

const { confirm } = useConfirm()

// Compartir tu propio perfil público sin tener que ir a buscarlo primero.
const { copied: profileLinkCopied, copy: copyLink } = useClipboard()
function copyMyProfileLink() {
  if (!partner.value) return
  copyLink(`${window.location.origin}/profile/partner/${partner.value.id}`)
}

const packageError = ref('')

async function confirmDeletePackage(pkg: Package) {
  const ok = await confirm({
    title: `¿Borrar "${pkg.title}"?`,
    message: 'Se borrará permanentemente, junto con cualquier oferta que se haya hecho sobre ella.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (!ok) return
  packageError.value = ''
  try {
    await deletePackage(pkg.id)
  } catch {
    packageError.value = 'No se ha podido borrar la necesidad. Inténtalo de nuevo.'
  }
}

async function toggleActivePackage(pkg: Package) {
  packageError.value = ''
  try {
    await updatePackage(pkg.id, { active: !pkg.active })
  } catch {
    packageError.value = 'No se ha podido actualizar la necesidad. Inténtalo de nuevo.'
  }
}

async function duplicateOnePackage(pkg: Package) {
  packageError.value = ''
  try {
    await duplicatePackage(pkg)
  } catch {
    packageError.value = 'No se ha podido duplicar la necesidad. Inténtalo de nuevo.'
  }
}

const activePackagesCount = computed(() => (myPackages.value ?? []).filter((p) => p.active).length)
const pendingOffersTotal = computed(() => Object.values(pendingCountByPackage.value).reduce((sum, n) => sum + n, 0))

// M-O1: volver a ver el recorrido de bienvenida.
const onboardingTour = useOnboardingTour()
function replayTour() {
  if (myProfileId) onboardingTour.start(myProfileId, 'partner')
}

async function confirmLogout() {
  const ok = await confirm({ title: '¿Cerrar sesión?', confirmLabel: 'Cerrar sesión' })
  if (!ok) return
  // Confirmar "cerrar sesión" ya implica descartar cualquier cambio sin
  // guardar — si no se marca la ficha como "limpia" aquí, el guard de
  // cambios sin guardar volvería a preguntar justo después de este mismo
  // diálogo, cuando logout() navegue a /login (y signOut() ya se habría
  // ejecutado, dejando la sesión a medias si en ese segundo aviso se cancelara).
  fichaSnapshot.value = JSON.stringify(ficha)
  await logout()
}

const chatPrivacyOptions: { value: ChatPrivacy; label: string; description: string }[] = [
  { value: 'everyone', label: 'Cualquiera', description: 'Cualquier perfil te puede escribir directamente.' },
  { value: 'accepted_offers_only', label: 'Solo tras oferta aceptada', description: 'Solo podrán escribirte en texto libre quienes ya tengan una oferta aceptada contigo. Aun así, cualquiera te puede mandar una oferta.' }
]

// Ficha pública — lo que ve un creador en /creator/discover. Mismo patrón
// que creator/profile.vue: un solo botón "Guardar" para todo el bloque.
const ficha = reactive({
  bio: partner.value?.bio ?? '',
  categories: [...(partner.value?.categories ?? [])],
  minBudgetEuros: partner.value?.minBudgetCents ? partner.value.minBudgetCents / 100 : null,
  maxBudgetEuros: partner.value?.maxBudgetCents ? partner.value.maxBudgetCents / 100 : null,
  lookingFor: partner.value?.lookingFor ?? ''
})
const savingFicha = ref(false)
const fichaSaved = ref(false)
const coverArt = computed(() => coverArtFromString(partner.value?.id ?? 'partner'))

// Si sales con cambios sin guardar en la ficha (bio/categorías/presupuesto...),
// se avisa en vez de descartarlos en silencio — ver useUnsavedChangesGuard.ts.
// La portada y el avatar quedan fuera a propósito: se guardan solos al subir,
// no forman parte de este formulario con botón "Guardar" aparte.
const fichaSnapshot = ref(JSON.stringify(ficha))
const fichaDirty = computed(() => JSON.stringify(ficha) !== fichaSnapshot.value)
useUnsavedChangesGuard(fichaDirty)

// Vista previa en vivo (columna derecha en escritorio, dentro de "Ficha
// pública") — usa el MISMO componente que pinta /profile/[role]/[id], así
// nunca puede desincronizarse de cómo se ve el perfil de verdad. Lee los
// campos del formulario sin guardar todavía: es intencionado, para que se
// note el cambio mientras escribes, no solo después de "Guardar ficha".
// En móvil la columna no cabe (`hidden md:block`) — un botón abre la misma
// vista previa en una hoja aparte en vez de dejarla invisible del todo.
const previewSheetOpen = ref(false)
const previewName = computed(() => partner.value?.name || user.value?.email || 'Tu empresa')
const previewRangeLabel = computed(() => {
  if (!ficha.minBudgetEuros && !ficha.maxBudgetEuros) return null
  const min = ficha.minBudgetEuros ? formatEuros(Math.round(ficha.minBudgetEuros * 100)) : '…'
  const max = ficha.maxBudgetEuros ? formatEuros(Math.round(ficha.maxBudgetEuros * 100)) : '…'
  return `${min}–${max}`
})

// Barra de "ficha completa al X%" — anima a rellenar lo que de verdad
// mejora el matching (mismo motivo que ya explica el texto de esta sección).
const completionItems = computed(() => [
  { label: 'Foto de perfil', done: !!avatarUrl.value },
  { label: 'Foto de portada', done: !!partner.value?.coverUrl },
  { label: 'Biografía', done: !!ficha.bio.trim() },
  { label: 'Categorías', done: ficha.categories.length > 0 },
  { label: 'Presupuesto', done: !!(ficha.minBudgetEuros || ficha.maxBudgetEuros) },
  { label: 'Qué tipo de creador buscas', done: !!ficha.lookingFor.trim() },
  { label: 'Un paquete publicado', done: (myPackages.value?.length ?? 0) > 0 }
])
const completionPercent = computed(() => Math.round((completionItems.value.filter((i) => i.done).length / completionItems.value.length) * 100))

function toggleFichaCategory(cat: string) {
  const i = ficha.categories.indexOf(cat)
  if (i === -1) ficha.categories.push(cat)
  else ficha.categories.splice(i, 1)
}

async function saveFicha() {
  savingFicha.value = true
  fichaSaved.value = false
  try {
    await updateFicha({
      bio: ficha.bio || null,
      categories: ficha.categories,
      minBudgetCents: ficha.minBudgetEuros ? Math.round(ficha.minBudgetEuros * 100) : null,
      maxBudgetCents: ficha.maxBudgetEuros ? Math.round(ficha.maxBudgetEuros * 100) : null,
      lookingFor: ficha.lookingFor || null
    })
    fichaSaved.value = true
    fichaSnapshot.value = JSON.stringify(ficha)
  } finally {
    savingFicha.value = false
  }
}
</script>

<template>
  <AppShell role="partner" title="Perfil">
    <div class="md:max-w-5xl">
      <div class="md:max-w-lg">
        <section class="flex items-center gap-4 mb-6">
          <AvatarUploader
            v-if="partner" :avatar-url="avatarUrl" :initials="initialsFromName(partner.name)" :hue="hueFromString(partner.name)"
            :upload="uploadAvatar" :remove="removeAvatar"
          />
          <div>
            <p class="font-display text-[1.25rem] text-[var(--color-text)]">{{ partner?.name }}</p>
            <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Cuenta de partner' }}</p>
          </div>
        </section>

        <ProfileCompletionBar :percent="completionPercent" :items="completionItems" />
      </div>

      <div class="md:flex md:gap-10">
        <ProfileSettingsNav v-model="activeTab" :tabs="[...tabs]" />

        <div class="flex-1 min-w-0">
          <div v-show="activeTab === 'account'" class="md:max-w-lg">
            <section class="mb-6">
              <BaseCard v-if="partner" radius="lg" padding="none" class="overflow-hidden">
                <div class="flex items-center justify-between px-5 py-4 gap-3">
                  <NuxtLink :to="`/profile/partner/${partner.id}`" class="min-w-0 flex-1 text-[0.9375rem] text-[var(--color-text)] truncate">
                    Tu perfil público
                  </NuxtLink>
                  <button
                    type="button" :aria-label="profileLinkCopied ? 'Enlace copiado' : 'Copiar enlace de tu perfil'"
                    class="shrink-0 size-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-text)]"
                    @click="copyMyProfileLink"
                  >
                    <Icon :name="profileLinkCopied ? 'ph:check-bold' : 'ph:link-simple-bold'" class="size-4" />
                  </button>
                </div>
              </BaseCard>
            </section>

            <BaseButton variant="secondary" icon="ph:compass-tool-bold" class="w-full mb-3" @click="replayTour">Ver el recorrido de bienvenida</BaseButton>
            <BaseButton variant="secondary" icon="ph:sign-out-bold" class="w-full" @click="confirmLogout">Cerrar sesión</BaseButton>
          </div>

          <div v-show="activeTab === 'ficha'" class="md:flex md:gap-8 md:items-start">
            <div class="md:flex-1 md:min-w-0 md:max-w-lg">
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-3">Esto es lo que ve un creador en "Descubrir" — cuanto más completa, mejor encajan los resultados.</p>
              <BaseButton variant="secondary" size="sm" icon="ph:eye-fill" class="w-full mb-4 md:hidden" @click="previewSheetOpen = true">
                Ver vista previa
              </BaseButton>
              <BaseCard radius="lg" padding="md" class="flex flex-col gap-4">
                <CoverPhotoUploader
                  :cover-url="partner?.coverUrl ?? null" :cover-art="coverArt" icon="ph:storefront-fill" :upload="uploadCoverPhoto"
                  :remove="removeCoverPhoto"
                />

                <div>
                  <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-bio">Bio</label>
                  <textarea
                    id="ficha-bio" v-model="ficha.bio" rows="3" placeholder="Quién eres y qué tipo de campañas haces…"
                    class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
                  />
                </div>

                <div>
                  <p class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5">Categorías que buscas</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="cat in DISCOVERY_CATEGORIES" :key="cat" type="button"
                      class="px-2.5 h-7 rounded-full text-[0.75rem] font-medium border transition-colors duration-150"
                      :class="ficha.categories.includes(cat)
                        ? 'bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/50 text-[var(--color-primary-500)]'
                        : 'bg-[var(--color-ink-overlay)] border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:border-[var(--color-primary-500)]/40 hover:text-[var(--color-primary-600)]'"
                      @click="toggleFichaCategory(cat)"
                    >
                      {{ cat }}
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-2.5">
                  <div class="flex-1">
                    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-min-budget">Presupuesto desde (€)</label>
                    <input
                      id="ficha-min-budget" v-model.number="ficha.minBudgetEuros" type="number" min="0" step="1"
                      class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
                    >
                  </div>
                  <div class="flex-1">
                    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-max-budget">hasta (€)</label>
                    <input
                      id="ficha-max-budget" v-model.number="ficha.maxBudgetEuros" type="number" min="0" step="1"
                      class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
                    >
                  </div>
                </div>

                <div>
                  <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-looking-for">Qué tipo de creador buscas</label>
                  <textarea
                    id="ficha-looking-for" v-model="ficha.lookingFor" rows="2" placeholder="Ej. creadores de fitness con audiencia en España…"
                    class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
                  />
                </div>

                <div class="flex items-center gap-3">
                  <BaseButton variant="secondary" size="sm" :icon-spin="savingFicha" :disabled="savingFicha" @click="saveFicha">
                    {{ savingFicha ? 'Guardando…' : 'Guardar ficha' }}
                  </BaseButton>
                  <span v-if="fichaSaved" class="text-[0.8125rem] text-[var(--color-status-published)]">Guardado.</span>
                </div>
              </BaseCard>
            </div>

            <div class="hidden md:block md:w-72 md:shrink-0 md:sticky md:top-24 md:self-start">
              <p class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2.5">Vista previa</p>
              <BaseCard radius="lg" padding="md">
                <ProfileHeaderCard
                  compact :name="previewName" role-label="Partner" :avatar-url="avatarUrl"
                  :cover-url="partner?.coverUrl ?? null" :cover-seed="partner?.id ?? 'partner'" :categories="ficha.categories"
                  :bio="ficha.bio || null" :range-label="previewRangeLabel" range-field-label="Presupuesto"
                  :looking-for="ficha.lookingFor || null"
                />
              </BaseCard>
            </div>
          </div>

          <BottomSheet v-model="previewSheetOpen" title="Vista previa">
            <ProfileHeaderCard
              :name="previewName" role-label="Partner" :avatar-url="avatarUrl"
              :cover-url="partner?.coverUrl ?? null" :cover-seed="partner?.id ?? 'partner'" :categories="ficha.categories"
              :bio="ficha.bio || null" :range-label="previewRangeLabel" range-field-label="Presupuesto"
              :looking-for="ficha.lookingFor || null"
            />
          </BottomSheet>

          <div v-show="activeTab === 'needs'" class="md:max-w-lg">
            <section>
              <div class="flex items-center justify-between mb-2 px-1">
                <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">Tus necesidades</p>
                <button type="button" class="text-[0.8125rem] font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] transition-colors" @click="openNewPackage">Añadir</button>
              </div>
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-1 px-1">Lo que buscas — un creador podrá hacer una oferta ajustándose a tu necesidad. Arrastra para reordenar.</p>
              <p v-if="myPackages?.length" class="text-[0.75rem] text-[var(--color-text-faint)] mb-3 px-1">
                {{ activePackagesCount }} activa{{ activePackagesCount === 1 ? '' : 's' }}
                <span v-if="pendingOffersTotal"> · {{ pendingOffersTotal }} oferta{{ pendingOffersTotal > 1 ? 's' : '' }} pendiente{{ pendingOffersTotal > 1 ? 's' : '' }}</span>
              </p>
              <p v-if="packageError" class="text-[0.75rem] text-[var(--color-status-alert)] mb-3 px-1">{{ packageError }}</p>
              <EmptyState
                v-if="!myPackages?.length"
                icon="ph:package" title="Sin necesidades todavía"
                description="Publica qué necesitas para que un creador pueda ofertar ajustándose a ello."
              />
              <draggable
                v-else v-model="myPackages" item-key="id" :animation="150" :delay="150" :delay-on-touch-only="true"
                class="flex flex-col gap-2.5" ghost-class="nx-package-ghost"
                @end="reorderPackages((myPackages ?? []).map((p) => p.id))"
              >
                <template #item="{ element }: { element: Package }">
                  <PackageCard
                    :pkg="element" editable drag-handle :pending-offers="pendingCountByPackage[element.id]"
                    @edit="openEditPackage" @delete="confirmDeletePackage(element)"
                    @toggle-active="toggleActivePackage" @duplicate="duplicateOnePackage"
                  />
                </template>
              </draggable>
              <PackageFormSheet v-if="myProfileId" v-model="packageSheetOpen" :profile-id="myProfileId" role="partner" :editing="editingPackage" />
            </section>
          </div>

          <div v-show="activeTab === 'privacy'" class="md:max-w-lg">
            <section>
              <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-2 px-1">Privacidad del chat</p>
              <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
                <button
                  v-for="opt in chatPrivacyOptions" :key="opt.value" type="button"
                  class="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-[var(--color-ink-overlay)]"
                  @click="setChatPrivacy(opt.value)"
                >
                  <span
                    class="mt-0.5 shrink-0 size-4 rounded-full border-2 flex items-center justify-center"
                    :class="chatPrivacy === opt.value ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-hairline-strong)]'"
                  >
                    <span v-if="chatPrivacy === opt.value" class="size-2 rounded-full bg-[var(--color-primary-500)]" />
                  </span>
                  <span>
                    <p class="text-[0.9375rem] text-[var(--color-text)]">{{ opt.label }}</p>
                    <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">{{ opt.description }}</p>
                  </span>
                </button>
              </BaseCard>
              <p v-if="chatPrivacyError" class="text-[0.75rem] text-[var(--color-status-alert)] mt-2 px-1">{{ chatPrivacyError }}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.nx-package-ghost {
  opacity: 0.4;
}
</style>
