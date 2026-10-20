import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'

interface AdminSessionData {
  authenticated?: boolean
}

/**
 * Sesión del panel de admin (/admin) — una cookie sellada (useSession, de
 * h3) independiente de las cuentas de Supabase, a propósito: el equipo
 * entra con una contraseña única, no con un login de la app. El secreto que
 * cifra la cookie (`adminSessionSecret`) es distinto de la contraseña en sí
 * (`adminPassword`) — cambiar uno no afecta al otro.
 */
export function adminSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.adminSessionSecret || config.adminSessionSecret.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_SESSION_SECRET no configurado (mínimo 32 caracteres).' })
  }
  return useSession<AdminSessionData>(event, {
    password: config.adminSessionSecret,
    name: 'feedma-admin-session',
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: 'strict', secure: !import.meta.dev }
  })
}

/** A usar al principio de cada ruta de /api/admin/* que no sea login. */
export async function requireAdmin(event: H3Event) {
  const session = await adminSession(event)
  if (!session.data.authenticated) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado en el panel de admin.' })
  }
}

/** Compara en tiempo constante — evita que el tiempo de respuesta filtre cuánto del password acertaste. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}
