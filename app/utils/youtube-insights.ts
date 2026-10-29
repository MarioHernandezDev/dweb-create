/**
 * Observaciones del dashboard de YouTube (A-R16g) con CRITERIO VISIBLE. Pura y
 * sin Vue. Reglas del requisito:
 *  - Cada observación sale de una regla fija sobre datos reales de YouTube y
 *    lleva escrito su criterio (qué se compara y con qué).
 *  - Sin IA, sin causalidad ("subió porque…") y sin recomendaciones.
 *  - Si falta un dato la observación NO se genera: nunca se rellena con 0.
 */
import { formatCompactNumber } from './mock-data'
import {
  formatDuration, formatPercent, formatRangeLabel,
  type AnalyticsReportDto, type PeriodTotalsDto
} from './youtube-period-view'
import type { VideoDto, VideoPerformanceDto, VideoPerformanceReport } from './youtube-videos-view'

const exact = new Intl.NumberFormat('es-ES', { useGrouping: 'always' })
const oneDecimal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

export interface Observation {
  id: string
  text: string
  /** Qué se compara y con qué: siempre visible, para que no sea una afirmación opaca. */
  criterion: string
}

export interface ChannelObservationsInput {
  report: Pick<AnalyticsReportDto, 'range' | 'totals' | 'comparison' | 'series' | 'previousTotals'> | null
  performance: Pick<VideoPerformanceReport, 'videos' | 'truncated'> | null
  /** Vídeos ya cargados en la lista (puede ser solo la primera página). */
  videos: VideoDto[]
  hasMoreVideos: boolean
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** El de más visualizaciones del periodo, sin fiarse del orden en que llegue (null no cuenta, 0 no es "el más visto"). */
export function topVideoOfPeriod(videos: VideoPerformanceDto[]): VideoPerformanceDto | null {
  let best: VideoPerformanceDto | null = null
  for (const v of videos) {
    if (v.views === null || v.views <= 0) continue
    if (!best || v.views > best.views!) best = v
  }
  return best
}

export function channelObservations(input: ChannelObservationsInput): Observation[] {
  const { report, performance, videos, hasMoreVideos } = input
  const out: Observation[] = []
  if (!report) return out

  const top = performance ? topVideoOfPeriod(performance.videos) : null
  // El más visto es válido aunque el informe esté recortado: el recorte se queda con los MÁS vistos.
  if (top) {
    const title = videos.find((v) => v.id === top.id)?.title
    out.push({
      id: 'top-video',
      text: `${title ? `«${title}»` : 'Un vídeo que aún no está en la lista'} fue el vídeo más visto del periodo, con ${exact.format(top.views!)} visualizaciones.`,
      criterion: 'Mayor número de visualizaciones en el periodo entre los vídeos que devuelve YouTube Analytics.'
    })
    const total = report.totals.views
    if (total !== null && total > 0 && top.views! <= total) {
      const share = (top.views! / total) * 100
      out.push({
        id: 'concentration',
        text: `Ese vídeo concentra el ${oneDecimal.format(share)} % de las visualizaciones del canal en el periodo.`,
        criterion: 'Visualizaciones del vídeo más visto ÷ visualizaciones totales del canal en el periodo (ambas de YouTube Analytics, mismas fechas).'
      })
    }
  }

  const viewsDelta = report.comparison?.views
  const prevViews = report.previousTotals?.views
  const nowViews = report.totals.views
  if (viewsDelta && viewsDelta.pct !== null && nowViews !== null && prevViews != null) {
    const pct = viewsDelta.pct
    const verb = Math.abs(pct) < 1 ? 'se mantienen estables' : pct > 0 ? `suben un ${oneDecimal.format(pct)} %` : `bajan un ${oneDecimal.format(Math.abs(pct))} %`
    out.push({
      id: 'views-change',
      text: `Las visualizaciones del canal ${verb} frente al periodo anterior (${exact.format(prevViews)} → ${exact.format(nowViews)}).`,
      criterion: 'Visualizaciones del periodo frente a las del periodo inmediatamente anterior de la misma duración. Solo se muestra si el periodo anterior es completo y mayor que 0. Describe el cambio, no su causa.'
    })
  }

  const withData = report.series.filter((d) => d.views !== null)
  if (withData.length) {
    const best = withData.reduce((a, b) => (b.views! > a.views! ? b : a))
    if (best.views! > 0) {
      out.push({
        id: 'best-day',
        text: `El mejor día fue el ${dayLabel(best.date)}, con ${exact.format(best.views!)} visualizaciones.`,
        criterion: `Día con más visualizaciones del periodo, entre los ${withData.length} días con dato de YouTube (los días sin dato no cuentan como cero).`
      })
    }
  }

  // Solo se cuenta cuando ya están cargados TODOS los vídeos del rango: la lista llega de más reciente a más antiguo.
  const dated = videos.filter((v) => v.publishedAt && Number.isFinite(new Date(v.publishedAt).getTime()))
  if (dated.length) {
    const oldest = dated.reduce((a, b) => (new Date(b.publishedAt!) < new Date(a.publishedAt!) ? b : a)).publishedAt!.slice(0, 10)
    if (!hasMoreVideos || oldest < report.range.start) {
      const count = dated.filter((v) => {
        const d = v.publishedAt!.slice(0, 10)
        return d >= report.range.start && d <= report.range.end
      }).length
      out.push({
        id: 'published',
        text: count === 0 ? 'No has publicado vídeos en el periodo.' : `Has publicado ${count} ${count === 1 ? 'vídeo' : 'vídeos'} en el periodo.`,
        criterion: `Vídeos con fecha de publicación entre ${formatRangeLabel(report.range)}. Se cuenta solo cuando ya están cargados todos los vídeos de ese rango.`
      })
    }
  }

  return out
}

// --- Un vídeo frente a lo habitual del canal -------------------------------------------------------------------

export type Verdict = 'above' | 'similar' | 'below'

export interface ComparisonRow {
  key: 'views' | 'avgPercentage' | 'avgDuration'
  label: string
  videoText: string
  referenceText: string
  /** Contra qué se compara. */
  referenceLabel: string
  verdict: Verdict
  criterion: string
}

/** Margen en el que se considera "similar": ±10 % relativo. Fijo y visible en el criterio. */
export const SIMILAR_MARGIN = 0.1

export function verdictOf(value: number, reference: number): Verdict | null {
  if (!(reference > 0)) return null
  const ratio = value / reference
  if (ratio > 1 + SIMILAR_MARGIN) return 'above'
  if (ratio < 1 - SIMILAR_MARGIN) return 'below'
  return 'similar'
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/** Mínimo de vídeos con actividad para que "lo habitual" tenga sentido. */
export const MIN_VIDEOS_FOR_TYPICAL = 5

export interface VideoVsChannelInput {
  videoTotals: Pick<PeriodTotalsDto, 'views' | 'averageViewPercentage' | 'averageViewDuration'>
  channelTotals: Pick<PeriodTotalsDto, 'averageViewPercentage' | 'averageViewDuration'> | null
  performance: Pick<VideoPerformanceReport, 'videos' | 'truncated'> | null
  /** El vídeo se publicó dentro del periodo: sus visualizaciones no son comparables con las de vídeos que existían entero. */
  partialPeriod: boolean
}

export function videoVsChannel(input: VideoVsChannelInput): ComparisonRow[] {
  const rows: ComparisonRow[] = []
  const margin = `±${SIMILAR_MARGIN * 100} %`

  const pct = input.videoTotals.averageViewPercentage
  const chPct = input.channelTotals?.averageViewPercentage ?? null
  if (pct !== null && chPct !== null) {
    const verdict = verdictOf(pct, chPct)
    if (verdict) {
      rows.push({
        key: 'avgPercentage', label: '% medio visto', videoText: formatPercent(pct), referenceText: formatPercent(chPct), referenceLabel: 'media del canal en el periodo', verdict,
        criterion: `% medio visto del vídeo frente al % medio visto de todo el canal en el mismo periodo. "Similar" = dentro de ${margin}.`
      })
    }
  }

  const dur = input.videoTotals.averageViewDuration
  const chDur = input.channelTotals?.averageViewDuration ?? null
  if (dur !== null && chDur !== null) {
    const verdict = verdictOf(dur, chDur)
    if (verdict) {
      rows.push({
        key: 'avgDuration', label: 'Duración media de visualización', videoText: formatDuration(dur), referenceText: formatDuration(chDur), referenceLabel: 'media del canal en el periodo', verdict,
        criterion: `Duración media de visualización del vídeo frente a la de todo el canal en el mismo periodo. "Similar" = dentro de ${margin}. Depende de lo largo que sea cada vídeo.`
      })
    }
  }

  // Con el informe recortado la mediana estaría sesgada hacia arriba (solo entran los más vistos).
  const views = input.videoTotals.views
  if (views !== null && !input.partialPeriod && input.performance && !input.performance.truncated) {
    const typical = median(input.performance.videos.map((v) => v.views).filter((n): n is number => n !== null))
    const count = input.performance.videos.filter((v) => v.views !== null).length
    if (typical !== null && count >= MIN_VIDEOS_FOR_TYPICAL) {
      const verdict = verdictOf(views, typical)
      if (verdict) {
        rows.push({
          key: 'views', label: 'Visualizaciones', videoText: exact.format(views), referenceText: formatCompactNumber(Math.round(typical)), referenceLabel: `mediana de ${count} vídeos con actividad`, verdict,
          criterion: `Visualizaciones del vídeo en el periodo frente a la mediana de los ${count} vídeos con actividad en el mismo periodo. "Similar" = dentro de ${margin}. Solo se calcula si hay al menos ${MIN_VIDEOS_FOR_TYPICAL} vídeos y el vídeo existía durante todo el periodo.`
        })
      }
    }
  }
  return rows
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  above: 'Por encima',
  similar: 'Similar',
  below: 'Por debajo'
}
