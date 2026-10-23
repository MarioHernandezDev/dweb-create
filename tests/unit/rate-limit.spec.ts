import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from '../../server/utils/rate-limit'

/**
 * El límite de intentos del login de admin (server/api/admin/login.post.ts)
 * depende enteramente de esta ventana deslizante — si falla aquí, falla la
 * única defensa contra fuerza bruta de ese endpoint.
 */
describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('permite hasta el máximo de intentos dentro de la ventana', () => {
    const key = `key-${Math.random()}`
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true)
    }
  })

  it('bloquea el intento que excede el máximo', () => {
    const key = `key-${Math.random()}`
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000)
    const sixth = checkRateLimit(key, 5, 60_000)
    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('las claves (IPs) son independientes entre sí', () => {
    const keyA = `a-${Math.random()}`
    const keyB = `b-${Math.random()}`
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60_000)
    // keyA ya está al límite; keyB no debería verse afectada.
    expect(checkRateLimit(keyA, 5, 60_000).allowed).toBe(false)
    expect(checkRateLimit(keyB, 5, 60_000).allowed).toBe(true)
  })

  it('los intentos fuera de la ventana se olvidan (ventana deslizante real)', () => {
    const key = `window-${Math.random()}`
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000)
    expect(checkRateLimit(key, 5, 60_000).allowed).toBe(false)

    // Avanza más allá de la ventana entera: los 5 intentos viejos ya no cuentan.
    vi.advanceTimersByTime(60_001)
    expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true)
  })

  it('retryAfterSeconds baja a medida que se acerca el fin de la ventana', () => {
    const key = `retry-${Math.random()}`
    checkRateLimit(key, 1, 60_000)
    const blocked1 = checkRateLimit(key, 1, 60_000)
    expect(blocked1.retryAfterSeconds).toBe(60)

    vi.advanceTimersByTime(30_000)
    const blocked2 = checkRateLimit(key, 1, 60_000)
    expect(blocked2.retryAfterSeconds).toBe(30)
  })
})
