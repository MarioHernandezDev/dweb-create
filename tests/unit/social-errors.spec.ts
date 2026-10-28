import { describe, expect, it } from 'vitest'
import { classifyProviderError, describeErrorForLog, redactSecrets } from '../../server/utils/social-errors'

/** Imita un `FetchError` de ofetch: respuesta con estado y cuerpo ya parseado en `data`. */
function fetchError(status: number, data: unknown, message = 'fetch failed') {
  return Object.assign(new Error(message), { response: { status }, data })
}

const meta = (code: number, error_subcode?: number) => fetchError(400, { error: { message: 'x', type: 'OAuthException', code, error_subcode } })

describe('classifyProviderError', () => {
  describe('Meta (Graph API)', () => {
    it.each([
      [190, undefined, 'expired', 'meta_190'],
      [190, 463, 'expired', 'meta_190_463'],
      [190, 467, 'expired', 'meta_190_467'],
      [190, 458, 'revoked', 'meta_190_458'],
      [190, 460, 'revoked', 'meta_190_460']
    ] as const)('código %s / subcódigo %s -> %s', (code, sub, kind, expectedCode) => {
      const result = classifyProviderError(meta(code, sub))
      expect(result.kind).toBe(kind)
      expect(result.code).toBe(expectedCode)
      expect(result.reconnect).toBe(true)
    })

    it.each([10, 200, 230, 299])('código %s -> faltan permisos (reconectar)', (code) => {
      const result = classifyProviderError(meta(code))
      expect(result.kind).toBe('missing_permissions')
      expect(result.reconnect).toBe(true)
    })

    it.each([459, 464])('código %s -> el usuario debe actuar en el proveedor (no es "reconectar")', (code) => {
      const result = classifyProviderError(meta(code))
      expect(result.kind).toBe('user_action')
      expect(result.reconnect).toBe(false)
    })

    it.each([1, 2, 4, 17, 32, 613])('código %s -> temporal, no pide reconectar', (code) => {
      const result = classifyProviderError(meta(code))
      expect(result.kind).toBe('transient')
      expect(result.reconnect).toBe(false)
    })
  })

  describe('Google / YouTube', () => {
    it('invalid_grant al refrescar el token -> acceso caducado o revocado (reconectar)', () => {
      const result = classifyProviderError(fetchError(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }))
      expect(result.kind).toBe('revoked')
      expect(result.reconnect).toBe(true)
    })

    it.each(['insufficientPermissions', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT'])('403 con motivo %s -> faltan permisos (reconectar)', (reason) => {
      const result = classifyProviderError(fetchError(403, { error: { code: 403, errors: [{ reason }], details: [{ reason }] } }))
      expect(result.kind).toBe('missing_permissions')
      expect(result.reconnect).toBe(true)
    })

    it.each(['quotaExceeded', 'rateLimitExceeded', 'dailyLimitExceeded'])('403 con motivo %s -> cuota, temporal (no reconectar)', (reason) => {
      const result = classifyProviderError(fetchError(403, { error: { code: 403, errors: [{ reason }] } }))
      expect(result.kind).toBe('transient')
      expect(result.reconnect).toBe(false)
    })

    it('un 403 sin motivo conocido NO se trata como "reconectar"', () => {
      const result = classifyProviderError(fetchError(403, { error: { code: 403, errors: [{ reason: 'forbidden' }] } }))
      expect(result.reconnect).toBe(false)
    })

    it('invalid_client es un problema de configuración nuestro, no del usuario', () => {
      const result = classifyProviderError(fetchError(401, { error: 'invalid_client' }))
      expect(result.kind).toBe('unknown')
      expect(result.reconnect).toBe(false)
    })
  })

  describe('HTTP genérico y red', () => {
    it('401 sin cuerpo reconocible -> caducado (reconectar)', () => {
      expect(classifyProviderError(fetchError(401, null))).toMatchObject({ kind: 'expired', reconnect: true })
    })

    it('429 -> temporal', () => {
      expect(classifyProviderError(fetchError(429, null))).toMatchObject({ kind: 'transient', reconnect: false })
    })

    it.each([500, 502, 503, 504])('%s -> temporal', (status) => {
      expect(classifyProviderError(fetchError(status, null))).toMatchObject({ kind: 'transient', reconnect: false })
    })

    it.each(['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'])('fallo de red %s -> temporal, no pide reconectar', (code) => {
      const err = Object.assign(new Error('fetch failed'), { cause: { code } })
      expect(classifyProviderError(err)).toMatchObject({ kind: 'transient', code: 'network', reconnect: false })
    })

    it('TimeoutError -> temporal', () => {
      const err = Object.assign(new Error('timeout'), { name: 'TimeoutError' })
      expect(classifyProviderError(err)).toMatchObject({ kind: 'transient', code: 'timeout' })
    })

    it('un 404 desconocido no pide reconectar', () => {
      expect(classifyProviderError(fetchError(404, null))).toMatchObject({ kind: 'unknown', reconnect: false })
    })

    it.each([null, undefined, 'texto', 42])('entrada rara (%s) no lanza y no pide reconectar', (input) => {
      const result = classifyProviderError(input)
      expect(result.reconnect).toBe(false)
    })
  })
})

describe('redactSecrets / describeErrorForLog', () => {
  it('oculta tokens y secretos en una URL', () => {
    const url = 'https://graph.instagram.com/v21.0/me?fields=followers_count&access_token=IGQVJ-super-secreto&client_secret=abc123'
    const out = redactSecrets(`[GET] "${url}": 400 Bad Request`)
    expect(out).not.toContain('IGQVJ-super-secreto')
    expect(out).not.toContain('abc123')
    expect(out).toContain('access_token=<redactado>')
    expect(out).toContain('fields=followers_count')
  })

  it('oculta el code de autorización y la cabecera Bearer', () => {
    const out = redactSecrets('code=4/0AbCdEf&state=xyz Authorization: Bearer ya29.a0AfH6SMBtoken')
    expect(out).not.toContain('4/0AbCdEf')
    expect(out).not.toContain('ya29.a0AfH6SMBtoken')
  })

  it('no toca texto sin secretos', () => {
    expect(redactSecrets('fallo de red normal')).toBe('fallo de red normal')
  })

  it('el resumen para el log incluye clasificación y NO el token del mensaje', () => {
    const err = Object.assign(new Error('[GET] "https://graph.instagram.com/me?access_token=TOKEN-SECRETO": 400'), {
      response: { status: 400 },
      data: { error: { code: 190, error_subcode: 463 } }
    })
    const line = describeErrorForLog(err)
    expect(line).toContain('expired/meta_190_463')
    expect(line).not.toContain('TOKEN-SECRETO')
  })
})
