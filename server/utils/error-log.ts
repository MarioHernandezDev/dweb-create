/**
 * Resumen de un error seguro para `console.error`. Un `FetchError` de ofetch
 * incluye la URL completa en su mensaje y varias llamadas llevan
 * `access_token`/`client_secret` en la query: loguear el error tal cual los
 * dejaría en los logs del servidor. Lo usan los endpoints activos de Meta
 * (borrado de datos y desautorización).
 */
const SENSITIVE_PARAMS = /\b(access_token|refresh_token|client_secret|client_id|code|token|id_token|key|api_key)=([^&\s"'<>]+)/gi
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi

/** Quita de un texto cualquier valor de parámetro sensible (tokens, secretos) y cabeceras Bearer. */
export function redactSecrets(text: string): string {
  return text.replace(SENSITIVE_PARAMS, '$1=<redactado>').replace(BEARER, 'Bearer <redactado>')
}

export function describeErrorForLog(err: unknown): string {
  return redactSecrets(err instanceof Error ? err.message : String(err))
}
