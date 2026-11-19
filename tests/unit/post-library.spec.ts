import { describe, expect, it } from 'vitest'
import { emptyFilters, filterPosts, hasActiveFilters, isDueThisWeek, isOldPublished, projectStats, publishedThisWeek, quickCounts, sortPosts, OWN_PROJECT } from '../../app/utils/post-library'
import type { Post } from '../../app/types'

let n = 0
const post = (over: Partial<Post> = {}): Post => ({
  id: `p${++n}`, creatorId: 'c', collaborationId: null, title: 'Reel lanzamiento', caption: '', contentType: 'reel', platform: 'instagram', status: 'idea',
  dueInDays: 3, dueDate: '2026-11-05', hashtags: [], cover: { from: 'a', to: 'b', angle: 1 }, labelIds: [], checklist: { total: 0, done: 0 },
  createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-02T10:00:00Z', ...over
})

describe('filterPosts', () => {
  const a = post({ title: 'Reel verano', collaborationId: 'k1', platform: 'youtube', status: 'in_production' })
  const b = post({ title: 'Story rutina', collaborationId: null, status: 'published' })
  const c = post({ title: 'Reel otoño', collaborationId: 'k2', status: 'ready_for_review' })
  const all = [a, b, c]

  it('sin filtros devuelve todo', () => {
    expect(filterPosts(all, emptyFilters())).toHaveLength(3)
    expect(hasActiveFilters(emptyFilters())).toBe(false)
  })
  it('busca por título sin distinguir mayúsculas ni espacios', () => {
    expect(filterPosts(all, { ...emptyFilters(), search: '  REEL ' }).map((p) => p.id)).toEqual([a.id, c.id])
  })
  it('filtra por estado, red y proyecto', () => {
    expect(filterPosts(all, { ...emptyFilters(), status: 'published' })).toEqual([b])
    expect(filterPosts(all, { ...emptyFilters(), platform: 'youtube' })).toEqual([a])
    expect(filterPosts(all, { ...emptyFilters(), project: 'k2' })).toEqual([c])
  })
  it('"Contenido propio" son solo las que no tienen colaboración', () => {
    expect(filterPosts(all, { ...emptyFilters(), project: OWN_PROJECT })).toEqual([b])
  })
  it('el tablero ignora el estado (las columnas ya son los estados)', () => {
    const f = { ...emptyFilters(), status: 'published' as const }
    expect(filterPosts(all, f, { ignoreStatus: true })).toHaveLength(3)
    expect(hasActiveFilters(f, { ignoreStatus: true })).toBe(false)
  })
  it('tablero y lista con los mismos filtros enseñan lo mismo', () => {
    const f = { ...emptyFilters(), project: 'k1', platform: 'youtube' as const }
    expect(filterPosts(all, f, { ignoreStatus: true })).toEqual(filterPosts(all, f))
  })
})

