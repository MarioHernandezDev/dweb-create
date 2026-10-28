import { afterEach, describe, expect, it, vi } from 'vitest'
import { revokeGoogleToken } from '../../server/utils/token-revoke'

const respond = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue({ status, json: async () => (body === undefined ? Promise.reject(new Error('sin cuerpo')) : body) }) as unknown as typeof fetch

afterEach(() => vi.restoreAllMocks())

describe('revokeGoogleToken', () => {
  it('200 -> revocado y confirmado', async () => {
    expect(await revokeGoogleToken('t', respond(200, {}))).toEqual({ outcome: 'revoked', code: 'google_revoked' })
  })

  it('400 invalid_token -> el token ya no era válido (nada que revocar)', async () => {
    expect(await revokeGoogleToken('t', respond(400, { error: 'invalid_token' }))).toEqual({ outcome: 'already_invalid', code: 'google_invalid_token' })
  })

  it('400 con otro error -> NO se puede afirmar que se revocó', async () => {
    const result = await revokeGoogleToken('t', respond(400, { error: 'invalid_request' }))
    expect(result).toEqual({ outcome: 'unconfirmed', code: 'google_http_400' })
  })

  it.each([401, 403, 429, 500, 503])('%s -> sin confirmar', async (status) => {
    expect((await revokeGoogleToken('t', respond(status, {}))).outcome).toBe('unconfirmed')
  })

  it('respuesta sin cuerpo JSON -> sin confirmar, no lanza', async () => {
    expect((await revokeGoogleToken('t', respond(502))).outcome).toBe('unconfirmed')
  })

  it('fallo de red -> sin confirmar, con código "network"', async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch
    expect(await revokeGoogleToken('t', failing)).toEqual({ outcome: 'unconfirmed', code: 'network' })
  })

  it('manda el token por POST en formato de formulario a la URL de revocación de Google', async () => {
    const fetchMock = respond(200, {})
    await revokeGoogleToken('MI-TOKEN-DE-PRUEBA', fetchMock)
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://oauth2.googleapis.com/revoke')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(String(init.body)).toBe('token=MI-TOKEN-DE-PRUEBA')
  })

  it('el resultado nunca contiene el token', async () => {
    const result = await revokeGoogleToken('TOKEN-SECRETO', respond(500, { error: 'x' }))
    expect(JSON.stringify(result)).not.toContain('TOKEN-SECRETO')
  })
})
