import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeMetrics, endOfDueDay, monthRange, sinceForRange, type MCollab, type MEvent, type MPost, type MetricsInput } from '../../server/utils/collab-metrics'

const NOW = new Date('2026-11-15T12:00:00Z')
const CREATOR = 'p-creator'
const PARTNER = 'p-partner'
const collab = (id: string, status: string, createdAt: string, extra: Partial<MCollab> = {}): MCollab => ({
  id, status, createdAt, budgetCents: null, initiatedBy: 'partner', creatorProfileId: CREATOR, partnerProfileId: PARTNER, terminatedBy: null, categories: [], ...extra
})
const ev = (collaborationId: string, kind: string, createdAt: string, extra: Partial<MEvent> = {}): MEvent => ({
  collaborationId, kind, createdAt, postId: null, actorProfileId: null, approximate: false, ...extra
})
const post = (id: string, collaborationId: string, dueDate: string | null, status = 'in_production', publishedAt: string | null = null): MPost => ({ id, collaborationId, dueDate, status, publishedAt })

const data: MetricsInput = {
  collabs: [
    collab('done', 'completed', '2026-09-01T10:00:00Z', { budgetCents: 30000, categories: ['Belleza', 'Moda'] }),
    collab('cancel', 'cancelled', '2026-09-10T10:00:00Z', { budgetCents: 10000, categories: ['Belleza'] }),
    collab('breach', 'terminated', '2026-10-01T10:00:00Z', { budgetCents: 20000, terminatedBy: PARTNER }),
    collab('open', 'in_progress', '2026-10-05T10:00:00Z', { initiatedBy: 'creator' }),
    collab('no', 'declined', '2026-10-06T10:00:00Z', { budgetCents: 99900 }),
    collab('wait', 'requested', '2026-11-01T10:00:00Z')
  ],
  events: [
    ev('done', 'accepted', '2026-09-01T14:00:00Z', { actorProfileId: CREATOR }), // creador responde en 4 h
    ev('cancel', 'counteroffer', '2026-09-10T12:00:00Z', { actorProfileId: CREATOR }), // 2 h
    ev('cancel', 'accepted', '2026-09-11T10:00:00Z', { actorProfileId: PARTNER }), // aceptada a las 24 h
    ev('breach', 'accepted', '2026-10-20T10:00:00Z', { approximate: true }), // reconstruido: no cuenta para tiempos
    ev('open', 'accepted', '2026-10-05T16:00:00Z', { actorProfileId: PARTNER }), // la marca responde en 6 h
    ev('no', 'declined', '2026-10-07T10:00:00Z', { actorProfileId: CREATOR }), // 24 h
    ev('done', 'deliverable_sent', '2026-09-10T20:00:00Z', { postId: 'p1' }), // vence el 10: a tiempo
    ev('done', 'changes_requested', '2026-09-11T09:00:00Z', { postId: 'p1' }),
    ev('done', 'deliverable_sent', '2026-09-12T09:00:00Z', { postId: 'p1' }),
    ev('done', 'changes_requested', '2026-09-12T10:00:00Z', { postId: 'p1' }),
    ev('done', 'deliverable_sent', '2026-09-20T09:00:00Z', { postId: 'p2' }) // vencía el 15: tarde
  ],
  posts: [
    post('p1', 'done', '2026-09-10T00:00:00Z'),
    post('p2', 'done', '2026-09-15T00:00:00Z'),
    post('p3', 'open', '2026-11-01T00:00:00Z'), // vencida y sin enviar: tarde
    post('p4', 'open', '2026-12-01T00:00:00Z'), // aún no vence
    post('p5', 'open', null), // sin fecha
    post('p6', 'cancel', '2026-09-20T00:00:00Z'), // la colaboración se canceló: no es un retraso
    post('p7', 'done', '2026-09-05T00:00:00Z', 'published'), // entregada sin registro de cuándo
    post('p8', 'no', '2026-10-10T00:00:00Z') // colaboración nunca aceptada: fuera
  ],
  ratings: [{ rateeProfileId: CREATOR, stars: 5 }, { rateeProfileId: CREATOR, stars: 4 }, { rateeProfileId: PARTNER, stars: 2 }]
}

describe('métricas propias: recuentos y éxito', () => {
  const m = computeMetrics(data, { now: NOW, perspective: { role: 'creator', profileId: CREATOR } })

  it('cuenta iniciadas, aceptadas, completadas, canceladas, terminadas, rechazadas y pendientes', () => {
    expect(m.totals).toEqual({ started: 6, accepted: 4, completed: 1, cancelled: 1, terminated: 1, declined: 1, pending: 1, open: 1 })
  })
  it('el éxito es completadas entre cerradas; cancelar o terminar por incumplimiento nunca suma', () => {
    expect(m.successRate).toEqual({ value: 1 / 3, n: 3 })
    const soloMalas = computeMetrics({ ...data, collabs: data.collabs.filter((c) => c.status === 'cancelled' || c.status === 'terminated') }, { now: NOW })
    expect(soloMalas.totals.completed).toBe(0)
    expect(soloMalas.successRate).toEqual({ value: 0, n: 2 })
  })
  it('sin colaboraciones cerradas no hay porcentaje (no se inventa un 0 % ni un 100 %)', () => {
    const abiertas = computeMetrics({ ...data, collabs: data.collabs.filter((c) => c.status === 'in_progress' || c.status === 'requested') }, { now: NOW })
    expect(abiertas.successRate).toBeNull()
  })
  it('distingue quién declaró el incumplimiento', () => {
    expect(m.terminatedAgainstMe).toBe(1)
    expect(m.terminatedByMe).toBe(0)
    const marca = computeMetrics(data, { now: NOW, perspective: { role: 'partner', profileId: PARTNER } })
    expect(marca.terminatedByMe).toBe(1)
    expect(marca.terminatedAgainstMe).toBe(0)
  })
})

