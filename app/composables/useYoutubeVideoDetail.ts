import { readSocialApiError } from '~/utils/social-api-error'
import type { VideoDetailReport } from '~/utils/youtube-videos-view'

/**
 * Detalle de UN vídeo desde `GET /api/social/youtube-video-detail` (A-R16d.3).
 * Se pide solo al abrir un vídeo (son varias llamadas a Google), se guarda por
 * vídeo y periodo y cancela la petición anterior si se cambia de vídeo o de
 * periodo antes de que llegue. Solo se usa en el navegador.
 */
export interface DetailError {
  code: string | null
  message: string
}

const FALLBACK_MESSAGE = 'No se ha podido cargar el detalle del vídeo. Inténtalo de nuevo en unos minutos.'

export function useYoutubeVideoDetail(days: Ref<number>) {
  const videoId = ref<string | null>(null)
  const reports = ref<Record<string, VideoDetailReport>>({})
  const loading = ref(false)
  const error = ref<DetailError | null>(null)
  let controller: AbortController | null = null

  const key = (id: string, period: number) => `${id}:${period}`
  const report = computed(() => (videoId.value ? (reports.value[key(videoId.value, days.value)] ?? null) : null))

  async function load(opts: { force?: boolean } = {}) {
    const id = videoId.value
    if (!id) return
    const period = days.value
    if (!opts.force && reports.value[key(id, period)]) {
      error.value = null
      return
    }
    controller?.abort()
    const mine = (controller = new AbortController())
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<VideoDetailReport>('/api/social/youtube-video-detail', { query: { id, days: period }, signal: mine.signal, timeout: 25_000 })
      reports.value = { ...reports.value, [key(id, period)]: res }
    } catch (err) {
      if (mine.signal.aborted) return
      const { code, message } = readSocialApiError(err)
      error.value = { code, message: message ?? FALLBACK_MESSAGE }
    } finally {
      if (controller === mine) loading.value = false
    }
  }

  function open(id: string) {
    videoId.value = id
    void load()
  }

  function close() {
    controller?.abort()
    videoId.value = null
    loading.value = false
    error.value = null
  }

  // Con el detalle abierto, cambiar de periodo pide ese periodo.
  watch(days, () => {
    if (videoId.value) void load()
  })

  return { videoId, report, loading, error, open, close, reload: () => load({ force: true }) }
}
