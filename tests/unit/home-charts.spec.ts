import { describe, expect, it } from 'vitest'
import { overdueCount, phaseShares, weekDays, weekDaysSummary } from '../../app/utils/home-charts'
import type { PostStatus } from '../../app/types'

const post = (dueInDays: number, status: PostStatus) => ({ dueInDays, status })
const monday = new Date(2026, 10, 2) // lunes 2 de noviembre de 2026

describe('weekDays', () => {
  it('devuelve 7 días empezando hoy y marca solo el primero como hoy', () => {
    const days = weekDays([], monday)
    expect(days).toHaveLength(7)
    expect(days.map((d) => d.today)).toEqual([true, false, false, false, false, false, false])
    expect(days[0]!.label).toBe('lun')
    expect(days[6]!.label).toBe('dom')
  })

  it('separa pendientes y publicadas por día, y un día vacío es 0 (no un hueco)', () => {
    const days = weekDays([post(0, 'idea'), post(0, 'published'), post(0, 'scheduled'), post(3, 'in_production')], monday)
    expect(days[0]).toMatchObject({ pending: 2, done: 1 })
    expect(days[3]).toMatchObject({ pending: 1, done: 0 })
    expect(days[1]).toMatchObject({ pending: 0, done: 0 })
  })

  it('ignora lo que cae fuera de los 7 días (pasado y futuro lejano)', () => {
    const days = weekDays([post(-2, 'idea'), post(7, 'idea'), post(30, 'idea')], monday)
    expect(days.every((d) => d.pending === 0 && d.done === 0)).toBe(true)
  })
})

describe('overdueCount', () => {
  it('cuenta fecha pasada y no publicada', () => {
    expect(overdueCount([post(-1, 'idea'), post(-5, 'published'), post(0, 'idea'), post(-3, 'scheduled')])).toBe(2)
  })
})

describe('phaseShares', () => {
  it('reparte en orden de avance y los porcentajes suman 100', () => {
    const shares = phaseShares([{ status: 'idea' }, { status: 'idea' }, { status: 'published' }, { status: 'scheduled' }])
    expect(shares.map((s) => s.status)).toEqual(['idea', 'in_production', 'ready_for_review', 'scheduled', 'published'])
    expect(shares.map((s) => s.count)).toEqual([2, 0, 0, 1, 1])
    expect(shares.reduce((sum, s) => sum + s.pct, 0)).toBeCloseTo(100)
  })

  it('sin publicaciones, todo es 0 (sin dividir por cero)', () => {
    expect(phaseShares([]).every((s) => s.count === 0 && s.pct === 0)).toBe(true)
  })

  it('no cuenta «fuera de plazo»: no es una fase del tablero', () => {
    const shares = phaseShares([{ status: 'overdue' }, { status: 'idea' }])
    expect(shares.reduce((sum, s) => sum + s.count, 0)).toBe(1)
  })
})

describe('weekDaysSummary', () => {
  it('describe cada día con texto y usa singular/plural', () => {
    const text = weekDaysSummary(weekDays([post(0, 'idea'), post(1, 'idea'), post(1, 'idea')], monday))
    expect(text).toContain('1 entrega')
    expect(text).toContain('2 entregas')
    expect(text).toContain('sin entregas')
  })
})
