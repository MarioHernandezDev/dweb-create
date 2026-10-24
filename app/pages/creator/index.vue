<script setup lang="ts">
import { formatCompactNumber, formatEuros } from '~/utils/mock-data'
import { isFichaIncomplete } from '~/utils/ficha'
import { relativeTime, isPostOverdue } from '~/utils/status'

useHead({ title: 'Hoy' })

const { posts, ensureLoaded } = useMyPosts()
const { requests, pendingCount: pendingRequests, activeCount: activeCollaborations, ensureLoaded: ensureRequestsLoaded } = useCollabRequests()
// Seguidores reales de tus redes conectadas — mismo dato (y mismo motivo
// honesto) que ya usa metrics.vue: nada de "interacciones"/"racha" fijas,
// porque no hay ninguna fuente real detrás todavía (alcance/interacciones
// necesitan el permiso de insights de Instagram, pendiente de Meta).
const { accounts: socialAccounts, ensureLoaded: ensureSocialsLoaded } = useMySocialAccounts()
const { creator, ensureCreator } = useMyCreator()
const { myPackages, ensureMyPackages } = usePackages()
const { resolveMyProfileId } = useMyProfileId()
const { conversations, ensureConversations } = useChat()
const composerOpen = ref(false)

// `resolveMyProfileId()` antes del `Promise.all`, no dentro — las demás
// consultas no dependen de él, pero `ensureMyPackages` sí necesita el id
// ya resuelto para saber qué pedir.
const myProfileId = await resolveMyProfileId()

// En paralelo, no en serie — seis consultas independientes, esperarlas una
// tras otra solo suma su latencia de red sin motivo.
await Promise.all([
  ensureLoaded(), ensureRequestsLoaded(), ensureSocialsLoaded(), ensureCreator(),
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([]),
  ensureConversations()
])

// Panel de descubrimiento: SIN await en el Promise.all de arriba a
// propósito — no debe bloquear el primer pintado del home. Mismo patrón de
// "fase 2 progresiva" que ya usa useDiscover internamente para el
// enriquecido con IA (results/loading se actualizan solos cuando llegan).
// Modo "filters" (sin texto): consulta directa a la base de datos, sin LLM.
const { results: discoverResults, loading: discoverLoading, error: discoverError, search: runDiscoverSearch } = useDiscover()
runDiscoverSearch('filters', '', { categories: [], minBudgetCents: null, maxBudgetCents: null })
// El endpoint devuelve hasta 200 candidatos para poder puntuar/ordenar bien
// — aquí solo hace falta un vistazo, así que se pintan los 3 primeros y se
// descarta el resto sin pedir un endpoint nuevo (fuera de alcance tocar servidor).
const suggestedPartners = computed(() => discoverResults.value.slice(0, 3))

// Primera acción útil cuando todavía no hay nada que mostrar (roadmap,
// sección 12) — nunca a la vez las dos: sin ficha, publicar un paquete
// tampoco serviría de mucho (nadie lo encontraría en Descubrir), así que
// se resuelve una cosa antes de pedir la otra.
const fichaIncomplete = computed(() => creator.value
  ? isFichaIncomplete({ bio: creator.value.bio, categories: creator.value.categories, minCents: creator.value.minRateCents, maxCents: creator.value.maxRateCents })
  : false)
const hasNoPackages = computed(() => myPackages.value?.length === 0)

const today = computed(() => posts.value.filter((p) => p.dueInDays === 0))
const upcoming = computed(() => posts.value.filter((p) => p.dueInDays > 0 && p.dueInDays <= 3))
// Ordenado por urgencia real (más vencido primero) — antes solo se contaban, nunca se sabía cuál mirar primero.
// `isPostOverdue` (fecha pasada + no publicada), no `status === 'overdue'`:
// ese valor del enum existe en la base de datos pero ningún código lo
// asigna jamás, así que ese filtro nunca encontraba nada (ver utils/status.ts).
const overdue = computed(() => posts.value.filter(isPostOverdue).sort((a, b) => a.dueInDays - b.dueInDays))
const connectedFollowers = computed(() => socialAccounts.value.filter((a) => a.connected).reduce((sum, a) => sum + a.followers, 0))
const hasConnectedSocials = computed(() => socialAccounts.value.some((a) => a.connected))

// Objetivo semanal real del creador (editable en Perfil → Ficha pública).
const weeklyTarget = computed(() => creator.value?.weeklyPostTarget ?? 5)
const publishedThisWeek = computed(() => posts.value.filter((p) => p.status === 'published').length)
const goalPct = computed(() => (posts.value.length ? Math.min(100, Math.round((publishedThisWeek.value / weeklyTarget.value) * 100)) : 0))

