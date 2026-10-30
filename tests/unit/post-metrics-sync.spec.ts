import { afterEach, describe, expect, it, vi } from 'vitest'
import { refreshAccountPostMetricsBestEffort, refreshInstagramPostMetrics, refreshYoutubePostMetrics } from '../../server/utils/post-metrics-sync'

/** Cliente de base falso: guarda lo que se escribe y responde a la lectura de vínculos. */
function fakeClient(links: { post_id: string; external_id: string }[] = []) {
  const upserts: unknown[][] = []
  const client = {
    from: (table: string) => {
      if (table === 'metrics') return { upsert: vi.fn(async (rows: unknown[]) => { upserts.push(rows); return { error: null } }) }
      return { select: () => ({ eq: async () => ({ data: links, error: null }) }) }
    }
  }
  return { client: client as never, upserts }
}

afterEach(() => vi.unstubAllGlobals())

const NOW = new Date('2026-10-30T12:00:00Z')

describe('refreshYoutubePostMetrics', () => {
  it('guarda una fila por vídeo con las estadísticas de YouTube y lista el que ya no existe', async () => {
    const $fetch = vi.fn(async () => ({
      items: [
        { id: 'AAAAAAAAAAA', statistics: { viewCount: '1000', likeCount: '50', commentCount: '5' } },
        { id: 'BBBBBBBBBBB', statistics: { viewCount: '200' } } // likes ocultos y comentarios desactivados
      ]
    }))
    vi.stubGlobal('$fetch', $fetch)
    const { client, upserts } = fakeClient()
    const res = await refreshYoutubePostMetrics(client, 'acc', 'tok', [
      { postId: 'p1', externalId: 'AAAAAAAAAAA' }, { postId: 'p2', externalId: 'BBBBBBBBBBB' }, { postId: 'p3', externalId: 'CCCCCCCCCCC' }
    ], NOW)
    expect(res).toEqual({ saved: 2, missing: ['p3'] })
    const rows = upserts[0] as Record<string, unknown>[]
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ post_id: 'p1', source: 'youtube', measured_on: '2026-10-30', views: 1000, likes: 50, comments: 5, shares: null, saves: null, reach: null })
    expect(rows[0]!.unavailable_metrics).toEqual(['shares', 'saves', 'reach'])
    // Me gusta ocultos y comentarios desactivados: null y anotados, NO 0.
    expect(rows[1]).toMatchObject({ post_id: 'p2', views: 200, likes: null, comments: null, engagement_rate: null })
    expect(rows[1]!.unavailable_metrics).toEqual(['likes', 'comments', 'shares', 'saves', 'reach'])
  })

  it('pide los vídeos en lotes de 50 (una llamada no admite más)', async () => {
    const $fetch = vi.fn(async () => ({ items: [] }))
    vi.stubGlobal('$fetch', $fetch)
    const links = Array.from({ length: 51 }, (_, i) => ({ postId: `p${i}`, externalId: `V${String(i).padStart(10, '0')}` }))
    const { client } = fakeClient()
    const res = await refreshYoutubePostMetrics(client, 'acc', 'tok', links, NOW)
    expect($fetch).toHaveBeenCalledTimes(2)
    expect(res.saved).toBe(0)
    expect(res.missing).toHaveLength(51)
  })

  it('sin vídeos devueltos NO se escribe ninguna fila (no se inventan ceros)', async () => {
    vi.stubGlobal('$fetch', vi.fn(async () => ({ items: [] })))
    const { client, upserts } = fakeClient()
    await refreshYoutubePostMetrics(client, 'acc', 'tok', [{ postId: 'p1', externalId: 'AAAAAAAAAAA' }], NOW)
    expect(upserts).toHaveLength(0)
  })
})

describe('refreshInstagramPostMetrics', () => {
  it('combina campos básicos e insights; un insight que falla solo deja esa métrica en null', async () => {
    const $fetch = vi.fn(async (url: string, opts: { params: Record<string, string> }) => {
      if (!url.endsWith('/insights')) return { like_count: 12, comments_count: 3 }
      const metric = opts.params.metric
      if (metric === 'shares') throw new Error('metric not supported for this media type')
      const values: Record<string, number> = { views: 900, reach: 700, saved: 6 }
      return { data: [{ name: metric, values: [{ value: values[metric] }] }] }
    })
    vi.stubGlobal('$fetch', $fetch)
    const { client, upserts } = fakeClient()
    const res = await refreshInstagramPostMetrics(client, 'acc', 'tok', [{ postId: 'p1', externalId: '17900000000000000' }], NOW)
    expect(res).toEqual({ saved: 1, missing: [] })
    const row = (upserts[0] as Record<string, unknown>[])[0]!
    expect(row).toMatchObject({ source: 'instagram', views: 900, likes: 12, comments: 3, shares: null, saves: 6, reach: 700 })
    expect(row.unavailable_metrics).toEqual(['shares'])
    expect(row.engagement_rate).toBeCloseTo(1.667, 3)
  })

  it('un fallo en los campos básicos se relanza (el llamador lo clasifica: acceso caducado…)', async () => {
    vi.stubGlobal('$fetch', vi.fn(async () => { throw Object.assign(new Error('token'), { response: { status: 400 } }) }))
    const { client } = fakeClient()
    await expect(refreshInstagramPostMetrics(client, 'acc', 'tok', [{ postId: 'p1', externalId: '1' }], NOW)).rejects.toThrow()
  })

  it('limita a 25 publicaciones por lectura', async () => {
    const $fetch = vi.fn(async (url: string) => (url.endsWith('/insights') ? { data: [] } : { like_count: 1, comments_count: 1 }))
    vi.stubGlobal('$fetch', $fetch)
    const { client, upserts } = fakeClient()
    const links = Array.from({ length: 40 }, (_, i) => ({ postId: `p${i}`, externalId: String(i) }))
    await refreshInstagramPostMetrics(client, 'acc', 'tok', links, NOW)
    expect((upserts[0] as unknown[]).length).toBe(25)
  })
})

describe('refreshAccountPostMetricsBestEffort', () => {
  it('sin publicaciones vinculadas no llama al proveedor', async () => {
    const $fetch = vi.fn()
    vi.stubGlobal('$fetch', $fetch)
    const { client } = fakeClient([])
    await refreshAccountPostMetricsBestEffort(client, 'youtube', 'acc', 'tok')
    expect($fetch).not.toHaveBeenCalled()
  })

  it('si el proveedor falla NO lanza: la sincronización de la cuenta no debe romperse', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('$fetch', vi.fn(async () => { throw new Error('Google caído') }))
    const { client } = fakeClient([{ post_id: 'p1', external_id: 'AAAAAAAAAAA' }])
    await expect(refreshAccountPostMetricsBestEffort(client, 'youtube', 'acc', 'tok')).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
