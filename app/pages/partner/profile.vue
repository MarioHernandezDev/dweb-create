<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta } from '~/utils/status'
import { DISCOVERY_CATEGORIES } from '~/utils/categories'

// "Pagar" solo tiene sentido una vez la otra parte ha aceptado — antes de
// eso ni siquiera sabe que existe la solicitud (ver useCollabRequests.ts).
const payableStatuses = ['accepted', 'in_progress', 'completed']

useHead({ title: 'Perfil' })

const route = useRoute()
const { partner, ensurePartner, updateFicha } = useMyPartner()
const { collaborations, paying, ensureLoaded, refresh: refreshCollaborations, payForCollaboration } = useMyCollaborations()

if (route.query.payment) await refreshCollaborations()
else await ensureLoaded()
await ensurePartner()

const user = useSupabaseUser()
const { logout } = useLogout()

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
  } finally {
    savingFicha.value = false
  }
}
</script>

<template>
  <AppShell role="partner" title="Perfil">
    <div class="md:max-w-lg">
      <section class="flex items-center gap-4 mb-8">
        <BaseAvatar v-if="partner" :initials="initialsFromName(partner.name)" :hue="hueFromString(partner.name)" size="lg" />
        <div>
          <p class="font-display text-[1.25rem] text-[var(--color-text)]">{{ partner?.name }}</p>
          <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Cuenta de partner' }}</p>
        </div>
      </section>

      <BaseCard v-if="route.query.payment" radius="md" padding="md" class="flex items-center gap-3 mb-6">
        <Icon
          :name="route.query.payment === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0"
          :class="route.query.payment === 'success' ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-muted)]'"
        />
        <p class="text-[0.875rem] text-[var(--color-text)]">
          {{ route.query.payment === 'success' ? 'Pago enviado.' : 'Pago cancelado, no se ha cobrado nada.' }}
        </p>
      </BaseCard>

      <section class="mb-6">
        <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-2 px-1">Tu ficha pública</p>
        <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-3 px-1">Esto es lo que ve un creador en "Descubrir" — cuanto más completa, mejor encajan los resultados.</p>
        <BaseCard radius="lg" padding="md" class="flex flex-col gap-4">
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
                  : 'bg-[var(--color-ink-overlay)] border-[var(--color-hairline)] text-[var(--color-text-muted)]'"
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
      </section>

      <section class="mb-6">
        <div class="flex items-center justify-between mb-2 px-1">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">Tus colaboraciones</p>
          <NuxtLink to="/partner/discover" class="text-[0.8125rem] font-medium text-[var(--color-primary-500)]">Descubrir más</NuxtLink>
        </div>

        <EmptyState
          v-if="!collaborations.length"
          icon="ph:handshake" title="Ninguna todavía"
          description="Contacta a un creador de contenido desde 'Descubrir' para empezar."
        />
        <div v-else class="flex flex-col gap-2.5">
          <BaseCard v-for="collab in collaborations" :key="collab.id" radius="lg" padding="md">
            <div class="flex items-center justify-between gap-3 mb-1">
              <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">
                {{ collab.creatorName ?? 'Sin asignar' }}
              </p>
              <span class="text-[0.9375rem] font-medium text-[var(--color-text)] shrink-0">{{ formatEuros(collab.budgetCents) }}</span>
            </div>
            <p class="text-[0.75rem] mb-3" :style="{ color: collaborationStatusMeta[collab.status].color }">
              {{ collaborationStatusMeta[collab.status].label }}
            </p>

            <p v-if="collab.paidAt" class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-status-published)]">
              <Icon name="ph:check-circle-fill" class="size-4" /> Pagado
            </p>
            <p v-else-if="!payableStatuses.includes(collab.status)" class="text-[0.75rem] text-[var(--color-text-faint)]">
              Se podrá pagar cuando acepten la solicitud.
            </p>
            <BaseButton
              v-else variant="primary" size="sm" class="w-full" :disabled="!collab.budgetCents || paying === collab.id"
              :icon-spin="paying === collab.id" @click="payForCollaboration(collab.id)"
            >
              {{ paying === collab.id ? 'Abriendo pago…' : 'Pagar' }}
            </BaseButton>
          </BaseCard>
        </div>
      </section>

      <BaseButton variant="secondary" icon="ph:sign-out-bold" class="w-full" @click="logout">Cerrar sesión</BaseButton>
    </div>
  </AppShell>
</template>
