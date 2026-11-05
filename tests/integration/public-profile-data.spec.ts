import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseEnv, creatorSession, partnerSession } from './supabase-setup'

/** Migración 20261105140000: datos del perfil público, permisos por columna y funciones de lectura. */
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasServiceRole = !!(SUPABASE_URL && SERVICE_ROLE_KEY)

describe.skipIf(!hasSupabaseEnv || !hasServiceRole)('datos del perfil público (Supabase)', () => {
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let admin: SupabaseClient
  let creatorRowId: string
  let partnerRowId: string
  let before: Record<string, unknown> = {}

  beforeAll(async () => {
    creator = await creatorSession()
    partner = await partnerSession()
    if (!creator || !partner) return
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data: c } = await admin.from('creators').select('id, headline, location, audience, show_collaborations').eq('profile_id', creator.userId).single()
    const { data: p } = await admin.from('partners').select('id').eq('profile_id', partner.userId).single()
    creatorRowId = (c as { id: string }).id
    partnerRowId = (p as { id: string }).id
    before = c as Record<string, unknown>
  })

  afterAll(async () => {
    if (!admin || !creatorRowId) return
    await admin.from('creators').update({ headline: before.headline, location: before.location, audience: before.audience, show_collaborations: before.show_collaborations }).eq('id', creatorRowId)
    await admin.from('partners').update({ headline: null, location: null, website: null }).eq('id', partnerRowId)
  })

  it('el creador edita su frase, ubicación, audiencia y visibilidad; las lee cualquier usuario autenticado', async () => {
    if (!creator || !partner) return
    const audience = { countries: [{ name: 'España', pct: 70 }], ages: [{ range: '25-34', pct: 45 }], gender: { female: 60, male: 40, other: 0 } }
    const up = await creator.client.from('creators').update({ headline: 'Creadora de deporte', location: 'Granada, España', audience, show_collaborations: false } as never).eq('id', creatorRowId)
    expect(up.error).toBeNull()
    const seen = await partner.client.from('creators').select('headline, location, audience').eq('id', creatorRowId).single()
    expect(seen.data).toEqual({ headline: 'Creadora de deporte', location: 'Granada, España', audience })
  })

  it('rechaza audiencias inválidas y textos demasiado largos', async () => {
    if (!creator) return
    const bad = [
      { audience: { countries: [{ name: 'A', pct: 70 }, { name: 'B', pct: 40 }] } },
      { audience: { gender: { female: 120 } } },
      { audience: { otra: 1 } },
      { headline: 'x'.repeat(81) }
    ]
    for (const patch of bad) {
      const { error } = await creator.client.from('creators').update(patch as never).eq('id', creatorRowId)
      expect(error, JSON.stringify(patch)).not.toBeNull()
    }
  })

  it('la marca edita su web (solo http/https) y nadie edita la ficha de otro', async () => {
    if (!creator || !partner) return
    expect((await partner.client.from('partners').update({ headline: 'Moda', location: 'Madrid', website: 'https://marca.example' } as never).eq('id', partnerRowId)).error).toBeNull()
    expect((await partner.client.from('partners').update({ website: 'javascript:alert(1)' } as never).eq('id', partnerRowId)).error).not.toBeNull()
    await creator.client.from('partners').update({ headline: 'hackeado' } as never).eq('id', partnerRowId)
    const { data } = await admin.from('partners').select('headline').eq('id', partnerRowId).single()
    expect((data as { headline: string }).headline).toBe('Moda')
    await partner.client.from('creators').update({ headline: 'hackeado' } as never).eq('id', creatorRowId)
    const { data: c } = await admin.from('creators').select('headline').eq('id', creatorRowId).single()
    expect((c as { headline: string }).headline).toBe('Creadora de deporte')
  })

  it('las funciones públicas solo se ejecutan con sesión y respetan lo que el dueño oculta', async () => {
    if (!creator || !partner) return
    const anon = createClient(SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    expect((await anon.rpc('get_public_creator_stats' as never, { p_creator_id: creatorRowId } as never)).error).not.toBeNull()
    const stats = await partner.client.rpc('get_public_creator_stats' as never, { p_creator_id: creatorRowId } as never)
    expect(stats.error).toBeNull()
    // show_collaborations = false → no se devuelve ninguna marca.
    const hidden = await partner.client.rpc('get_public_collaborations' as never, { p_role: 'creator', p_id: creatorRowId } as never)
    expect(hidden.data).toEqual([])
    await admin.from('creators').update({ show_collaborations: true }).eq('id', creatorRowId)
    const shown = await partner.client.rpc('get_public_collaborations' as never, { p_role: 'creator', p_id: creatorRowId } as never)
    expect(shown.error).toBeNull()
    const act = await partner.client.rpc('get_public_activity' as never, { p_role: 'creator', p_id: creatorRowId } as never)
    expect(act.error).toBeNull()
    expect(typeof (act.data as { collab_count: number }[])[0]!.collab_count).toBe('number')
  })
})
