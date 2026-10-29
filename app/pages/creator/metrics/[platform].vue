<script setup lang="ts">
import { platformMeta, formatCompactNumber, socialAccountState, isComingSoonPlatform } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import type { Platform } from '~/types'

// Mismo motivo que profile/[role]/[id].vue para vivir fuera de un prefijo
// de rol fijo — aquí no aplica (sigue bajo /creator a propósito, solo el
// creador ve sus propias métricas), pero sí necesita validar el parámetro
// de ruta contra el catálogo real de plataformas antes de usarlo en nada.
const route = useRoute()
const rawPlatform = route.params.platform as string
if (!(rawPlatform in platformMeta)) {
  throw createError({ statusCode: 404, statusMessage: 'Red social no reconocida' })
}
const platform = rawPlatform as Platform
const meta = platformMeta[platform]

useHead({ title: `Métricas · ${meta.label}` })

const { accounts, ensureLoaded, connect, refresh } = useMySocialAccounts()
await ensureLoaded()

const account = computed(() => accounts.value.find((a) => a.platform === platform)!)
const state = computed(() => socialAccountState(account.value))

// Solo YouTube tiene este detalle rico de verdad (ver
// server/api/social/youtube-channel-stats.get.ts) — el resto de redes
// verificadas (Instagram) solo tienen seguidores por ahora, sin API de
// insights todavía conectada (ver el aviso en /creator/metrics).
interface YoutubeRecentVideo {
  id: string
  title: string
  thumbnailUrl: string | null
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  durationSeconds: number
}
interface YoutubeChannelStats {
  channelId: string | null
  title: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  subscriberCount: number | null
  viewCount: number
  videoCount: number
  avgViewsPerVideo: number
  recentVideos: YoutubeRecentVideo[]
}

const stats = ref<YoutubeChannelStats | null>(null)
const loadingStats = ref(false)
const statsError = ref('')
const statsNeedsReconnect = ref(false)

async function loadStats() {
  if (platform !== 'youtube' || state.value !== 'connected') return
  // Si ya sabemos que el acceso no sirve (estado guardado), no se llama a
  // Google para obtener un error que ya conocemos.
  if (account.value.status && account.value.status !== 'connected') {
    statsNeedsReconnect.value = true
    statsError.value = 'El acceso a YouTube ha caducado o se ha revocado. Reconecta la cuenta.'
    return
  }
  loadingStats.value = true
  statsError.value = ''
  statsNeedsReconnect.value = false
  try {
    // `timeout`: son varias llamadas encadenadas a la API de Google — si
    // alguna se queda colgada (red, cuota, lo que sea), mejor un error
    // claro a los 20s que un spinner infinito sin ninguna pista.
    stats.value = await $fetch<YoutubeChannelStats>('/api/social/youtube-channel-stats', { timeout: 20_000 })
  } catch (err) {
    console.error('[creator/metrics/[platform]] fallo al cargar estadísticas de YouTube:', err)
    // Mensaje distinto según el motivo real: solo se pide reconectar si el
    // acceso está caducado, revocado o sin permiso; un fallo pasajero no.
    const { code, message } = readSocialApiError(err)
    statsNeedsReconnect.value = code === 'reconnect_required'
    statsError.value = message ?? 'No se han podido cargar las estadísticas. Inténtalo de nuevo en unos minutos.'
  } finally {
    loadingStats.value = false
  }
}
// En onMounted, NUNCA a nivel de script: esto dispara un $fetch real a
// nuestra propia API, y correrlo también durante el SSR competiría con el
// propio renderizado de la página — el mismo fallo de fondo que ya nos
// pasó con startRealtime() en useChat.ts, con la petición en vez del socket.
onMounted(() => {
  if (platform === 'youtube' && state.value === 'connected') loadStats()
})

// "Actualizar": recarga las estadísticas y después el estado guardado de la
// cuenta (una carga correcta actualiza `last_synced_at`), para que la cabecera
// diga "actualizado ahora" sin recargar la página.
async function reload() {
  await loadStats()
  await refresh()
}

