/**
 * Clasificación de errores de los proveedores (Instagram/Meta y Google/YouTube)
 * y saneado de logs — A-R2. Sin Nitro ni Supabase en la lógica pura, para
 * poder probarla con tests unitarios.
 *
 * Por qué importa: hasta ahora cualquier fallo de la API acababa en un error
 * genérico ("si la conexión es antigua, reconecta"), igual para un token
 * revocado que para un corte de red. Aquí se distingue qué requiere que el
 * usuario reconecte y qué es un problema pasajero que NO debe pedirle nada.
 *
 * Códigos de Meta contrastados con la documentación oficial de errores de la
 * Graph API (190 con subcódigos 458/460/463/467, 459/464, permisos 10 y
 * 200–299, límites 4/17, temporales 1/2). Los de Google siguen las
 * respuestas OAuth estándar (`invalid_grant`) y los motivos de error de las
 * APIs de YouTube. NO se han probado contra cuentas reales (Instagram está
 * bloqueado sin app de Meta; YouTube sin ejecutar): tratar como hipótesis
 * hasta verificarlo con una cuenta de verdad.
 */

export type SocialErrorKind =
  | 'expired' // el token ha caducado o es inválido: hay que reconectar
  | 'revoked' // el usuario retiró el acceso o cambió la contraseña: hay que reconectar
  | 'missing_permissions' // falta un permiso (scope): hay que reconectar concediéndolo
  | 'user_action' // el usuario debe resolver algo en el propio proveedor (p. ej. verificación de seguridad de Facebook)
  | 'transient' // límite, cuota, corte de red o fallo del proveedor: reintentar más tarde, sin pedir nada
  | 'unknown' // error del proveedor no reconocido

export interface SocialErrorInfo {
  kind: SocialErrorKind
  /** Código corto y estable, seguro para guardar y para enseñar (nunca el mensaje crudo del proveedor). */
  code: string
  httpStatus: number | null
  /** ¿La solución es que el usuario vuelva a conectar la cuenta? */
  reconnect: boolean
}

interface ProviderErrorLike {
  response?: { status?: number; _data?: unknown }
  data?: unknown
  status?: number
  statusCode?: number
  cause?: { code?: string }
  code?: string
  name?: string
}

const RECONNECT_KINDS: SocialErrorKind[] = ['expired', 'revoked', 'missing_permissions']

function info(kind: SocialErrorKind, code: string, httpStatus: number | null): SocialErrorInfo {
  return { kind, code, httpStatus, reconnect: RECONNECT_KINDS.includes(kind) }
}

function bodyOf(err: ProviderErrorLike): Record<string, unknown> | null {
  const raw = err.data ?? err.response?._data
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
}

function statusOf(err: ProviderErrorLike): number | null {
  return err.response?.status ?? err.status ?? err.statusCode ?? null
}

/** Motivos de error de las APIs de Google (`errors[].reason` y `details[].reason`). */
function googleReasons(body: Record<string, unknown>): string[] {
  const error = body.error
  if (!error || typeof error !== 'object') return []
  const e = error as { errors?: { reason?: string }[]; details?: { reason?: string }[] }
  return [...(e.errors ?? []), ...(e.details ?? [])].map((d) => d.reason).filter((r): r is string => typeof r === 'string')
}

const NETWORK_CODES = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT']

