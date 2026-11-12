import { describe, expect, it } from 'vitest'
import {
  countDisplay, engagementRate, filterVideos, formatEngagement, formatVideoDuration, hasActiveFilters, normalizeText, sortVideos, videoUrl,
  type VideoDto
} from '../../../app/_disabled/social-metrics/utils/youtube-videos-view'

const NOW = new Date('2026-10-29T12:00:00Z')
const video = (over: Partial<VideoDto> & { id: string }): VideoDto => ({
  title: over.id, thumbnailUrl: null, publishedAt: '2026-10-01T00:00:00Z', durationSeconds: 60, viewCount: 100, likeCount: 10, commentCount: 5, ...over
})

describe('normalizeText', () => {
  it('quita tildes y mayúsculas', () => {
    expect(normalizeText('  VÍDEO Sobre Cámaras ')).toBe('video sobre camaras')
  })
})

describe('engagementRate', () => {
  it('(me gusta + comentarios) / visualizaciones en %', () => {
    expect(engagementRate({ viewCount: 1000, likeCount: 40, commentCount: 10 })).toBe(5)
  })

  it.each([
    ['me gusta ocultos', { viewCount: 1000, likeCount: null, commentCount: 10 }],
    ['comentarios desactivados', { viewCount: 1000, likeCount: 40, commentCount: null }],
    ['sin visualizaciones (dato)', { viewCount: null, likeCount: 4, commentCount: 1 }],
    ['0 visualizaciones (no se divide entre cero)', { viewCount: 0, likeCount: 0, commentCount: 0 }]
  ])('no se calcula con %s', (_n, v) => {
    expect(engagementRate(v)).toBeNull()
  })

  it('con 0 me gusta y 0 comentarios reales y vistas, es 0 % (no "sin dato")', () => {
    expect(engagementRate({ viewCount: 500, likeCount: 0, commentCount: 0 })).toBe(0)
  })
})

describe('filterVideos', () => {
  const list = [
    video({ id: 'a', title: 'Cómo montar una cámara', publishedAt: '2026-10-20T00:00:00Z' }),
    video({ id: 'b', title: 'Reseña de micrófono', publishedAt: '2026-08-01T00:00:00Z' }),
    video({ id: 'c', title: 'Vlog antiguo', publishedAt: '2024-01-01T00:00:00Z' }),
    video({ id: 'd', title: 'Sin fecha', publishedAt: null })
  ]
  const ids = (l: VideoDto[]) => l.map((v) => v.id)

  it('sin filtros devuelve todo', () => {
    expect(ids(filterVideos(list, { query: '', range: 'all' }, NOW))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('busca por título sin importar tildes ni mayúsculas', () => {
    expect(ids(filterVideos(list, { query: 'camara', range: 'all' }, NOW))).toEqual(['a'])
    expect(ids(filterVideos(list, { query: 'MICROFONO', range: 'all' }, NOW))).toEqual(['b'])
  })

  it('una búsqueda sin coincidencias devuelve vacío', () => {
    expect(filterVideos(list, { query: 'zzz', range: 'all' }, NOW)).toEqual([])
  })

  it.each([['30', ['a']], ['90', ['a', 'b']], ['365', ['a', 'b']]] as const)('rango %s días', (range, expected) => {
    expect(ids(filterVideos(list, { query: '', range }, NOW))).toEqual(expected)
  })

  it('un vídeo sin fecha NO entra en un filtro de fechas (pero sí sin filtro)', () => {
    expect(ids(filterVideos(list, { query: '', range: '365' }, NOW))).not.toContain('d')
    expect(ids(filterVideos(list, { query: 'sin fecha', range: 'all' }, NOW))).toEqual(['d'])
  })

  it('combina búsqueda y fecha', () => {
    expect(ids(filterVideos(list, { query: 'vlog', range: '30' }, NOW))).toEqual([])
  })

  it('no modifica la lista original', () => {
    const copy = [...list]
    filterVideos(list, { query: 'camara', range: '30' }, NOW)
    expect(list).toEqual(copy)
  })
})

describe('sortVideos', () => {
  const ids = (l: VideoDto[]) => l.map((v) => v.id)

  it('más recientes: por fecha, los que no tienen fecha al final', () => {
    const l = [video({ id: 'old', publishedAt: '2026-01-01T00:00:00Z' }), video({ id: 'none', publishedAt: null }), video({ id: 'new', publishedAt: '2026-09-01T00:00:00Z' })]
    expect(ids(sortVideos(l, 'recent'))).toEqual(['new', 'old', 'none'])
  })

  it('más vistos: los que no tienen el dato van al final (no se tratan como 0)', () => {
    const l = [video({ id: 'low', viewCount: 5 }), video({ id: 'null', viewCount: null }), video({ id: 'zero', viewCount: 0 }), video({ id: 'high', viewCount: 900 })]
    expect(ids(sortVideos(l, 'views'))).toEqual(['high', 'low', 'zero', 'null'])
  })

  it('mayor interacción: sin el dato (me gusta ocultos…) al final', () => {
    const l = [
      video({ id: 'hidden', viewCount: 100, likeCount: null, commentCount: 50 }),
      video({ id: 'mid', viewCount: 100, likeCount: 4, commentCount: 1 }),
      video({ id: 'top', viewCount: 100, likeCount: 20, commentCount: 10 })
    ]
    expect(ids(sortVideos(l, 'engagement'))).toEqual(['top', 'mid', 'hidden'])
  })

  it('es estable: con el mismo valor conserva el orden de entrada', () => {
    const l = [video({ id: 'a', viewCount: 10 }), video({ id: 'b', viewCount: 10 }), video({ id: 'c', viewCount: 10 })]
    expect(ids(sortVideos(l, 'views'))).toEqual(['a', 'b', 'c'])
  })

  it('no modifica la lista original', () => {
    const l = [video({ id: 'a', viewCount: 1 }), video({ id: 'b', viewCount: 9 })]
    sortVideos(l, 'views')
    expect(ids(l)).toEqual(['a', 'b'])
  })
})

describe('hasActiveFilters', () => {
  it.each([[{ query: '', range: 'all' }, false], [{ query: '  ', range: 'all' }, false], [{ query: 'x', range: 'all' }, true], [{ query: '', range: '30' }, true]] as const)('%j -> %s', (f, out) => {
    expect(hasActiveFilters(f)).toBe(out)
  })
})

describe('countDisplay', () => {
  it('un recuento ausente es "—" con su motivo, NO 0', () => {
    expect(countDisplay('likes', null)).toEqual({ text: '—', reason: 'El canal oculta los me gusta de este vídeo' })
    expect(countDisplay('comments', null)).toEqual({ text: '—', reason: 'Los comentarios están desactivados en este vídeo' })
    expect(countDisplay('views', null).reason).toMatch(/visualizaciones/)
  })

  it('un 0 real se muestra como 0', () => {
    expect(countDisplay('likes', 0)).toEqual({ text: '0', reason: null })
  })

  it('formatea con separador de miles', () => {
    expect(countDisplay('views', 12345).text).toBe('12.345')
  })
})

describe('formatos', () => {
  it.each([[253, '4:13'], [3725, '1:02:05'], [0, '0:00']])('duración %s s -> %s', (s, out) => expect(formatVideoDuration(s)).toBe(out))
  it('interacción con un decimal', () => expect(formatEngagement(4.236)).toBe('4,2 %'))
  it('URL del vídeo con el id codificado', () => {
    expect(videoUrl('abc123')).toBe('https://www.youtube.com/watch?v=abc123')
    expect(videoUrl('a&b')).toBe('https://www.youtube.com/watch?v=a%26b')
  })
})
