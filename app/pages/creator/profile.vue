<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import { coverArtFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import type { Package } from '~/composables/usePackages'
import type { ChatPrivacy } from '~/types'

useHead({ title: 'Perfil' })

const user = useSupabaseUser()
const { logout } = useLogout()
const { resolveMyProfileId } = useMyProfileId()
const { avatarUrl, initials: myInitials, hue: myHue, uploadAvatar } = useMyAvatar()

const route = useRoute()
const { subscription, connectOnboarded, redirecting, ensureLoaded, refresh: refreshBilling, subscribe, connectPayouts } = useMyBilling()
const { creator, ensureCreator, updateFicha, uploadCoverPhoto } = useMyCreator()

// `user.value?.id` puede seguir vacío justo al cargar la página (ver
// role-guard.global.ts) — se resuelve de forma fiable con useMyProfileId.
const myProfileId = await resolveMyProfileId()

const { myPackages, ensureMyPackages, deletePackage } = usePackages()
const { chatPrivacy, ensureChatPrivacy, setChatPrivacy } = useChatSettings()

// Cuatro consultas independientes entre sí — en paralelo en vez de en
// cascada (lo que antes era: paquetes → privacidad → facturación →
// ficha, cada una esperando a la anterior sin necesidad; con la latencia
// de red real eso se notaba mucho al navegar a esta página).
// Al volver de Stripe (Checkout o Connect) los datos ya cambiaron en el
// servidor vía webhook — hay que refrescar de verdad, no fiarse de la
// caché de la visita anterior a esta pantalla (si no, se queda enseñando
// "sin plan"/"sin conectar" aunque el pago se haya guardado bien).
await Promise.all([
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([]),
  ensureChatPrivacy(),
  route.query.checkout || route.query.connect ? refreshBilling() : ensureLoaded(),
  ensureCreator()
])

// Secciones de "Tu Perfil" — antes era un único scroll larguísimo con 7
// bloques seguidos, cada uno marcado solo con una etiqueta gris diminuta.
// Agrupadas así se navega directo a lo que se busca, en vez de bajar todo.
const tabs = [
  { id: 'account', label: 'Cuenta', icon: 'ph:user-circle-fill' },
  { id: 'ficha', label: 'Ficha pública', icon: 'ph:identification-card-fill' },
  { id: 'packages', label: 'Paquetes', icon: 'ph:package-fill' },
  { id: 'billing', label: 'Privacidad y pagos', icon: 'ph:shield-check-fill' }
] as const
const activeTab = ref<(typeof tabs)[number]['id']>('account')

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

async function confirmDeletePackage(pkg: Package) {
  const ok = await confirm({
    title: `¿Borrar "${pkg.title}"?`,
    message: 'Se borrará permanentemente, junto con cualquier oferta que se haya hecho sobre él.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (ok) await deletePackage(pkg.id)
}

async function confirmLogout() {
  const ok = await confirm({ title: '¿Cerrar sesión?', confirmLabel: 'Cerrar sesión' })
  if (ok) await logout()
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
// el matching por IA. Se edita con un solo botón "Guardar" para todo el
// bloque, en vez de autoguardar campo a campo (menos peticiones, y más
// fácil de entender cuándo se ha guardado algo de verdad).
const ficha = reactive({
  bio: creator.value?.bio ?? '',
  categories: [...(creator.value?.categories ?? [])],
  minRateEuros: creator.value?.minRateCents ? creator.value.minRateCents / 100 : null,
  maxRateEuros: creator.value?.maxRateCents ? creator.value.maxRateCents / 100 : null,
  lookingFor: creator.value?.lookingFor ?? ''
})
const savingFicha = ref(false)
const fichaSaved = ref(false)
const coverArt = computed(() => coverArtFromString(creator.value?.id ?? 'creator'))

// Vista previa en vivo (columna derecha en escritorio, dentro de "Ficha
// pública") — usa el MISMO componente que pinta /profile/[role]/[id], así
// nunca puede desincronizarse de cómo se ve el perfil de verdad. Lee los
// campos del formulario sin guardar todavía: es intencionado, para que se
// note el cambio mientras escribes, no solo después de "Guardar ficha".
const previewName = computed(() => creator.value?.displayName || user.value?.email || 'Tu nombre')
const previewRangeLabel = computed(() => {
  if (!ficha.minRateEuros && !ficha.maxRateEuros) return null
  const min = ficha.minRateEuros ? formatEuros(Math.round(ficha.minRateEuros * 100)) : '…'
  const max = ficha.maxRateEuros ? formatEuros(Math.round(ficha.maxRateEuros * 100)) : '…'
  return `${min}–${max}`
})

// Barra de "ficha completa al X%" — anima a rellenar lo que de verdad
// mejora el matching (mismo motivo que ya explica el texto de esta sección).
const completionPercent = computed(() => {
  const checks = [
    !!avatarUrl.value,
    !!creator.value?.coverUrl,
    !!ficha.bio.trim(),
    ficha.categories.length > 0,
    !!(ficha.minRateEuros || ficha.maxRateEuros),
    !!ficha.lookingFor.trim(),
    (myPackages.value?.length ?? 0) > 0
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
})

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
      minRateCents: ficha.minRateEuros ? Math.round(ficha.minRateEuros * 100) : null,
      maxRateCents: ficha.maxRateEuros ? Math.round(ficha.maxRateEuros * 100) : null,
      lookingFor: ficha.lookingFor || null
    })
    fichaSaved.value = true
  } finally {
    savingFicha.value = false
  }
}
</script>

<template>
  <AppShell role="creator" title="Perfil">
    <div class="md:max-w-5xl">
      <div class="md:max-w-lg">
        <section class="flex items-center gap-4 mb-6">
          <AvatarUploader :avatar-url="avatarUrl" :initials="myInitials" :hue="myHue" :upload="uploadAvatar" />
          <div>
            <p class="font-display text-[1.25rem] text-[var(--color-text)]">Tu cuenta</p>
            <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Creador de contenido' }}</p>
          </div>
        </section>

        <BaseCard v-if="route.query.checkout" radius="md" padding="md" class="flex items-center gap-3 mb-6">
          <Icon
            :name="route.query.checkout === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0"
            :class="route.query.checkout === 'success' ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-muted)]'"
          />
          <p class="text-[0.875rem] text-[var(--color-text)]">
            {{ route.query.checkout === 'success' ? 'Suscripción activada.' : 'Pago cancelado, no se ha cobrado nada.' }}
          </p>
        </BaseCard>
        <BaseCard v-else-if="route.query.connect === 'done'" radius="md" padding="md" class="flex items-center gap-3 mb-6">
          <Icon name="ph:check-circle-fill" class="size-5 shrink-0 text-[var(--color-status-published)]" />
          <p class="text-[0.875rem] text-[var(--color-text)]">Cuenta de pagos actualizada.</p>
        </BaseCard>

        <ProfileCompletionBar :percent="completionPercent" />
      </div>

      <div class="md:flex md:gap-10">
        <ProfileSettingsNav v-model="activeTab" :tabs="[...tabs]" />

        <div class="flex-1 min-w-0">
          <div v-show="activeTab === 'account'" class="md:max-w-lg">
            <section class="mb-6">
              <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
                <NuxtLink to="/creator/socials" class="flex items-center justify-between px-5 py-4">
                  <span class="text-[0.9375rem] text-[var(--color-text)]">Redes conectadas</span>
                  <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)]" />
                </NuxtLink>
                <div class="flex items-center justify-between px-5 py-4">
                  <span class="text-[0.9375rem] text-[var(--color-text)]">Créditos de predicción</span>
                  <span class="text-[0.8125rem] text-[var(--color-text-faint)]">18 restantes</span>
                </div>
              </BaseCard>
            </section>

            <BaseButton variant="secondary" icon="ph:sign-out-bold" class="w-full" @click="confirmLogout">Cerrar sesión</BaseButton>
          </div>

          <div v-show="activeTab === 'ficha'" class="md:flex md:gap-8 md:items-start">
            <div class="md:flex-1 md:min-w-0 md:max-w-lg">
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-3">Esto es lo que ve un partner en "Descubrir" — cuanto más completa, mejor encajan los resultados.</p>
              <BaseCard radius="lg" padding="md" class="flex flex-col gap-4">
                <CoverPhotoUploader
                  :cover-url="creator?.coverUrl ?? null" :cover-art="coverArt" icon="ph:image-fill" :upload="uploadCoverPhoto"
                />

                <div>
                  <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-bio">Bio</label>
                  <textarea
                    id="ficha-bio" v-model="ficha.bio" rows="3" placeholder="Quién eres y qué tipo de contenido haces…"
                    class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
                  />
                </div>

                <div>
                  <p class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5">Categorías</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="cat in DISCOVERY_CATEGORIES" :key="cat" type="button"
                      class="px-2.5 h-7 rounded-full text-[0.75rem] font-medium border transition-colors duration-150"
                      :class="ficha.categories.includes(cat)
                        ? 'bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/50 text-[var(--color-primary-500)]'
                        : 'bg-[var(--color-ink-overlay)] border-[var(--color-hairline)] text-[var(--color-text-muted)]'"
                      @click="toggleFichaCategory(cat)"
                    >
                      {{ cat }}
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-2.5">
                  <div class="flex-1">
                    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-min-rate">Tarifa desde (€)</label>
                    <input
                      id="ficha-min-rate" v-model.number="ficha.minRateEuros" type="number" min="0" step="1"
                      class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
                    >
                  </div>
                  <div class="flex-1">
                    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-max-rate">hasta (€)</label>
                    <input
                      id="ficha-max-rate" v-model.number="ficha.maxRateEuros" type="number" min="0" step="1"
                      class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
                    >
                  </div>
                </div>

                <div>
                  <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="ficha-looking-for">Qué tipo de marcas buscas</label>
                  <textarea
                    id="ficha-looking-for" v-model="ficha.lookingFor" rows="2" placeholder="Ej. marcas de moda sostenible, tono joven…"
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
                  compact :name="previewName" role-label="Creador de contenido" :avatar-url="avatarUrl"
                  :cover-url="creator?.coverUrl ?? null" :cover-seed="creator?.id ?? 'creator'" :categories="ficha.categories"
                  :bio="ficha.bio || null" :range-label="previewRangeLabel" range-field-label="Tarifa orientativa"
                  :looking-for="ficha.lookingFor || null"
                />
              </BaseCard>
            </div>
          </div>

          <div v-show="activeTab === 'packages'" class="md:max-w-lg">
            <section>
              <div class="flex items-center justify-between mb-2 px-1">
                <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">Tus paquetes</p>
                <button type="button" class="text-[0.8125rem] font-medium text-[var(--color-primary-500)]" @click="openNewPackage">Añadir</button>
              </div>
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-3 px-1">Lo que ofreces — un partner podrá hacer una oferta sobre cualquiera de ellos.</p>
              <EmptyState
                v-if="!myPackages?.length"
                icon="ph:package" title="Sin paquetes todavía"
                description="Crea tu primer paquete para que los partners puedan ofertar sobre él."
              />
              <div v-else class="flex flex-col gap-2.5">
                <PackageCard
                  v-for="pkg in myPackages" :key="pkg.id" :pkg="pkg" editable
                  @edit="openEditPackage" @delete="confirmDeletePackage(pkg)"
                />
              </div>
              <PackageFormSheet v-if="myProfileId" v-model="packageSheetOpen" :profile-id="myProfileId" role="creator" :editing="editingPackage" />
            </section>
          </div>

          <div v-show="activeTab === 'billing'" class="md:max-w-lg">
            <section class="mb-6">
              <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-2 px-1">Privacidad del chat</p>
              <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
                <button
                  v-for="opt in chatPrivacyOptions" :key="opt.value" type="button"
                  class="w-full flex items-start gap-3 px-5 py-4 text-left"
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
            </section>

            <section>
              <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-2 px-1">Pagos</p>
              <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
                <div class="flex items-center justify-between px-5 py-4">
                  <div>
                    <p class="text-[0.9375rem] text-[var(--color-text)]">{{ planLabel }}</p>
                    <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">Cuota mensual por usar el panel</p>
                  </div>
                  <BaseButton
                    v-if="!subscription || subscription.status !== 'active'" variant="secondary" size="sm"
                    :icon-spin="redirecting" :disabled="redirecting" @click="subscribe('pro')"
                  >
                    Mejorar a Pro
                  </BaseButton>
                </div>
                <div class="flex items-center justify-between px-5 py-4">
                  <div>
                    <p class="text-[0.9375rem] text-[var(--color-text)]">Cuenta de pagos</p>
                    <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">
                      {{ connectOnboarded ? 'Verificada — ya puedes cobrar colaboraciones' : 'Necesaria para cobrar cuando un partner te contrata' }}
                    </p>
                  </div>
                  <Icon v-if="connectOnboarded" name="ph:check-circle-fill" class="size-5 text-[var(--color-status-published)] shrink-0" />
                  <BaseButton v-else variant="secondary" size="sm" :icon-spin="redirecting" :disabled="redirecting" @click="connectPayouts">
                    Conectar
                  </BaseButton>
                </div>
              </BaseCard>
            </section>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