describe('métricas propias: plazos, tiempos y revisiones', () => {
  const m = computeMetrics(data, { now: NOW, perspective: { role: 'creator', profileId: CREATOR } })

  it('a tiempo: solo entregas con fecha, entregadas o vencidas; el resto se aparta y se cuenta', () => {
    expect(m.onTime).toEqual({ rate: { value: 1 / 3, n: 3 }, onTime: 1, late: 2, noDueDate: 1, notDueYet: 1, unknown: 2 })
  })
  it('entregar el mismo día de la fecha cuenta como a tiempo', () => {
    expect(new Date('2026-09-10T20:00:00Z').getTime()).toBeLessThanOrEqual(endOfDueDay('2026-09-10T00:00:00Z'))
    expect(new Date('2026-09-11T00:00:01Z').getTime()).toBeGreaterThan(endOfDueDay('2026-09-10T00:00:00Z'))
  })
  it('tiempo de respuesta: de quien recibe la solicitud, con eventos de fecha exacta', () => {
    // Creador responde a done (4 h), cancel (2 h) y no (24 h); breach solo tiene un evento reconstruido.
    expect(m.responseHours.mine).toEqual({ value: 10, n: 3 })
    expect(m.responseHours.counterpart).toEqual({ value: 6, n: 1 })
    const global = computeMetrics(data, { now: NOW })
    expect(global.responseHours.creators).toEqual({ value: 10, n: 3 })
    expect(global.responseHours.partners).toEqual({ value: 6, n: 1 })
    expect(global.responseHours.mine).toBeNull()
  })
  it('de la propuesta a la aceptación, sin eventos reconstruidos', () => {
    expect(m.hoursToAccept).toEqual({ value: (4 + 24 + 6) / 3, n: 3 })
  })
  it('revisiones por entregable: peticiones de cambios entre entregas enviadas', () => {
    expect(m.revisionsPerDeliverable).toEqual({ value: 1, n: 2 }) // p1: 2, p2: 0
  })
  it('valoración recibida y presupuesto medio de las aceptadas con importe', () => {
    expect(m.rating).toEqual({ value: 4.5, n: 2 })
    expect(m.avgBudgetCents).toEqual({ value: 20000, n: 3 }) // la rechazada (999 €) no cuenta
    expect(computeMetrics(data, { now: NOW }).rating).toEqual({ value: 11 / 3, n: 3 })
  })
})

describe('métricas propias: periodo y reparto', () => {
  it('reparte por mes de creación y por categoría', () => {
    const m = computeMetrics(data, { now: NOW })
    expect(m.byMonth.map((r) => r.month)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(m.byMonth[0]).toEqual({ month: '2026-09', started: 2, accepted: 2, completed: 1, cancelled: 1, terminated: 0 })
    expect(m.byMonth[1]).toEqual({ month: '2026-10', started: 3, accepted: 2, completed: 0, cancelled: 0, terminated: 1 })
    expect(m.byCategory).toEqual([{ category: 'Belleza', count: 2 }, { category: 'Moda', count: 1 }])
  })
  it('el periodo filtra por fecha de creación y rellena meses vacíos', () => {
    const since = sinceForRange('3m', NOW)
    expect(since?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    const m = computeMetrics(data, { now: NOW, since: new Date('2026-10-01T00:00:00Z') })
    expect(m.totals.started).toBe(4)
    expect(m.totals.completed).toBe(0)
    expect(sinceForRange('all', NOW)).toBeNull()
    expect(sinceForRange('lo-que-sea', NOW)).toBeNull()
    expect(monthRange(new Date('2025-11-20T00:00:00Z'), new Date('2026-02-01T00:00:00Z'))).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
  it('sin datos devuelve nulos, no ceros', () => {
    const m = computeMetrics({ collabs: [], events: [], posts: [], ratings: [] }, { now: NOW })
    expect([m.successRate, m.onTime.rate, m.hoursToAccept, m.revisionsPerDeliverable, m.rating, m.avgBudgetCents, m.responseHours.creators]).toEqual([null, null, null, null, null, null, null])
    expect(m.byMonth).toEqual([])
  })
})

describe('métricas propias: permisos', () => {
  const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8')
  it('las del usuario se leen con SU sesión (RLS), nunca con la clave de servicio ni con ids de la petición', () => {
    const src = read('server/api/analytics/me.get.ts')
    expect(src).toContain('await serverSupabaseClient(event)')
    expect(src).not.toMatch(/serverSupabaseServiceRole|readBody|getRouterParam|query\.(id|profile|creator|partner)/)
    expect(src.indexOf('serverSupabaseUser(event)')).toBeLessThan(src.indexOf('serverSupabaseClient(event)'))
    expect(src).toContain(".eq('profile_id', user.sub)")
    expect(src).toContain(".eq('ratee_profile_id', user.sub)")
  })
  it('la vista general exige sesión de admin antes de leer nada', () => {
    const src = read('server/api/admin/platform-metrics.get.ts')
    expect(src.indexOf('await requireAdmin(event)')).toBeGreaterThan(-1)
    expect(src.indexOf('await requireAdmin(event)')).toBeLessThan(src.indexOf('serverSupabaseServiceRole(event)'))
  })
  it('no depende de redes sociales ni de servicios externos', () => {
    const src = read('server/utils/collab-metrics.ts')
    expect(src).not.toMatch(/social_accounts|metrics'|youtube|instagram|\$fetch|openrouter/i)
  })
})
