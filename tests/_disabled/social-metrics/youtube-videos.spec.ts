import { describe, expect, it } from 'vitest'
import { isValidPageToken, mapVideo, numberOrNull, parseIsoDuration, sortNewestFirst, type VideoDto } from '../../../server/_disabled/social-metrics/utils/youtube-videos'

describe('numberOrNull', () => {
  it.each([['1234', 1234], ['0', 0], [5, 5], [0, 0], ['12.5', 12.5]])('%j -> %j', (input, out) => {
    expect(numberOrNull(input)).toBe(out)
  })

  it.each([undefined, null, '', '   ', 'abc', NaN, Infinity, {}, []])('%j -> null (no es un 0)', (input) => {
    expect(numberOrNull(input)).toBeNull()
  })
})

describe('parseIsoDuration', () => {
  it.each([
    ['PT4M13S', 253], ['PT45S', 45], ['PT1H', 3600], ['PT1H2M3S', 3723], ['PT0S', 0],
    ['P1DT2H', 93_600], ['P1D', 86_400]
  ])('%s -> %s s', (iso, seconds) => {
    expect(parseIsoDuration(iso)).toBe(seconds)
  })

  it.each([undefined, '', 'P', 'PT', 'basura', '4:13', 'PT-5S'])('%j -> null (antes salía 0 y parecía una duración real)', (iso) => {
    expect(parseIsoDuration(iso)).toBeNull()
  })
})

describe('mapVideo', () => {
  const full = {
    id: 'abc123',
    snippet: { title: ' Mi vídeo ', publishedAt: '2026-10-01T10:00:00Z', thumbnails: { medium: { url: 'https://i.ytimg.com/m.jpg' }, default: { url: 'https://i.ytimg.com/d.jpg' } } },
    statistics: { viewCount: '1000', likeCount: '50', commentCount: '7' },
    contentDetails: { duration: 'PT4M13S' }
  }

  it('mapea un vídeo completo', () => {
    expect(mapVideo(full)).toEqual({
      id: 'abc123', title: 'Mi vídeo', thumbnailUrl: 'https://i.ytimg.com/m.jpg', publishedAt: '2026-10-01T10:00:00Z',
      durationSeconds: 253, viewCount: 1000, likeCount: 50, commentCount: 7
    })
  })

  it('si el canal OCULTA los me gusta, likeCount es null (NO 0)', () => {
    const v = mapVideo({ ...full, statistics: { viewCount: '1000', commentCount: '7' } })!
    expect(v.likeCount).toBeNull()
    expect(v.commentCount).toBe(7)
  })

  it('si los comentarios están DESACTIVADOS, commentCount es null (NO 0)', () => {
    const v = mapVideo({ ...full, statistics: { viewCount: '1000', likeCount: '50' } })!
    expect(v.commentCount).toBeNull()
    expect(v.likeCount).toBe(50)
  })

  it('un 0 real se conserva como 0', () => {
    const v = mapVideo({ ...full, statistics: { viewCount: '0', likeCount: '0', commentCount: '0' } })!
    expect([v.viewCount, v.likeCount, v.commentCount]).toEqual([0, 0, 0])
  })

  it('sin estadísticas todo es null', () => {
    const v = mapVideo({ id: 'x' })!
    expect([v.viewCount, v.likeCount, v.commentCount, v.durationSeconds, v.publishedAt, v.thumbnailUrl]).toEqual([null, null, null, null, null, null])
    expect(v.title).toBe('Sin título')
  })

  it('usa la miniatura pequeña si no hay mediana', () => {
    expect(mapVideo({ id: 'x', snippet: { thumbnails: { default: { url: 'https://d' } } } })!.thumbnailUrl).toBe('https://d')
  })

  it('un elemento sin id se descarta', () => {
    expect(mapVideo({ snippet: { title: 'sin id' } })).toBeNull()
  })
})

describe('sortNewestFirst', () => {
  const v = (id: string, publishedAt: string | null): VideoDto => ({ id, title: id, thumbnailUrl: null, publishedAt, durationSeconds: null, viewCount: null, likeCount: null, commentCount: null })

  it('ordena del más reciente al más antiguo y deja sin fecha al final', () => {
    const out = sortNewestFirst([v('a', '2026-01-01T00:00:00Z'), v('b', null), v('c', '2026-03-01T00:00:00Z')])
    expect(out.map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })

  it('no modifica la lista original', () => {
    const input = [v('a', '2026-01-01T00:00:00Z'), v('c', '2026-03-01T00:00:00Z')]
    sortNewestFirst(input)
    expect(input.map((x) => x.id)).toEqual(['a', 'c'])
  })
})

describe('isValidPageToken', () => {
  it.each(['CAoQAA', 'EAAaBlBUOkNBbw', 'a_b-c'])('acepta %s', (t) => expect(isValidPageToken(t)).toBe(true))
  it.each([undefined, null, '', 123, 'con espacios', 'a&b=c', 'a/../b', '<script>', 'x'.repeat(201)])('rechaza %j', (t) => expect(isValidPageToken(t)).toBe(false))
})
