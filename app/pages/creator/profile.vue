<script setup lang="ts">
import draggable from 'vuedraggable'
import { coverArtFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { firstFichaError, validateFicha } from '~/utils/profile-ficha'
import { audienceError, audienceFromDb, audienceToDb } from '~/utils/audience'
import type { Package } from '~/composables/usePackages'
import type { ChatPrivacy } from '~/types'

useHead({ title: 'Perfil' })

const user = useSupabaseUser()
const { logout } = useLogout()
const { resolveMyProfileId } = useMyProfileId()
const { avatarUrl, initials: myInitials, hue: myHue, uploadAvatar, removeAvatar } = useMyAvatar()

const route = useRoute()
const { paymentsEnabled, predictionsEnabled } = useLaunchMode()
const { subscription, connectOnboarded, redirecting, redirectError, ensureLoaded, refresh: refreshBilling, subscribe, connectPayouts } = useMyBilling()
const { creator, ensureCreator, updateFicha, uploadCoverPhoto, removeCoverPhoto } = useMyCreator()

// `user.value?.id` puede seguir vacío justo al cargar la página (ver
// role-guard.global.ts) — se resuelve de forma fiable con useMyProfileId.
const myProfileId = await resolveMyProfileId()

const { myPackages, ensureMyPackages, duplicatePackage, updatePackage, reorderPackages, deletePackage } = usePackages()
const { pendingCountByPackage, refreshPendingCounts } = useOffers()
const { chatPrivacy, chatPrivacyError, ensureChatPrivacy, setChatPrivacy } = useChatSettings()
const { balance: creditsBalance, ensureLoaded: ensureCredits } = useMyCredits()

// Consultas independientes entre sí — en paralelo en vez de en cascada.
// Al volver de Stripe (Checkout o Connect) los datos ya cambiaron en el
// servidor vía webhook — hay que refrescar de verdad, no fiarse de la
// caché de la visita anterior a esta pantalla (si no, se queda enseñando
// "sin plan"/"sin conectar" aunque el pago se haya guardado bien).
await Promise.all([
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([]),
  myProfileId ? refreshPendingCounts(myProfileId) : Promise.resolve(),
  ensureChatPrivacy(),
  route.query.checkout || route.query.connect ? refreshBilling() : ensureLoaded(),
  ensureCreator(),
  ensureCredits(),
])

// Las mismas cuatro secciones de siempre (A-R18): "Cuenta" pasa a llamarse
// "Resumen" porque ahora es el panel personal del creador, no una lista de enlaces.
const tabs = [
  { id: 'account', label: 'Resumen', icon: 'ph:squares-four-fill' },
  { id: 'ficha', label: 'Ficha pública', icon: 'ph:identification-card-fill' },
  { id: 'packages', label: 'Paquetes', icon: 'ph:package-fill' },
  { id: 'billing', label: 'Privacidad y cuenta', icon: 'ph:shield-check-fill' }
] as const
type TabId = (typeof tabs)[number]['id']
// `?tab=billing` permite enlazar directo desde fuera (p. ej. "mejora tu plan"
// en el compositor de posts, cuando no quedan créditos).
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
  if (!creator.value) return
  copyLink(`${window.location.origin}/profile/creator/${creator.value.id}`)
}

const packageError = ref('')

