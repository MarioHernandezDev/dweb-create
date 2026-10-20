interface LoginBody {
  password?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.adminPassword) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_PASSWORD no configurada en el servidor.' })
  }

  const body = await readBody<LoginBody>(event)
  if (!body?.password || !timingSafeEqualString(body.password, config.adminPassword)) {
    throw createError({ statusCode: 401, statusMessage: 'Contraseña incorrecta.' })
  }

  const session = await adminSession(event)
  await session.update({ authenticated: true })
  return { ok: true }
})
