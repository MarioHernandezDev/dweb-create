interface LoginBody {
  password?: string
}

// 8 intentos cada 10 minutos por IP — generoso para un despiste al teclear,
// pero cierra la puerta a fuerza bruta contra la única contraseña que
// protege el panel de admin (acceso a emails de todos los usuarios, puede
// bloquear cuentas o regalar planes).
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.adminPassword) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_PASSWORD no configurada en el servidor.' })
  }

  const ip = clientIp(event)
  const { allowed, retryAfterSeconds } = checkRateLimit(`admin-login:${ip}`, MAX_ATTEMPTS, WINDOW_MS)
  if (!allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Demasiados intentos. Vuelve a probar en ${Math.ceil(retryAfterSeconds / 60)} minuto(s).`
    })
  }

  const body = await readBody<LoginBody>(event)
  if (!body?.password || !timingSafeEqualString(body.password, config.adminPassword)) {
    throw createError({ statusCode: 401, statusMessage: 'Contraseña incorrecta.' })
  }

  const session = await adminSession(event)
  await session.update({ authenticated: true })
  return { ok: true }
})
