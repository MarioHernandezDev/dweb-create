<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { isFichaIncomplete } from '~/utils/ficha'
import { relativeTime, isPostOverdue } from '~/utils/status'
import { publishedThisWeek as countPublishedThisWeek } from '~/utils/post-library'
import type { FirstStep } from '~/components/onboarding/FirstSteps.vue'
import type { LastProposal } from '~/composables/useCollaborationOffers'

import { weekDays, overdueCount, phaseShares } from '~/utils/home-charts'

useHead({ title: 'Inicio' })

const { posts, ensureLoaded, loadUntilDue } = useMyPosts()
const { requests, pendingCount: pendingRequests, activeCount: activeCollaborations, ensureLoaded: ensureRequestsLoaded } = useCollabRequests()
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
  ensureLoaded(), ensureRequestsLoaded(), ensureCreator(),
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([])
])
// Lo siguiente NO bloquea el primer pintado (cada espera encadenada suma una ida
// y vuelta a la base de datos a la carga de la página):
//  - los mensajes (solo alimentan el bloque de «mensajes sin leer»);
//  - las páginas extra de publicaciones: Hoy necesita lo de hoy, lo próximo y lo
//    atrasado aunque haya mucho historial, así que se siguen cargando hasta pasar
//    de la próxima semana, pero después de pintar lo que ya llegó. Solo en el
//    navegador: el servidor pinta con la primera página y el cliente completa.
ensureConversations()
if (import.meta.client) void loadUntilDue(new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10))

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

// Objetivo semanal real del creador (editable en Perfil → Ficha pública).
const weeklyTarget = computed(() => creator.value?.weeklyPostTarget ?? 5)
const publishedThisWeek = computed(() => countPublishedThisWeek(posts.value, new Date()))
const goalPct = computed(() => (posts.value.length ? Math.min(100, Math.round((publishedThisWeek.value / weeklyTarget.value) * 100)) : 0))

const nextDeliveries = computed(() => [...today.value, ...upcoming.value].sort((a, b) => a.dueInDays - b.dueInDays))
// Solo las solicitudes a las que me toca responder: manda quien hizo la ÚLTIMA propuesta (la inicial o la última
// contraoferta). Antes entraban también las que yo misma inicié y estaban esperando a la marca.
const { loadLastProposers } = useCollaborationOffers()
const lastProposers = ref<Record<string, LastProposal>>({})
const requestedIds = computed(() => requests.value.filter((r) => r.status === 'requested').map((r) => r.id))
watch(requestedIds, async (ids) => { if (import.meta.client) lastProposers.value = await loadLastProposers(ids) }, { immediate: true })
const pendingRequestList = computed(() => requests.value.filter((r) => r.status === 'requested' && (lastProposers.value[r.id]?.by ?? r.initiatedBy) === 'partner'))
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
      eyebrow: 'Solicitud pendiente',
      title: lastProposers.value[request.id] ? `${request.partnerName} te ha respondido con otro presupuesto` : `${request.partnerName} quiere colaborar contigo`,
      description: lastProposers.value[request.id]
        ? `Propone ${formatEuros(lastProposers.value[request.id]!.budgetCents)}${lastProposers.value[request.id]!.message ? ` · «${lastProposers.value[request.id]!.message!.trim().slice(0, 90)}»` : ''}.`
        : request.brief, ctaLabel: 'Responder', ctaTo: '/creator/requests'
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

// Lo que exige una acción tuya (entrega fuera de plazo, solicitud sin responder) va ARRIBA, antes que los números y los
// gráficos; el resto del tiempo, el panel destacado se queda en su columna como sugerencia.
const heroUrgent = computed(() => !isFresh.value && (overdue.value.length > 0 || pendingRequestList.value.length > 0))

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

// Gráficas de resumen (datos ya cargados; nada se consulta aparte).
const chartDays = computed(() => weekDays(posts.value, new Date()))
const chartOverdue = computed(() => overdueCount(posts.value))
const chartShares = computed(() => phaseShares(posts.value))

