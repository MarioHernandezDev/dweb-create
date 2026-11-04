<script setup lang="ts">
import draggable from 'vuedraggable'
import { initialsFromName, hueFromString, coverArtFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { firstFichaError, validateFicha } from '~/utils/profile-ficha'
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

// Consultas independientes entre sí — en paralelo en vez de en cascada.
await Promise.all([
  ensurePartner(),
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([]),
  myProfileId ? refreshPendingCounts(myProfileId) : Promise.resolve(),
  ensureChatPrivacy()
])

// Las mismas cuatro secciones de siempre (A-R18): "Cuenta" pasa a llamarse
// "Resumen". "Colaboraciones" vive entera en /partner/requests.
const tabs = [
  { id: 'account', label: 'Resumen', icon: 'ph:squares-four-fill' },
  { id: 'ficha', label: 'Ficha pública', icon: 'ph:identification-card-fill' },
  { id: 'needs', label: 'Necesidades', icon: 'ph:package-fill' },
  { id: 'privacy', label: 'Privacidad', icon: 'ph:shield-check-fill' }
] as const
type TabId = (typeof tabs)[number]['id']
const initialTab = route.query.tab as string | undefined
const activeTab = ref<TabId>(tabs.some((t) => t.id === initialTab) ? (initialTab as TabId) : 'account')
function selectTab(id: string) {
  if (tabs.some((t) => t.id === id)) activeTab.value = id as TabId
}

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
  // guardar — si no, el guard de cambios sin guardar volvería a preguntar
  // justo después de este mismo diálogo, cuando logout() navegue a /login.
  fichaSnapshot.value = JSON.stringify(ficha)
  await logout()
}

const chatPrivacyOptions: { value: ChatPrivacy; label: string; description: string }[] = [
  { value: 'everyone', label: 'Cualquiera', description: 'Cualquier perfil te puede escribir directamente.' },
  { value: 'accepted_offers_only', label: 'Solo tras oferta aceptada', description: 'Solo podrán escribirte en texto libre quienes ya tengan una oferta aceptada contigo. Aun así, cualquiera te puede mandar una oferta.' }
]
const currentPrivacy = computed(() => chatPrivacyOptions.find((o) => o.value === chatPrivacy.value) ?? null)

// Ficha pública — lo que ve un creador en /creator/discover. Mismo patrón que
// creator/profile.vue: un solo guardado para todo el bloque (barra fija).
function fichaFromPartner() {
  return {
    bio: partner.value?.bio ?? '',
    categories: [...(partner.value?.categories ?? [])],
    min: (partner.value?.minBudgetCents ? partner.value.minBudgetCents / 100 : null) as number | string | null,
    max: (partner.value?.maxBudgetCents ? partner.value.maxBudgetCents / 100 : null) as number | string | null,
    lookingFor: partner.value?.lookingFor ?? ''
  }
}
const ficha = reactive(fichaFromPartner())
const savingFicha = ref(false)
const fichaSaved = ref(false)
const fichaError = ref('')

// Cambios sin guardar: se avisa al salir — ver useUnsavedChangesGuard.ts.
// La portada y el avatar se guardan solos al subir y quedan fuera.
const fichaSnapshot = ref(JSON.stringify(ficha))
const fichaDirty = computed(() => JSON.stringify(ficha) !== fichaSnapshot.value)
useUnsavedChangesGuard(fichaDirty)

const fichaErrors = computed(() => validateFicha(ficha, { min: 'El presupuesto mínimo', max: 'El presupuesto máximo' }))
const fichaBlockedReason = computed(() => firstFichaError(fichaErrors.value))

function discardFicha() {
  Object.assign(ficha, fichaFromPartner())
  fichaSnapshot.value = JSON.stringify(ficha)
  fichaError.value = ''
}

