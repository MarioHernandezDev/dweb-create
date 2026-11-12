import { MAIL_ERROR_LABEL, isValidEmail } from '../../utils/mail-config'
import { testMail } from '../../utils/mail-templates'

/** POST /api/admin/mail-test { to } — envía un correo de prueba. Solo desde el panel de admin, 5 por cada 10 min. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const limit = checkRateLimit(`mail-test:${clientIp(event)}`, 5, 10 * 60_000)
  if (!limit.allowed) {
    setResponseHeader(event, 'Retry-After', limit.retryAfterSeconds)
    throw createError({ statusCode: 429, statusMessage: 'Demasiadas pruebas seguidas.' })
  }
  const body = await readBody<{ to?: unknown }>(event)
  if (!isValidEmail(body?.to)) throw createError({ statusCode: 400, statusMessage: 'Direccion de correo no valida.' })
  const result = await sendMail({ to: body.to, ...testMail() }, event)
  if (result.ok) return { ok: true }
  if (result.skipped) return { ok: false, code: result.reason, message: 'El correo no está configurado en el servidor (revisa las variables SMTP_*).' }
  return { ok: false, code: result.code, message: MAIL_ERROR_LABEL[result.code] }
})
