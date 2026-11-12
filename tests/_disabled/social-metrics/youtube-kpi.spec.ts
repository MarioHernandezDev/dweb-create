import { describe, expect, it } from 'vitest'
import { channelKpis, type ChannelStatsInput } from '../../../app/_disabled/social-metrics/utils/youtube-kpi'

const base: ChannelStatsInput = { subscriberCount: 12400, viewCount: 1_250_000, videoCount: 50, avgViewsPerVideo: 25_000 }
const kpi = (stats: ChannelStatsInput, key: string) => channelKpis(stats).find((k) => k.key === key)!

describe('channelKpis', () => {
  it('devuelve las cuatro tarjetas en orden y solo Suscriptores es la protagonista', () => {
    const list = channelKpis(base)
    expect(list.map((k) => k.key)).toEqual(['subscribers', 'views', 'videos', 'avgViews'])
    expect(list.filter((k) => k.hero).map((k) => k.key)).toEqual(['subscribers'])
  })

  it('con datos normales todas tienen valor y ninguna lleva motivo', () => {
    for (const k of channelKpis(base)) {
      expect(k.value).not.toBeNull()
      expect(k.reason).toBeNull()
    }
  })

  it('muestra el valor exacto (para el tooltip) además del compacto', () => {
    const k = kpi(base, 'subscribers')
    expect(k.exact).toBe('12.400')
    expect(k.value).toMatch(/12/)
  })

  describe('suscriptores ocultos por el canal', () => {
    const hidden = { ...base, subscriberCount: null }

    it('NO se muestra un 0: sin valor y con el motivo', () => {
      const k = kpi(hidden, 'subscribers')
      expect(k.value).toBeNull()
      expect(k.exact).toBeNull()
      expect(k.reason).toMatch(/oculta/)
    })

    it('el resto de tarjetas no se ven afectadas', () => {
      expect(kpi(hidden, 'views').value).not.toBeNull()
    })
  })

  describe('un canal sin vídeos', () => {
    const empty = { subscriberCount: 3, viewCount: 0, videoCount: 0, avgViewsPerVideo: 0 }

    it('la media por vídeo NO es 0: sin valor y con motivo', () => {
      const k = kpi(empty, 'avgViews')
      expect(k.value).toBeNull()
      expect(k.reason).toMatch(/vídeos/)
    })

    it('las visualizaciones y los vídeos sí pueden ser 0 reales', () => {
      expect(kpi(empty, 'views').value).toBe('0')
      expect(kpi(empty, 'videos').value).toBe('0')
    })
  })

  it('distingue lo que da YouTube de lo que calcula CIBERAN', () => {
    expect(kpi(base, 'avgViews').source).toBe('ciberan')
    expect(kpi(base, 'avgViews').hint).toMatch(/cálculo de CIBERAN/)
    for (const key of ['subscribers', 'views', 'videos']) expect(kpi(base, key).source).toBe('youtube')
  })

  it('un suscriptor real 0 se muestra como 0 (no se confunde con oculto)', () => {
    const k = kpi({ ...base, subscriberCount: 0 }, 'subscribers')
    expect(k.value).toBe('0')
    expect(k.reason).toBeNull()
  })
})
