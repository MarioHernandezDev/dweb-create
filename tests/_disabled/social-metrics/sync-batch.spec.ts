import { describe, expect, it } from 'vitest'
import {
  bearerToken, instagramRefreshDecision, mapWithConcurrency, summarizeSync, syncCutoffs, verifyCronSecret,
  SYNC_MIN_INTERVAL_MS, SYNC_RETRY_SPACING_MS, type SyncAccountResult
} from '../../../server/_disabled/social-metrics/utils/sync-batch'

const NOW = new Date('2026-10-28T12:00:00.000Z')
const SECRET = 'secreto-de-prueba-largo-y-aleatorio'

describe('bearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['Bearer   abc  ', 'abc']
  ])('extrae el token de %j', (header, expected) => {
    expect(bearerToken(header)).toBe(expected)
  })

  it.each([undefined, '', 'Basic abc', 'Bearer', 'Bearer ', 'abc'])('devuelve null para %j', (header) => {
    expect(bearerToken(header)).toBeNull()
  })
})

describe('verifyCronSecret', () => {
  it('acepta el secreto correcto', () => {
    expect(verifyCronSecret(`Bearer ${SECRET}`, SECRET)).toBe(true)
  })

  it.each([
    ['secreto incorrecto', 'Bearer otro-secreto'],
    ['sin cabecera', undefined],
    ['sin prefijo Bearer', SECRET],
    ['vacío', 'Bearer '],
    ['prefijo del secreto', `Bearer ${SECRET.slice(0, 10)}`],
    ['secreto más largo', `Bearer ${SECRET}extra`]
  ])('rechaza: %s', (_name, header) => {
    expect(verifyCronSecret(header, SECRET)).toBe(false)
  })

  it.each([undefined, ''])('FALLA CERRADO: sin secreto configurado (%j) nunca autoriza', (secret) => {
    expect(verifyCronSecret(`Bearer ${SECRET}`, secret)).toBe(false)
    expect(verifyCronSecret('Bearer ', secret)).toBe(false)
    expect(verifyCronSecret(undefined, secret)).toBe(false)
  })
})

describe('syncCutoffs', () => {
  it('calcula los límites a partir de la hora dada', () => {
    const c = syncCutoffs(NOW)
    expect(c.now).toBe('2026-10-28T12:00:00.000Z')
    expect(new Date(c.syncedBefore).getTime()).toBe(NOW.getTime() - SYNC_MIN_INTERVAL_MS)
    expect(new Date(c.attemptedBefore).getTime()).toBe(NOW.getTime() - SYNC_RETRY_SPACING_MS)
  })
})

describe('instagramRefreshDecision', () => {
  const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString()

  it.each([
    [inDays(59), 'wait'], // token recién renovado
    [inDays(30), 'wait'],
    [inDays(15), 'wait'],
    [inDays(14), 'refresh'], // entra en la ventana de renovación
    [inDays(7), 'refresh'],
    [inDays(0.5), 'refresh'], // a punto de caducar pero todavía válido
    [inDays(0), 'expired'],
    [inDays(-3), 'expired']
  ] as const)('caduca %s -> %s', (expires, expected) => {
    expect(instagramRefreshDecision(expires, NOW)).toBe(expected)
  })

  it('no renueva un token con menos de 24 h de vida (límite de Meta)', () => {
    // Quedan 59 días y 23 h => lleva 1 h de vida: demasiado joven aunque la ventana fuese amplia.
    const young = new Date(NOW.getTime() + 60 * 86_400_000 - 3_600_000).toISOString()
    expect(instagramRefreshDecision(young, NOW)).toBe('wait')
  })

  it.each([null, 'no es una fecha'])('sin fecha válida (%j) no puede decidir', (value) => {
    expect(instagramRefreshDecision(value, NOW)).toBe('unknown')
  })
})

describe('summarizeSync', () => {
  const results: SyncAccountResult[] = [
    { platform: 'youtube', outcome: 'ok', code: 'ok' },
    { platform: 'youtube', outcome: 'ok', code: 'ok' },
    { platform: 'instagram', outcome: 'failed', code: 'meta_190' },
    { platform: 'instagram', outcome: 'failed', code: 'network' },
    { platform: 'youtube', outcome: 'skipped_locked', code: 'locked' }
  ]

  it('cuenta procesadas, correctas, fallidas y omitidas', () => {
    const s = summarizeSync(results, 1000, 4500)
    expect(s).toMatchObject({ processed: 4, ok: 2, failed: 2, skipped: 1, durationMs: 3500 })
    expect(s.byCode).toEqual({ ok: 2, meta_190: 1, network: 1, locked: 1 })
  })

  it('con una lista vacía devuelve ceros', () => {
    expect(summarizeSync([], 0, 0)).toEqual({ processed: 0, ok: 0, failed: 0, skipped: 0, byCode: {}, durationMs: 0 })
  })

  it('el resumen solo tiene recuentos: sin ids de cuenta ni datos personales', () => {
    const json = JSON.stringify(summarizeSync(results, 0, 1))
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(['byCode', 'durationMs', 'failed', 'ok', 'processed', 'skipped'])
  })
})

describe('mapWithConcurrency', () => {
  it('conserva el orden de los resultados', async () => {
    const out = await mapWithConcurrency([30, 5, 20, 1], 2, async (ms) => {
      await new Promise((r) => setTimeout(r, ms))
      return ms
    })
    expect(out).toEqual([30, 5, 20, 1])
  })

  it('no supera el máximo de tareas simultáneas', async () => {
    let running = 0
    let peak = 0
    await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, 5))
      running--
    })
    expect(peak).toBeLessThanOrEqual(3)
    expect(peak).toBeGreaterThan(1)
  })

  it('con una lista vacía no hace nada', async () => {
    expect(await mapWithConcurrency([], 3, async () => 1)).toEqual([])
  })
})
