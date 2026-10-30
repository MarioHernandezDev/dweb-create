import { describe, expect, it } from 'vitest'
import { matchInstagramMedia, parseInstagramShortcode, parseYoutubeVideoId } from '../../server/utils/external-link'

const ID = 'dQw4w9WgXcQ'

describe('parseYoutubeVideoId', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube.com/live/${ID}`],
    [`www.youtube.com/watch?v=${ID}`],
    [`  ${ID}  `],
    [ID]
  ])('%s -> id', (input) => {
    expect(parseYoutubeVideoId(input)).toBe(ID)
  })

  it.each([
    'https://evil.com/watch?v=' + ID,
    'https://youtube.com.evil.com/watch?v=' + ID,
    'https://notyoutube.com/watch?v=' + ID,
    'https://www.youtube.com/watch?v=corto',
    'https://www.youtube.com/watch?v=' + ID + 'EXTRA',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/channel/UC1234567890123456789012',
    'javascript:alert(1)',
    'ftp://youtube.com/watch?v=' + ID,
    'no es un enlace',
    '',
    '   ',
    'x'.repeat(600)
  ])('%j -> null', (input) => {
    expect(parseYoutubeVideoId(input)).toBeNull()
  })
})

describe('parseInstagramShortcode', () => {
  it.each([
    ['https://www.instagram.com/p/Cabc123_-XY/', 'Cabc123_-XY'],
    ['https://instagram.com/reel/Cabc123_-XY', 'Cabc123_-XY'],
    ['https://www.instagram.com/reels/Cabc123_-XY/?igsh=zzz', 'Cabc123_-XY'],
    ['https://www.instagram.com/tv/Cabc123_-XY/', 'Cabc123_-XY'],
    ['https://www.instagram.com/mi_usuario/p/Cabc123_-XY/', 'Cabc123_-XY']
  ])('%s -> %s', (input, out) => {
    expect(parseInstagramShortcode(input)).toBe(out)
  })

  it.each([
    'https://evil.com/p/Cabc123_-XY/',
    'https://instagram.com.evil.com/p/Cabc123_-XY/',
    'https://www.instagram.com/mi_usuario/',
    'https://www.instagram.com/p/',
    'https://www.instagram.com/p/ab/',
    'https://www.instagram.com/p/<script>/',
    '',
    'hola'
  ])('%j -> null', (input) => {
    expect(parseInstagramShortcode(input)).toBeNull()
  })
})

describe('matchInstagramMedia', () => {
  const items = [
    { id: '111', permalink: 'https://www.instagram.com/p/AAAAAAA/' },
    { id: '222', permalink: 'https://www.instagram.com/reel/Cabc123_-XY/' },
    { id: '333' },
    { permalink: 'https://www.instagram.com/p/ZZZZZZZ/' }
  ]
  it('encuentra la publicación de la cuenta por su código corto', () => {
    expect(matchInstagramMedia(items, 'Cabc123_-XY')).toEqual({ id: '222', permalink: 'https://www.instagram.com/reel/Cabc123_-XY/' })
  })
  it('una publicación que no es de la cuenta no se encuentra', () => {
    expect(matchInstagramMedia(items, 'OtraCosa99')).toBeNull()
  })
  it('ignora elementos incompletos y no confunde códigos parecidos', () => {
    expect(matchInstagramMedia(items, 'ZZZZZZZ')).toBeNull()
    expect(matchInstagramMedia(items, 'AAAAAA')).toBeNull()
    expect(matchInstagramMedia([], 'AAAAAAA')).toBeNull()
  })
})
