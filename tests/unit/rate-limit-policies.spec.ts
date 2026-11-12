import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { RATE_POLICIES, enforceUserRateLimit, type RatePolicy } from '../../server/utils/rate-limit-policies'

/**
 * Políticas de límite por usuario + guarda estática sobre `server/api`:
 * si alguien añade un endpoint con sesión de usuario y se olvida del límite,
 * o usa una política que no existe, este test falla en CI. Es la revisión
 * sistemática automatizada de la tarea 1.6 del ROADMAP.
 */
const API_DIR = join(__dirname, '..', '..', 'server', 'api')

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? listFiles(full) : [full]
  })
}

const endpoints = listFiles(API_DIR).filter((f) => f.endsWith('.ts'))
const read = (f: string) => readFileSync(f, 'utf8')
const rel = (f: string) => relative(API_DIR, f).replace(/\\/g, '/')

describe('RATE_POLICIES', () => {
  it('todas las políticas tienen un máximo y una ventana positivos', () => {
    for (const [name, p] of Object.entries(RATE_POLICIES)) {
      expect(p.max, name).toBeGreaterThan(0)
      expect(p.windowMs, name).toBeGreaterThan(0)
    }
  })
})

describe('enforceUserRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    vi.stubGlobal('setResponseHeader', () => {})
    vi.stubGlobal('createError', (e: { statusCode: number; statusMessage: string }) => Object.assign(new Error(e.statusMessage), e))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('deja pasar hasta el máximo de la política y corta con 429 el siguiente', () => {
    const user = `u-${Math.random()}`
    const { max } = RATE_POLICIES.payments
    for (let i = 0; i < max; i++) enforceUserRateLimit({} as never, 'payments', user)
    expect(() => enforceUserRateLimit({} as never, 'payments', user)).toThrowError(expect.objectContaining({ statusCode: 429 }))
  })

  it('cada usuario y cada política tienen su propio cupo', () => {
    const a = `a-${Math.random()}`
    const b = `b-${Math.random()}`
    for (let i = 0; i < RATE_POLICIES.payments.max; i++) enforceUserRateLimit({} as never, 'payments', a)
    expect(() => enforceUserRateLimit({} as never, 'payments', b)).not.toThrow()
    expect(() => enforceUserRateLimit({} as never, 'analytics', a)).not.toThrow()
  })

  it('el cupo se recupera al pasar la ventana', () => {
    const user = `w-${Math.random()}`
    const { max, windowMs } = RATE_POLICIES['payments']
    for (let i = 0; i < max; i++) enforceUserRateLimit({} as never, 'payments', user)
    expect(() => enforceUserRateLimit({} as never, 'payments', user)).toThrow()
    vi.advanceTimersByTime(windowMs + 1)
    expect(() => enforceUserRateLimit({} as never, 'payments', user)).not.toThrow()
  })
})

describe('server/api: guarda estática', () => {
  it('todo endpoint con sesión de usuario aplica un límite de uso', () => {
    const missing = endpoints.filter((f) => /serverSupabaseUser/.test(read(f)) && !/RateLimit\(/.test(read(f))).map(rel)
    expect(missing, `Endpoints con sesión y sin límite de uso: ${missing.join(', ')}`).toEqual([])
  })

  it('las políticas usadas en los endpoints existen en RATE_POLICIES', () => {
    const used = endpoints.flatMap((f) => [...read(f).matchAll(/enforceUserRateLimit\(event, '([^']+)'/g)].map((m) => ({ file: rel(f), policy: m[1]! })))
    expect(used.length).toBeGreaterThan(0)
    const unknown = used.filter((u) => !(u.policy in RATE_POLICIES)).map((u) => `${u.file} → ${u.policy}`)
    expect(unknown).toEqual([])
    // y toda política declarada se usa en algún sitio (sin números muertos)
    const usedNames = new Set<RatePolicy | string>(used.map((u) => u.policy))
    const dead = (Object.keys(RATE_POLICIES) as RatePolicy[]).filter((p) => !usedNames.has(p))
    expect(dead).toEqual([])
  })

  it('todo endpoint de /admin comprueba la sesión de admin', () => {
    const adminFiles = endpoints.filter((f) => rel(f).startsWith('admin/'))
    expect(adminFiles.length).toBeGreaterThan(0)
    const unguarded = adminFiles.filter((f) => !/adminSession|requireAdmin/.test(read(f))).map(rel)
    expect(unguarded).toEqual([])
  })
})
