import { describe, expect, it } from 'vitest'
import { groupNotifications } from '../../app/utils/notifications'

const base = { type: 'collaboration_requested', title: 'Nueva solicitud', body: 'Alma Beauty te contacta', link: '/creator/requests', readAt: null }
let n = 0
const make = (over: Partial<typeof base> & { createdAt?: string } = {}) => ({ ...base, id: `n${++n}`, createdAt: '2026-10-01T10:00:00Z', ...over })

describe('groupNotifications', () => {
  it('agrupa avisos idénticos con su contador e ids', () => {
    const list = [make(), make(), make()]
    const groups = groupNotifications(list)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.count).toBe(3)
    expect(groups[0]!.ids).toEqual(list.map((x) => x.id))
    expect(groups[0]!.unread).toBe(true)
  })

  it('no mezcla avisos con distinto texto, destino o tipo', () => {
    const groups = groupNotifications([make(), make({ body: 'Otra marca' }), make({ link: '/otro' }), make({ type: 'offer_received' })])
    expect(groups).toHaveLength(4)
  })

  it('no esconde un aviso nuevo dentro de otros ya leídos', () => {
    const groups = groupNotifications([make(), make({ readAt: '2026-10-01T11:00:00Z' }), make({ readAt: '2026-10-01T11:00:00Z' })])
    expect(groups).toHaveLength(2)
    expect(groups[0]!.unread).toBe(true)
    expect(groups[1]!.count).toBe(2)
    expect(groups[1]!.unread).toBe(false)
  })

  it('conserva el orden y toma los datos del más reciente (el primero)', () => {
    const newest = make({ createdAt: '2026-10-03T10:00:00Z' })
    const groups = groupNotifications([newest, make({ title: 'Otro' }), make({ createdAt: '2026-10-01T10:00:00Z' })])
    expect(groups.map((g) => g.title)).toEqual(['Nueva solicitud', 'Otro'])
    expect(groups[0]!.createdAt).toBe('2026-10-03T10:00:00Z')
  })

  it('lista vacía → sin grupos', () => {
    expect(groupNotifications([])).toEqual([])
  })
})
