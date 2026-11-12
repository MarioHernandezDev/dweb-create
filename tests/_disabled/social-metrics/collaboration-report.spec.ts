import { describe, expect, it } from 'vitest'
import { buildCollaborationReport, safeExternalUrl, type ReportMetricRow, type ReportPost } from '../../../app/_disabled/social-metrics/utils/collaboration-report'

const post = (id: string, platform = 'youtube'): ReportPost => ({ id, title: `Post ${id}`, platform, status: 'published', dueDate: '2026-10-30' })
const m = (post_id: string, over: Partial<ReportMetricRow> = {}): ReportMetricRow => ({
  post_id, measured_on: '2026-10-30', source: 'youtube', views: 100, likes: 10, comments: 2, shares: null, saves: null, reach: null, engagement_rate: null, ...over
})

describe('buildCollaborationReport', () => {
  it('sin entregas: informe vacío, totales null (no 0)', () => {
    const r = buildCollaborationReport([], [], [])
    expect(r.deliverables).toBe(0)
    expect(r.totals.every((t) => t.value === null && t.counted === 0)).toBe(true)
  })

  it('distingue sin vínculo, vinculada sin medir y medida', () => {
    const r = buildCollaborationReport(
      [post('a'), post('b'), post('c')],
      [{ post_id: 'b', external_url: 'https://youtu.be/x' }, { post_id: 'c', external_url: null }],
      [m('c')]
    )
    expect(r.entries.map((e) => e.state)).toEqual(['unlinked', 'unmeasured', 'measured'])
    expect(r.deliverables).toBe(3)
    expect(r.linked).toBe(2)
    expect(r.measured).toBe(1)
  })

  it('una entrega sin medir no suma ceros a los totales', () => {
    const r = buildCollaborationReport([post('a'), post('b')], [{ post_id: 'a', external_url: null }, { post_id: 'b', external_url: null }], [m('a', { views: 500 })])
    const views = r.totals.find((t) => t.key === 'views')!
    expect(views).toMatchObject({ value: 500, counted: 1 })
  })

  it('los me gusta ocultos (null) no suman y no cuentan; un 0 real sí cuenta', () => {
    const links = [{ post_id: 'a', external_url: null }, { post_id: 'b', external_url: null }, { post_id: 'c', external_url: null }]
    const r = buildCollaborationReport([post('a'), post('b'), post('c')], links, [
      m('a', { likes: null }), m('b', { likes: 0 }), m('c', { likes: 7 })
    ])
    expect(r.totals.find((t) => t.key === 'likes')).toMatchObject({ value: 7, counted: 2 })
    expect(r.totals.find((t) => t.key === 'views')).toMatchObject({ value: 300, counted: 3 })
  })

  it('usa la última medición de cada entrega', () => {
    const r = buildCollaborationReport([post('a')], [{ post_id: 'a', external_url: null }], [
      m('a', { measured_on: '2026-10-28', views: 10 }), m('a', { measured_on: '2026-10-30', views: 40 })
    ])
    expect(r.totals.find((t) => t.key === 'views')?.value).toBe(40)
  })

  it('métricas de una publicación no se cuelan en otra', () => {
    const r = buildCollaborationReport([post('a'), post('b')], [{ post_id: 'a', external_url: null }, { post_id: 'b', external_url: null }], [m('a', { views: 5 })])
    expect(r.entries[1]!.state).toBe('unmeasured')
  })
})

describe('safeExternalUrl', () => {
  it('solo acepta http(s)', () => {
    expect(safeExternalUrl('https://www.youtube.com/watch?v=abc')).toContain('youtube.com')
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,x')).toBeNull()
    expect(safeExternalUrl('no es una url')).toBeNull()
    expect(safeExternalUrl(null)).toBeNull()
  })
})
