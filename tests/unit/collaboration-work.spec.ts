import { describe, expect, it } from 'vitest'
import { collabContext, collaborationWork, deliverableState, hasRated, type WorkCollab, type WorkDeliverable, type WorkEvent, type WorkPost } from '../../app/utils/collaboration-work'

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
  it('tras una contraoferta la pelota cambia de lado: quien la hizo espera, quien la recibe responde', () => {
    // El partner inició y el creador contraofertó (actor distinto de «me»): ahora le toca al partner.
    const counter = ev('counteroffer', { postId: null, actorProfileId: 'other' })
    const mine = collaborationWork('partner', collab({ status: 'requested', initiatedBy: 'partner' }), [], [counter], 'me')
    expect(kinds(mine)).toEqual(['respond_request'])
    expect(mine.tasks[0]!.title).toContain('otro presupuesto')
    // Si la última contraoferta es mía, espero aunque yo no iniciara.
    const waiting = collaborationWork('partner', collab({ status: 'requested', initiatedBy: 'creator' }), [], [ev('counteroffer', { postId: null, actorProfileId: 'me' })], 'me')
    expect(waiting.tasks).toEqual([])
    expect(waiting.waiting?.text).toContain('Esperando')
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

// ---------------------------------------------------------------- Fase 2: entregables como datos
const deliv = (over: Partial<WorkDeliverable> = {}): WorkDeliverable => ({
  id: 'd1', collaborationId: 'c1', title: '1 reel', state: 'open', enforceable: true, resolved: false,
  postId: null, postTitle: null, lastReviewComment: null, approvalInvalidated: false, ...over
})

describe('collaborationWork con entregables · creador', () => {
  it('hueco libre: asignar una publicación', () => {
    const r = collaborationWork('creator', collab(), [], [], 'me', [deliv()])
    expect(kinds(r)).toEqual(['assign_deliverable'])
    expect(r.tasks[0]!.title).toContain('1 reel')
  })
  it('cambios pedidos con su comentario; aprobación invalidada pide reenviar; en revisión espera', () => {
    const posts = [post({ id: 'p1', title: 'Reel A' })]
    const fix = collaborationWork('creator', collab(), posts, [], 'me', [deliv({ postId: 'p1', postTitle: 'Reel A', state: 'changes_requested', lastReviewComment: 'Más luz' })])
    expect(kinds(fix)).toEqual(['fix_changes'])
    expect(fix.tasks[0]!.detail).toContain('Más luz')
    const again = collaborationWork('creator', collab(), posts, [], 'me', [deliv({ postId: 'p1', postTitle: 'Reel A', state: 'in_progress', approvalInvalidated: true })])
    expect(again.tasks[0]).toMatchObject({ kind: 'send_deliverable', priority: 26 })
    expect(again.tasks[0]!.title).toContain('Vuelve a enviar')
    const wait = collaborationWork('creator', collab(), posts, [], 'me', [deliv({ postId: 'p1', postTitle: 'Reel A', state: 'in_review' })])
    expect(wait.tasks).toEqual([])
    expect(wait.waiting?.text).toContain('revisando')
  })
  it('entregables definidos por la marca sin confirmar: confirmar, y no son exigibles (no piden asignar ni cerrar)', () => {
    const r = collaborationWork('creator', collab(), [], [], 'me', [deliv({ enforceable: false })])
    expect(kinds(r)).toEqual(['confirm_deliverables'])
  })
  it('todo resuelto: cerrar la colaboración', () => {
    const r = collaborationWork('creator', collab(), [], [], 'me', [deliv({ state: 'approved', resolved: true }), deliv({ id: 'd2', state: 'waived', resolved: true })])
    expect(kinds(r)).toEqual(['close_collaboration'])
  })
  it('con entregables no se pide «crear la primera publicación» (modo libre)', () => {
    const r = collaborationWork('creator', collab(), [], [], 'me', [deliv({ state: 'approved', resolved: true })])
    expect(kinds(r)).not.toContain('start_deliverable')
  })
})

describe('collaborationWork con entregables · partner', () => {
  it('en revisión: revisar la publicación del hueco; el resto espera', () => {
    const posts = [post({ id: 'p1', title: 'Reel A', status: 'ready_for_review' })]
    const r = collaborationWork('partner', collab(), posts, [], 'me', [deliv({ postId: 'p1', postTitle: 'Reel A', state: 'in_review' }), deliv({ id: 'd2', title: '3 stories' })])
    expect(kinds(r)).toEqual(['review_deliverable', 'complete_brief'].filter((k) => k === 'review_deliverable'))
    expect(r.tasks[0]).toMatchObject({ postId: 'p1' })
  })
  it('sin tareas: espera al creador y cuenta los pendientes; sin confirmar, espera la confirmación', () => {
    const r = collaborationWork('partner', collab(), [], [], 'me', [deliv(), deliv({ id: 'd2', title: 'B' })])
    expect(r.waiting?.text).toContain('2 entregables')
    const u = collaborationWork('partner', collab(), [], [], 'me', [deliv({ enforceable: false })])
    expect(u.waiting?.text).toContain('confirmar')
  })
  it('ignora entregables de otras colaboraciones', () => {
    const r = collaborationWork('creator', collab(), [], [], 'me', [deliv({ collaborationId: 'otra' })])
    expect(kinds(r)).toEqual(['start_deliverable'])
  })
})

describe('collaborationWork · cancelación pendiente y solicitud caducada', () => {
  const accepted = (over: Partial<WorkCollab> = {}) => collab({ status: 'accepted', ...over })
  it('si la otra parte propone cancelar, responder es lo más urgente (antes que el brief)', () => {
    const r = collaborationWork('partner', accepted({ cancelRequestedBy: 'creator-profile', cancelReason: 'No puedo cumplir los plazos.', campaignGoal: null }), [], [], 'me')
    expect(kinds(r)[0]).toBe('respond_cancel')
    expect(r.tasks[0]!.title).toMatch(/propone cancelar/)
    expect(r.tasks[0]!.detail).toMatch(/No puedo cumplir los plazos/)
    expect(r.tasks[0]!.to).toMatch(/#cancelar$/)
    expect(kinds(r)).toContain('complete_brief') // sigue estando, pero detrás
  })
  it('si la propuesta de cancelar es mía, no es una tarea: espero la respuesta', () => {
    const r = collaborationWork('partner', accepted({ cancelRequestedBy: 'me' }), [], [], 'me')
    expect(kinds(r)).not.toContain('respond_cancel')
    expect(r.waiting?.text).toMatch(/Esperando la respuesta de .* a tu propuesta de cancelar/)
  })
  it('sin cancelación pendiente no aparece ninguna tarea de cancelar', () => {
    expect(kinds(collaborationWork('partner', accepted(), [], [], 'me'))).not.toContain('respond_cancel')
  })
  it('una solicitud caducada dice qué hacer, distinto para quien la envió y para quien la recibió', () => {
    const past = '2020-01-01T00:00:00Z'
    const sender = collaborationWork('partner', collab({ status: 'requested', initiatedBy: 'partner', expiresAt: past }), [], [], 'me')
    expect(sender.waiting?.text).toMatch(/ha caducado/)
    expect(sender.waiting?.detail).toMatch(/Retira la solicitud/)
    const receiver = collaborationWork('creator', collab({ status: 'requested', initiatedBy: 'partner', expiresAt: past }), [], [], 'me')
    expect(receiver.waiting?.detail).toMatch(/rechazarla/)
    expect(sender.tasks).toHaveLength(0)
  })
  it('una espera normal no lleva detalle propio (se usa el genérico)', () => {
    const r = collaborationWork('partner', collab({ status: 'requested', initiatedBy: 'partner' }), [], [], 'me')
    expect(r.waiting?.detail).toBeUndefined()
  })
})

describe('contexto de la campaña en tareas idénticas', () => {
  it('«Crea la primera publicación» y «Valora» llevan el nombre de campaña para distinguir colaboraciones con la misma marca', () => {
    const a = collaborationWork('creator', collab({ id: 'a', campaignName: 'Lanzamiento de otoño', campaignGoal: null }), [], [], 'me')
    const b = collaborationWork('creator', collab({ id: 'b', campaignName: 'Black Friday', campaignGoal: null }), [], [], 'me')
    expect(a.tasks.find((t) => t.kind === 'start_deliverable')!.detail).toContain('«Lanzamiento de otoño»')
    expect(b.tasks.find((t) => t.kind === 'start_deliverable')!.detail).toContain('«Black Friday»')
    const done = collaborationWork('creator', collab({ status: 'completed', campaignName: 'Black Friday' }), [], [], 'me')
    expect(done.tasks[0]!.detail).toBe('«Black Friday» · Tu valoración ayuda a otros usuarios.')
  })
  it('sin nombre de campaña usa la primera frase del brief, y sin nada no añade contexto', () => {
    expect(collabContext({ campaignName: null, brief: 'Una reseña en vídeo del producto. Para el 30 de noviembre.' })).toBe('«Una reseña en vídeo del producto.»')
    expect(collabContext({ campaignName: '  ', brief: '' })).toBe('')
    const r = collaborationWork('creator', collab({ status: 'completed', campaignName: null, brief: '' }), [], [], 'me')
    expect(r.tasks[0]!.detail).toBe('Tu valoración ayuda a otros usuarios.')
  })
})