// Frase de estado: solo con lo que de verdad hay (nada inventado).
// Contador de tareas de la bandeja (lo rellena la barra superior); aquí solo se lee.
const taskCount = useState<number>('my-work-task-count', () => 0)
const statusLine = computed(() => {
  const parts: string[] = []
  if (overdue.value.length) parts.push(`${overdue.value.length} ${overdue.value.length === 1 ? 'entrega fuera de plazo' : 'entregas fuera de plazo'}`)
  if (pendingRequestList.value.length) parts.push(`${pendingRequestList.value.length} ${pendingRequestList.value.length === 1 ? 'solicitud sin responder' : 'solicitudes sin responder'}`)
  if (unreadConversations.value.length) parts.push(`${unreadConversations.value.length} ${unreadConversations.value.length === 1 ? 'conversación con mensajes nuevos' : 'conversaciones con mensajes nuevos'}`)
  if (parts.length) return parts.join(' · ')
  if (isFresh.value) return 'Empieza por estos pasos para que las marcas te encuentren.'
  // «Todo al día» solo si la bandeja tampoco tiene tareas pendientes.
  return taskCount.value > 0 ? `Tienes ${taskCount.value} ${taskCount.value === 1 ? 'tarea pendiente' : 'tareas pendientes'} en tu bandeja.` : 'Todo al día por ahora.'
})

// Cuenta sin actividad todavía (nada publicado, ni solicitudes, ni colaboraciones): el panel de números a cero y el
// gráfico vacío no enseñan nada, así que se esconden y «Primeros pasos» pasa arriba. En cuanto hay actividad, vuelve lo normal.
const isFresh = computed(() => !posts.value.length && !requests.value.length && activeCollaborations.value === 0)

// Primeros pasos: cada uno se marca solo con datos reales de la cuenta (ver FirstSteps.vue).
const firstSteps = computed<FirstStep[]>(() => [
  { label: 'Completa tu ficha pública', hint: 'Las marcas te encuentran en Descubrir por tu ficha.', done: !fichaIncomplete.value, to: '/creator/profile' },
  { label: 'Publica tu primer paquete', hint: 'Así pueden hacerte una oferta desde el chat.', done: !hasNoPackages.value, to: '/creator/packages?nuevo=1' },
  { label: 'Contacta con una marca', hint: 'Elige una en Descubrir y envíale una propuesta.', done: requests.value.length > 0, to: '/creator/discover' },
  { label: 'Crea tu primera publicación', hint: 'Organiza el contenido en el tablero, de la idea a publicarlo.', done: posts.value.length > 0, to: '/creator/timeline?nueva=1' }
])
</script>