const nextDeliveries = computed(() => [...today.value, ...upcoming.value].sort((a, b) => a.dueInDays - b.dueInDays))
const pendingRequestList = computed(() => requests.value.filter((r) => r.status === 'requested'))
const unreadConversations = computed(() => conversations.value.filter((c) => c.unread))

// Panel destacado: un único protagonista, elegido por lo más urgente que
// haya de verdad — fuera de plazo > solicitud sin responder > próxima
// entrega > invitación a descubrir si no hay nada pendiente todavía.
const hero = computed(() => {
  const worstOverdue = overdue.value[0]
  if (worstOverdue) {
    return {
      coverUrl: worstOverdue.mediaUrl ?? null, coverSeed: worstOverdue.id, icon: 'ph:warning-fill',
      eyebrow: 'Fuera de plazo', title: worstOverdue.title,
      description: `${Math.abs(worstOverdue.dueInDays)} día${Math.abs(worstOverdue.dueInDays) === 1 ? '' : 's'} de retraso — tu calendario lo sigue contando como pendiente.`,
      ctaLabel: 'Ver publicación', ctaTo: `/creator/post/${worstOverdue.id}`
    }
  }
  const request = pendingRequestList.value[0]
  if (request) {
    return {
      coverUrl: null, coverSeed: request.id, icon: 'ph:handshake-fill',
      eyebrow: 'Solicitud pendiente', title: `${request.partnerName} quiere colaborar contigo`,
      description: request.brief, ctaLabel: 'Responder', ctaTo: '/creator/requests'
    }
  }
  const next = nextDeliveries.value[0]
  if (next) {
    return {
      coverUrl: next.mediaUrl ?? null, coverSeed: next.id, icon: 'ph:calendar-check-fill',
      eyebrow: next.dueInDays === 0 ? 'Entrega de hoy' : `Entrega en ${next.dueInDays} días`, title: next.title,
      description: null, ctaLabel: 'Ver publicación', ctaTo: `/creator/post/${next.id}`
    }
  }
  return {
    coverUrl: null, coverSeed: 'home-hero-creator-discover', icon: 'ph:compass-fill',
    eyebrow: 'Siguiente paso', title: 'Descubre marcas que buscan creadores como tú',
    description: 'Explora Descubrir y contacta directamente con la que encaje con tu contenido.',
    ctaLabel: 'Descubrir', ctaTo: '/creator/discover'
  }
})

interface ActivityItem { icon: string; title: string; subtitle: string; to: string }
const activity = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = []
  // Las atrasadas van primero — son la urgencia real, y antes no aparecían
  // en ningún resumen salvo que ganaran el único hueco del panel destacado.
  for (const p of overdue.value.slice(0, 2)) {
    items.push({ icon: 'ph:warning-fill', title: p.title, subtitle: `Atrasada ${Math.abs(p.dueInDays)} día${Math.abs(p.dueInDays) === 1 ? '' : 's'}`, to: `/creator/post/${p.id}` })
  }
  for (const r of pendingRequestList.value.slice(0, 2)) {
    items.push({ icon: 'ph:handshake-fill', title: `${r.partnerName} — nueva solicitud`, subtitle: relativeTime(r.createdAt), to: '/creator/requests' })
  }
  for (const p of nextDeliveries.value.slice(0, 2)) {
    items.push({ icon: 'ph:calendar-check-fill', title: p.title, subtitle: p.dueInDays === 0 ? 'Hoy' : `En ${p.dueInDays} días`, to: `/creator/post/${p.id}` })
  }
  for (const c of unreadConversations.value.slice(0, 2)) {
    items.push({ icon: 'ph:chat-circle-fill', title: c.otherName, subtitle: c.lastMessagePreview ?? 'Mensaje nuevo', to: `/chat/${c.id}` })
  }
  return items.slice(0, 4)
})

const tips = computed(() => {
  const list: { icon: string; text: string; cta: string; to: string }[] = []
  if (fichaIncomplete.value) {
    list.push({ icon: 'ph:identification-card-fill', text: 'Completa tu ficha pública para que las marcas te encuentren en Descubrir.', cta: 'Completar', to: '/creator/profile' })
  } else if (hasNoPackages.value) {
    list.push({ icon: 'ph:package-fill', text: 'Publica tu primer paquete para que puedan hacerte una oferta desde el chat.', cta: 'Publicar', to: '/creator/profile' })
  }
  if (!hasConnectedSocials.value) {
    list.push({ icon: 'ph:share-network-fill', text: 'Conecta una red social para ver tus métricas reales aquí.', cta: 'Conectar', to: '/creator/socials' })
  }
  return list
})
</script>

