import { serverSupabaseServiceRole } from '#supabase/server'
import { hashAdminPassword, isAdminRole, verifyAdminPassword } from '../../utils/admin-roles'

interface LoginBody {
  email?: string
  password?: string
}

// 8 intentos cada 10 minutos por IP — generoso para un despiste al teclear,
// pero cierra la puerta a fuerza bruta contra las contraseñas que protegen
// el panel de admin (acceso a emails de todos los usuarios, puede
// bloquear cuentas o regalar planes).
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000
// Tope global, sin mirar la IP. `clientIp` se fía de X-Forwarded-For, que un
// atacante puede inventarse en cada petición y así saltarse el límite por IP
// (comprobado en M-S2: 10 intentos con cabeceras distintas, todos 401). Este
// segundo cubo acota la fuerza bruta aunque eso ocurra; el coste es que
// alguien podría bloquear el login de admin unos minutos, algo asumible
// frente a que adivinen una contraseña del panel.
const MAX_GLOBAL_ATTEMPTS = 40

// Para que un correo que no existe tarde lo mismo en responder que uno que sí.
let dummyHash: string | null = null

/**
 * Entrada al panel:
 *  - con `email` + `password`: cuenta personal del equipo (tabla admin_members, con rol);
 *  - sin `email`: contraseña compartida ADMIN_PASSWORD («Administrador principal»), salvo que se haya desactivado.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const ip = clientIp(event)
  const { allowed, retryAfterSeconds } = checkRateLimit(`admin-login:${ip}`, MAX_ATTEMPTS, WINDOW_MS)
  if (!allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Demasiados intentos. Vuelve a probar en ${Math.ceil(retryAfterSeconds / 60)} minuto(s).`
    })
  }

  const global = checkRateLimit('admin-login:global', MAX_GLOBAL_ATTEMPTS, WINDOW_MS)
  if (!global.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Demasiados intentos. Vuelve a probar en ${Math.ceil(global.retryAfterSeconds / 60)} minuto(s).`
    })
  }

  const body = await readBody<LoginBody>(event)
  const password = typeof body?.password === 'string' ? body.password : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const session = await adminSession(event)

  if (email) {
    const client = serverSupabaseServiceRole(event)
    const { data } = await client.from('admin_members').select('id, name, role, active, password_hash').eq('email', email).maybeSingle<{ id: string; name: string; role: string; active: boolean; password_hash: string }>()
    dummyHash ??= hashAdminPassword('contraseña-de-relleno')
    const ok = verifyAdminPassword(password, data?.password_hash ?? dummyHash)
    if (!data || !ok || !data.active || !isAdminRole(data.role)) {
      throw createError({ statusCode: 401, statusMessage: 'Correo o contraseña incorrectos.' })
    }
    await client.from('admin_members').update({ last_login_at: new Date().toISOString() } as never).eq('id', data.id)
    await session.update({ authenticated: true, memberId: data.id })
    await logAdminAction(event, { memberId: data.id, name: data.name, role: data.role }, { action: 'inició sesión', targetType: 'session' })
    return { ok: true }
  }

  if (config.adminSharedLoginDisabled) {
    throw createError({ statusCode: 401, statusMessage: 'Entra con tu correo y tu contraseña de equipo.' })
  }
  if (!config.adminPassword) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_PASSWORD no configurada en el servidor.' })
  }
  if (!password || !timingSafeEqualString(password, config.adminPassword)) {
    throw createError({ statusCode: 401, statusMessage: 'Contraseña incorrecta.' })
  }
  await session.update({ authenticated: true, memberId: undefined })
  await logAdminAction(event, { memberId: null, name: SHARED_ADMIN_NAME, role: 'admin' }, { action: 'inició sesión con la contraseña compartida', targetType: 'session' })
  return { ok: true }
})
