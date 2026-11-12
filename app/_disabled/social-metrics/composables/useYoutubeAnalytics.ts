import { readSocialApiError } from '~/utils/social-api-error'
import type { AnalyticsReportDto, AvailablePeriodDto } from '~/utils/youtube-period-view'

/**
 * Informe por periodos de YouTube (A-R16c.2) desde
 * `GET /api/social/youtube-analytics`. Guarda cada periodo en memoria para no
 * repetir llamadas a Google al volver a una pestaña ya vista, y cancela la
 * petición anterior si se cambia de periodo antes de que llegue (así una
 * respuesta lenta nunca pisa la del periodo actual).
 *
 * No se usa nunca en servidor: solo se llama desde el navegador, después de
 * montar la página (mismo motivo que `loadStats` en Métricas).
 */
export interface AnalyticsError {
  /** Código estable del servidor (`reconnect_required`, `provider_temporarily_unavailable`…) o `period_unavailable`. */
  code: string | null
  message: string
}

const FALLBACK_MESSAGE = 'No se han podido cargar las analíticas. Inténtalo de nuevo en unos minutos.'

function periodsFromError(err: unknown): AvailablePeriodDto[] | null {
  const list = (err as { data?: { data?: { availablePeriods?: unknown } } } | null)?.data?.data?.availablePeriods
  return Array.isArray(list) ? (list as AvailablePeriodDto[]) : null
}

export function useYoutubeAnalytics() {
  const days = ref<number>(28)
  const compare = ref(true)
  const reports = ref<Record<number, AnalyticsReportDto>>({})
  const availablePeriods = ref<AvailablePeriodDto[] | null>(null)
  const loading = ref(false)
  const error = ref<AnalyticsError | null>(null)
  let controller: AbortController | null = null

  const report = computed(() => reports.value[days.value] ?? null)
  const currentPeriod = computed(() => availablePeriods.value?.find((p) => p.days === days.value) ?? null)
  /** ¿Se puede comparar el periodo elegido? Hasta saberlo (primera carga) se asume que sí, y la comparación solo se pinta si llegó. */
  const comparable = computed(() => currentPeriod.value?.comparable ?? true)

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
      const res = await $fetch<AnalyticsReportDto>('/api/social/youtube-analytics', {
        query: { days: period },
        signal: mine.signal,
        timeout: 25_000
      })
      reports.value = { ...reports.value, [period]: res }
      availablePeriods.value = res.availablePeriods
    } catch (err) {
      // Si se cambió de periodo mientras tanto, esa petición ya no importa.
      if (mine.signal.aborted) return
      const { code, message } = readSocialApiError(err)

      // El canal no existía durante todo el periodo pedido: se pasa al mayor periodo que sí es válido.
      const periods = periodsFromError(err)
      if ((err as { data?: { data?: { code?: string } } } | null)?.data?.data?.code === 'period_unavailable' && periods) {
        availablePeriods.value = periods
        const fallback = [...periods].reverse().find((p) => p.available && p.days < period)
        if (fallback) {
          days.value = fallback.days // el `watch` de abajo carga el nuevo periodo
          return
        }
        error.value = { code: 'period_unavailable', message: 'El canal es demasiado reciente para mostrar periodos completos todavía.' }
        return
      }
      error.value = { code, message: message ?? FALLBACK_MESSAGE }
    } finally {
      if (controller === mine) loading.value = false
    }
  }

  watch(days, (d) => {
    void load(d)
  })

  /** Vuelve a pedir todo (botón Actualizar / Reintentar): descarta lo guardado en memoria. */
  async function reload() {
    reports.value = {}
    await load(days.value, { force: true })
  }

  function select(period: number) {
    days.value = period
  }

  return { days, compare, report, availablePeriods, comparable, loading, error, load, reload, select }
}
