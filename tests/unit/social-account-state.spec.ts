import { describe, expect, it } from 'vitest'
import { failurePatch, successPatch } from '../../server/utils/social-account-state'
import type { SocialErrorInfo } from '../../server/utils/social-errors'

const NOW = new Date('2026-10-28T12:00:00.000Z')
const info = (kind: SocialErrorInfo['kind'], code = 'x'): SocialErrorInfo => ({ kind, code, httpStatus: null, reconnect: ['expired', 'revoked', 'missing_permissions'].includes(kind) })

describe('successPatch', () => {
  it('deja la cuenta connected, sin errores y con la hora de la sincronización', () => {
    expect(successPatch(NOW)).toEqual({
      status: 'connected', last_error_code: null, last_error_at: null,
      last_synced_at: '2026-10-28T12:00:00.000Z', last_sync_attempt_at: '2026-10-28T12:00:00.000Z'
    })
  })
})

describe('failurePatch', () => {
  it.each(['expired', 'revoked', 'missing_permissions'] as const)('un fallo %s cambia el estado y anota el error', (kind) => {
    expect(failurePatch(info(kind, 'meta_190'), NOW)).toEqual({
      status: kind, last_error_code: 'meta_190',
      last_error_at: '2026-10-28T12:00:00.000Z', last_sync_attempt_at: '2026-10-28T12:00:00.000Z'
    })
  })

  it.each(['transient', 'unknown', 'user_action'] as const)('un fallo %s NO cambia el estado (solo anota el error)', (kind) => {
    const patch = failurePatch(info(kind, 'network'), NOW)
    expect(patch).not.toHaveProperty('status')
    expect(patch).toMatchObject({ last_error_code: 'network', last_error_at: '2026-10-28T12:00:00.000Z' })
  })

  it('un fallo nunca marca la sincronización como correcta', () => {
    expect(failurePatch(info('transient'), NOW)).not.toHaveProperty('last_synced_at')
  })

  it('no guarda nada que no sea un código corto (sin mensajes del proveedor)', () => {
    const patch = failurePatch(info('expired', 'google_invalid_grant'), NOW)
    expect(Object.keys(patch).sort()).toEqual(['last_error_at', 'last_error_code', 'last_sync_attempt_at', 'status'])
  })
})
