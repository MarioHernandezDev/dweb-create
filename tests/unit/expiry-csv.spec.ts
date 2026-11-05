import { describe, expect, it } from 'vitest'
import { expiryState } from '../../app/utils/collab-expiry'
import { csvCell, toCsv } from '../../app/utils/csv'
import { collaborationWork } from '../../app/utils/collaboration-work'

const NOW = Date.parse('2026-11-05T10:00:00Z')

describe('caducidad de propuestas', () => {
  it('solo aplica a solicitudes pendientes con fecha', () => {
    expect(expiryState('accepted', '2026-11-01T00:00:00Z', NOW).label).toBeNull()
    expect(expiryState('requested', null, NOW).label).toBeNull()
  })
  it('cuenta los días que quedan y marca la caducada', () => {
    expect(expiryState('requested', '2026-11-08T10:00:00Z', NOW)).toEqual({ expired: false, label: 'Caduca en 3 días' })
    expect(expiryState('requested', '2026-11-06T09:00:00Z', NOW)).toEqual({ expired: false, label: 'Caduca en 1 día' })
    expect(expiryState('requested', '2026-11-05T09:00:00Z', NOW)).toEqual({ expired: true, label: 'Caducada' })
  })
  it('una solicitud caducada deja de ser una tarea y pasa a esperar', () => {
    const base = { id: 'c1', status: 'requested' as const, initiatedBy: 'creator' as const, counterpartName: 'Marca X' }
    const live = collaborationWork('partner', { ...base, expiresAt: '2099-01-01T00:00:00Z' }, [], [], null, [])
    expect(live.tasks).toHaveLength(1)
    const dead = collaborationWork('partner', { ...base, expiresAt: '2020-01-01T00:00:00Z' }, [], [], null, [])
    expect(dead.tasks).toHaveLength(0)
    expect(dead.waiting?.text).toMatch(/caducado/)
  })
})

describe('CSV', () => {
  it('escapa comillas, separadores y saltos de línea', () => {
    expect(csvCell('hola; "mundo"')).toBe('"hola; ""mundo"""')
    expect(csvCell('línea1\nlínea2')).toBe('"línea1\nlínea2"')
    expect(csvCell(350)).toBe('350')
    expect(csvCell(null)).toBe('')
  })
  it('neutraliza fórmulas de hoja de cálculo', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"')
    expect(csvCell('+34 600')).toBe("'+34 600")
  })
  it('lleva BOM y CRLF', () => {
    const csv = toCsv(['A', 'B'], [[1, 'x']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toBe('﻿A;B\r\n1;x\r\n')
  })
})
