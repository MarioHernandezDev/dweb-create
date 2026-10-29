import { formatCompactNumber } from './mock-data'

/**
 * Tarjetas de "Total del canal" del dashboard de YouTube (A-R16c). Pura y sin
 * Vue para probar las reglas de "no confundir ausencia con cero":
 *  - Suscriptores ocultos por el canal -> sin valor y con motivo, no 0.
 *  - Media de vistas por vídeo sin vídeos -> sin valor y con motivo, no 0.
 *  - Cada cifra dice de dónde sale: dato de YouTube o cálculo de FEEDMA.
 */
export interface ChannelStatsInput {
  subscriberCount: number | null
  viewCount: number
  videoCount: number
  avgViewsPerVideo: number
}

export interface Kpi {
  /** Identificador estable de la tarjeta (totales del canal o métricas del periodo). */
  key: string
  label: string
  /** Valor compacto ("12,4 mil"); `null` si no se puede mostrar. */
  value: string | null
  /** Valor exacto, para el tooltip. */
  exact: string | null
  /** Por qué no hay valor (solo si `value` es null). */
  reason: string | null
  hero: boolean
  icon: string
  hint: string
  /** `youtube` = dato que da YouTube; `feedma` = cálculo nuestro, no una cifra oficial. */
  source: 'youtube' | 'feedma'
  /** Valor numérico y su formato, para el contador animado. El texto final es SIEMPRE `value`; sin esto no se anima. */
  count?: { to: number; format: (n: number) => string }
}

const exactFormat = new Intl.NumberFormat('es-ES')

export function channelKpis(stats: ChannelStatsInput): Kpi[] {
  const subscribersHidden = stats.subscriberCount === null
  const noVideos = stats.videoCount <= 0

  const kpis: Kpi[] = [
    {
      key: 'subscribers',
      label: 'Suscriptores',
      value: subscribersHidden ? null : formatCompactNumber(stats.subscriberCount!),
      exact: subscribersHidden ? null : exactFormat.format(stats.subscriberCount!),
      reason: subscribersHidden ? 'El canal oculta su número de suscriptores' : null,
      hero: true,
      icon: 'ph:users-three-fill',
      hint: 'Suscriptores actuales del canal. Es un total acumulado, no un cambio en un periodo.',
      source: 'youtube'
    },
    {
      key: 'views',
      label: 'Visualizaciones totales',
      value: formatCompactNumber(stats.viewCount),
      exact: exactFormat.format(stats.viewCount),
      reason: null,
      hero: false,
      icon: 'ph:eye-fill',
      hint: 'Todas las visualizaciones del canal desde que existe.',
      source: 'youtube'
    },
    {
      key: 'videos',
      label: 'Vídeos publicados',
      value: formatCompactNumber(stats.videoCount),
      exact: exactFormat.format(stats.videoCount),
      reason: null,
      hero: false,
      icon: 'ph:video-fill',
      hint: 'Número total de vídeos públicos del canal.',
      source: 'youtube'
    },
    {
      key: 'avgViews',
      label: 'Media de vistas por vídeo',
      value: noVideos ? null : formatCompactNumber(stats.avgViewsPerVideo),
      exact: noVideos ? null : exactFormat.format(stats.avgViewsPerVideo),
      reason: noVideos ? 'Aún no hay vídeos publicados' : null,
      hero: false,
      icon: 'ph:chart-bar-fill',
      hint: 'Visualizaciones totales entre vídeos publicados. Es un cálculo de FEEDMA, no una cifra de YouTube.',
      source: 'feedma'
    }
  ]

  // Contador animado solo donde hay un número real: el texto final sigue siendo `value`.
  const raw: Record<string, number | null> = {
    subscribers: subscribersHidden ? null : stats.subscriberCount,
    views: stats.viewCount,
    videos: stats.videoCount,
    avgViews: noVideos ? null : stats.avgViewsPerVideo
  }
  return kpis.map((k) => (raw[k.key] == null ? k : { ...k, count: { to: raw[k.key]!, format: formatCompactNumber } }))
}
