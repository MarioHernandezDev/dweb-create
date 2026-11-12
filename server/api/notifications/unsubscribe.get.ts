import { verifyUnsubscribeToken } from '../../utils/unsubscribe-token'
import { unsubscribePage } from '../../utils/unsubscribe-page'

/**
 * GET /api/notifications/unsubscribe?token=… — página de confirmación.
 * Abrir el enlace NO da de baja (los filtros de correo abren los enlaces para
 * analizarlos): hace falta pulsar el botón, que envía el POST.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const token = getQuery(event).token
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  if (!verifyUnsubscribeToken(token, config.adminSessionSecret)) {
    setResponseStatus(event, 400)
    return unsubscribePage('invalid')
  }
  return unsubscribePage('confirm', String(token))
})
