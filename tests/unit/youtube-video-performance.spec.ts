import { describe, expect, it } from 'vitest'
import { VIDEO_REPORT_LIMIT, parseVideoPerformance } from '../../server/utils/youtube-video-performance'
import { performanceMap, periodStatus, sortVideos, type VideoDto, type VideoPerformanceDto } from '../../app/utils/youtube-videos-view'

const ID_A = 'aaaaaaaaaaa'
const ID_B = 'bbbbbbbbbbb'
const ID_C = 'ccccccccccc'
const headers = (...names: string[]) => names.map((name) => ({ name }))

describe('parseVideoPerformance', () => {
  it('lee las columnas por NOMBRE, no por posición', () => {
    const { videos } = parseVideoPerformance({
      columnHeaders: headers('video', 'likes', 'views', 'comments', 'estimatedMinutesWatched'),
      rows: [[ID_A, 7, 100, 3, 250.5]]
    })
    expect(videos).toEqual([{ id: ID_A, views: 100, estimatedMinutesWatched: 250.5, likes: 7, comments: 3 }])
  })

  it('una métrica que no viene es null, no 0; un 0 real sigue siendo 0', () => {
    const { videos } = parseVideoPerformance({ columnHeaders: headers('video', 'views', 'likes'), rows: [[ID_A, 0, 5]] })
    expect(videos[0]).toEqual({ id: ID_A, views: 0, estimatedMinutesWatched: null, likes: 5, comments: null })
  })

  it('valores no numéricos -> null', () => {
    const { videos } = parseVideoPerformance({ columnHeaders: headers('video', 'views'), rows: [[ID_A, 'n/a']] })
    expect(videos[0]!.views).toBeNull()
  })

  it('sin columna de vídeo o sin filas: lista vacía (no se inventan vídeos)', () => {
    expect(parseVideoPerformance({ columnHeaders: headers('views'), rows: [[1]] })).toEqual({ videos: [], truncated: false })
    expect(parseVideoPerformance({ columnHeaders: headers('video', 'views') })).toEqual({ videos: [], truncated: false })
    expect(parseVideoPerformance({})).toEqual({ videos: [], truncated: false })
  })

  it('descarta ids que no son de YouTube y los repetidos', () => {
    const { videos } = parseVideoPerformance({
      columnHeaders: headers('video', 'views'),
      rows: [[ID_A, 1], ['corto', 2], ['../../etc/pas', 3], [ID_A, 9], [ID_B, 4]]
    })
    expect(videos.map((v) => v.id)).toEqual([ID_A, ID_B])
    expect(videos[0]!.views).toBe(1)
  })

  it('truncated solo si el informe llega al tope', () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => [`v${String(i).padStart(10, '0')}`, i])
    expect(parseVideoPerformance({ columnHeaders: headers('video', 'views'), rows: rows(VIDEO_REPORT_LIMIT - 1) }).truncated).toBe(false)
    expect(parseVideoPerformance({ columnHeaders: headers('video', 'views'), rows: rows(VIDEO_REPORT_LIMIT) }).truncated).toBe(true)
  })
})

const perf = (id: string, views: number | null): VideoPerformanceDto => ({ id, views, estimatedMinutesWatched: null, likes: null, comments: null })
const video = (id: string, viewCount: number | null, publishedAt: string): VideoDto => ({
  id, title: id, thumbnailUrl: null, publishedAt, durationSeconds: 60, viewCount, likeCount: null, commentCount: null
})

describe('periodStatus', () => {
  const map = performanceMap({ videos: [perf(ID_A, 10)] })

  it('sin informe: se desconoce (ni cero ni "sin actividad")', () => {
    expect(periodStatus(ID_A, null, false)).toEqual({ kind: 'unknown' })
  })
  it('con fila: datos', () => {
    expect(periodStatus(ID_A, map, false)).toEqual({ kind: 'data', performance: perf(ID_A, 10) })
  })
  it('sin fila y informe completo: sin actividad registrada', () => {
    expect(periodStatus(ID_B, map, false)).toEqual({ kind: 'none' })
  })
  it('sin fila e informe recortado: no se puede afirmar nada', () => {
    expect(periodStatus(ID_B, map, true)).toEqual({ kind: 'unlisted' })
  })
})

describe('sortVideos por visualizaciones del periodo', () => {
  const list = [video(ID_A, 1000, '2026-01-01T00:00:00Z'), video(ID_B, 50, '2026-02-01T00:00:00Z'), video(ID_C, 5, '2026-03-01T00:00:00Z')]

  it('ordena por las vistas del periodo, distintas del total', () => {
    const map = performanceMap({ videos: [perf(ID_A, 3), perf(ID_B, 40), perf(ID_C, 10)] })
    expect(sortVideos(list, 'period-views', map).map((v) => v.id)).toEqual([ID_B, ID_C, ID_A])
    // El orden por total sigue igual de independiente.
    expect(sortVideos(list, 'views', map).map((v) => v.id)).toEqual([ID_A, ID_B, ID_C])
  })

  it('los vídeos sin cifras del periodo van al final (no se tratan como 0), también con vistas null', () => {
    const map = performanceMap({ videos: [perf(ID_B, 5), perf(ID_C, null)] })
    expect(sortVideos(list, 'period-views', map).map((v) => v.id)).toEqual([ID_B, ID_A, ID_C])
  })

  it('sin informe todos quedan en su orden original', () => {
    expect(sortVideos(list, 'period-views', null).map((v) => v.id)).toEqual([ID_A, ID_B, ID_C])
  })

  it('un 0 real del periodo va por delante de los que no tienen dato', () => {
    const map = performanceMap({ videos: [perf(ID_C, 0)] })
    expect(sortVideos(list, 'period-views', map)[0]!.id).toBe(ID_C)
  })
})
