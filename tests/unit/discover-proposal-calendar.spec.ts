import { describe, expect, it } from 'vitest'
import { hasFicha, matchesClientFilters, responseLabel, sortResults } from '../../app/utils/discover-view'
import { buildDeliverablesSummary } from '../../app/utils/proposal'
import { monthGrid, postsByDay, weekDays, weekRangeLabel } from '../../app/utils/post-calendar'
import { platformFeeCents, MARKETPLACE_FEE_RATE } from '../../app/utils/fees'
import type { DiscoveryResult } from '../../app/composables/useDiscover'
import type { Post } from '../../app/types'

const r = (o: Partial<DiscoveryResult>): DiscoveryResult => ({
  id: 'x', name: 'X', bio: null, categories: [], lookingFor: null, minCents: null, maxCents: null, followers: 0,
  coverUrl: null, score: 50, reason: null, profileId: 'p', collabCount: 0, responseHours: null, platforms: [],
  verified: false, collaborationTypes: [], ...o
})

describe('Descubrir: filtros y orden en el cliente', () => {
  it('filtra por red (basta con una) y por tiempo de respuesta', () => {
    const a = r({ id: 'a', platforms: ['instagram'], responseHours: 1.5 })
    const b = r({ id: 'b', platforms: ['youtube'], responseHours: 20 })
    const c = r({ id: 'c', platforms: ['instagram', 'tiktok'], responseHours: null })
    expect([a, b, c].filter((x) => matchesClientFilters(x, { platforms: ['instagram'], response: 'any' })).map((x) => x.id)).toEqual(['a', 'c'])
    expect([a, b, c].filter((x) => matchesClientFilters(x, { platforms: [], response: '24' })).map((x) => x.id)).toEqual(['a', 'b'])
    expect([a, b, c].filter((x) => matchesClientFilters(x, { platforms: [], response: '2' })).map((x) => x.id)).toEqual(['a'])
  })

  it('filtra por marcas verificadas y por tipo de colaboración', () => {
    const a = r({ id: 'a', verified: true, collaborationTypes: ['post', 'reel'] })
    const b = r({ id: 'b', verified: false, collaborationTypes: ['stories'] })
    const c = r({ id: 'c', verified: true, collaborationTypes: [] })
    const f = (x: Partial<Parameters<typeof matchesClientFilters>[1]>) => [a, b, c].filter((y) => matchesClientFilters(y, { platforms: [], response: 'any', ...x })).map((y) => y.id)
    expect(f({ verifiedOnly: true })).toEqual(['a', 'c'])
    expect(f({ types: ['reel', 'stories'] })).toEqual(['a', 'b'])
    expect(f({ types: ['reel'], verifiedOnly: true })).toEqual(['a'])
  })

  it('los que no tienen el dato van al final al ordenar por respuesta o presupuesto', () => {
    const a = r({ id: 'a', responseHours: 5, minCents: 20000 })
    const b = r({ id: 'b', responseHours: null, minCents: null })
    const c = r({ id: 'c', responseHours: 1, minCents: 50000, maxCents: 90000 })
    expect(sortResults([b, a, c], 'response').map((x) => x.id)).toEqual(['c', 'a', 'b'])
    expect(sortResults([b, a, c], 'budget_asc').map((x) => x.id)).toEqual(['a', 'c', 'b'])
    expect(sortResults([b, a, c], 'budget_desc').map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })

  it('formatea el tiempo de respuesta', () => {
    expect(responseLabel(null)).toBeNull()
    expect(responseLabel(0.4)).toBe('~1 h')
    expect(responseLabel(2.2)).toBe('~2 h')
    expect(responseLabel(24)).toBe('~1 día')
    expect(responseLabel(60)).toBe('~3 días')
  })
})

describe('Proponer', () => {
  it('resume los entregables solo con lo que tiene cantidad', () => {
    expect(buildDeliverablesSummary({ reels: 1, posts: 0, stories: 0 })).toBe('1 reel/vídeo')
    expect(buildDeliverablesSummary({ reels: 1, posts: 1, stories: 3 })).toBe('1 reel/vídeo, 1 post y 3 stories')
    expect(buildDeliverablesSummary({ reels: 0, posts: 2, stories: 1 })).toBe('2 posts y 1 story')
    expect(buildDeliverablesSummary({ reels: 0, posts: 0, stories: 0 })).toBe('')
  })

  it('la comisión es la misma que usa Stripe', () => {
    expect(platformFeeCents(35000)).toBe(Math.round(35000 * MARKETPLACE_FEE_RATE))
  })
})

describe('Calendario y resumen semanal', () => {
  it('la semana va de lunes a domingo y marca hoy', () => {
    const days = weekDays(new Date(2026, 10, 5)) // jueves 5 nov 2026
    expect(days.map((d) => d.day)).toEqual([2, 3, 4, 5, 6, 7, 8])
    expect(days.find((d) => d.isToday)?.day).toBe(5)
    expect(weekRangeLabel(days)).toBe('2 - 8 nov')
  })

  it('el mes se pinta en semanas completas', () => {
    const grid = monthGrid(2026, 10, new Date(2026, 10, 5))
    expect(grid.length % 7).toBe(0)
    expect(grid[0]!.date.getDay()).toBe(1)
    expect(grid.filter((d) => d.inMonth)).toHaveLength(30)
  })

  it('agrupa las publicaciones por día', () => {
    const posts = [{ id: '1', dueDate: '2026-11-05' }, { id: '2', dueDate: '2026-11-05' }, { id: '3', dueDate: '2026-11-06' }] as Post[]
    const map = postsByDay(posts)
    expect(map.get('2026-11-05')).toHaveLength(2)
    expect(map.get('2026-11-06')).toHaveLength(1)
  })
})

import { fitSummary } from '../../app/utils/discover-view'
describe('fitSummary', () => {
  const r = { categories: ['Moda', 'Belleza'], platforms: ['instagram'] } as never
  it('lista las coincidencias reales', () => {
    expect(fitSummary(r, { categories: ['moda', 'gaming'], platforms: ['instagram', 'tiktok'] })).toMatch(/^Encaja en moda, /)
  })
  it('sin coincidencias o sin filtros no inventa motivo', () => {
    expect(fitSummary(r, { categories: [], platforms: [] })).toBeNull()
    expect(fitSummary(r, { categories: ['gaming'], platforms: [] })).toBeNull()
  })
})

describe('orden por paquete en Descubrir', () => {
  const mk = (id: string, score: number) => ({ id, score, collabCount: 0, responseHours: null, minCents: null, maxCents: null }) as unknown as DiscoveryResult
  const list = [mk('a', 10), mk('b', 90), mk('c', 50), mk('d', 70)]
  const min: Record<string, number | null> = { a: 300, b: null, c: 100, d: 300 }
  const pkgMinCents = (r: DiscoveryResult) => min[r.id] ?? null
  it('de más barato a más caro, sin paquetes al final y empates por afinidad', () => {
    expect(sortResults(list, 'pkg_asc', { pkgMinCents }).map((r) => r.id)).toEqual(['c', 'd', 'a', 'b'])
  })
  it('de más caro a más barato, sin paquetes al final', () => {
    expect(sortResults(list, 'pkg_desc', { pkgMinCents }).map((r) => r.id)).toEqual(['d', 'a', 'c', 'b'])
  })
})

describe('Descubrir: perfiles sin ficha', () => {
  const con = (id: string, o: Partial<DiscoveryResult> = {}) => r({ id, bio: 'Hola', ...o })
  it('van detrás de los que tienen ficha, sea cual sea el orden', () => {
    const list = [r({ id: 'vacio', score: 99 }), con('a', { score: 10 }), con('b', { score: 20 })]
    expect(sortResults(list, 'affinity').map((x) => x.id)).toEqual(['b', 'a', 'vacio'])
    expect(sortResults(list, 'collabs').map((x) => x.id)).toEqual(['b', 'a', 'vacio'])
  })
  it('las categorías también cuentan como ficha', () => {
    expect(hasFicha(r({ categories: ['moda'] }))).toBe(true)
    expect(hasFicha(r({ bio: '   ' }))).toBe(false)
  })
})