async function confirmDeletePackage(pkg: Package) {
  const ok = await confirm({
    title: `¿Borrar "${pkg.title}"?`,
    message: 'Se borrará permanentemente, junto con cualquier oferta que se haya hecho sobre él.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (!ok) return
  packageError.value = ''
  try {
    await deletePackage(pkg.id)
  } catch {
    packageError.value = 'No se ha podido borrar el paquete. Inténtalo de nuevo.'
  }
}

async function toggleActivePackage(pkg: Package) {
  packageError.value = ''
  try {
    await updatePackage(pkg.id, { active: !pkg.active })
  } catch {
    packageError.value = 'No se ha podido actualizar el paquete. Inténtalo de nuevo.'
  }
}

async function duplicateOnePackage(pkg: Package) {
  packageError.value = ''
  try {
    await duplicatePackage(pkg)
  } catch {
    packageError.value = 'No se ha podido duplicar el paquete. Inténtalo de nuevo.'
  }
}

const activePackagesCount = computed(() => (myPackages.value ?? []).filter((p) => p.active).length)
const pendingOffersTotal = computed(() => Object.values(pendingCountByPackage.value).reduce((sum, n) => sum + n, 0))

// M-O1: volver a ver el recorrido de bienvenida.
const onboardingTour = useOnboardingTour()
function replayTour() {
  if (myProfileId) onboardingTour.start(myProfileId, 'creator')
}

async function confirmLogout() {
  const ok = await confirm({ title: '¿Cerrar sesión?', confirmLabel: 'Cerrar sesión' })
  if (!ok) return
  // Confirmar "cerrar sesión" ya implica descartar cualquier cambio sin
  // guardar — si no se marca la ficha como "limpia" aquí, el guard de
  // cambios sin guardar volvería a preguntar justo después de este mismo
  // diálogo, cuando logout() navegue a /login.
  fichaSnapshot.value = JSON.stringify(ficha)
  await logout()
}

const chatPrivacyOptions: { value: ChatPrivacy; label: string; description: string }[] = [
  { value: 'everyone', label: 'Cualquiera', description: 'Cualquier perfil te puede escribir directamente.' },
  { value: 'accepted_offers_only', label: 'Solo tras oferta aceptada', description: 'Solo podrán escribirte en texto libre quienes ya tengan una oferta aceptada contigo. Aun así, cualquiera te puede mandar una oferta.' }
]

const planLabel = computed(() => {
  if (!subscription.value) return 'Plan gratuito'
  const name = subscription.value.planId === 'pro' ? 'CIBERAN Pro' : subscription.value.planId
  return subscription.value.status === 'active' || subscription.value.status === 'trialing' ? name : `${name} (${subscription.value.status})`
})

// Ficha pública — lo que ve un partner en /partner/discover y lo que cruza
// el matching por IA. Un solo guardado para todo el bloque (barra fija).
function fichaFromCreator() {
  return {
    bio: creator.value?.bio ?? '',
    categories: [...(creator.value?.categories ?? [])],
    min: (creator.value?.minRateCents ? creator.value.minRateCents / 100 : null) as number | string | null,
    max: (creator.value?.maxRateCents ? creator.value.maxRateCents / 100 : null) as number | string | null,
    lookingFor: creator.value?.lookingFor ?? '',
    headline: creator.value?.headline ?? '',
    location: creator.value?.location ?? '',
    showCollaborations: creator.value?.showCollaborations ?? true,
    audience: audienceFromDb(creator.value?.audience)
  }
}
const ficha = reactive(fichaFromCreator())
const savingFicha = ref(false)
const fichaSaved = ref(false)
const fichaError = ref('')

// Si sales con cambios sin guardar en la ficha, se avisa en vez de
// descartarlos en silencio — ver useUnsavedChangesGuard.ts. La portada y el
// avatar quedan fuera a propósito: se guardan solos al subir.
const fichaSnapshot = ref(JSON.stringify(ficha))
const fichaDirty = computed(() => JSON.stringify(ficha) !== fichaSnapshot.value)
useUnsavedChangesGuard(fichaDirty)

const fichaErrors = computed(() => validateFicha(ficha, { min: 'La tarifa mínima', max: 'La tarifa máxima' }))
const fichaBlockedReason = computed(() => firstFichaError(fichaErrors.value) ?? audienceError(ficha.audience))

function discardFicha() {
  Object.assign(ficha, fichaFromCreator())
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
      minRateCents: ficha.min ? Math.round(Number(ficha.min) * 100) : null,
      maxRateCents: ficha.max ? Math.round(Number(ficha.max) * 100) : null,
      lookingFor: ficha.lookingFor.trim() || null,
      headline: ficha.headline.trim() || null,
      location: ficha.location.trim() || null,
      showCollaborations: ficha.showCollaborations,
      audience: audienceToDb(ficha.audience)
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
  bioPlaceholder: 'Quién eres y qué tipo de contenido haces…',
  categoriesLabel: 'Categorías',
  categoriesHint: 'Los partners te encuentran por ellas en Descubrir.',
  rangeLabel: 'Tarifa orientativa (€)',
  minLabel: 'Desde',
  maxLabel: 'Hasta',
  lookingForLabel: 'Qué tipo de marcas buscas',
  lookingForPlaceholder: 'Ej. marcas de moda sostenible, tono joven…',
  headlinePlaceholder: 'Ej. Creadora de contenido de deporte y fitness',
  collaborationsHint: 'En tu perfil aparecerán las marcas con las que has completado colaboraciones en CIBERAN.'
}

// Vista previa en vivo — usa el MISMO componente que pinta /profile/[role]/[id],
// así nunca puede desincronizarse del perfil de verdad. Lee los campos sin
// guardar a propósito, para que se note el cambio mientras escribes.
const previewSheetOpen = ref(false)
const previewName = computed(() => creator.value?.displayName || user.value?.email || 'Tu nombre')
function rangeText(min: number | string | null, max: number | string | null) {
  const a = Number(min) || 0
  const b = Number(max) || 0
  if (!a && !b) return null
  return `${a ? formatEuros(Math.round(a * 100)) : '…'}–${b ? formatEuros(Math.round(b * 100)) : '…'}`
}
const previewRangeLabel = computed(() => rangeText(ficha.min, ficha.max))

// Ficha completa: cada elemento que falta lleva a la pestaña donde se arregla.
const completionItems = computed(() => [
  { label: 'Foto de perfil', done: !!avatarUrl.value },
  { label: 'Foto de portada', done: !!creator.value?.coverUrl, tab: 'ficha' },
  { label: 'Biografía', done: !!ficha.bio.trim(), tab: 'ficha' },
  { label: 'Categorías', done: ficha.categories.length > 0, tab: 'ficha' },
  { label: 'Tarifa', done: !!(ficha.min || ficha.max), tab: 'ficha' },
  { label: 'Qué tipo de marcas buscas', done: !!ficha.lookingFor.trim(), tab: 'ficha' },
  { label: 'Un paquete publicado', done: (myPackages.value?.length ?? 0) > 0, tab: 'packages' }
])
const completionPercent = computed(() => Math.round((completionItems.value.filter((i) => i.done).length / completionItems.value.length) * 100))
const pendingItems = computed(() => completionItems.value.filter((i) => !i.done))

// Datos reales del encabezado: lo GUARDADO (no el borrador del formulario).
const heroCategories = computed(() => (creator.value?.categories ?? []))
const heroRange = computed(() => rangeText(
  creator.value?.minRateCents ? creator.value.minRateCents / 100 : null,
  creator.value?.maxRateCents ? creator.value.maxRateCents / 100 : null
))

const weeklyTargetInput = ref(creator.value?.weeklyPostTarget ?? 5)
const savingWeeklyTarget = ref(false)
const weeklyTargetError = ref('')
async function saveWeeklyTarget() {
  if (!weeklyTargetInput.value || weeklyTargetInput.value < 1) return
  savingWeeklyTarget.value = true
  weeklyTargetError.value = ''
  try {
    await updateFicha({ weeklyPostTarget: Math.round(weeklyTargetInput.value) })
  } catch {
    weeklyTargetError.value = 'No se ha podido guardar el objetivo.'
  } finally {
    savingWeeklyTarget.value = false
  }
}

</script>

<template>
  <AppShell role="creator" title="Perfil" full-width>
    <div class="settings">
      <ProfileHero
        :name="creator?.displayName || 'Tu cuenta'" :subtitle="user?.email ?? 'Creador de contenido'"
        :cover-url="creator?.coverUrl ?? null" :cover-seed="creator?.id ?? 'creator'"
        :avatar-url="avatarUrl" :initials="myInitials" :hue="myHue" :upload="uploadAvatar" :remove="removeAvatar"
        :percent="completionPercent" :items="completionItems" @select-tab="selectTab"
      >
        <template #actions>
          <BaseButton v-if="creator" :to="`/profile/creator/${creator.id}`" variant="outline" size="sm" icon="ph:eye-fill">Ver perfil público</BaseButton>
          <BaseButton
            v-if="creator" variant="ghost" size="sm" :icon="profileLinkCopied ? 'ph:check-bold' : 'ph:link-simple-bold'"
            :aria-label="profileLinkCopied ? 'Enlace copiado' : 'Copiar enlace de tu perfil'" data-copy-link @click="copyMyProfileLink"
          >
            {{ profileLinkCopied ? 'Copiado' : 'Copiar enlace' }}
          </BaseButton>
          <BaseButton variant="primary" size="sm" icon="ph:pencil-simple-bold" data-edit-ficha @click="selectTab('ficha')">Editar ficha</BaseButton>
        </template>
        <template #facts>
          <Chip v-if="creator?.niche && !heroCategories.includes(creator.niche)" outline data-fact="niche">{{ creator.niche }}</Chip>
          <Chip v-for="c in heroCategories.slice(0, 4)" :key="c" data-fact="category">{{ c }}</Chip>
          <span v-if="heroCategories.length > 4" class="hero-facts-empty">+{{ heroCategories.length - 4 }}</span>
          <Chip v-if="heroRange" outline data-fact="rate">Tarifa {{ heroRange }}</Chip>
          <span v-if="!heroCategories.length && !heroRange && !creator?.niche" class="hero-facts-empty" data-fact="empty">
            Aún no has completado tu ficha: añade categorías y tarifa.
          </span>
        </template>
      </ProfileHero>

      <BaseCard v-if="route.query.checkout" padding="md" class="pay-notice">
        <Icon :name="route.query.checkout === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0" />
        <p>{{ route.query.checkout === 'success' ? 'Suscripción activada.' : 'Pago cancelado, no se ha cobrado nada.' }}</p>
      </BaseCard>
      <BaseCard v-else-if="route.query.connect === 'done'" padding="md" class="pay-notice">
        <Icon name="ph:check-circle-fill" class="size-5 shrink-0" />
        <p>Cuenta de pagos actualizada.</p>
      </BaseCard>

      <ProfileSettingsNav v-model="activeTab" :tabs="[...tabs]" />

      <div class="min-w-0">
        <!-- RESUMEN -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'account'" id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" class="settings">
            <div class="settings-grid">
              <PanelCard title="Actividad" class="yt-reveal" style="--i: 0" data-card="activity">
                <div class="setting-list">
                  <div class="setting-row">
                    <div class="setting-row__text">
                      <p class="setting-row__label">Objetivo semanal</p>
                      <p class="setting-row__meta">Publicaciones por semana que ves en «Hoy»</p>
                    </div>
                    <div class="setting-row__control">
                      <label class="sr-only" for="weekly-target">Publicaciones por semana</label>
                      <input id="weekly-target" v-model.number="weeklyTargetInput" type="number" min="1" step="1" inputmode="numeric" class="input h-11">
                      <BaseButton variant="secondary" size="sm" :loading="savingWeeklyTarget" :disabled="!weeklyTargetInput || weeklyTargetInput === creator?.weeklyPostTarget" @click="saveWeeklyTarget">Guardar</BaseButton>
                    </div>
                  </div>
                  <div v-if="predictionsEnabled" class="setting-row">
                    <div class="setting-row__text">
                      <p class="setting-row__label">Créditos de predicción</p>
                      <!-- Ver grant_welcome_credits() y stripe-plans.ts (plan "pro") para las cifras reales. -->
                      <p class="setting-row__meta">{{ paymentsEnabled ? 'Cada predicción gasta 1 crédito. Recibiste 3 gratis al crear tu cuenta; con CIBERAN Pro (19,99 €/mes) se renuevan 20 más cada mes.' : 'Cada predicción gasta 1 crédito. Recibiste 3 gratis al crear tu cuenta.' }}</p>
                    </div>
                    <span class="setting-row__value" data-credits>{{ creditsBalance === null ? '…' : creditsBalance }}</span>
                  </div>
                </div>
                <p v-if="weeklyTargetError" class="setting-error" role="alert">{{ weeklyTargetError }}</p>
                <p class="setting-note" data-activity-packages>
                  {{ activePackagesCount }} paquete{{ activePackagesCount === 1 ? '' : 's' }} activo{{ activePackagesCount === 1 ? '' : 's' }}<template v-if="pendingOffersTotal"> · {{ pendingOffersTotal }} oferta{{ pendingOffersTotal > 1 ? 's' : '' }} pendiente{{ pendingOffersTotal > 1 ? 's' : '' }}</template>
                </p>
              </PanelCard>

              <PanelCard title="Pendiente de completar" class="yt-reveal" style="--i: 2" data-card="pending">
                <ProfileTodoList :items="pendingItems" done-text="Tu ficha está completa." @select="selectTab" />
              </PanelCard>
            </div>

            <AccountActions @tour="replayTour" @logout="confirmLogout" />
          </div>
        </Transition>

        <!-- FICHA PÚBLICA -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'ficha'" id="profile-panel-ficha" role="tabpanel" aria-labelledby="profile-tab-ficha" class="ficha-layout">
            <div class="min-w-0">
              <p class="ficha-intro">Esto es lo que ve un partner en «Descubrir»: cuanto más completa, mejor encajan los resultados.</p>
              <BaseButton variant="secondary" size="sm" icon="ph:eye-fill" block class="ficha-preview-btn" @click="previewSheetOpen = true">Ver vista previa</BaseButton>
              <BaseCard radius="lg" padding="lg">
                <ProfileFichaForm :ficha="ficha" :errors="fichaErrors" :texts="fichaTexts">
                  <template #cover>
                    <CoverPhotoUploader
                      :cover-url="creator?.coverUrl ?? null" :cover-art="coverArtFromString(creator?.id ?? 'creator')" icon="ph:image-fill"
                      :upload="uploadCoverPhoto" :remove="removeCoverPhoto"
                    />
                  </template>
                  <template #extra>
                    <ProfileAudienceEditor v-model="ficha.audience" />
                    <ProfileShowcasePicker />
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
                  compact :name="previewName" role-label="Creador de contenido" :avatar-url="avatarUrl"
                  :cover-url="creator?.coverUrl ?? null" :cover-seed="creator?.id ?? 'creator'" :categories="ficha.categories"
                  :bio="ficha.bio || null" :range-label="previewRangeLabel" range-field-label="Tarifa orientativa"
                  :looking-for="ficha.lookingFor || null"
                />
              </BaseCard>
            </div>
          </div>
        </Transition>

        <BottomSheet v-model="previewSheetOpen" title="Vista previa">
          <ProfileHeaderCard
            :name="previewName" role-label="Creador de contenido" :avatar-url="avatarUrl"
            :cover-url="creator?.coverUrl ?? null" :cover-seed="creator?.id ?? 'creator'" :categories="ficha.categories"
            :bio="ficha.bio || null" :range-label="previewRangeLabel" range-field-label="Tarifa orientativa"
            :looking-for="ficha.lookingFor || null"
          />
        </BottomSheet>

        <!-- PAQUETES -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'packages'" id="profile-panel-packages" role="tabpanel" aria-labelledby="profile-tab-packages">
            <div class="packages-head">
              <div>
                <SectionTitle title="Tus paquetes" description="Lo que ofreces: un partner podrá hacer una oferta sobre cualquiera. Arrastra para reordenar." />
                <p v-if="myPackages?.length" class="packages-summary" data-packages-summary>
                  {{ activePackagesCount }} activo{{ activePackagesCount === 1 ? '' : 's' }}
                  <span v-if="pendingOffersTotal"> · {{ pendingOffersTotal }} oferta{{ pendingOffersTotal > 1 ? 's' : '' }} pendiente{{ pendingOffersTotal > 1 ? 's' : '' }}</span>
                </p>
              </div>
              <BaseButton variant="primary" size="sm" icon="ph:plus-bold" data-add-package @click="openNewPackage">Añadir paquete</BaseButton>
            </div>
            <p v-if="packageError" class="setting-error mb-3" role="alert">{{ packageError }}</p>
            <EmptyState
              v-if="!myPackages?.length"
              icon="ph:package" title="Sin paquetes todavía"
              description="Crea tu primer paquete para que los partners puedan ofertar sobre él."
            >
              <BaseButton variant="primary" size="sm" icon="ph:plus-bold" @click="openNewPackage">Crear mi primer paquete</BaseButton>
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
            <PackageFormSheet v-if="myProfileId" v-model="packageSheetOpen" :profile-id="myProfileId" role="creator" :editing="editingPackage" />
          </div>
        </Transition>

        <!-- PRIVACIDAD Y PAGOS -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'billing'" id="profile-panel-billing" role="tabpanel" aria-labelledby="profile-tab-billing" class="settings-grid" style="--cols: 2">
            <PanelCard title="Privacidad del chat" data-card="chat">
              <ChatPrivacyChoices :options="chatPrivacyOptions" :model-value="chatPrivacy" :error="chatPrivacyError" @select="setChatPrivacy" />
            </PanelCard>

            <PanelCard v-if="!paymentsEnabled" title="Pagos" data-card="payments-off">
              <p class="setting-row__meta" data-free-launch>CIBERAN es gratis durante el lanzamiento: no hay cuotas ni comisiones y la plataforma no gestiona pagos. Lo que acordéis en una colaboración lo cobráis entre vosotros.</p>
            </PanelCard>
            <PanelCard v-else title="Pagos" data-card="payments">
              <div class="setting-list">
                <div class="setting-row">
                  <div class="setting-row__text">
                    <p class="setting-row__label">{{ planLabel }}</p>
                    <p class="setting-row__meta">Cuota mensual por usar el panel</p>
                  </div>
                  <BaseButton v-if="!subscription || subscription.status !== 'active'" variant="brand" size="sm" :loading="redirecting" @click="subscribe('pro')">Mejorar a Pro</BaseButton>
                  <span v-else class="state-ok"><Icon name="ph:check-circle-fill" class="size-4" /> Activo</span>
                </div>
                <div class="setting-row">
                  <div class="setting-row__text">
                    <p class="setting-row__label">Cuenta de pagos</p>
                    <p class="setting-row__meta">{{ connectOnboarded ? 'Verificada: ya puedes cobrar colaboraciones' : 'Necesaria para cobrar cuando un partner te contrata' }}</p>
                  </div>
                  <span v-if="connectOnboarded" class="state-ok"><Icon name="ph:check-circle-fill" class="size-4" /> Verificada</span>
                  <BaseButton v-else variant="primary" size="sm" :loading="redirecting" @click="connectPayouts">Conectar</BaseButton>
                </div>
              </div>
              <p v-if="redirectError" class="setting-error" role="alert">{{ redirectError }}</p>
            </PanelCard>

            <PanelCard title="Visibilidad del perfil" data-card="public-profile">
              <PublicProfileToggle />
            </PanelCard>

            <PanelCard title="Avisos" data-card="notifications">
              <NotificationPreferences role="creator" />
            </PanelCard>

            <PanelCard title="Tus datos" data-card="data-export">
              <DataExportCard />
            </PanelCard>

            <PanelCard title="Eliminar cuenta" data-card="delete-account">
              <DeleteAccountCard />
            </PanelCard>
          </div>
        </Transition>
      </div>
    </div>
  </AppShell>
</template>
