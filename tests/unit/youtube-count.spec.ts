import { describe, expect, it } from 'vitest'
import { channelKpis } from '../../app/utils/youtube-kpi'
import { periodKpis, type PeriodTotalsDto } from '../../app/utils/youtube-period-view'

/**
 * El contador animado (A-R16f) es solo el camino hacia el valor real: el texto
 * final de cada tarjeta tiene que ser EXACTAMENTE el que muestra sin animación.
 */
const totals = (over: Partial<PeriodTotalsDto> = {}): PeriodTotalsDto => ({
  views: 12_345, estimatedMinutesWatched: 4_321.5, averageViewDuration: 120, averageViewPercentage: 41.7, likes: 540, comments: 61, shares: 23,
  subscribersGained: 30, subscribersLost: 4, netSubscribers: 26, ...over
})

describe('contador animado: valor final = valor real', () => {
  it('totales del canal: el formato del contador reproduce exactamente `value`', () => {
    const kpis = channelKpis({ subscriberCount: 12_400, viewCount: 1_250_000, videoCount: 50, avgViewsPerVideo: 25_000 })
    expect(kpis.every((k) => k.count !== undefined)).toBe(true)
    for (const k of kpis) expect(k.count!.format(k.count!.to)).toBe(k.value)
  })

  it('suscriptores ocultos o sin vídeos: no hay contador (no se anima un "—")', () => {
    const kpis = channelKpis({ subscriberCount: null, viewCount: 10, videoCount: 0, avgViewsPerVideo: 0 })
    expect(kpis.find((k) => k.key === 'subscribers')!.count).toBeUndefined()
    expect(kpis.find((k) => k.key === 'avgViews')!.count).toBeUndefined()
    expect(kpis.find((k) => k.key === 'views')!.count).toBeDefined()
  })

  it('periodo: solo los recuentos se animan y su valor final coincide con `value`', () => {
    const kpis = periodKpis({ totals: totals(), comparison: null })
    expect(kpis.filter((k) => k.count).map((k) => k.key)).toEqual(['views', 'estimatedMinutesWatched', 'likes', 'comments', 'shares'])
    for (const k of kpis.filter((x) => x.count)) expect(k.count!.format(k.count!.to)).toBe(k.value)
  })

  it('periodo: un dato ausente no tiene contador (null no se anima ni se convierte en 0)', () => {
    const kpis = periodKpis({ totals: totals({ views: null, likes: null }), comparison: null })
    expect(kpis.find((k) => k.key === 'views')!.count).toBeUndefined()
    expect(kpis.find((k) => k.key === 'likes')!.count).toBeUndefined()
    expect(kpis.find((k) => k.key === 'views')!.value).toBeNull()
  })

  it('un 0 real sí cuenta (y acaba en "0")', () => {
    const k = periodKpis({ totals: totals({ comments: 0 }), comparison: null }).find((x) => x.key === 'comments')!
    expect(k.count).toBeDefined()
    expect(k.count!.format(0)).toBe(k.value)
  })
})
