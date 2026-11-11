import type { H3Event } from 'h3'
import { enforceRateLimit } from './rate-limit'

/**
 * Políticas de límite de uso por usuario para los endpoints de `server/api`
 * con sesión. Un único sitio con los números, para ajustarlos sin cazarlos
 * por 15 archivos. La clave es `<política>:<id de usuario>`, así que todos los
 * endpoints de una misma política comparten cupo por usuario.
 *
 * Las cifras están pensadas para no molestar a un uso normal (una pantalla
 * puede lanzar varias lecturas a la vez) y cortar bucles o abuso: protegen
 * las cuotas de YouTube/Instagram, los costes de Stripe y la CPU.
 *
 * Limitación conocida (Q3, ver rate-limit.ts): el contador vive en la memoria
 * del proceso, así que vale con un único proceso Nitro.
 */
export const RATE_POLICIES = {
  /** Sincronizaciones que llaman a APIs externas con los tokens del creador. */
  'social-sync': { max: 10, windowMs: 60_000 },
  /** Lecturas de analíticas de redes (varias por pantalla). */
  'social-read': { max: 60, windowMs: 60_000 },
  /** Desvincular cuentas o publicaciones. */
  'social-write': { max: 20, windowMs: 60_000 },
  /** Inicio de los flujos OAuth con Instagram/YouTube. */
  'oauth-start': { max: 10, windowMs: 60_000 },
  /** Todo lo que abre pagos o sesiones de Stripe. */
  payments: { max: 10, windowMs: 60_000 },
  /** Métricas propias (varias consultas por petición). */
  analytics: { max: 30, windowMs: 60_000 },
  /** Eliminación de cuenta. */
  account: { max: 5, windowMs: 60_000 },
  /** Tendencias (lectura pesada). */
  'ml-trends': { max: 30, windowMs: 60_000 }
} as const

export type RatePolicy = keyof typeof RATE_POLICIES

/** Aplica la política al usuario; si se supera, corta con 429 y `Retry-After`. */
export function enforceUserRateLimit(event: H3Event, policy: RatePolicy, userId: string): void {
  const { max, windowMs } = RATE_POLICIES[policy]
  enforceRateLimit(event, `${policy}:${userId}`, max, windowMs)
}
