import { readSocialApiError } from '~/utils/social-api-error'
import { performanceMap, type VideoPerformanceReport } from '~/utils/youtube-videos-view'

/**
 * Rendimiento de cada vídeo en el periodo elegido (A-R16d.2) desde
 * `GET /api/social/youtube-video-performance`. Igual que `useYoutubeAnalytics`:
 * guarda cada periodo en memoria, cancela la petición anterior al cambiar de
 * periodo y solo se usa en el navegador. Un fallo aquí NO oculta la lista de
 * vídeos: los totales acumulados siguen visibles y se avisa en línea.
 */
export interface PerformanceError {
  code: string | null
  message: string
}

const FALLBACK_MESSAGE = 'No se han podido cargar las cifras del periodo. Los totales de cada vídeo siguen siendo válidos.'

export function useYoutubeVideoPerformance(days: Ref<number>) {
  const reports = ref<Record<number, VideoPerformanceReport>>({})
  const loading = ref(false)
  const error = ref<PerformanceError | null>(null)
  let controller: AbortController | null = null

  const report = computed(() => reports.value[days.value] ?? null)
  const byId = computed(() => performanceMap(report.value))

  async function load(period: number = days.value, opts: { force?: boolean } = {}) {
    if (!opts.force && reports.value[period]) {
      error.value = null
      return
    }
    controller?.abort()
    const mine = (controller = new AbortController())
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<VideoPerformanceReport>('/api/social/youtube-video-performance', {
        query: { days: period },
        signal: mine.signal,
        timeout: 25_000
      })
      reports.value = { ...reports.value, [period]: res }
    } catch (err) {
      if (mine.signal.aborted) return
      const { code, message } = readSocialApiError(err)
      error.value = { code, message: message ?? FALLBACK_MESSAGE }
    } finally {
      if (controller === mine) loading.value = false
    }
  }

  async function reload() {
    reports.value = {}
    await load(days.value, { force: true })
  }

  return { report, byId, loading, error, load, reload }
}
