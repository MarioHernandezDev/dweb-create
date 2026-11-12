import { serverSupabaseServiceRole } from '#supabase/server'
import { verifyUnsubscribeToken } from '../../utils/unsubscribe-token'
import { unsubscribePage } from '../../utils/unsubscribe-page'

/**
 * POST /api/notifications/unsubscribe?token=… — apaga los avisos por correo.
 * Lo llaman el botón de la página de baja y los propios clientes de correo
 * («darse de baja» con un clic, RFC 8058), por eso no exige sesión: la
 * autorización es la firma del token. Solo puede apagar; nunca encender.
 */
export default defineEventHandler(async (event) => {
  const limit = checkRateLimit(`unsubscribe:${clientIp(event)}`, 20, 10 * 60_000)
  if (!limit.allowed) throw createError({ statusCode: 429, statusMessage: 'Demasiados intentos.' })
  const config = useRuntimeConfig(event)
  const profileId = verifyUnsubscribeToken(getQuery(event).token, config.adminSessionSecret)
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (!profileId) {
    setResponseStatus(event, 400)
    return unsubscribePage('invalid')
  }
  const client = serverSupabaseServiceRole(event)
  const { error } = await client.from('notification_preferences' as never)
    .upsert({ profile_id: profileId, email_enabled: false, updated_at: new Date().toISOString() } as never, { onConflict: 'profile_id' })
  if (error) {
    setResponseStatus(event, 500)
    return unsubscribePage('error')
  }
  return unsubscribePage('done')
})
