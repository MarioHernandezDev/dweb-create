<script setup lang="ts">
import { engagementSeries } from '~/utils/mock-data'

useHead({ title: 'Hoy' })

const router = useRouter()
const { posts, ensureLoaded } = useMyPosts()
const { pendingCount: pendingRequests, ensureLoaded: ensureRequestsLoaded } = useCollabRequests()
const composerOpen = ref(false)

// En paralelo, no en serie — son dos consultas independientes, esperarlas
// una tras otra solo suma su latencia de red sin motivo.
await Promise.all([ensureLoaded(), ensureRequestsLoaded()])

const today = computed(() => posts.value.filter((p) => p.dueInDays === 0))
const upcoming = computed(() => posts.value.filter((p) => p.dueInDays > 0 && p.dueInDays <= 3))
const overdue = computed(() => posts.value.filter((p) => p.status === 'overdue'))
const streak = 6

// El objetivo semanal (nº de publicaciones/semana) es del perfil del
// creador en Supabase en el futuro; de momento, fijo, como el resto de la
// ficha de "creator" que aún no se edita desde la app.
const weeklyTarget = 5
const publishedThisWeek = computed(() => posts.value.filter((p) => p.status === 'published').length)
const goalPct = computed(() => (posts.value.length ? Math.min(100, Math.round((publishedThisWeek.value / weeklyTarget) * 100)) : 0))

const quickActions = [
  { label: 'Publicar', icon: 'ph:pencil-simple-fill', action: () => { composerOpen.value = true } },
  { label: 'Tablero', icon: 'ph:kanban-fill', to: '/creator/timeline' },
  { label: 'Redes', icon: 'ph:share-network-fill', to: '/creator/socials' }
]
</script>

<template>
  <AppShell role="creator" title="Hoy">
    <section class="mb-6">
      <h1 class="font-display text-[2rem] md:text-[2.5rem] leading-[1.08] text-[var(--color-text)]">¡Vamos con fuerza hoy!</h1>
      <p class="mt-1.5 inline-flex items-center gap-1.5 text-[0.9375rem] text-[var(--color-status-production)]">
        <Icon name="ph:fire-fill" class="size-4" />
        Racha de {{ streak }} días publicando
      </p>
    </section>

    <section class="mb-6">
      <BaseCard radius="lg" padding="lg" class="flex items-center gap-4 md:max-w-md">
        <div class="min-w-0 flex-1">
          <p class="text-[0.9375rem] text-[var(--color-text)] leading-snug">
            Estás al <strong class="font-semibold">{{ goalPct }}%</strong> de tu objetivo semanal
          </p>
          <div class="mt-3 flex items-center gap-3">
            <div class="flex-1 h-2 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
              <div
                class="h-full rounded-full bg-[var(--color-primary-500)] transition-[width] duration-700 ease-[var(--ease-spring)]"
                :style="{ width: `${goalPct}%` }"
              />
            </div>
            <span class="shrink-0 text-[0.8125rem] text-[var(--color-text-faint)]" style="font-variant-numeric: proportional-nums">
              {{ publishedThisWeek }}/{{ weeklyTarget }}
            </span>
          </div>
        </div>
        <button
          type="button" aria-label="Nueva publicación"
          class="shrink-0 size-14 rounded-full bg-[var(--color-primary-500)] text-[var(--color-on-primary)] shadow-[0_10px_22px_-8px_var(--color-primary-500)] hover:shadow-[0_14px_28px_-6px_var(--color-primary-500)] flex items-center justify-center active:scale-90 transition-[transform,box-shadow] duration-300 ease-[var(--ease-spring-out)]"
          @click="composerOpen = true"
        >
          <Icon name="ph:lightning-fill" class="size-6" />
        </button>
      </BaseCard>
    </section>

    <section class="mb-8">
      <div class="flex justify-between md:justify-start md:gap-8">
        <component
          :is="action.to ? 'NuxtLink' : 'button'" v-for="action in quickActions" :key="action.label"
          :to="action.to" :type="!action.to ? 'button' : undefined"
          class="flex flex-col items-center gap-1.5 flex-1 md:flex-none md:w-16"
          @click="action.action?.()"
        >
          <span class="flex items-center justify-center size-14 rounded-full bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[var(--color-text)] transition-[transform,border-color] duration-200 ease-[var(--ease-spring)] active:scale-95 hover:border-[var(--color-hairline-strong)]">
            <Icon :name="action.icon" class="size-5" />
          </span>
          <span class="text-[0.75rem] text-[var(--color-text-muted)] text-center">{{ action.label }}</span>
        </component>
      </div>
    </section>

    <section v-if="overdue.length" class="mb-7">
      <BaseCard radius="md" padding="md" class="flex items-center gap-3 border-[var(--color-status-alert)]/30 bg-[var(--color-status-alert)]/[0.06]">
        <Icon name="ph:warning-fill" class="size-5 text-[var(--color-status-alert)] shrink-0" />
        <p class="text-[0.875rem] text-[var(--color-text)]">
          Tienes {{ overdue.length }} publicación fuera de plazo. <NuxtLink to="/creator/timeline" class="font-medium underline underline-offset-2">Revisar</NuxtLink>
        </p>
      </BaseCard>
    </section>

    <section v-if="pendingRequests" class="mb-7">
      <BaseCard radius="md" padding="md" class="flex items-center gap-3 border-[var(--color-status-review)]/30 bg-[var(--color-status-review)]/[0.08]">
        <Icon name="ph:handshake-fill" class="size-5 text-[var(--color-status-review)] shrink-0" />
        <p class="text-[0.875rem] text-[var(--color-text)]">
          Tienes {{ pendingRequests }} solicitud{{ pendingRequests > 1 ? 'es' : '' }} de colaboración nueva{{ pendingRequests > 1 ? 's' : '' }}. <NuxtLink to="/creator/requests" class="font-medium underline underline-offset-2">Ver</NuxtLink>
        </p>
      </BaseCard>
    </section>

    <section class="mb-8">
      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-3.5">Resumen de hoy</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="nx-stagger-in" style="--stagger-i: 0">
          <StatTile label="Interacciones, 7 días" value="24.8K" :delta-pct="14.2" :trend="engagementSeries.map((p) => p.value)" />
        </div>
        <div class="nx-stagger-in" style="--stagger-i: 1">
          <StatTile label="Seguidores totales" value="170.5K" :delta-pct="4.1" :trend="engagementSeries.map((p) => p.value * 0.8)" />
        </div>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3.5">
        <h2 class="font-display text-[1.25rem] text-[var(--color-text)]">Próximas entregas</h2>
        <NuxtLink to="/creator/timeline" class="text-[0.875rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Ver todo</NuxtLink>
      </div>
      <WeekBoard :posts="[...today, ...upcoming]" @open="router.push(`/creator/post/${$event.id}`)" />
    </section>

    <Fab :active="composerOpen" @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>
