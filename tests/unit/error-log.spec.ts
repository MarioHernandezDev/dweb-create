import { describe, expect, it } from 'vitest'
import { describeErrorForLog, redactSecrets } from '../../server/utils/error-log'

describe('describeErrorForLog', () => {
  it('oculta tokens y secretos en la query', () => {
    const err = new Error('GET https://graph.facebook.com/me?access_token=ABC123&fields=id falló')
    const out = describeErrorForLog(err)
    expect(out).not.toContain('ABC123')
    expect(out).toContain('access_token=<redactado>')
    expect(out).toContain('fields=id')
  })
  it('oculta cabeceras Bearer y admite valores que no son Error', () => {
    expect(redactSecrets('Authorization: Bearer abc.def-123')).toBe('Authorization: Bearer <redactado>')
    expect(describeErrorForLog('client_secret=zzz')).toBe('client_secret=<redactado>')
  })
})
