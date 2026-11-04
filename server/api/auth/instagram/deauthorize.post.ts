import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * POST /api/auth/instagram/deauthorize — «URL de devolución de llamada de
 * desautorización» de la app de Meta (A-R4). Meta la llama cuando una persona
 * quita la app desde los ajustes de Instagram. Respuesta 200 con `{ ok: true }`.
 *
 * Seguridad: solo actúa con un `signed_request` válido (firmado con el secreto de
 * la app). Sin firma válida responde 400 sin tocar nada. Nunca registra el
 * `signed_request` ni tokens.
 * SIN VERIFICAR con Meta real: requiere la app publicada y una desautorización.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, `meta-deauth:${clientIp(event)}`, 30, 60_000)
  const config = useRuntimeConfig(event)
  const body = await readBody<{ signed_request?: string }>(event).catch(() => null)
  const verified = verifyMetaSignedRequest(body?.signed_request, config.instagramAppSecret)
  if (!verified) throw createError({ statusCode: 400, statusMessage: 'Solicitud no válida.' })

  try {
    const removed = await deleteInstagramAccountByExternalId(serverSupabaseServiceRole(event), verified.userId)
    console.info(`[meta/deauthorize] cuentas desconectadas: ${removed}`)
  } catch (err) {
    console.error('[meta/deauthorize] no se pudo borrar la cuenta:', describeErrorForLog(err))
    // 500: Meta reintenta. No se confirma un borrado que no ocurrió.
    throw createError({ statusCode: 500, statusMessage: 'No se ha podido procesar la solicitud.' })
  }
  return { ok: true }
})
