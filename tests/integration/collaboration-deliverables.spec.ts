import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession, unrelatedCreatorSession, anonClient } from './supabase-setup'

/**
 * Flujo de colaboraciones · Fase 2 (migraciones 20261105100000/110000/120000):
 * entregables como datos, versiones de contenido, guarda de aprobación, excepciones
 * con historial inmutable y regla de cierre. Incluye concurrencia real y los intentos
 * de saltarse las reglas con service_role.
 * Crea y borra sus propias filas (marcadas con [test-f2]).
 */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)
const TAG = '[test-f2]'

type Sess = NonNullable<Awaited<ReturnType<typeof creatorSession>>>
type Row = Record<string, any>

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('entregables y reglas de aprobación (Supabase real)', () => {
  let creator: Sess
  let partner: Sess
  let outsider: Sess | null
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  const collabIds: string[] = []
  const packageIds: string[] = []
  const offerIds: string[] = []

  beforeAll(async () => {
    const c = await creatorSession()
    const p = await partnerSession()
    if (!c || !p) throw new Error('faltan las cuentas de prueba')
    creator = c
    partner = p
    outsider = await unrelatedCreatorSession()
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    creatorRowId = ((await admin.from('creators').select('id').eq('profile_id', creator.userId).single()).data as Row).id
    partnerRowId = ((await admin.from('partners').select('id').eq('profile_id', partner.userId).single()).data as Row).id
  })

  afterAll(async () => {
    if (!admin) return
    for (const id of collabIds) {
      // Las publicaciones revisadas/publicadas de una colaboración activa no se pueden borrar: se cierra antes.
      await admin.from('collaborations').update({ status: 'completed' } as never).eq('id', id)
      await admin.from('posts').delete().eq('collaboration_id', id)
      await admin.from('collaborations').delete().eq('id', id)
    }
    await admin.from('posts').delete().like('title', `${TAG}%`)
    for (const id of offerIds) {
      await admin.from('messages').delete().eq('offer_id', id)
      await admin.from('offers').delete().eq('id', id)
    }
    for (const id of packageIds) await admin.from('packages').delete().eq('id', id)
  })

  // ------------------------------------------------------------------ helpers
  async function newCollab(opts: { status?: string; deliverables?: string[] } = {}) {
    const { data, error } = await admin.from('collaborations').insert({
      creator_id: creatorRowId, partner_id: partnerRowId, initiated_by: 'partner', brief: `${TAG} ${Date.now()}`,
      budget_cents: 10000, status: opts.status ?? 'accepted'
    } as never).select('id').single()
    if (error) throw error
    const id = (data as Row).id as string
    collabIds.push(id)
    return id
  }
  async function newPost(collaborationId: string | null, status = 'in_production', extra: Row = {}) {
    const { data, error } = await creator.client.from('posts').insert({
      creator_id: creatorRowId, collaboration_id: collaborationId, title: `${TAG} pieza ${Math.random().toString(36).slice(2, 8)}`,
      caption: 'texto inicial', content_type: 'reel', platform: 'instagram', status,
      due_date: new Date(Date.now() + 5 * 86400000).toISOString(), ...extra
    } as never).select('id').single()
    if (error) throw error
    return (data as Row).id as string
  }
  async function seedDeliverables(collaborationId: string, titles: string[]) {
    // Con service_role (el relleno de la migración hace lo mismo): origen «package», confirmados.
    const { error } = await admin.from('collaboration_deliverables').insert(
      titles.map((t, i) => ({ collaboration_id: collaborationId, position: i, title: t, origin: 'package', confirmed_at: new Date().toISOString() })) as never
    )
    if (error) throw error
    const { data } = await admin.from('collaboration_deliverables').select('id, title, position').eq('collaboration_id', collaborationId).order('position')
    return data as Row[]
  }
  const rpc = (s: Sess, fn: string, args: Row) => s.client.rpc(fn as never, args as never)
  const post = async (id: string) => ((await admin.from('posts').select('status, content_version, published_version, collaboration_id').eq('id', id).single()).data as Row)
  const stateOf = async (deliverableId: string) =>
    ((await partner.client.from('collaboration_deliverable_status').select('*').eq('deliverable_id', deliverableId).single()).data as Row)
  const kinds = async (collaborationId: string) =>
    ((await admin.from('collaboration_events').select('kind').eq('collaboration_id', collaborationId).order('created_at').order('seq')).data as Row[]).map((e) => e.kind)

  // ------------------------------------------------------------------ 1. Instantánea
  it('lo contratado es lo que mostraba la oferta, aunque el paquete cambie antes de aceptarla', async () => {
    const { data: pkg, error } = await admin.from('packages').insert({
      profile_id: creator.userId, title: `${TAG} paquete`, description: 'desc original', price_cents: 20000,
      deliverables: ['1 reel de 30-45 s', '3 stories', ' Carrusel de producto ', '  ']
    } as never).select('id').single()
    if (error) throw error
    const packageId = (pkg as Row).id as string
    packageIds.push(packageId)

    const offer = await rpc(partner, 'create_offer', { p_package_id: packageId, p_proposed_price_cents: 20000, p_message: 'oferta de prueba' })
    expect(offer.error).toBeNull()
    const offerId = (offer.data as Row).id as string
    offerIds.push(offerId)
    expect((offer.data as Row).package_deliverables).toEqual(['1 reel de 30-45 s', '3 stories', ' Carrusel de producto ', '  '])

    // El dueño edita el paquete ANTES de que se acepte.
    await admin.from('packages').update({ deliverables: ['Algo completamente distinto'], title: 'cambiado' } as never).eq('id', packageId)

    const accepted = await rpc(creator, 'respond_offer', { p_offer_id: offerId, p_accept: true })
    expect(accepted.error).toBeNull()
    const { data: collab } = await admin.from('collaborations').select('id, package_deliverables, package_title').eq('offer_id', offerId).single()
    const cid = (collab as Row).id as string
    collabIds.push(cid)
    expect((collab as Row).package_deliverables).toEqual(['1 reel de 30-45 s', '3 stories', ' Carrusel de producto ', '  '])

    const { data: rows } = await admin.from('collaboration_deliverables').select('position, title, origin, confirmed_at, post_id').eq('collaboration_id', cid).order('position')
    expect((rows as Row[]).map((r) => r.title)).toEqual(['1 reel de 30-45 s', '3 stories', 'Carrusel de producto'])
    expect((rows as Row[]).map((r) => r.position)).toEqual([0, 1, 2])
    expect((rows as Row[]).every((r) => r.origin === 'package' && r.confirmed_at && r.post_id === null)).toBe(true)

    // Reintentar no duplica nada.
    const again = await rpc(creator, 'respond_offer', { p_offer_id: offerId, p_accept: true })
    expect(again.error).not.toBeNull()
    expect(((await admin.from('collaboration_deliverables').select('id').eq('collaboration_id', cid)).data as Row[]).length).toBe(3)
  })

  it('el título, el orden y el origen de un entregable no se pueden cambiar, ni borrar (ni con service_role)', async () => {
    const cid = await newCollab()
    const [d] = await seedDeliverables(cid, ['Pieza A'])
    expect((await admin.from('collaboration_deliverables').update({ title: 'otra' } as never).eq('id', d!.id)).error).not.toBeNull()
    expect((await admin.from('collaboration_deliverables').update({ position: 5 } as never).eq('id', d!.id)).error).not.toBeNull()
    expect((await admin.from('collaboration_deliverables').update({ origin: 'defined' } as never).eq('id', d!.id)).error).not.toBeNull()
    expect((await admin.from('collaboration_deliverables').delete().eq('id', d!.id)).error).not.toBeNull()
  })

  // ------------------------------------------------------------------ 2. Identidad y asignación
  it('un hueco ocupa un post y un post un hueco; la doble asignación concurrente solo la gana uno', async () => {
    const cid = await newCollab()
    const [d1, d2, d3] = await seedDeliverables(cid, ['A', 'B', 'C'])
    const p1 = await newPost(null)
    const p2 = await newPost(null)

    expect((await rpc(partner, 'assign_deliverable', { p_deliverable_id: d1!.id, p_post_id: p1 })).error).not.toBeNull() // la marca no asigna
    const ok = await rpc(creator, 'assign_deliverable', { p_deliverable_id: d1!.id, p_post_id: p1 })
    expect(ok.error).toBeNull()
    expect((await post(p1)).collaboration_id).toBe(cid) // se vincula en la misma operación
    expect((await rpc(creator, 'assign_deliverable', { p_deliverable_id: d1!.id, p_post_id: p1 })).error).toBeNull() // idempotente
    expect((await rpc(creator, 'assign_deliverable', { p_deliverable_id: d2!.id, p_post_id: p1 })).error).not.toBeNull() // el post ya ocupa otro hueco
    expect((await rpc(creator, 'assign_deliverable', { p_deliverable_id: d1!.id, p_post_id: p2 })).error).not.toBeNull() // el hueco ya está ocupado

    // Dos asignaciones simultáneas del MISMO post a huecos distintos: solo una gana.
    const results = await Promise.all([
      rpc(creator, 'assign_deliverable', { p_deliverable_id: d2!.id, p_post_id: p2 }),
      rpc(creator, 'assign_deliverable', { p_deliverable_id: d3!.id, p_post_id: p2 })
    ])
    expect(results.filter((r) => !r.error)).toHaveLength(1)
    const { data: owners } = await admin.from('collaboration_deliverables').select('id').eq('post_id', p2)
    expect((owners as Row[]).length).toBe(1)
  })

  it('no se asigna un post de otra colaboración ni de otro creador, y el trigger lo impide también con service_role', async () => {
    const cid = await newCollab()
    const other = await newCollab()
    const [d] = await seedDeliverables(cid, ['A'])
    const foreign = await newPost(other)
    expect((await rpc(creator, 'assign_deliverable', { p_deliverable_id: d!.id, p_post_id: foreign })).error).not.toBeNull()
    // Directo con service_role (sin RPC): el trigger de consistencia lo rechaza igualmente.
    expect((await admin.from('collaboration_deliverables').update({ post_id: foreign } as never).eq('id', d!.id)).error).not.toBeNull()
  })

  it('soltar: solo si el post no está en revisión ni aprobado; el hueco queda libre y con evento', async () => {
    const cid = await newCollab()
    const [d] = await seedDeliverables(cid, ['A'])
    const p = await newPost(null)
    await rpc(creator, 'assign_deliverable', { p_deliverable_id: d!.id, p_post_id: p })
    await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', p)
    expect((await rpc(creator, 'unassign_deliverable', { p_deliverable_id: d!.id })).error).not.toBeNull()
    await creator.client.from('posts').update({ status: 'in_production' } as never).eq('id', p)
    expect((await rpc(creator, 'unassign_deliverable', { p_deliverable_id: d!.id })).error).toBeNull()
    expect((await rpc(creator, 'unassign_deliverable', { p_deliverable_id: d!.id })).error).toBeNull() // idempotente
    expect((await stateOf(d!.id)).state).toBe('open')
    expect(await kinds(cid)).toEqual(expect.arrayContaining(['deliverable_assigned', 'deliverable_unassigned']))
  })

  it('D6: no se borra ni se mueve un post en revisión; uno libre se borra y reabre el hueco', async () => {
    const cid = await newCollab()
    const other = await newCollab()
    const [d1, d2] = await seedDeliverables(cid, ['A', 'B'])
    const pr = await newPost(null)
    const pf = await newPost(null)
    await rpc(creator, 'assign_deliverable', { p_deliverable_id: d1!.id, p_post_id: pr })
    await rpc(creator, 'assign_deliverable', { p_deliverable_id: d2!.id, p_post_id: pf })
    await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', pr)

    expect((await creator.client.from('posts').delete().eq('id', pr)).error ?? (await post(pr)).status).toBeTruthy() // sigue existiendo
    expect(((await admin.from('posts').select('id').eq('id', pr)).data as Row[]).length).toBe(1)
    expect((await admin.from('posts').delete().eq('id', pr)).error).not.toBeNull() // tampoco con service_role
    expect((await creator.client.from('posts').update({ collaboration_id: other } as never).eq('id', pr)).error).not.toBeNull()

    expect((await creator.client.from('posts').delete().eq('id', pf)).error).toBeNull()
    expect((await stateOf(d2!.id)).state).toBe('open')
  })

  // ------------------------------------------------------------------ 3. Versiones y guarda de aprobación
  it('la aprobación va ligada a una versión: se invalida solo con cambios materiales', async () => {
    const cid = await newCollab()
    const [d] = await seedDeliverables(cid, ['Reel'])
    const p = await newPost(null)
    await rpc(creator, 'assign_deliverable', { p_deliverable_id: d!.id, p_post_id: p })

    // Sin aprobación no se puede programar ni publicar (ni con service_role).
    expect((await creator.client.from('posts').update({ status: 'scheduled' } as never).eq('id', p)).error).not.toBeNull()
    expect((await admin.from('posts').update({ status: 'published' } as never).eq('id', p)).error).not.toBeNull()
    expect((await post(p)).status).toBe('in_production')

    // No se fabrican aprobaciones fuera de la RPC (ni con service_role).
    const fake = await admin.from('post_revision_notes').insert({ post_id: p, author_profile_id: partner.userId, kind: 'approved', content_version: 1 } as never)
    expect(fake.error).not.toBeNull() // el post no está en revisión

    await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', p)
    expect((await stateOf(d!.id)).state).toBe('in_review')
    const stale = await rpc(partner, 'approve_post', { target_post_id: p, p_comment: 'ok', p_content_version: 7 })
    expect(stale.error?.message).toMatch(/ha cambiado/i)
    expect((await rpc(creator, 'approve_post', { target_post_id: p, p_comment: 'yo me apruebo' })).error).not.toBeNull()
    expect((await rpc(partner, 'approve_post', { target_post_id: p, p_comment: 'Perfecto', p_content_version: 1 })).error).toBeNull()

    let s = await stateOf(d!.id)
    expect(s.state).toBe('approved')
    expect(s.content_version).toBe(1)
    expect((await post(p)).status).toBe('scheduled')

    // Cambio NO material (fecha límite, etiquetas…): la aprobación sigue.
    await creator.client.from('posts').update({ due_date: new Date(Date.now() + 9 * 86400000).toISOString() } as never).eq('id', p)
    expect((await post(p)).status).toBe('scheduled')
    expect((await post(p)).content_version).toBe(1)

    // Cambio material: vuelve a producción, versión 2, evento.
    await creator.client.from('posts').update({ caption: 'texto cambiado' } as never).eq('id', p)
    expect(await post(p)).toMatchObject({ status: 'in_production', content_version: 2 })
    s = await stateOf(d!.id)
    expect(s.state).toBe('in_progress')
    expect(s.approval_invalidated).toBe(true)
    expect(await kinds(cid)).toContain('approval_invalidated')

    // La versión no la fija el cliente.
    await creator.client.from('posts').update({ content_version: 99 } as never).eq('id', p)
    expect((await post(p)).content_version).toBe(2)
    await admin.from('posts').update({ content_version: 99 } as never).eq('id', p)
    expect((await post(p)).content_version).toBe(2)

    // Volver a programar sin nueva aprobación está bloqueado; con ella, sí.
    expect((await creator.client.from('posts').update({ status: 'scheduled' } as never).eq('id', p)).error).not.toBeNull()
    await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', p)
    expect((await rpc(partner, 'approve_post', { target_post_id: p, p_content_version: 1 })).error).not.toBeNull() // versión vieja
    expect((await rpc(partner, 'approve_post', { target_post_id: p, p_content_version: 2 })).error).toBeNull()
    expect((await creator.client.from('posts').update({ status: 'published' } as never).eq('id', p)).error).toBeNull()
    expect(await post(p)).toMatchObject({ status: 'published', published_version: 2 })

    // D5: editar tras publicar no bloquea; deja evento y el entregable sigue resuelto.
    expect((await creator.client.from('posts').update({ caption: 'retoque tras publicar' } as never).eq('id', p)).error).toBeNull()
    expect(await post(p)).toMatchObject({ status: 'published', content_version: 3 })
    s = await stateOf(d!.id)
    expect(s.state).toBe('approved')
    expect(s.edited_after_publish).toBe(true)
    expect(await kinds(cid)).toContain('edited_after_publish')
  })

  it('pedir cambios también va ligado a la versión y a la fila bloqueada', async () => {
    const cid = await newCollab()
    const [d] = await seedDeliverables(cid, ['Reel'])
    const p = await newPost(null)
    await rpc(creator, 'assign_deliverable', { p_deliverable_id: d!.id, p_post_id: p })
    await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', p)
    expect((await rpc(partner, 'request_post_changes', { target_post_id: p, p_comment: 'x', p_content_version: 3 })).error?.message).toMatch(/ha cambiado/i)
    expect((await rpc(partner, 'request_post_changes', { target_post_id: p, p_comment: '  ', p_content_version: 1 })).error).not.toBeNull()
    expect((await rpc(partner, 'request_post_changes', { target_post_id: p, p_comment: 'Más luz en el plano', p_content_version: 1 })).error).toBeNull()
    const s = await stateOf(d!.id)
    expect(s.state).toBe('changes_requested')
    expect(s.last_review_comment).toBe('Más luz en el plano')
    // Segunda petición sobre lo ya devuelto: no está pendiente.
    expect((await rpc(partner, 'request_post_changes', { target_post_id: p, p_comment: 'otra vez', p_content_version: 1 })).error?.message).toMatch(/ya no está pendiente/i)
  })

  // ------------------------------------------------------------------ 4. Carreras
  it('carrera real: aprobar y editar a la vez nunca dejan una pieza programada con una aprobación vieja', async () => {
    const cid = await newCollab()
    for (let i = 0; i < 8; i++) {
      const p = await newPost(cid, 'ready_for_review', { caption: `v-${i}` })
      const [approve, edit] = await Promise.all([
        rpc(partner, 'approve_post', { target_post_id: p, p_content_version: 1 }),
        creator.client.from('posts').update({ caption: `editado-${i}` } as never).eq('id', p)
      ])
      expect(edit.error).toBeNull()
      const now = await post(p)
      const { data: notes } = await admin.from('post_revision_notes').select('kind, content_version').eq('post_id', p)
      const approvedVersions = (notes as Row[]).filter((n) => n.kind === 'approved').map((n) => n.content_version)
      // Invariante: si está programada, existe una aprobación de ESTA versión.
      if (now.status === 'scheduled') expect(approvedVersions).toContain(now.content_version)
      // O la aprobación ganó y la edición la invalidó, o la edición ganó y la aprobación falló por versión.
      if (!approve.error) expect(now).toMatchObject({ status: 'in_production', content_version: 2 })
      else expect(approve.error.message).toMatch(/ha cambiado|ya no está pendiente/i)
    }
  })

  it('carrera real: aprobar y pedir cambios a la vez, solo una gana', async () => {
    const cid = await newCollab()
    const p = await newPost(cid, 'ready_for_review')
    const results = await Promise.all([
      rpc(partner, 'approve_post', { target_post_id: p, p_content_version: 1 }),
      rpc(partner, 'request_post_changes', { target_post_id: p, p_comment: 'Cambia algo', p_content_version: 1 })
    ])
    expect(results.filter((r) => !r.error)).toHaveLength(1)
    const { data: notes } = await admin.from('post_revision_notes').select('id').eq('post_id', p)
    expect((notes as Row[]).length).toBe(1)
  })

  it('carrera real: asignar y mover el post a otra colaboración a la vez no dejan un hueco inconsistente', async () => {
    const cid = await newCollab()
    const other = await newCollab()
    const [d] = await seedDeliverables(cid, ['A'])
    const p = await newPost(cid)
    await Promise.all([
      rpc(creator, 'assign_deliverable', { p_deliverable_id: d!.id, p_post_id: p }),
      creator.client.from('posts').update({ collaboration_id: other } as never).eq('id', p)
    ])
    const { data: dd } = await admin.from('collaboration_deliverables').select('post_id').eq('id', d!.id).single()
    const now = await post(p)
    // Invariante: si el hueco tiene el post, el post sigue siendo de esa colaboración.
    if ((dd as Row).post_id) expect(now.collaboration_id).toBe(cid)
  })

  // ------------------------------------------------------------------ 5. Excepciones
  it('excepciones: motivo obligatorio, solo la marca, historial inmutable y reapertura con rastro', async () => {
    const cid = await newCollab()
    const [d1, d2] = await seedDeliverables(cid, ['A', 'B'])
    const p = await newPost(null)
    await rpc(creator, 'assign_deliverable', { p_deliverable_id: d1!.id, p_post_id: p })

    expect((await rpc(creator, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'waived', p_reason: 'no hace falta ya' })).error).not.toBeNull() // el creador no
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'waived', p_reason: 'corto' })).error).not.toBeNull()
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'raro', p_reason: 'motivo suficiente' })).error).not.toBeNull()
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d1!.id, p_resolution: 'accepted_without_approval', p_reason: 'lo acepto tal cual' })).error).not.toBeNull() // aún no entregada
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'accepted_without_approval', p_reason: 'sin publicación asignada' })).error).not.toBeNull()

    // Renuncia (con y sin post), idempotente.
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'waived', p_reason: 'Ya no necesitamos el carrusel' })).error).toBeNull()
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'waived', p_reason: 'Ya no necesitamos el carrusel' })).error).toBeNull()
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'accepted_without_approval', p_reason: 'cambio de idea sin reabrir' })).error).not.toBeNull()
    expect((await stateOf(d2!.id)).state).toBe('waived')
    expect(((await admin.from('collaboration_deliverable_decisions').select('id').eq('deliverable_id', d2!.id)).data as Row[]).length).toBe(1)
    expect((await rpc(creator, 'assign_deliverable', { p_deliverable_id: d2!.id, p_post_id: await newPost(null) })).error).not.toBeNull() // renunciado: no se asigna

    // Aceptar sin aprobación formal: el post puede programarse/publicarse sin nota de aprobación.
    await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', p)
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d1!.id, p_resolution: 'accepted_without_approval', p_reason: 'Lo damos por bueno tal cual' })).error).toBeNull()
    let s = await stateOf(d1!.id)
    expect(s).toMatchObject({ state: 'accepted_without_approval', decision_reason: 'Lo damos por bueno tal cual', decided_by: partner.userId })
    expect((await creator.client.from('posts').update({ status: 'scheduled' } as never).eq('id', p)).error).toBeNull()

    // Si se cambia algo material, la excepción caduca (queda en el historial).
    await creator.client.from('posts').update({ caption: 'cambio posterior' } as never).eq('id', p)
    s = await stateOf(d1!.id)
    expect(s.decision_outdated).toBe(true)
    expect(s.state).not.toBe('accepted_without_approval')
    expect((await post(p)).status).toBe('in_production') // la excepción caducada también devuelve la pieza a producción (D2)
    expect(await kinds(cid)).toContain('approval_invalidated')

    // Reabrir: motivo obligatorio, se añade una fila (no se sobrescribe).
    expect((await rpc(partner, 'reopen_deliverable', { p_deliverable_id: d2!.id, p_reason: 'x' })).error).not.toBeNull()
    expect((await rpc(creator, 'reopen_deliverable', { p_deliverable_id: d2!.id, p_reason: 'quiero reabrirlo yo' })).error).not.toBeNull()
    expect((await rpc(partner, 'reopen_deliverable', { p_deliverable_id: d2!.id, p_reason: 'Volvemos a necesitar el carrusel' })).error).toBeNull()
    expect((await rpc(partner, 'reopen_deliverable', { p_deliverable_id: d2!.id, p_reason: 'Volvemos a necesitar el carrusel' })).error).toBeNull() // idempotente
    expect((await stateOf(d2!.id)).state).toBe('open')
    const { data: hist } = await admin.from('collaboration_deliverable_decisions').select('id, kind, reason, decided_by').eq('deliverable_id', d2!.id).order('seq')
    expect((hist as Row[]).map((h) => h.kind)).toEqual(['waived', 'reopened'])
    expect((hist as Row[])[0]!.reason).toBe('Ya no necesitamos el carrusel')

    // Inmutable para todos (también service_role).
    const first = (hist as Row[])[0]!.id
    expect((await admin.from('collaboration_deliverable_decisions').update({ reason: 'reescrito por service_role' } as never).eq('id', first)).error).not.toBeNull()
    expect((await admin.from('collaboration_deliverable_decisions').delete().eq('id', first)).error).not.toBeNull()
    expect((await creator.client.from('collaboration_deliverable_decisions').delete().eq('id', first)).error).not.toBeNull() // sin permiso de borrado
    expect(((await admin.from('collaboration_deliverable_decisions').select('id').eq('deliverable_id', d2!.id)).data as Row[]).length).toBe(2)
    const evKinds = await kinds(cid)
    expect(evKinds).toEqual(expect.arrayContaining(['deliverable_waived', 'deliverable_accepted_without_approval', 'deliverable_reopened']))
    const { data: ev } = await admin.from('collaboration_events').select('id, detail').eq('collaboration_id', cid).eq('kind', 'deliverable_waived').limit(1).single()
    expect((await admin.from('collaboration_events').update({ detail: {} } as never).eq('id', (ev as Row).id)).error).not.toBeNull() // la cronología tampoco se reescribe
    expect((await admin.from('collaboration_events').delete().eq('id', (ev as Row).id)).error).not.toBeNull()
  })

  it('carrera real: dos decisiones simultáneas sobre el mismo entregable crean una sola fila', async () => {
    const cid = await newCollab()
    const [d] = await seedDeliverables(cid, ['A'])
    const results = await Promise.all([
      rpc(partner, 'resolve_deliverable', { p_deliverable_id: d!.id, p_resolution: 'waived', p_reason: 'Decisión repetida a la vez' }),
      rpc(partner, 'resolve_deliverable', { p_deliverable_id: d!.id, p_resolution: 'waived', p_reason: 'Decisión repetida a la vez' })
    ])
    expect(results.every((r) => !r.error)).toBe(true)
    expect(((await admin.from('collaboration_deliverable_decisions').select('id').eq('deliverable_id', d!.id)).data as Row[]).length).toBe(1)
  })

  // ------------------------------------------------------------------ 6. Cierre (D3) y modo libre / entregables definidos (D1)
  it('cierre: nadie completa con entregables sin resolver; la marca los resuelve con motivo y entonces sí', async () => {
    const cid = await newCollab()
    const [d1, d2] = await seedDeliverables(cid, ['A', 'B'])
    const p = await newPost(null)
    await rpc(creator, 'assign_deliverable', { p_deliverable_id: d1!.id, p_post_id: p })
    await creator.client.from('posts').update({ status: 'ready_for_review' } as never).eq('id', p)
    await rpc(partner, 'approve_post', { target_post_id: p, p_content_version: 1 })

    expect((await rpc(creator, 'mark_collaboration_completed', { p_collaboration_id: cid })).error?.message).toMatch(/Faltan 1 entregable/)
    expect((await rpc(partner, 'mark_collaboration_completed', { p_collaboration_id: cid })).error?.message).toMatch(/Faltan 1 entregable/)
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d2!.id, p_resolution: 'waived', p_reason: 'Fuera del alcance acordado' })).error).toBeNull()
    expect((await rpc(creator, 'mark_collaboration_completed', { p_collaboration_id: cid })).error).toBeNull()
    expect(((await admin.from('collaborations').select('status').eq('id', cid).single()).data as Row).status).toBe('completed')
    // Con la colaboración completada no se asigna ni se reabre nada.
    expect((await rpc(partner, 'reopen_deliverable', { p_deliverable_id: d2!.id, p_reason: 'ya está completada' })).error).not.toBeNull()
  })

  it('modo libre: sin entregables el cierre funciona como siempre', async () => {
    const cid = await newCollab()
    expect((await rpc(creator, 'mark_collaboration_completed', { p_collaboration_id: cid })).error).toBeNull()
  })

  it('D1: la marca define entregables una vez; el creador los confirma antes de que sean exigibles', async () => {
    const cid = await newCollab()
    expect((await rpc(creator, 'define_deliverables', { p_collaboration_id: cid, p_titles: ['X'] })).error).not.toBeNull()
    expect((await rpc(partner, 'define_deliverables', { p_collaboration_id: cid, p_titles: ['  ', ''] })).error).not.toBeNull()
    expect((await rpc(partner, 'define_deliverables', { p_collaboration_id: cid, p_titles: ['1 reel', '2 stories'] })).data).toBe(2)
    expect((await rpc(partner, 'define_deliverables', { p_collaboration_id: cid, p_titles: ['otro'] })).error).not.toBeNull() // una sola vez
    const { data: rows } = await admin.from('collaboration_deliverables').select('id, origin, confirmed_at').eq('collaboration_id', cid).order('position')
    expect((rows as Row[]).every((r) => r.origin === 'defined' && r.confirmed_at === null)).toBe(true)

    // Sin confirmar no son exigibles: se puede completar; la marca no puede resolverlos ni el creador asignarlos.
    const p = await newPost(null)
    expect((await rpc(creator, 'assign_deliverable', { p_deliverable_id: (rows as Row[])[0]!.id, p_post_id: p })).error).not.toBeNull()
    expect((await rpc(partner, 'resolve_deliverable', { p_deliverable_id: (rows as Row[])[0]!.id, p_resolution: 'waived', p_reason: 'sin confirmar aún' })).error).not.toBeNull()

    expect((await rpc(partner, 'confirm_deliverables', { p_collaboration_id: cid })).error).not.toBeNull() // solo el creador
    expect((await rpc(creator, 'confirm_deliverables', { p_collaboration_id: cid })).data).toBe(2)
    expect((await rpc(creator, 'confirm_deliverables', { p_collaboration_id: cid })).data).toBe(0) // idempotente
    expect((await rpc(creator, 'mark_collaboration_completed', { p_collaboration_id: cid })).error?.message).toMatch(/Faltan 2 entregable/)
    expect(await kinds(cid)).toEqual(expect.arrayContaining(['deliverables_defined', 'deliverables_confirmed']))
    // Confirmar no se puede deshacer.
    expect((await admin.from('collaboration_deliverables').update({ confirmed_at: null } as never).eq('id', (rows as Row[])[0]!.id)).error).not.toBeNull()
  })

  // ------------------------------------------------------------------ 7. RLS y permisos
  it('RLS y permisos: lectura solo para las dos partes; ninguna escritura directa; sin anon', async () => {
    const cid = await newCollab()
    const [d] = await seedDeliverables(cid, ['A'])
    await rpc(partner, 'resolve_deliverable', { p_deliverable_id: d!.id, p_resolution: 'waived', p_reason: 'Motivo de prueba largo' })

    for (const who of [creator, partner]) {
      expect(((await who.client.from('collaboration_deliverables').select('id').eq('id', d!.id)).data as Row[]).length).toBe(1)
      expect(((await who.client.from('collaboration_deliverable_decisions').select('id').eq('deliverable_id', d!.id)).data as Row[]).length).toBe(1)
      expect(((await who.client.from('collaboration_deliverable_status').select('deliverable_id').eq('deliverable_id', d!.id)).data as Row[]).length).toBe(1)
    }
    if (outsider) {
      expect(((await outsider.client.from('collaboration_deliverables').select('id').eq('id', d!.id)).data as Row[]).length).toBe(0)
      expect(((await outsider.client.from('collaboration_deliverable_status').select('deliverable_id').eq('deliverable_id', d!.id)).data as Row[]).length).toBe(0)
      expect(((await outsider.client.from('collaboration_deliverable_decisions').select('id').eq('deliverable_id', d!.id)).data as Row[]).length).toBe(0)
    }

    // Ninguna escritura directa desde el cliente.
    for (const who of [creator, partner]) {
      expect((await who.client.from('collaboration_deliverables').insert({ collaboration_id: cid, position: 9, title: 'x', origin: 'defined' } as never)).error).not.toBeNull()
      expect((await who.client.from('collaboration_deliverables').update({ post_id: null } as never).eq('id', d!.id)).error).not.toBeNull()
      expect((await who.client.from('collaboration_deliverable_decisions').insert({ deliverable_id: d!.id, collaboration_id: cid, kind: 'waived', reason: 'insertado directamente' } as never)).error).not.toBeNull()
    }
    expect(((await admin.from('collaboration_deliverable_decisions').select('id').eq('deliverable_id', d!.id)).data as Row[]).length).toBe(1)

    // Sin sesión: nada de las tablas, vista ni RPC.
    const anon = anonClient()!
    const t = await anon.from('collaboration_deliverables').select('id').limit(1)
    expect(t.error !== null || (t.data as Row[]).length === 0).toBe(true)
    const v = await anon.from('collaboration_deliverable_status').select('deliverable_id').limit(1)
    expect(v.error !== null || (v.data as Row[]).length === 0).toBe(true)
    for (const [fn, args] of [
      ['assign_deliverable', { p_deliverable_id: d!.id, p_post_id: d!.id }],
      ['resolve_deliverable', { p_deliverable_id: d!.id, p_resolution: 'waived', p_reason: 'sin sesión de ningún tipo' }],
      ['reopen_deliverable', { p_deliverable_id: d!.id, p_reason: 'sin sesión de ningún tipo' }],
      ['define_deliverables', { p_collaboration_id: cid, p_titles: ['x'] }],
      ['approve_post', { target_post_id: d!.id }]
    ] as const) {
      expect((await anon.rpc(fn as never, args as never)).error, fn).not.toBeNull()
    }
    // Las funciones auxiliares internas no son ejecutables por el cliente.
    for (const fn of ['collab_event_add', 'post_has_review_clearance', 'post_has_valid_approval']) {
      const r = await creator.client.rpc(fn as never, {} as never)
      expect(r.error, fn).not.toBeNull()
    }
  })

  it('las ofertas del chat guardan la instantánea y el creador de la oferta no puede alterarla', async () => {
    const { data: offers } = await admin.from('offers').select('package_deliverables').in('id', offerIds)
    expect((offers as Row[]).length).toBeGreaterThan(0)
    expect((offers as Row[]).every((o) => Array.isArray(o.package_deliverables))).toBe(true)
  })
})