let savedTimer: ReturnType<typeof setTimeout> | null = null
async function saveFicha() {
  if (fichaBlockedReason.value) return
  savingFicha.value = true
  fichaSaved.value = false
  fichaError.value = ''
  try {
    await updateFicha({
      bio: ficha.bio.trim() || null,
      categories: ficha.categories,
      minBudgetCents: ficha.min ? Math.round(Number(ficha.min) * 100) : null,
      maxBudgetCents: ficha.max ? Math.round(Number(ficha.max) * 100) : null,
      lookingFor: ficha.lookingFor.trim() || null
    })
    fichaSnapshot.value = JSON.stringify(ficha)
    fichaSaved.value = true
    if (savedTimer) clearTimeout(savedTimer)
    savedTimer = setTimeout(() => { fichaSaved.value = false }, 3000)
  } catch {
    fichaError.value = 'No se han podido guardar los cambios. Inténtalo de nuevo.'
  } finally {
    savingFicha.value = false
  }
}
onBeforeUnmount(() => { if (savedTimer) clearTimeout(savedTimer) })

const fichaTexts = {
  bioPlaceholder: 'Quiénes sois y qué tipo de campañas hacéis…',
  categoriesLabel: 'Categorías que buscas',
  categoriesHint: 'Los creadores de esas categorías te encuentran en Descubrir.',
  rangeLabel: 'Presupuesto por colaboración (€)',
  minLabel: 'Desde',
  maxLabel: 'Hasta',
  lookingForLabel: 'Qué tipo de creador buscas',
  lookingForPlaceholder: 'Ej. creadores de fitness con audiencia en España…'
}

// Vista previa en vivo — usa el MISMO componente que pinta /profile/[role]/[id].
// Lee los campos sin guardar a propósito, para que se note el cambio al escribir.
const previewSheetOpen = ref(false)
const previewName = computed(() => partner.value?.name || user.value?.email || 'Tu empresa')
function rangeText(min: number | string | null, max: number | string | null) {
  const a = Number(min) || 0
  const b = Number(max) || 0
  if (!a && !b) return null
  return `${a ? formatEuros(Math.round(a * 100)) : '…'}–${b ? formatEuros(Math.round(b * 100)) : '…'}`
}
const previewRangeLabel = computed(() => rangeText(ficha.min, ficha.max))

// Cada elemento que falta lleva a la pestaña donde se arregla.
const completionItems = computed(() => [
  { label: 'Foto de perfil', done: !!avatarUrl.value },
  { label: 'Foto de portada', done: !!partner.value?.coverUrl, tab: 'ficha' },
  { label: 'Biografía', done: !!ficha.bio.trim(), tab: 'ficha' },
  { label: 'Categorías', done: ficha.categories.length > 0, tab: 'ficha' },
  { label: 'Presupuesto', done: !!(ficha.min || ficha.max), tab: 'ficha' },
  { label: 'Qué tipo de creador buscas', done: !!ficha.lookingFor.trim(), tab: 'ficha' },
  { label: 'Una necesidad publicada', done: (myPackages.value?.length ?? 0) > 0, tab: 'needs' }
])
const completionPercent = computed(() => Math.round((completionItems.value.filter((i) => i.done).length / completionItems.value.length) * 100))
const pendingItems = computed(() => completionItems.value.filter((i) => !i.done))

// Datos reales del encabezado: lo GUARDADO (no el borrador del formulario).
const heroCategories = computed(() => partner.value?.categories ?? [])
const heroRange = computed(() => rangeText(
  partner.value?.minBudgetCents ? partner.value.minBudgetCents / 100 : null,
  partner.value?.maxBudgetCents ? partner.value.maxBudgetCents / 100 : null
))

</script>

