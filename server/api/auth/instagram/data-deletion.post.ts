import { randomUUID } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * POST /api/auth/instagram/data-deletion — «URL de solicitud de eliminación de
 * datos» de la app de Meta (A-R4). Meta exige responder con
 * `{ url, confirmation_code }`: la URL es una página donde la persona puede
 * comprobar el estado (`data-deletion-status`).
 *
 * Qué se borra: la cuenta de Instagram conectada y, en cascada, sus vínculos de
 * publicaciones, instantáneas y métricas. NO se borra el resto de la cuenta de
 * CIBERAN (eso es el borrado de cuenta, M-L2).
 * Seguridad: solo actúa con un `signed_request` válido. El código de confirmación
 * es aleatorio y no contiene datos personales.
 * SIN VERIFICAR con Meta real.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, `meta-data-deletion:${clientIp(event)}`, 30, 60_000)
  const config = useRuntimeConfig(event)
  const body = await readBody<{ signed_request?: string }>(event).catch(() => null)
  const verified = verifyMetaSignedRequest(body?.signed_request, config.instagramAppSecret)
  if (!verified) throw createError({ statusCode: 400, statusMessage: 'Solicitud no válida.' })

  try {
    const removed = await deleteInstagramAccountByExternalId(serverSupabaseServiceRole(event), verified.userId)
    console.info(`[meta/data-deletion] cuentas eliminadas: ${removed}`)
  } catch (err) {
    console.error('[meta/data-deletion] no se pudo borrar la cuenta:', describeErrorForLog(err))
    throw createError({ statusCode: 500, statusMessage: 'No se ha podido procesar la solicitud.' })
  }

  const code = randomUUID()
  const base = (config.appUrl || '').replace(/\/+$/, '')
  return { url: `${base}/api/auth/instagram/data-deletion-status?code=${code}`, confirmation_code: code }
})
