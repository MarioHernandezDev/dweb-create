import { describe, it, expect } from 'vitest'
import { buildFeedEvents, buildFeedIcs, FEED_PAST_DAYS, parseFeedToken } from '../../app/utils/calendar-feed'

const TOKEN = '3f2b8c1e-9a4d-4c7e-8b1a-5d6e7f8a9b0c'

describe('parseFeedToken', () => {
  it('acepta un UUID, con o sin .ics, y lo normaliza', () => {
    expect(parseFeedToken(TOKEN)).toBe(TOKEN)
    expect(parseFeedToken(`${TOKEN}.ics`)).toBe(TOKEN)
    expect(parseFeedToken(` ${TOKEN.toUpperCase()}.ICS `)).toBe(TOKEN)
  })
  it('rechaza lo que no parece un token', () => {
    for (const bad of ['', 'abc', '../../etc/passwd', `${TOKEN}x`, `${TOKEN}/otro`, undefined, null, 123]) expect(parseFeedToken(bad), String(bad)).toBeNull()
  })
})

describe('buildFeedEvents', () => {
  const base = { role: 'creator' as const, origin: 'https://app.ejemplo.es', today: '2026-11-20' }
  const collabs = [{ id: 'c1', campaignName: 'Campaña de otoño', packageTitle: null, brief: 'x' }]
  it('crea un evento por entrega con fecha, ordenado, con enlace a la colaboración', () => {
    const posts = [
      { id: 'b', title: 'Story', dueDate: '2026-11-25', collaborationId: 'c1', status: 'scheduled' },
      { id: 'a', title: 'Reel', dueDate: '2026-11-22', collaborationId: 'c1', status: 'in_production' },
      { id: 'n', title: 'Sin fecha', dueDate: null, collaborationId: 'c1', status: 'idea' }
    ]
    const ev = buildFeedEvents({ ...base, posts, collabs })
    expect(ev.map((e) => e.uid)).toEqual(['post-a', 'post-b'])
    expect(ev[0]).toMatchObject({ date: '2026-11-22', title: 'Entrega: Reel', url: 'https://app.ejemplo.es/creator/collaborations/c1' })
    expect(ev[0]!.description).toContain('Campaña de otoño')
  })
  it('descarta lo muy pasado y marca lo publicado', () => {
    const old = '2026-10-01'
    const recent = '2026-11-10'
    const ev = buildFeedEvents({ ...base, collabs, posts: [
      { id: 'o', title: 'Vieja', dueDate: old, collaborationId: null, status: 'published' },
      { id: 'r', title: 'Reciente', dueDate: recent, collaborationId: null, status: 'published' }
    ] })
    expect(ev.map((e) => e.uid)).toEqual(['post-r'])
    expect(ev[0]!.title).toMatch(/\(publicada\)/)
    expect(FEED_PAST_DAYS).toBe(30)
  })
  it('contenido propio: sin colaboración', () => {
    const ev = buildFeedEvents({ ...base, collabs: [], posts: [{ id: 'p', title: 'Mío', dueDate: '2026-11-21', collaborationId: null, status: 'idea' }] })
    expect(ev[0]!.description).toMatch(/propio/)
    expect(ev[0]!.url).toBe('https://app.ejemplo.es/creator/post/p')
  })
})

describe('buildFeedIcs', () => {
  it('genera un calendario iCalendar válido', () => {
    const ics = buildFeedIcs({ role: 'partner', origin: 'https://x.es', today: '2026-11-20', collabs: [], posts: [{ id: 'p', title: 'Pieza, con coma', dueDate: '2026-11-23', collaborationId: null, status: 'idea' }] }, new Date('2026-11-20T10:00:00Z'))
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics).toContain('X-WR-CALNAME:CIBERAN · Entregas')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261123')
    expect(ics).toContain('Pieza\\, con coma')
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })
})