<template>
  <AppShell role="creator" title="Hoy">
    <section class="mb-6">
      <h1 class="font-display text-[1.75rem] md:text-[2.125rem] leading-[1.1] text-[var(--color-text)]">¡Hola! ¿Qué tienes entre manos hoy?</h1>
    </section>

    <section class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatTile label="Colaboraciones activas" :value="String(activeCollaborations)" />
      <StatTile label="Solicitudes pendientes" :value="String(pendingRequests)" />
      <StatTile label="Entregas próximas" :value="String(nextDeliveries.length)" />
      <StatTile label="Objetivo semanal" :value="`${publishedThisWeek}/${weeklyTarget}`" />
    </section>

    <div class="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
      <div class="flex flex-col gap-5 min-w-0">
        <HomeHeroCard
          :cover-url="hero.coverUrl" :cover-seed="hero.coverSeed" :icon="hero.icon"
          :eyebrow="hero.eyebrow" :title="hero.title" :description="hero.description"
          :cta-label="hero.ctaLabel" :cta-to="hero.ctaTo"
        />

        <section v-if="discoverLoading || discoverError || suggestedPartners.length">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-display text-[1.125rem] text-[var(--color-text)]">Marcas que podrían interesarte</h2>
            <NuxtLink to="/creator/discover" class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Ver todo</NuxtLink>
          </div>
          <p v-if="discoverError" class="text-[0.8125rem] text-[var(--color-text-faint)]">No se han podido cargar sugerencias ahora mismo.</p>
          <div v-else class="grid sm:grid-cols-3 gap-3">
            <template v-if="discoverLoading">
              <div v-for="n in 3" :key="`sk-${n}`" class="h-32 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] animate-pulse" />
            </template>
            <NuxtLink
              v-else v-for="p in suggestedPartners" :key="p.id" :to="`/profile/partner/${p.id}`"
              class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 hover:border-[var(--color-hairline-strong)] transition-colors"
            >
              <p class="text-[0.9375rem] font-semibold text-[var(--color-text)] truncate">{{ p.name }}</p>
              <p v-if="p.categories.length" class="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5 truncate">{{ p.categories.slice(0, 2).join(' · ') }}</p>
              <p v-if="p.minCents || p.maxCents" class="text-[0.75rem] text-[var(--color-text-faint)] mt-1.5 inline-flex items-center gap-1">
                <Icon name="ph:currency-eur" class="size-3" />
                {{ p.minCents ? formatEuros(p.minCents) : '…' }}–{{ p.maxCents ? formatEuros(p.maxCents) : '…' }}
              </p>
            </NuxtLink>
          </div>
        </section>
      </div>

      <div class="flex flex-col gap-5 min-w-0">
        <section v-if="activity.length" class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
          <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Necesita tu atención</h2>
          <div class="flex flex-col gap-1">
            <NuxtLink
              v-for="(item, i) in activity" :key="i" :to="item.to"
              class="flex items-center gap-3 py-2 px-1 -mx-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-ink-overlay)] transition-colors"
            >
              <span class="flex items-center justify-center size-8 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
                <Icon :name="item.icon" class="size-3.5" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-[0.8125rem] font-medium text-[var(--color-text)] truncate">{{ item.title }}</p>
                <p class="text-[0.75rem] text-[var(--color-text-faint)] truncate">{{ item.subtitle }}</p>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section v-if="hasConnectedSocials" class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
          <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Tus redes</h2>
          <StatTile label="Seguidores totales" :value="formatCompactNumber(connectedFollowers)" />
        </section>

        <section v-if="tips.length" class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)]/60 p-4">
          <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Para sacarle más partido</h2>
          <div class="flex flex-col gap-3">
            <div v-for="(tip, i) in tips" :key="i" class="flex items-start gap-2.5">
              <Icon :name="tip.icon" class="size-4 text-[var(--color-primary-500)] shrink-0 mt-0.5" />
              <p class="min-w-0 flex-1 text-[0.8125rem] text-[var(--color-text)] leading-snug">
                {{ tip.text }} <NuxtLink :to="tip.to" class="font-medium underline underline-offset-2">{{ tip.cta }}</NuxtLink>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Fab :active="composerOpen" @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>