<template>
  <AppShell role="creator" title="Inicio">
    <section class="home-greeting">
      <div>
        <h2 class="home-greeting__title">¡Hola! ¿Qué tienes entre manos hoy?</h2>
        <p class="home-greeting__status">{{ statusLine }}</p>
      </div>
      <!-- En escritorio la acción vive en la cabecera (el botón flotante tapaba contenido); en móvil sigue el flotante. -->
      <BaseButton variant="brand" icon="ph:plus-bold" class="home-greeting__action" data-new-post @click="composerOpen = true">Nueva publicación</BaseButton>
    </section>

    <HomeHeroCard
      v-if="heroUrgent" class="home-urgent"
      :cover-url="hero.coverUrl" :icon="hero.icon"
      :eyebrow="hero.eyebrow" :title="hero.title" :description="hero.description"
      :cta-label="hero.ctaLabel" :cta-to="hero.ctaTo"
    />

    <FirstSteps v-if="isFresh" role="creator" :steps="firstSteps" class="home-firststeps" />

    <section v-if="!isFresh" class="home-stats">
      <StatTile label="Colaboraciones activas" :value="String(activeCollaborations)" tint="menta" />
      <StatTile label="Solicitudes pendientes" :value="String(pendingRequests)" tint="mantequilla" />
      <StatTile label="Entregas próximas" :value="String(nextDeliveries.length)" tint="cielo" />
      <StatTile label="Objetivo semanal" :value="`${publishedThisWeek}/${weeklyTarget}`" tint="voltio" />
    </section>

    <section class="home-packages-band">
      <!-- Tus paquetes: lo que permite que te hagan ofertas. Visible desde Inicio y creable en un clic. -->
      <PanelCard title="Tus paquetes" padding="sm" data-home-packages>
        <div v-if="myPackages?.length" class="activity">
          <NuxtLink v-for="p in myPackages.slice(0, 3)" :key="p.id" to="/creator/packages" class="activity__row">
            <span class="activity__icon"><Icon name="ph:package-fill" class="size-4" /></span>
            <div class="min-w-0 flex-1">
              <p class="activity__title truncate">{{ p.title }}</p>
              <p class="activity__sub truncate">{{ formatEuros(p.priceCents) }}<template v-if="!p.active"> · en pausa</template></p>
            </div>
          </NuxtLink>
          <div class="home-packages__foot">
            <BaseButton to="/creator/packages?nuevo=1" variant="secondary" size="sm" icon="ph:plus-bold">Nuevo paquete</BaseButton>
            <NuxtLink v-if="myPackages.length > 3" to="/creator/packages" class="home-packages__more">Ver los {{ myPackages.length }}</NuxtLink>
          </div>
        </div>
        <div v-else class="home-packages__empty">
          <p>Los paquetes son lo primero que ven las marcas: qué haces y a qué precio. Con una plantilla lo tienes en un minuto.</p>
          <BaseButton to="/creator/packages?nuevo=1" variant="primary" size="sm" icon="ph:plus-bold" data-home-create-package>Crear mi primer paquete</BaseButton>
        </div>
      </PanelCard>
    </section>

    <section v-if="!isFresh" class="home-charts">
      <PanelCard title="Entregas de los próximos 7 días" description="Pendientes y publicadas, día a día">
        <WeekColumns :days="chartDays" :overdue="chartOverdue" />
      </PanelCard>
      <PanelCard title="Tus publicaciones por fase" description="Dónde está cada una ahora mismo">
        <PhaseStack :shares="chartShares" empty-text="Aún no hay publicaciones: cuando crees la primera, aquí verás en qué fase está cada una." />
      </PanelCard>
    </section>

    <div class="home-grid">
      <div class="home-col">
        <HomeHeroCard
          v-if="!heroUrgent"
          :cover-url="hero.coverUrl" :icon="hero.icon"
          :eyebrow="hero.eyebrow" :title="hero.title" :description="hero.description"
          :cta-label="hero.ctaLabel" :cta-to="hero.ctaTo"
        />

        <section v-if="discoverLoading || discoverError || suggestedPartners.length">
          <SectionTitle title="Marcas que podrían interesarte" class="mb-3">
            <NuxtLink to="/creator/discover" class="inline-flex items-center min-h-[var(--control-md)] px-1 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]">Ver todo</NuxtLink>
          </SectionTitle>
          <p v-if="discoverError" class="text-sm text-[var(--text-muted)]">No se han podido cargar sugerencias ahora mismo.</p>
          <div v-else class="grid sm:grid-cols-3 gap-3">
            <template v-if="discoverLoading">
              <SkeletonBlock v-for="n in 3" :key="`sk-${n}`" height="8rem" rounded="var(--radius-md)" />
            </template>
            <NuxtLink v-else v-for="p in suggestedPartners" :key="p.id" :to="`/profile/partner/${p.id}`" class="block">
              <BaseCard interactive class="h-full">
                <p class="font-semibold truncate">{{ p.name }}</p>
                <p v-if="p.categories.length" class="text-sm text-[var(--text-muted)] mt-0.5 truncate">{{ p.categories.slice(0, 2).join(' · ') }}</p>
                <p v-if="p.minCents || p.maxCents" class="text-sm text-[var(--text-muted)] mt-2 inline-flex items-center gap-1">
                  <Icon name="ph:currency-eur" class="size-4" />
                  {{ p.minCents ? formatEuros(p.minCents) : '…' }}–{{ p.maxCents ? formatEuros(p.maxCents) : '…' }}
                </p>
              </BaseCard>
            </NuxtLink>
          </div>
        </section>
      </div>

      <div class="home-col">
        <PanelCard v-if="activity.length" title="Necesita tu atención" padding="sm">
          <div class="activity">
            <NuxtLink v-for="(item, i) in activity" :key="i" :to="item.to" class="activity__row">
              <span class="activity__icon"><Icon :name="item.icon" class="size-4" /></span>
              <div class="min-w-0 flex-1">
                <p class="activity__title truncate">{{ item.title }}</p>
                <p class="activity__sub truncate">{{ item.subtitle }}</p>
              </div>
            </NuxtLink>
          </div>
        </PanelCard>

        <FirstSteps v-if="!isFresh" role="creator" :steps="firstSteps" />
      </div>
    </div>

    <div class="md:hidden"><Fab :active="composerOpen" @click="composerOpen = true" /></div>
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>
