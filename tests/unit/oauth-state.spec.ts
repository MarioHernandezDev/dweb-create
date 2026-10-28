import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOAuthState, verifyOAuthState } from '../../server/utils/oauth-state'

// Secretos generados al vuelo: ningún valor real en los tests.
const secret = () => randomBytes(32).toString('base64')

const TEN_MINUTES = 10 * 60_000

function decodePayload(state: string) {
  return JSON.parse(Buffer.from(state.split('.')[0]!, 'base64url').toString('utf8')) as {
    creatorId: string
    nonce: string
    exp: number
  }
}

/** Sustituye el payload sin recalcular la firma: la original queda desfasada. */
function withPayload(state: string, payload: object): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${json}.${state.split('.')[1]}`
}

describe('oauth-state', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('estado válido', () => {
    it('devuelve el creatorId con el que se creó', () => {
      const key = secret()
      const state = createOAuthState('creator-123', key)
      expect(verifyOAuthState(state, key)).toBe('creator-123')
    })

    it('tiene forma payload.firma y no deja el creatorId firmado con la clave a la vista', () => {
      const key = secret()
      const state = createOAuthState('creator-123', key)
      expect(state.split('.')).toHaveLength(2)
      expect(state).not.toContain(key)
    })

    it('cada estado lleva un nonce distinto', () => {
      const key = secret()
      const a = createOAuthState('creator-123', key)
      const b = createOAuthState('creator-123', key)
      expect(a).not.toBe(b)
      expect(decodePayload(a).nonce).not.toBe(decodePayload(b).nonce)
    })
  })

  describe('caducidad', () => {
    it('es válido justo antes de los 10 minutos', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
      const key = secret()
      const state = createOAuthState('creator-123', key)

      vi.setSystemTime(Date.now() + TEN_MINUTES - 1)
      expect(verifyOAuthState(state, key)).toBe('creator-123')
    })

    it('caduca pasados los 10 minutos', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
      const key = secret()
      const state = createOAuthState('creator-123', key)

      vi.setSystemTime(Date.now() + TEN_MINUTES + 1)
      expect(verifyOAuthState(state, key)).toBeNull()
    })
  })

  describe('firma', () => {
    it('rechaza un estado firmado con otra clave', () => {
      const state = createOAuthState('creator-123', secret())
      expect(verifyOAuthState(state, secret())).toBeNull()
    })

    it('rechaza cambiar el creatorId sin poder volver a firmar', () => {
      const key = secret()
      const state = createOAuthState('creator-123', key)
      const forged = withPayload(state, { ...decodePayload(state), creatorId: 'creator-ajeno' })
      expect(verifyOAuthState(forged, key)).toBeNull()
    })

    it('rechaza alargar la caducidad sin poder volver a firmar', () => {
      const key = secret()
      const state = createOAuthState('creator-123', key)
      const forged = withPayload(state, { ...decodePayload(state), exp: Date.now() + 365 * 24 * 3_600_000 })
      expect(verifyOAuthState(forged, key)).toBeNull()
    })

    it('rechaza una firma alterada', () => {
      const key = secret()
      const [json, signature] = createOAuthState('creator-123', key).split('.')
      const altered = `${signature!.slice(0, -1)}${signature!.endsWith('A') ? 'B' : 'A'}`
      expect(verifyOAuthState(`${json}.${altered}`, key)).toBeNull()
    })
  })

  describe('formato inválido', () => {
    it.each([
      ['cadena vacía', ''],
      ['sin separador', 'sinseparador'],
      ['sin firma', 'abc.'],
      ['sin payload', '.abc'],
      ['basura', 'no.es.un.estado']
    ])('devuelve null (%s)', (_name, input) => {
      expect(verifyOAuthState(input, secret())).toBeNull()
    })

    it('devuelve null (no lanza) si la firma es válida pero el payload no es JSON', async () => {
      const { createHmac } = await import('node:crypto')
      const key = secret()
      const json = Buffer.from('esto no es json').toString('base64url')
      const signature = createHmac('sha256', key).update(json).digest('base64url')
      expect(verifyOAuthState(`${json}.${signature}`, key)).toBeNull()
    })

    it('devuelve null si el creatorId firmado no es una cadena', async () => {
      const { createHmac } = await import('node:crypto')
      const key = secret()
      const json = Buffer.from(JSON.stringify({ creatorId: 42, nonce: 'n', exp: Date.now() + 60_000 })).toString('base64url')
      const signature = createHmac('sha256', key).update(json).digest('base64url')
      expect(verifyOAuthState(`${json}.${signature}`, key)).toBeNull()
    })
  })

  describe('limitación conocida (A-R13, pendiente de decisión)', () => {
    // El estado no es de un solo uso: no hay ningún registro de nonces, así que
    // el mismo `state` sigue valiendo hasta que caduca. Este test DOCUMENTA el
    // comportamiento actual; si se añade protección contra reutilización
    // (requiere almacenamiento nuevo) debe invertirse.
    it('el mismo estado se puede verificar varias veces dentro de la ventana de 10 minutos', () => {
      const key = secret()
      const state = createOAuthState('creator-123', key)
      expect(verifyOAuthState(state, key)).toBe('creator-123')
      expect(verifyOAuthState(state, key)).toBe('creator-123')
    })
  })
})
