import { describe, expect, it } from 'vitest'
import { collaborationWork, deliverableState, hasRated, type WorkCollab, type WorkEvent, type WorkPost } from '../../app/utils/collaboration-work'

const empty = { scopeNotes: null, revisionsIncluded: null, exclusivity: false, usageRights: null, campaignGoal: null, targetAudience: null, tone: null }
const collab = (over: Partial<WorkCollab> = {}): WorkCollab => ({
  id: 'c1', status: 'accepted', initiatedBy: 'partner', counterpartName: 'Lía', ...empty, campaignGoal: 'Lanzar', ...over
})
const post = (over: Partial<WorkPost> = {}): WorkPost => ({ id: 'p1', collaborationId: 'c1', title: 'Reel', status: 'in_production', dueInDays: 3, ...over })
const ev = (kind: string, over: Partial<WorkEvent> = {}): WorkEvent => ({ collaborationId: 'c1', kind, postId: 'p1', actorProfileId: null, detail: {}, createdAt: '2026-11-04T10:00:00Z', ...over })
const kinds = (r: ReturnType<typeof collaborationWork>) => r.tasks.map((t) => t.kind)

describe('deliverableState', () => {
  it('distingue en revisión, cambios pedidos, aprobada y pendiente', () => {
    expect(deliverableState(post({ status: 'ready_for_review' }), [])).toBe('in_review')
    expect(deliverableState(post({ status: 'scheduled' }), [])).toBe('approved')
    expect(deliverableState(post({ status: 'published' }), [])).toBe('approved')
    expect(deliverableState(post(), [])).toBe('pending')
    expect(deliverableState(post(), [ev('deliverable_sent'), ev('changes_requested')])).toBe('changes')
    // si después de pedir cambios se vuelve a enviar y luego vuelve a producción por otro motivo, sigue contando el último evento relevante
    expect(deliverableState(post(), [ev('changes_requested'), ev('deliverable_sent')])).toBe('pending')
  })
})

describe('collaborationWork · partner', () => {
  it('solicitud del creador: me toca responder', () => {
    const r = collaborationWork('partner', collab({ status: 'requested', initiatedBy: 'creator' }), [], [], 'me')
    expect(kinds(r)).toEqual(['respond_request'])
  })
  it('solicitud propia: solo espera', () => {
    const r = collaborationWork('partner', collab({ status: 'requested', initiatedBy: 'partner' }), [], [], 'me')
    expect(r.tasks).toEqual([])
    expect(r.waiting?.text).toContain('Lía')
  })
  it('entrega en revisión: revisar, y antes que completar el brief', () => {
    const r = collaborationWork('partner', collab({ campaignGoal: null }), [post({ status: 'ready_for_review' })], [], 'me')
    expect(kinds(r)).toEqual(['review_deliverable', 'complete_brief'])
    expect(r.tasks[0]!.to).toContain('post=p1')
  })
  it('sin publicaciones espera al creador; con todas aprobadas propone cerrar', () => {
    expect(collaborationWork('partner', collab(), [], [], 'me').waiting?.text).toContain('ninguna publicación')
    const r = collaborationWork('partner', collab(), [post({ status: 'scheduled' })], [], 'me')
    expect(kinds(r)).toEqual(['close_collaboration'])
  })
  it('no genera tareas de creador (enviar, corregir)', () => {
    const r = collaborationWork('partner', collab(), [post()], [], 'me')
    expect(kinds(r)).toEqual([])
    expect(r.waiting?.text).toContain('1 entrega')
  })
})

describe('collaborationWork · creator', () => {
  it('cambios pedidos: corregir, con el comentario del partner', () => {
    const r = collaborationWork('creator', collab(), [post()], [ev('changes_requested', { detail: { comment: 'Cambia el primer plano' } })], 'me')
    expect(kinds(r)).toEqual(['fix_changes'])
    expect(r.tasks[0]!.detail).toContain('Cambia el primer plano')
    expect(r.tasks[0]!.to).toBe('/creator/post/p1')
  })
  it('una pieza atrasada va antes que una con margen', () => {
    const r = collaborationWork('creator', collab(), [post({ id: 'a', dueInDays: 5 }), post({ id: 'b', dueInDays: -2 })], [], 'me')
    expect(r.tasks.map((t) => t.postId)).toEqual(['b', 'a'])
  })
  it('en revisión: espera; sin publicaciones: crear la primera', () => {
    expect(collaborationWork('creator', collab(), [post({ status: 'ready_for_review' })], [], 'me').waiting?.text).toContain('revisando')
    expect(kinds(collaborationWork('creator', collab(), [], [], 'me'))).toEqual(['start_deliverable'])
  })
  it('ignora publicaciones de otras colaboraciones', () => {
    const r = collaborationWork('creator', collab(), [post({ collaborationId: 'otra' })], [], 'me')
    expect(kinds(r)).toEqual(['start_deliverable'])
  })
})

describe('valoración', () => {
  it('completada y sin valorar → valorar; ya valorada → nada', () => {
    const c = collab({ status: 'completed' })
    expect(kinds(collaborationWork('creator', c, [], [], 'me'))).toEqual(['rate'])
    const rated = [ev('rated', { actorProfileId: 'me', postId: null })]
    expect(hasRated(rated, 'me')).toBe(true)
    expect(hasRated(rated, 'otro')).toBe(false)
    expect(kinds(collaborationWork('creator', c, [], rated, 'me'))).toEqual([])
  })
  it('rechazada: sin tareas', () => {
    expect(collaborationWork('creator', collab({ status: 'declined' }), [], [], 'me')).toEqual({ tasks: [], waiting: null })
  })
})
