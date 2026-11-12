import { describe, expect, it, vi } from 'vitest'
import {
  buildMetricsRow, engagementRateOf, insightValue, mapInstagramMetrics, mapYoutubeMetrics, recordPostMetrics, unavailableOf, type PostMetricValues
} from '../../../server/_disabled/social-metrics/utils/post-metrics'

const all = (over: Partial<PostMetricValues> = {}): PostMetricValues => ({ views: 100, likes: 10, comments: 2, shares: 1, saves: 3, reach: 80, ...over })

describe('mapYoutubeMetrics', () => {
  it('lee las estadísticas del vídeo', () => {
    expect(mapYoutubeMetrics({ viewCount: '1234', likeCount: '56', commentCount: '7' })).toEqual({
      views: 1234, likes: 56, comments: 7, shares: null, saves: null, reach: null
    })
  })
  it('me gusta ocultos y comentarios desactivados (campo ausente) son null, NO 0', () => {
    const m = mapYoutubeMetrics({ viewCount: '500' })
    expect(m.likes).toBeNull()
    expect(m.comments).toBeNull()
    expect(m.views).toBe(500)
  })
  it('un 0 real sigue siendo 0', () => {
    expect(mapYoutubeMetrics({ viewCount: '0', likeCount: '0', commentCount: '0' })).toMatchObject({ views: 0, likes: 0, comments: 0 })
  })
  it('sin estadísticas todo es null', () => {
    expect(Object.values(mapYoutubeMetrics(undefined)).every((v) => v === null)).toBe(true)
  })
  it('compartidos, guardados y alcance no existen en esta API: null', () => {
    const m = mapYoutubeMetrics({ viewCount: '1', likeCount: '1', commentCount: '1' })
    expect([m.shares, m.saves, m.reach]).toEqual([null, null, null])
  })
})

describe('insightValue', () => {
  it('lee el valor de `values[0].value` y de `total_value.value`', () => {
    expect(insightValue({ data: [{ name: 'reach', values: [{ value: 321 }] }] }, 'reach')).toBe(321)
    expect(insightValue({ data: [{ name: 'views', total_value: { value: '77' } }] }, 'views')).toBe(77)
  })
  it('métrica que no viene o respuesta vacía (Meta devuelve un conjunto vacío, no un 0) -> null', () => {
    expect(insightValue({ data: [] }, 'reach')).toBeNull()
    expect(insightValue({ data: [{ name: 'saved', values: [] }] }, 'saved')).toBeNull()
    expect(insightValue(null, 'reach')).toBeNull()
    expect(insightValue({ data: [{ name: 'reach', values: [{ value: 'x' }] }] }, 'reach')).toBeNull()
  })
  it('un 0 real se conserva', () => {
    expect(insightValue({ data: [{ name: 'saved', values: [{ value: 0 }] }] }, 'saved')).toBe(0)
  })
})

describe('mapInstagramMetrics', () => {
  it('combina campos básicos e insights', () => {
    expect(mapInstagramMetrics({ like_count: 9, comments_count: 2 }, { views: 500, reach: 300, saved: 4, shares: 1 })).toEqual({
      views: 500, likes: 9, comments: 2, shares: 1, saves: 4, reach: 300
    })
  })
  it('me gusta ocultos (like_count ausente) e insights que fallaron quedan null', () => {
    const m = mapInstagramMetrics({ comments_count: 0 }, { views: null })
    expect(m).toEqual({ views: null, likes: null, comments: 0, shares: null, saves: null, reach: null })
  })
})

describe('unavailableOf / engagementRateOf', () => {
  it('lista las métricas null en orden estable', () => {
    expect(unavailableOf(all({ likes: null, saves: null }))).toEqual(['likes', 'saves'])
    expect(unavailableOf(all())).toEqual([])
  })
  it('interacción = (likes + comentarios) / vistas; null si falta algo o no hay vistas', () => {
    expect(engagementRateOf({ views: 200, likes: 10, comments: 2 })).toBe(6)
    expect(engagementRateOf({ views: 200, likes: null, comments: 2 })).toBeNull()
    expect(engagementRateOf({ views: 200, likes: 10, comments: null })).toBeNull()
    expect(engagementRateOf({ views: 0, likes: 0, comments: 0 })).toBeNull()
    expect(engagementRateOf({ views: null, likes: 1, comments: 1 })).toBeNull()
  })
  it('un valor fuera de rango para la columna no se guarda', () => {
    expect(engagementRateOf({ views: 1, likes: 5000, comments: 0 })).toBeNull()
  })
})

describe('buildMetricsRow', () => {
  it('lleva la clave (publicación, origen, día UTC) y anota lo no disponible', () => {
    const row = buildMetricsRow({ postId: 'p1', accountId: 'a1', source: 'youtube', values: all({ shares: null, likes: null }), now: new Date('2026-10-30T23:30:00Z') })
    expect(row).toMatchObject({
      post_id: 'p1', social_account_id: 'a1', source: 'youtube', measured_on: '2026-10-30', measured_at: '2026-10-30T23:30:00.000Z',
      likes: null, shares: null, engagement_rate: null, unavailable_metrics: ['likes', 'shares']
    })
  })
})

describe('recordPostMetrics', () => {
  function fakeClient(result: { error: { message: string } | null } | Error) {
    const upsert = vi.fn(async () => { if (result instanceof Error) throw result; return result })
    return { client: { from: vi.fn(() => ({ upsert })) } as never, upsert }
  }
  const row = buildMetricsRow({ postId: 'p1', accountId: 'a1', source: 'youtube', values: all() })

  it('upsert por (publicación, origen, día): la misma clave que la restricción única', async () => {
    const { client, upsert } = fakeClient({ error: null })
    expect(await recordPostMetrics(client, [row])).toBe(1)
    expect((upsert.mock.calls[0] as unknown[])[1]).toEqual({ onConflict: 'post_id,source,measured_on' })
  })
  it('sin filas no llama a la base', async () => {
    const { client, upsert } = fakeClient({ error: null })
    expect(await recordPostMetrics(client, [])).toBe(0)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('si la base falla o lanza, NO lanza (la operación continúa) y devuelve 0', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await recordPostMetrics(fakeClient({ error: { message: 'boom' } }).client, [row])).toBe(0)
    expect(await recordPostMetrics(fakeClient(new Error('red')).client, [row])).toBe(0)
    spy.mockRestore()
  })
})