describe('sortPosts', () => {
  const x = post({ dueDate: '2026-11-10', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z' })
  const y = post({ dueDate: '2026-11-01', createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z' })
  const z = post({ dueDate: '2026-11-20', createdAt: undefined, updatedAt: undefined })
  it('por entrega', () => {
    expect(sortPosts([x, y, z], 'due_asc')).toEqual([y, x, z])
    expect(sortPosts([x, y, z], 'due_desc')).toEqual([z, x, y])
  })
  it('por creación y modificación; sin fecha va al final y no rompe', () => {
    expect(sortPosts([z, x, y], 'created_desc')).toEqual([y, x, z])
    expect(sortPosts([z, y, x], 'updated_desc')).toEqual([x, y, z])
  })
  it('no modifica el array original', () => {
    const src = [x, y]
    sortPosts(src, 'due_asc')
    expect(src).toEqual([x, y])
  })
})

describe('projectStats', () => {
  it('cuenta atrasadas, en revisión y publicadas; una publicada atrasada no cuenta como atrasada', () => {
    const s = projectStats([post({ dueInDays: -2 }), post({ dueInDays: -2, status: 'published' }), post({ status: 'ready_for_review' }), post()])
    expect(s).toEqual({ total: 4, overdue: 1, inReview: 1, published: 1 })
  })
})

describe('publishedThisWeek (objetivo semanal, lunes a domingo)', () => {
  // Miércoles 4 nov 2026, hora local: la semana va del lunes 2 al domingo 8.
  const now = new Date(2026, 10, 4, 12, 0, 0)
  const at = (d: number, h = 10) => new Date(2026, 10, d, h, 0, 0).toISOString()
  it('cuenta las publicadas desde el lunes, no todo el historial', () => {
    const monday = post({ status: 'published', publishedAt: at(2, 9), dueDate: '2026-11-02' })
    const wednesday = post({ status: 'published', publishedAt: at(4, 8), dueDate: '2026-11-04' })
    const old = post({ status: 'published', publishedAt: new Date(2026, 8, 1).toISOString(), dueDate: '2026-09-01' })
    expect(publishedThisWeek([monday, wednesday, old], now)).toBe(2)
  })
  it('el domingo anterior ya es de la semana pasada', () => {
    const sunday = post({ status: 'published', publishedAt: at(1, 23), dueDate: '2026-11-01' })
    expect(publishedThisWeek([sunday], now)).toBe(0)
  })
  it('no cuenta las que no están publicadas', () => {
    expect(publishedThisWeek([post({ status: 'in_production', publishedAt: at(3) })], now)).toBe(0)
  })
  it('sin fecha de publicación (publicadas antes de existir el campo) usa la fecha de entrega: las antiguas no cuentan', () => {
    const legacyOld = post({ status: 'published', publishedAt: null, dueDate: '2026-08-10' })
    const legacyThisWeek = post({ status: 'published', publishedAt: null, dueDate: '2026-11-03' })
    expect(publishedThisWeek([legacyOld, legacyThisWeek], now)).toBe(1)
  })
  it('un domingo cuenta como último día de su semana, y el lunes siguiente empieza otra', () => {
    const sunday = new Date(2026, 10, 8, 20, 0, 0)
    const p = post({ status: 'published', publishedAt: at(8, 18), dueDate: '2026-11-08' })
    expect(publishedThisWeek([p], sunday)).toBe(1)
    expect(publishedThisWeek([p], new Date(2026, 10, 9, 9, 0, 0))).toBe(0)
  })
  it('sin ninguna publicada devuelve 0', () => {
    expect(publishedThisWeek([], now)).toBe(0)
  })
})

describe('atajos, etiquetas y búsqueda ampliada', () => {
  // Miércoles 11 nov 2026: la semana va del lunes 9 al domingo 15.
  const now = new Date(2026, 10, 11, 10, 0, 0)
  const late = post({ title: 'Tarde', dueDate: '2026-11-03', dueInDays: -8, status: 'in_production', labelIds: ['l1'] })
  const thisWeek = post({ title: 'Esta semana', dueDate: '2026-11-14', dueInDays: 3, status: 'idea', labelIds: ['l1', 'l2'] })
  const mondayEdge = post({ title: 'Lunes', dueDate: '2026-11-09', dueInDays: -2, status: 'scheduled' })
  const nextWeek = post({ title: 'Próxima', dueDate: '2026-11-16', dueInDays: 5, status: 'idea' })
  const done = post({ title: 'Hecha', dueDate: '2026-11-12', dueInDays: 1, status: 'published' })
  const all = [late, thisWeek, mondayEdge, nextWeek, done]

  it('«Atrasadas» no incluye las publicadas', () => {
    expect(filterPosts(all, { ...emptyFilters(), quick: 'overdue' }).map((p) => p.title)).toEqual(['Tarde', 'Lunes'])
  })
  it('«Esta semana» va de lunes a domingo y deja fuera las publicadas', () => {
    expect(filterPosts(all, { ...emptyFilters(), quick: 'week' }, { now }).map((p) => p.title)).toEqual(['Esta semana', 'Lunes'])
    expect(isDueThisWeek(nextWeek, now)).toBe(false)
    expect(isDueThisWeek(done, now)).toBe(false)
  })
  it('el domingo todavía es «esta semana» y el lunes siguiente ya no', () => {
    const sunday = post({ dueDate: '2026-11-15', status: 'idea' })
    const monday = post({ dueDate: '2026-11-16', status: 'idea' })
    expect(isDueThisWeek(sunday, now)).toBe(true)
    expect(isDueThisWeek(monday, now)).toBe(false)
  })
  it('filtra por etiqueta', () => {
    expect(filterPosts(all, { ...emptyFilters(), label: 'l2' }).map((p) => p.title)).toEqual(['Esta semana'])
    expect(filterPosts(all, { ...emptyFilters(), label: 'l1' })).toHaveLength(2)
  })
  it('los atajos y la etiqueta cuentan como filtro activo', () => {
    expect(hasActiveFilters({ ...emptyFilters(), quick: 'overdue' })).toBe(true)
    expect(hasActiveFilters({ ...emptyFilters(), label: 'l1' })).toBe(true)
  })
  it('la búsqueda mira también el texto y los hashtags', () => {
    const withText = post({ title: 'Sin pista', caption: 'Rutina de noche con retinol', hashtags: ['#skincare'] })
    expect(filterPosts([withText], { ...emptyFilters(), search: 'retinol' })).toEqual([withText])
    expect(filterPosts([withText], { ...emptyFilters(), search: '#skincare' })).toEqual([withText])
    expect(filterPosts([withText], { ...emptyFilters(), search: 'no existe' })).toEqual([])
  })
  it('quickCounts cuenta lo que dejan pasar el resto de filtros', () => {
    expect(quickCounts(all, emptyFilters(), { now })).toEqual({ overdue: 2, week: 2 })
    expect(quickCounts(all, { ...emptyFilters(), label: 'l1' }, { now })).toEqual({ overdue: 1, week: 1 })
    // el atajo activo no cambia su propio número
    expect(quickCounts(all, { ...emptyFilters(), quick: 'overdue' }, { now })).toEqual({ overdue: 2, week: 2 })
  })
})

describe('isOldPublished', () => {
  const now = new Date('2026-11-12T12:00:00Z')
  it('solo las publicadas de hace más de 30 días', () => {
    expect(isOldPublished(post({ status: 'published', publishedAt: '2026-10-01T10:00:00Z' }), now)).toBe(true)
    expect(isOldPublished(post({ status: 'published', publishedAt: '2026-11-01T10:00:00Z' }), now)).toBe(false)
    expect(isOldPublished(post({ status: 'in_production', dueDate: '2026-01-01' }), now)).toBe(false)
  })
  it('sin fecha de publicación usa la de entrega', () => {
    expect(isOldPublished(post({ status: 'published', publishedAt: null, dueDate: '2026-08-01' }), now)).toBe(true)
    expect(isOldPublished(post({ status: 'published', publishedAt: null, dueDate: '2026-11-05' }), now)).toBe(false)
  })
})
