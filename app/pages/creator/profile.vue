<script setup lang="ts">
import draggable from 'vuedraggable'
import { coverArtFromString } from '~/utils/avatar'
import { formatEuros, formatCompactNumber, platformMeta } from '~/utils/mock-data'
import { firstFichaError, validateFicha } from '~/utils/profile-ficha'
import { socialChips } from '~/utils/profile-socials'
import type { Package } from '~/composables/usePackages'
import type { ChatPrivacy } from '~/types'

useHead({ title: 'Perfil' })

const user = useSupabaseUser()
const { logout } = useLogout()
const { resolveMyProfileId } = useMyProfileId()
const { avatarUrl, initials: myInitials, hue: myHue, uploadAvatar, removeAvatar } = useMyAvatar()

const route = useRoute()
const { subscription, connectOnboarded, redirecting, redirectError, ensureLoaded, refresh: refreshBilling, subscribe, connectPayouts } = useMyBilling()
const { creator, ensureCreator, updateFicha, uploadCoverPhoto, removeCoverPhoto } = useMyCreator()
const { accounts: socialAccounts, ensureLoaded: ensureSocials } = useMySocialAccounts()

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
  ensureSocials()
])

// Las mismas cuatro secciones de siempre (A-R18): "Cuenta" pasa a llamarse
// "Resumen" porque ahora es el panel personal del creador, no una lista de enlaces.
const tabs = [
  { id: 'account', label: 'Resumen', icon: 'ph:squares-four-fill' },
  { id: 'ficha', label: 'Ficha pública', icon: 'ph:identification-card-fill' },
  { id: 'packages', label: 'Paquetes', icon: 'ph:package-fill' },
  { id: 'billing', label: 'Privacidad y pagos', icon: 'ph:shield-check-fill' }
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
  const name = subscription.value.planId === 'pro' ? 'FEEDMA Pro' : subscription.value.planId
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
    lookingFor: creator.value?.lookingFor ?? ''
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
const fichaBlockedReason = computed(() => firstFichaError(fichaErrors.value))

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
  bioPlaceholder: 'Quién eres y qué tipo de contenido haces…',
  categoriesLabel: 'Categorías',
  categoriesHint: 'Los partners te encuentran por ellas en Descubrir.',
  rangeLabel: 'Tarifa orientativa (€)',
  minLabel: 'Desde',
  maxLabel: 'Hasta',
  lookingForLabel: 'Qué tipo de marcas buscas',
  lookingForPlaceholder: 'Ej. marcas de moda sostenible, tono joven…'
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
const chips = computed(() => socialChips(socialAccounts.value))
const connectedChips = computed(() => chips.value.filter((c) => c.tone !== 'off'))
const accountByPlatform = computed(() => new Map(socialAccounts.value.map((a) => [a.platform, a])))
const unitFor = (p: string) => (p === 'youtube' ? 'suscriptores' : 'seguidores')

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

const card = 'rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5'
const cardTitle = 'text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3'
</script>

<template>
  <AppShell role="creator" title="Perfil" full-width>
    <div class="flex flex-col gap-5">
      <BaseCard v-if="route.query.checkout" radius="md" padding="md" class="flex items-center gap-3">
        <Icon
          :name="route.query.checkout === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0"
          :class="route.query.checkout === 'success' ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-muted)]'"
        />
        <p class="text-[0.875rem] text-[var(--color-text)]">
          {{ route.query.checkout === 'success' ? 'Suscripción activada.' : 'Pago cancelado, no se ha cobrado nada.' }}
        </p>
      </BaseCard>
      <BaseCard v-else-if="route.query.connect === 'done'" radius="md" padding="md" class="flex items-center gap-3">
        <Icon name="ph:check-circle-fill" class="size-5 shrink-0 text-[var(--color-status-published)]" />
        <p class="text-[0.875rem] text-[var(--color-text)]">Cuenta de pagos actualizada.</p>
      </BaseCard>

      <ProfileHero
        :name="creator?.displayName || 'Tu cuenta'" :subtitle="user?.email ?? 'Creador de contenido'"
        :cover-url="creator?.coverUrl ?? null" :cover-seed="creator?.id ?? 'creator'"
        :avatar-url="avatarUrl" :initials="myInitials" :hue="myHue" :upload="uploadAvatar" :remove="removeAvatar"
        :percent="completionPercent" :items="completionItems" @select-tab="selectTab"
      >
        <template #actions>
          <NuxtLink v-if="creator" :to="`/profile/creator/${creator.id}`" class="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-[var(--color-hairline-strong)] text-[0.8125rem] font-medium text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)] transition-colors">
            <Icon name="ph:eye-fill" class="size-4" /> Ver perfil público
          </NuxtLink>
          <button
            v-if="creator" type="button" class="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-text)] transition-colors"
            :aria-label="profileLinkCopied ? 'Enlace copiado' : 'Copiar enlace de tu perfil'" data-copy-link @click="copyMyProfileLink"
          >
            <Icon :name="profileLinkCopied ? 'ph:check-bold' : 'ph:link-simple-bold'" class="size-4" /> {{ profileLinkCopied ? 'Copiado' : 'Copiar enlace' }}
          </button>
          <BaseButton variant="primary" size="sm" icon="ph:pencil-simple-bold" data-edit-ficha @click="selectTab('ficha')">Editar ficha</BaseButton>
        </template>
        <template #facts>
          <span v-if="creator?.niche && !heroCategories.includes(creator.niche)" class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-ink-overlay)] text-[0.75rem] font-medium text-[var(--color-text)]" data-fact="niche">
            <Icon name="ph:tag-fill" class="size-3.5 text-[var(--color-text-faint)]" /> {{ creator.niche }}
          </span>
          <span v-for="c in heroCategories.slice(0, 4)" :key="c" class="inline-flex items-center h-8 px-3 rounded-full bg-[var(--color-primary-500)]/10 text-[0.75rem] font-medium text-[var(--color-primary-500)]" data-fact="category">{{ c }}</span>
          <span v-if="heroCategories.length > 4" class="text-[0.75rem] text-[var(--color-text-faint)]">+{{ heroCategories.length - 4 }}</span>
          <span v-if="heroRange" class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-ink-overlay)] text-[0.75rem] font-medium text-[var(--color-text)]" data-fact="rate">
            <Icon name="ph:coins-fill" class="size-3.5 text-[var(--color-text-faint)]" /> Tarifa {{ heroRange }}
          </span>
          <span
            v-for="c in connectedChips" :key="c.platform" class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[0.75rem] font-medium"
            :class="c.tone === 'ok' ? 'border-[var(--color-status-published)]/40 text-[var(--color-text)]' : 'border-[var(--color-status-alert)]/50 text-[var(--color-status-alert)]'"
            :data-fact="`social-${c.platform}`" :data-tone="c.tone"
          >
            <Icon :name="c.tone === 'ok' ? 'ph:check-circle-fill' : 'ph:warning-fill'" class="size-3.5" :class="c.tone === 'ok' && 'text-[var(--color-status-published)]'" />
            {{ platformMeta[c.platform].label }} · {{ c.statusText }}
          </span>
          <span v-if="!heroCategories.length && !heroRange && !creator?.niche && !connectedChips.length" class="text-[0.8125rem] text-[var(--color-text-faint)]" data-fact="empty">
            Aún no has completado tu ficha: añade categorías, tarifa o conecta una red.
          </span>
        </template>
      </ProfileHero>

      <ProfileSettingsNav v-model="activeTab" :tabs="[...tabs]" />

      <div class="min-w-0">
        <!-- RESUMEN -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'account'" id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" class="grid gap-5 lg:grid-cols-3">
            <section :class="card" class="yt-reveal" style="--i: 0" data-card="socials">
              <h3 :class="cardTitle">Redes</h3>
              <ul class="flex flex-col gap-3">
                <li v-for="id in (['youtube', 'instagram'] as const)" :key="id" class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-[0.9375rem] text-[var(--color-text)]">{{ platformMeta[id].label }}</p>
                    <p class="text-[0.75rem] text-[var(--color-text-faint)] truncate">
                      <template v-if="accountByPlatform.get(id)?.connected">
                        {{ accountByPlatform.get(id)?.handle }}<template v-if="accountByPlatform.get(id)?.status === 'connected'"> · {{ formatCompactNumber(accountByPlatform.get(id)?.followers ?? 0) }} {{ unitFor(id) }} · dato de {{ platformMeta[id].label }}</template>
                      </template>
                      <template v-else>No conectada</template>
                    </p>
                  </div>
                  <span
                    class="shrink-0 inline-flex items-center gap-1 text-[0.75rem] font-medium"
                    :class="accountByPlatform.get(id)?.status === 'connected' ? 'text-[var(--color-status-published)]' : accountByPlatform.get(id)?.connected ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-text-faint)]'"
                  >
                    {{ socialChips(socialAccounts).find((c) => c.platform === id)?.statusText }}
                  </span>
                </li>
              </ul>
              <NuxtLink to="/creator/metrics#conexiones" class="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]">
                Gestionar redes y ver métricas <Icon name="ph:arrow-right-bold" class="size-3.5" />
              </NuxtLink>
            </section>

            <section :class="card" class="yt-reveal" style="--i: 1" data-card="activity">
              <h3 :class="cardTitle">Actividad</h3>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-[0.9375rem] text-[var(--color-text)]">Objetivo semanal</p>
                  <p class="text-[0.75rem] text-[var(--color-text-faint)]">Publicaciones/semana que ves en «Hoy»</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <label class="sr-only" for="weekly-target">Publicaciones por semana</label>
                  <input
                    id="weekly-target" v-model.number="weeklyTargetInput" type="number" min="1" step="1" inputmode="numeric"
                    class="w-16 h-11 px-2 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary-500)]/60"
                  >
                  <BaseButton variant="secondary" size="sm" :disabled="savingWeeklyTarget || !weeklyTargetInput || weeklyTargetInput === creator?.weeklyPostTarget" :icon-spin="savingWeeklyTarget" @click="saveWeeklyTarget">Guardar</BaseButton>
                </div>
              </div>
              <p v-if="weeklyTargetError" class="mt-2 text-[0.75rem] text-[var(--color-status-alert)]">{{ weeklyTargetError }}</p>
              <div class="mt-4 pt-4 border-t border-[var(--color-hairline)]">
                <div class="flex items-center justify-between">
                  <p class="text-[0.9375rem] text-[var(--color-text)]">Créditos de predicción</p>
                  <span class="text-[0.875rem] font-medium text-[var(--color-text)]" data-credits>{{ creditsBalance === null ? '…' : creditsBalance }}</span>
                </div>
                <!-- Ver grant_welcome_credits() y stripe-plans.ts (plan "pro") para las cifras reales. -->
                <p class="mt-1 text-[0.75rem] text-[var(--color-text-faint)]">
                  Cada predicción gasta 1 crédito. Recibiste 3 gratis al crear tu cuenta; con FEEDMA Pro (19,99 €/mes) se renuevan 20 más cada mes.
                </p>
              </div>
              <p class="mt-4 text-[0.8125rem] text-[var(--color-text-muted)]" data-activity-packages>
                {{ activePackagesCount }} paquete{{ activePackagesCount === 1 ? '' : 's' }} activo{{ activePackagesCount === 1 ? '' : 's' }}<template v-if="pendingOffersTotal"> · {{ pendingOffersTotal }} oferta{{ pendingOffersTotal > 1 ? 's' : '' }} pendiente{{ pendingOffersTotal > 1 ? 's' : '' }}</template>
              </p>
            </section>

            <section :class="card" class="yt-reveal" style="--i: 2" data-card="pending">
              <h3 :class="cardTitle">Pendiente de completar</h3>
              <ul v-if="pendingItems.length" class="flex flex-col gap-1">
                <li v-for="p in pendingItems" :key="p.label">
                  <button
                    type="button" class="w-full flex items-center justify-between gap-2 min-h-11 px-3 -mx-3 rounded-[var(--radius-sm)] text-left text-[0.875rem] text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)] transition-colors"
                    data-pending-item @click="selectTab(p.tab ?? 'ficha')"
                  >
                    {{ p.label }} <Icon name="ph:caret-right-bold" class="size-3.5 text-[var(--color-text-faint)]" />
                  </button>
                </li>
              </ul>
              <p v-else class="inline-flex items-center gap-2 text-[0.875rem] text-[var(--color-text)]" data-pending-none>
                <Icon name="ph:check-circle-fill" class="size-4 text-[var(--color-status-published)]" /> Tu ficha está completa.
              </p>
            </section>

            <section class="lg:col-span-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-1" data-card="account-actions">
              <button type="button" class="inline-flex items-center gap-1.5 min-h-11 text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" @click="replayTour">
                <Icon name="ph:compass-tool-bold" class="size-4" /> Ver el recorrido de bienvenida
              </button>
              <button type="button" class="inline-flex items-center gap-1.5 min-h-11 text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-status-alert)] transition-colors" data-logout @click="confirmLogout">
                <Icon name="ph:sign-out-bold" class="size-4" /> Cerrar sesión
              </button>
            </section>
          </div>
        </Transition>

        <!-- FICHA PÚBLICA -->
        <Transition name="profile-tab">
          <div v-show="activeTab === 'ficha'" id="profile-panel-ficha" role="tabpanel" aria-labelledby="profile-tab-ficha" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
            <div class="min-w-0">
              <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-3">Esto es lo que ve un partner en «Descubrir» — cuanto más completa, mejor encajan los resultados.</p>
              <BaseButton variant="secondary" size="sm" icon="ph:eye-fill" class="w-full mb-4 xl:hidden" @click="previewSheetOpen = true">Ver vista previa</BaseButton>
              <BaseCard radius="lg" padding="lg">
                <ProfileFichaForm :ficha="ficha" :errors="fichaErrors" :texts="fichaTexts">
                  <template #cover>
                    <CoverPhotoUploader
                      :cover-url="creator?.coverUrl ?? null" :cover-art="coverArtFromString(creator?.id ?? 'creator')" icon="ph:image-fill"
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

            <div class="hidden xl:block xl:sticky xl:top-24 xl:self-start">
              <p class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2.5">Vista previa</p>
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
            <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h3 class="font-display text-[1.125rem] text-[var(--color-text)]">Tus paquetes</h3>
                <p class="text-[0.8125rem] text-[var(--color-text-muted)]">Lo que ofreces — un partner podrá hacer una oferta sobre cualquiera de ellos. Arrastra para reordenar.</p>
                <p v-if="myPackages?.length" class="text-[0.8125rem] text-[var(--color-text-faint)] mt-1" data-packages-summary>
                  {{ activePackagesCount }} activo{{ activePackagesCount === 1 ? '' : 's' }}
                  <span v-if="pendingOffersTotal"> · {{ pendingOffersTotal }} oferta{{ pendingOffersTotal > 1 ? 's' : '' }} pendiente{{ pendingOffersTotal > 1 ? 's' : '' }}</span>
                </p>
              </div>
              <BaseButton variant="primary" size="sm" icon="ph:plus-bold" data-add-package @click="openNewPackage">Añadir paquete</BaseButton>
            </div>
            <p v-if="packageError" class="text-[0.8125rem] text-[var(--color-status-alert)] mb-3" role="alert">{{ packageError }}</p>
            <EmptyState
              v-if="!myPackages?.length"
              icon="ph:package" title="Sin paquetes todavía"
              description="Crea tu primer paquete para que los partners puedan ofertar sobre él."
            >
              <BaseButton variant="primary" size="sm" icon="ph:plus-bold" @click="openNewPackage">Crear mi primer paquete</BaseButton>
            </EmptyState>
            <draggable
              v-else v-model="myPackages" item-key="id" :animation="150" :delay="150" :delay-on-touch-only="true"
              class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3" ghost-class="nx-package-ghost"
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
          <div v-show="activeTab === 'billing'" id="profile-panel-billing" role="tabpanel" aria-labelledby="profile-tab-billing" class="grid gap-5 lg:grid-cols-2 lg:items-start">
            <section :class="card" data-card="chat">
              <h3 :class="cardTitle">Privacidad del chat</h3>
              <div role="radiogroup" aria-label="Quién puede escribirte" class="flex flex-col gap-1">
                <button
                  v-for="opt in chatPrivacyOptions" :key="opt.value" type="button" role="radio" :aria-checked="chatPrivacy === opt.value"
                  class="w-full flex items-start gap-3 px-3 py-3 -mx-3 rounded-[var(--radius-sm)] text-left transition-colors duration-150 hover:bg-[var(--color-ink-overlay)] min-h-11"
                  @click="setChatPrivacy(opt.value)"
                >
                  <span class="mt-0.5 shrink-0 size-4 rounded-full border-2 flex items-center justify-center" :class="chatPrivacy === opt.value ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-hairline-strong)]'">
                    <span v-if="chatPrivacy === opt.value" class="size-2 rounded-full bg-[var(--color-primary-500)]" />
                  </span>
                  <span>
                    <span class="block text-[0.9375rem] text-[var(--color-text)]">{{ opt.label }}</span>
                    <span class="block text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">{{ opt.description }}</span>
                  </span>
                </button>
              </div>
              <p v-if="chatPrivacyError" class="text-[0.75rem] text-[var(--color-status-alert)] mt-2" role="alert">{{ chatPrivacyError }}</p>
            </section>

            <section :class="card" data-card="payments">
              <h3 :class="cardTitle">Pagos</h3>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-[0.9375rem] text-[var(--color-text)]">{{ planLabel }}</p>
                  <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">Cuota mensual por usar el panel</p>
                </div>
                <BaseButton v-if="!subscription || subscription.status !== 'active'" variant="primary" size="sm" :icon-spin="redirecting" :disabled="redirecting" @click="subscribe('pro')">Mejorar a Pro</BaseButton>
                <span v-else class="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[var(--color-status-published)]"><Icon name="ph:check-circle-fill" class="size-4" /> Activo</span>
              </div>
              <div class="mt-4 pt-4 border-t border-[var(--color-hairline)] flex items-center justify-between gap-3">
                <div>
                  <p class="text-[0.9375rem] text-[var(--color-text)]">Cuenta de pagos</p>
                  <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">
                    {{ connectOnboarded ? 'Verificada — ya puedes cobrar colaboraciones' : 'Necesaria para cobrar cuando un partner te contrata' }}
                  </p>
                </div>
                <span v-if="connectOnboarded" class="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[var(--color-status-published)]"><Icon name="ph:check-circle-fill" class="size-4" /> Verificada</span>
                <BaseButton v-else variant="primary" size="sm" :icon-spin="redirecting" :disabled="redirecting" @click="connectPayouts">Conectar</BaseButton>
              </div>
              <p v-if="redirectError" class="text-[0.75rem] text-[var(--color-status-alert)] mt-2" role="alert">{{ redirectError }}</p>
            </section>
          </div>
        </Transition>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.nx-package-ghost {
  opacity: 0.4;
}
</style>
