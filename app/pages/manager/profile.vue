<script setup lang="ts">
useHead({ title: 'Perfil' })

const user = useSupabaseUser()
const { logout } = useLogout()

const route = useRoute()
const { subscription, connectOnboarded, redirecting, ensureLoaded, refresh: refreshBilling, subscribe, connectPayouts } = useMyBilling()
const { pendingCount: pendingRosterRequests, ensureLoaded: ensureRosterRequestsLoaded } = useRosterRequests()

// Al volver de Stripe (Checkout o Connect) los datos ya cambiaron en el
// servidor vía webhook — hay que refrescar de verdad, no fiarse de la
// caché de la visita anterior a esta pantalla (si no, se queda enseñando
// "sin plan"/"sin conectar" aunque el pago se haya guardado bien). En
// paralelo con las solicitudes de plantilla — son consultas independientes.
await Promise.all([
  ensureRosterRequestsLoaded(),
  route.query.checkout || route.query.connect ? refreshBilling() : ensureLoaded()
])

const planLabel = computed(() => {
  if (!subscription.value) return 'Plan gratuito'
  const name = subscription.value.planId === 'agency' ? 'FEEDMA Agencia' : subscription.value.planId
  return subscription.value.status === 'active' || subscription.value.status === 'trialing' ? name : `${name} (${subscription.value.status})`
})
</script>

<template>
  <AppShell role="manager" title="Perfil">
    <div class="md:max-w-lg">
      <section class="flex items-center gap-4 mb-8">
        <BaseAvatar initials="TU" :hue="266" size="lg" />
        <div>
          <p class="font-display text-[1.25rem] text-[var(--color-text)]">Tu cuenta</p>
          <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Community manager' }}</p>
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

      <section class="mb-6">
        <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
          <NuxtLink to="/manager/roster-requests" class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Solicitudes de plantilla</span>
            <span class="flex items-center gap-2">
              <span v-if="pendingRosterRequests" class="text-[0.8125rem] text-[var(--color-status-review)]">{{ pendingRosterRequests }}</span>
              <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)]" />
            </span>
          </NuxtLink>
          <div class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Notificaciones</span>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">Próximamente</span>
          </div>
        </BaseCard>
      </section>

      <section class="mb-6">
        <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-2 px-1">Pagos</p>
        <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4">
            <div>
              <p class="text-[0.9375rem] text-[var(--color-text)]">{{ planLabel }}</p>
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">Cuota mensual por usar el panel</p>
            </div>
            <BaseButton
              v-if="!subscription || subscription.status !== 'active'" variant="secondary" size="sm"
              :icon-spin="redirecting" :disabled="redirecting" @click="subscribe('agency')"
            >
              Mejorar a Agencia
            </BaseButton>
          </div>
          <div class="flex items-center justify-between px-5 py-4">
            <div>
              <p class="text-[0.9375rem] text-[var(--color-text)]">Cuenta de pagos</p>
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">
                {{ connectOnboarded ? 'Verificada — ya puedes cobrar colaboraciones' : 'Necesaria para cobrar cuando una marca contrata a tu roster' }}
              </p>
            </div>
            <Icon v-if="connectOnboarded" name="ph:check-circle-fill" class="size-5 text-[var(--color-status-published)] shrink-0" />
            <BaseButton v-else variant="secondary" size="sm" :icon-spin="redirecting" :disabled="redirecting" @click="connectPayouts">
              Conectar
            </BaseButton>
          </div>
        </BaseCard>
      </section>

      <BaseButton variant="secondary" icon="ph:sign-out-bold" class="w-full" @click="logout">Cerrar sesión</BaseButton>
    </div>
  </AppShell>
</template>