export function classifyProviderError(err: unknown): SocialErrorInfo {
  if (!err || typeof err !== 'object') return info('unknown', 'provider_error', null)
  const e = err as ProviderErrorLike
  const status = statusOf(e)
  const body = bodyOf(e)

  // --- Meta (Graph API): { error: { code, error_subcode, ... } }
  const metaError = body?.error && typeof body.error === 'object' ? (body.error as { code?: unknown; error_subcode?: unknown }) : null
  if (metaError && typeof metaError.code === 'number') {
    const code = metaError.code
    const sub = typeof metaError.error_subcode === 'number' ? metaError.error_subcode : null
    if (code === 190) {
      if (sub === 458 || sub === 460) return info('revoked', `meta_190_${sub}`, status)
      return info('expired', sub ? `meta_190_${sub}` : 'meta_190', status)
    }
    if (code === 459 || code === 464) return info('user_action', `meta_${code}`, status)
    if (code === 10 || (code >= 200 && code <= 299)) return info('missing_permissions', `meta_${code}`, status)
    if (code === 4 || code === 17 || code === 32 || code === 613) return info('transient', `meta_rate_${code}`, status)
    if (code === 1 || code === 2) return info('transient', `meta_${code}`, status)
  }

  // --- Google OAuth (endpoint de token): { error: 'invalid_grant', ... }
  if (body && typeof body.error === 'string') {
    if (body.error === 'invalid_grant') return info('revoked', 'google_invalid_grant', status)
    if (body.error === 'invalid_client' || body.error === 'unauthorized_client') return info('unknown', `google_${body.error}`, status)
  }

  // --- Google APIs de YouTube
  if (body) {
    const reasons = googleReasons(body)
    if (reasons.some((r) => r === 'insufficientPermissions' || r === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
      return info('missing_permissions', 'google_insufficient_scope', status)
    }
    if (reasons.some((r) => ['quotaExceeded', 'rateLimitExceeded', 'userRateLimitExceeded', 'dailyLimitExceeded'].includes(r))) {
      return info('transient', 'google_quota', status)
    }
  }

  if (status === 401) return info('expired', 'http_401', status)
  if (status === 429) return info('transient', 'http_429', status)
  if (status !== null && status >= 500) return info('transient', `http_${status}`, status)

  // Sin respuesta del proveedor: red caída, DNS, tiempo agotado.
  if (status === null) {
    const netCode = e.cause?.code ?? e.code
    if (typeof netCode === 'string' && NETWORK_CODES.includes(netCode)) return info('transient', 'network', null)
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return info('transient', 'timeout', null)
    return info('transient', 'network', null)
  }

  return info('unknown', `http_${status}`, status)
}

const SENSITIVE_PARAMS = /\b(access_token|refresh_token|client_secret|client_id|code|token|id_token|key|api_key)=([^&\s"'<>]+)/gi
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi

/** Quita de un texto cualquier valor de parámetro sensible (tokens, secretos) y cabeceras Bearer. */
export function redactSecrets(text: string): string {
  return text.replace(SENSITIVE_PARAMS, '$1=<redactado>').replace(BEARER, 'Bearer <redactado>')
}

/**
 * Resumen de un error seguro para `console.error`. Un `FetchError` de ofetch
 * incluye la URL completa en su mensaje, y varias llamadas nuestras llevan
 * `access_token`/`client_secret` en la query: loguear el error tal cual los
 * dejaría en los logs del servidor.
 */
export function describeErrorForLog(err: unknown): string {
  const classified = classifyProviderError(err)
  const message = err instanceof Error ? redactSecrets(err.message) : redactSecrets(String(err))
  return `[${classified.kind}/${classified.code}${classified.httpStatus ? ` http=${classified.httpStatus}` : ''}] ${message}`
}

const PROVIDER_LABEL: Record<string, string> = { instagram: 'Instagram', youtube: 'YouTube' }

/**
 * Error HTTP para el cliente: mensaje comprensible y `data.code` estable para
 * que la interfaz decida (p. ej. enseñar "Reconectar"). Nunca incluye el
 * mensaje crudo del proveedor.
 */
export function toSocialHttpError(platform: 'instagram' | 'youtube', classified: SocialErrorInfo) {
  const label = PROVIDER_LABEL[platform]
  const base = { platform, reason: classified.kind, detail: classified.code }

  if (classified.reconnect) {
    const why = classified.kind === 'missing_permissions'
      ? `Falta un permiso de ${label}. Reconecta la cuenta para concederlo.`
      : `El acceso a ${label} ha caducado o se ha revocado. Reconecta la cuenta.`
    return createError({ statusCode: 401, statusMessage: why, data: { ...base, code: 'reconnect_required' } })
  }
  if (classified.kind === 'user_action') {
    return createError({
      statusCode: 403,
      statusMessage: `${label} pide que resuelvas un aviso de seguridad en su propia web o app antes de seguir.`,
      data: { ...base, code: 'provider_action_required' }
    })
  }
  if (classified.kind === 'transient') {
    return createError({
      statusCode: 503,
      statusMessage: `${label} no responde ahora mismo o hay un límite temporal. No hace falta reconectar: inténtalo más tarde.`,
      data: { ...base, code: 'provider_temporarily_unavailable' }
    })
  }
  return createError({ statusCode: 502, statusMessage: `${label} ha devuelto un error inesperado.`, data: { ...base, code: 'provider_error' } })
}