<template>
  <AppShell role="partner" title="Perfil" full-width>
    <div class="settings">
      <ProfileHero
        :name="partner?.name || 'Tu empresa'" :subtitle="user?.email ?? 'Cuenta de partner'"
        :cover-url="partner?.coverUrl ?? null" :cover-seed="partner?.id ?? 'partner'"
        :avatar-url="avatarUrl" :initials="initialsFromName(partner?.name ?? '?')" :hue="hueFromString(partner?.name ?? '')"
        :upload="uploadAvatar" :remove="removeAvatar"
        :percent="completionPercent" :items="completionItems" @select-tab="selectTab"
      >
        <template #actions>
          <BaseButton v-if="partner" :to="`/profile/partner/${partner.id}`" variant="outline" size="sm" icon="ph:eye-fill">Ver perfil público</BaseButton>
          <BaseButton
            v-if="partner" variant="ghost" size="sm" :icon="profileLinkCopied ? 'ph:check-bold' : 'ph:link-simple-bold'"
            :aria-label="profileLinkCopied ? 'Enlace copiado' : 'Copiar enlace de tu perfil'" data-copy-link @click="copyMyProfileLink"
          >
            {{ profileLinkCopied ? 'Copiado' : 'Copiar enlace' }}
          </BaseButton>
          <BaseButton variant="primary" size="sm" icon="ph:pencil-simple-bold" data-edit-ficha @click="selectTab('ficha')">Editar ficha</BaseButton>
        </template>
        <template #facts>
          <Chip v-if="partner?.industry && !heroCategories.includes(partner.industry)" outline data-fact="industry">{{ partner.industry }}</Chip>
          <Chip v-for="c in heroCategories.slice(0, 4)" :key="c" data-fact="category">{{ c }}</Chip>
          <span v-if="heroCategories.length > 4" class="hero-facts-empty">+{{ heroCategories.length - 4 }}</span>
          <Chip v-if="heroRange" outline data-fact="budget">Presupuesto {{ heroRange }}</Chip>
          <span v-if="!partner?.industry && !heroCategories.length && !heroRange" class="hero-facts-empty" data-fact="empty">
            Aún no has completado la presentación de tu empresa: añade sector, categorías o presupuesto.
          </span>
        </template>
      </ProfileHero>

      <ProfileSettingsNav v-model="activeTab" :tabs="[...tabs]" />

      <div class="min-w-0">
        <!-- RESUMEN -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'account'" id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" class="settings">
            <div class="settings-grid" style="--cols: 2">
              <PanelCard title="Pendiente de completar" class="yt-reveal" style="--i: 0" data-card="pending">
                <ProfileTodoList :items="pendingItems" done-text="La presentación de tu empresa está completa." @select="selectTab" />
              </PanelCard>

              <PanelCard title="Actividad" class="yt-reveal" style="--i: 1" data-card="activity">
                <dl class="mini-stats">
                  <div class="mini-stat">
                    <dt class="mini-stat__label">Necesidades activas</dt>
                    <dd class="mini-stat__value" data-activity-needs>{{ activePackagesCount }}</dd>
                  </div>
                  <div class="mini-stat">
                    <dt class="mini-stat__label">Ofertas pendientes</dt>
                    <dd class="mini-stat__value" data-activity-offers>{{ pendingOffersTotal }}</dd>
                  </div>
                </dl>
                <div class="link-row">
                  <NuxtLink to="/partner/requests" class="link-arrow">Ver colaboraciones <Icon name="ph:arrow-right-bold" class="size-4" /></NuxtLink>
                  <button type="button" class="link-arrow" @click="selectTab('needs')">Gestionar necesidades <Icon name="ph:arrow-right-bold" class="size-4" /></button>
                </div>
              </PanelCard>
            </div>

            <AccountActions @tour="replayTour" @logout="confirmLogout" />
          </div>
        </Transition>

        <!-- FICHA PÚBLICA -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'ficha'" id="profile-panel-ficha" role="tabpanel" aria-labelledby="profile-tab-ficha" class="ficha-layout">
            <div class="min-w-0">
              <p class="ficha-intro">Esto es lo que ve un creador en «Descubrir»: cuanto más completa, mejor encajan los resultados.</p>
              <BaseButton variant="secondary" size="sm" icon="ph:eye-fill" block class="ficha-preview-btn" @click="previewSheetOpen = true">Ver vista previa</BaseButton>
              <BaseCard radius="lg" padding="lg">
                <ProfileFichaForm :ficha="ficha" :errors="fichaErrors" :texts="fichaTexts">
                  <template #cover>
                    <CoverPhotoUploader
                      :cover-url="partner?.coverUrl ?? null" :cover-art="coverArtFromString(partner?.id ?? 'partner')" icon="ph:storefront-fill"
                      :upload="uploadCoverPhoto" :remove="removeCoverPhoto"
                    />
                  </template>
                </ProfileFichaForm>
              </BaseCard>
              <ProfileSaveBar
                :dirty="fichaDirty" :saving="savingFicha" :saved="fichaSaved" :blocked-reason="fichaBlockedReason" :error="fichaError"
                @save="saveFicha" @discard="discardFicha"
              />
            </div>

            <div class="ficha-preview">
              <p class="ficha-preview__title">Vista previa</p>
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
        </Transition>

        <BottomSheet v-model="previewSheetOpen" title="Vista previa">
          <ProfileHeaderCard
            :name="previewName" role-label="Partner" :avatar-url="avatarUrl"
            :cover-url="partner?.coverUrl ?? null" :cover-seed="partner?.id ?? 'partner'" :categories="ficha.categories"
            :bio="ficha.bio || null" :range-label="previewRangeLabel" range-field-label="Presupuesto"
            :looking-for="ficha.lookingFor || null"
          />
        </BottomSheet>

        <!-- NECESIDADES -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'needs'" id="profile-panel-needs" role="tabpanel" aria-labelledby="profile-tab-needs">
            <div class="packages-head">
              <div>
                <SectionTitle title="Tus necesidades" description="Lo que buscas: un creador podrá hacer una oferta ajustándose a tu necesidad. Arrastra para reordenar." />
                <p v-if="myPackages?.length" class="packages-summary" data-packages-summary>
                  {{ activePackagesCount }} activa{{ activePackagesCount === 1 ? '' : 's' }}
                  <span v-if="pendingOffersTotal"> · {{ pendingOffersTotal }} oferta{{ pendingOffersTotal > 1 ? 's' : '' }} pendiente{{ pendingOffersTotal > 1 ? 's' : '' }}</span>
                </p>
              </div>
              <BaseButton variant="primary" size="sm" icon="ph:plus-bold" data-add-package @click="openNewPackage">Añadir necesidad</BaseButton>
            </div>
            <p v-if="packageError" class="setting-error mb-3" role="alert">{{ packageError }}</p>
            <EmptyState
              v-if="!myPackages?.length"
              icon="ph:package" title="Sin necesidades todavía"
              description="Publica qué necesitas para que un creador pueda ofertar ajustándose a ello."
            >
              <BaseButton variant="primary" size="sm" icon="ph:plus-bold" @click="openNewPackage">Publicar mi primera necesidad</BaseButton>
            </EmptyState>
            <draggable
              v-else v-model="myPackages" item-key="id" :animation="150" :delay="150" :delay-on-touch-only="true"
              class="packages-grid" ghost-class="nx-package-ghost"
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
          </div>
        </Transition>

        <!-- PRIVACIDAD -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'privacy'" id="profile-panel-privacy" role="tabpanel" aria-labelledby="profile-tab-privacy" class="settings-grid settings-grid--wide-first">
            <PanelCard title="Privacidad del chat" data-card="chat">
              <ChatPrivacyChoices :options="chatPrivacyOptions" :model-value="chatPrivacy" :error="chatPrivacyError" @select="setChatPrivacy" />
            </PanelCard>

            <PanelCard v-if="currentPrivacy" title="Ahora mismo" data-card="privacy-state">
              <p class="setting-row__label">{{ currentPrivacy.label }}</p>
              <p class="setting-row__meta">{{ currentPrivacy.description }}</p>
            </PanelCard>
          </div>
        </Transition>
      </div>
    </div>
  </AppShell>
</template>
