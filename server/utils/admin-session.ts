import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import { type AdminRole, isAdminRole, roleAtLeast } from './admin-roles'

interface AdminSessionData {
  authenticated?: boolean
  /** Presente si entró con su cuenta personal; ausente si entró con la contraseña compartida (o con una sesión anterior). */
  memberId?: string
}

/** Quién está detrás de la sesión de admin. `memberId` es null con la contraseña compartida. */
export interface AdminActor {
  memberId: string | null
  name: string
  role: AdminRole
}

export const SHARED_ADMIN_NAME = 'Administrador principal'

/**
 * Sesión del panel de admin (/admin) — una cookie sellada (useSession, de
 * h3) independiente de las cuentas de Supabase, a propósito. Se entra con la
 * cuenta personal del equipo (tabla `admin_members`, con rol) o, mientras no
 * se desactive, con la contraseña compartida `ADMIN_PASSWORD`, que actúa como
 * «Administrador principal». El secreto que cifra la cookie
 * (`adminSessionSecret`) es distinto de la contraseña en sí.
 */
export function adminSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.adminSessionSecret || config.adminSessionSecret.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_SESSION_SECRET no configurado (mínimo 32 caracteres).' })
  }
  return useSession<AdminSessionData>(event, {
    password: config.adminSessionSecret,
    name: 'ciberan-admin-session',
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: 'strict', secure: !import.meta.dev }
  })
}

/** La persona de la sesión, o null. Con cuenta personal se vuelve a mirar la base: si la desactivan o le cambian el rol, se nota en la siguiente petición. */
export async function getAdminActor(event: H3Event): Promise<AdminActor | null> {
  const session = await adminSession(event)
  if (!session.data.authenticated) return null
  if (!session.data.memberId) return { memberId: null, name: SHARED_ADMIN_NAME, role: 'admin' }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('admin_members').select('name, role, active').eq('id', session.data.memberId).maybeSingle<{ name: string; role: string; active: boolean }>()
  if (error) throw createError({ statusCode: 500, statusMessage: 'No se ha podido comprobar la sesión del equipo.' })
  if (!data || !data.active || !isAdminRole(data.role)) {
    await session.clear()
    return null
  }
  return { memberId: session.data.memberId, name: data.name, role: data.role }
}

/** A usar al principio de cada ruta de /api/admin/* que no sea login. `min` es el rol mínimo que exige la acción. */
export async function requireAdmin(event: H3Event, min: AdminRole = 'viewer'): Promise<AdminActor> {
  const actor = await getAdminActor(event)
  if (!actor) throw createError({ statusCode: 401, statusMessage: 'No autenticado en el panel de admin.' })
  if (!roleAtLeast(actor.role, min)) {
    throw createError({ statusCode: 403, statusMessage: 'Sin permiso', message: 'Tu rol no permite esta acción.' })
  }
  return actor
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