function formatMonthYear(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
</script>

<template>
  <AppShell role="creator" :title="meta.label" subtitle="Estadísticas reales de tu red">
    <template v-if="state !== 'connected'">
      <EmptyState
        :icon="meta.icon"
        :title="isComingSoonPlatform(platform) ? `${meta.label}: próximamente` : 'Red no conectada'"
        :description="isComingSoonPlatform(platform)
          ? 'Todavía no se puede conectar esta red, así que no hay estadísticas que mostrar.'
          : `Conecta ${meta.label} desde Redes para empezar a ver sus estadísticas reales aquí.`"
      >
        <BaseButton variant="primary" to="/creator/socials">Ir a Redes</BaseButton>
      </EmptyState>
    </template>

    <template v-else-if="platform === 'youtube'">
      <YoutubeDashboard
        :stats="stats" :loading="loadingStats" :error="statsError" :needs-reconnect="statsNeedsReconnect"
        :account-status="account.status" :last-synced-at="account.lastSyncedAt ?? null"
        @reload="reload" @reconnect="connect('youtube')"
      >
        <!-- Fases siguientes (A-R16c.2 / d): evolución y vídeos se sustituyen por componentes propios. Mientras tanto se conserva lo que ya funcionaba. -->
        <template v-if="stats">
          <section>
            <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-3.5">Vídeos recientes</h2>
            <EmptyState
              v-if="!stats.recentVideos.length"
              icon="ph:video-camera" title="Sin vídeos todavía"
              description="Cuando subas contenido a este canal, aparecerá aquí con sus estadísticas reales."
            />
            <div v-else class="flex flex-col gap-2.5 md:max-w-2xl">
              <a
                v-for="video in stats.recentVideos" :key="video.id"
                :href="`https://www.youtube.com/watch?v=${video.id}`" target="_blank" rel="noopener noreferrer" class="block"
              >
                <BaseCard radius="lg" padding="none" interactive class="flex gap-3 overflow-hidden">
                  <div class="relative w-32 sm:w-40 aspect-video shrink-0 bg-[var(--color-ink-overlay)]">
                    <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" alt="" class="absolute inset-0 size-full object-cover">
                    <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-black/70 text-white text-[0.6875rem] font-medium leading-none">
                      {{ formatDuration(video.durationSeconds) }}
                    </span>
                  </div>
                  <div class="flex-1 min-w-0 py-2.5 pr-3 flex flex-col justify-center gap-1">
                    <p class="text-[0.875rem] font-medium text-[var(--color-text)] leading-snug line-clamp-2">{{ video.title }}</p>
                    <p class="text-[0.75rem] text-[var(--color-text-faint)]">{{ relativeTime(video.publishedAt) }}</p>
                    <div class="flex items-center gap-3 mt-0.5 text-[0.75rem] text-[var(--color-text-muted)]">
                      <span class="inline-flex items-center gap-1"><Icon name="ph:eye-fill" class="size-3.5" /> {{ formatCompactNumber(video.viewCount) }}</span>
                      <span class="inline-flex items-center gap-1"><Icon name="ph:thumbs-up-fill" class="size-3.5" /> {{ formatCompactNumber(video.likeCount) }}</span>
                      <span class="inline-flex items-center gap-1"><Icon name="ph:chat-circle-fill" class="size-3.5" /> {{ formatCompactNumber(video.commentCount) }}</span>
                    </div>
                  </div>
                </BaseCard>
              </a>
            </div>
          </section>
        </template>
      </YoutubeDashboard>
    </template>

    <template v-else>
      <BaseCard radius="lg" padding="lg" class="flex items-center gap-4 mb-6 md:max-w-xl">
        <span
          class="flex items-center justify-center size-14 rounded-full shrink-0"
          :style="{ background: `color-mix(in oklab, ${meta.colorVar} 18%, transparent)`, color: meta.colorVar }"
        >
          <Icon :name="meta.icon" class="size-6" />
        </span>
        <div>
          <p class="font-display text-[1.25rem] text-[var(--color-text)]">{{ account.handle || meta.label }}</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)]">{{ formatCompactNumber(account.followers) }} seguidores</p>
        </div>
      </BaseCard>

      <BaseCard radius="lg" padding="lg" class="md:max-w-xl flex items-start gap-3">
        <Icon name="ph:info-fill" class="size-5 shrink-0 text-[var(--color-text-faint)] mt-0.5" />
        <p class="text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed">
          Todavía solo tenemos tu número de seguidores — el resto de estadísticas de {{ meta.label }} (alcance,
          interacciones, publicaciones) necesitan el permiso de Insights de Meta, pendiente de verificación.
        </p>
      </BaseCard>
    </template>
  </AppShell>
</template>
