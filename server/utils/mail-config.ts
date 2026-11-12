/**
 * Configuración del correo saliente (SMTP), leída SOLO de variables de entorno
 * (ver .env.example y docs/16-EMAIL-SMTP.md). Aquí no hay red ni secretos
 * escritos: solo se decide si la configuración vale y cómo se cifra la conexión.
 */
export interface MailEnv {
  smtpHost?: string
  smtpPort?: string | number
  smtpUser?: string
  smtpPass?: string
  smtpFromEmail?: string
  smtpFromName?: string
}

export interface MailSettings {
  host: string
  port: number
  /** true = TLS desde el primer byte (465). false = STARTTLS obligatorio (587). */
  secure: boolean
  user: string
  pass: string
  fromEmail: string
  fromName: string
}

export type MailSettingsResult =
  | { ok: true; settings: MailSettings }
  | { ok: false; reason: 'not_configured' | 'invalid'; missing: string[] }

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value)
}

/**
 * Sin SMTP_HOST, SMTP_USER y SMTP_PASS el correo queda apagado (no es un error:
 * la app funciona igual, solo no envía). Solo se aceptan los puertos con cifrado:
 * 465 (TLS implícito) y 587 (STARTTLS obligatorio). Nunca se envía en claro.
 */
export function resolveMailSettings(env: MailEnv): MailSettingsResult {
  const host = (env.smtpHost ?? '').trim()
  const user = (env.smtpUser ?? '').trim()
  // Google muestra la contraseña de aplicación en grupos de 4 separados por espacios.
  const pass = (env.smtpPass ?? '').replace(/\s+/g, '')
  const missing = [!host && 'SMTP_HOST', !user && 'SMTP_USER', !pass && 'SMTP_PASS'].filter(Boolean) as string[]
  if (missing.length === 3) return { ok: false, reason: 'not_configured', missing }
  if (missing.length) return { ok: false, reason: 'invalid', missing }

  const port = Number(env.smtpPort || 465)
  if (port !== 465 && port !== 587) return { ok: false, reason: 'invalid', missing: ['SMTP_PORT (465 o 587)'] }

  const fromEmail = (env.smtpFromEmail ?? '').trim() || user
  if (!isValidEmail(fromEmail)) return { ok: false, reason: 'invalid', missing: ['SMTP_FROM_EMAIL'] }
  // Sin saltos de línea ni comillas: el nombre va en una cabecera.
  const fromName = ((env.smtpFromName ?? '').replace(/[\r\n"<>]/g, '').trim() || 'Ciberan').slice(0, 60)

  return { ok: true, settings: { host, port, secure: port === 465, user, pass, fromEmail, fromName } }
}

/** Códigos estables para registrar y mostrar, sin filtrar nunca credenciales ni la respuesta cruda del servidor. */
export type MailErrorCode = 'auth' | 'connection' | 'timeout' | 'tls' | 'rejected' | 'rate_limited' | 'unknown'

export function classifyMailError(err: unknown): MailErrorCode {
  const e = (err ?? {}) as { code?: string; responseCode?: number; message?: string }
  const code = e.code ?? ''
  if (code === 'EAUTH' || e.responseCode === 535 || e.responseCode === 534) return 'auth'
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return 'timeout'
  if (code === 'ETLS' || /certificate|ssl|tls/i.test(e.message ?? '')) return 'tls'
  if (code === 'ECONNECTION' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EDNS' || code === 'ESOCKET' || code === 'ECONNRESET') return 'connection'
  if (e.responseCode === 421 || e.responseCode === 450 || e.responseCode === 451 || e.responseCode === 452 || e.responseCode === 454) return 'rate_limited'
  if (code === 'EENVELOPE' || (typeof e.responseCode === 'number' && e.responseCode >= 500)) return 'rejected'
  return 'unknown'
}

/** Los fallos temporales se reintentan; los de credenciales o de destinatario, no. */
export function isRetryableMailError(code: MailErrorCode): boolean {
  return code === 'connection' || code === 'timeout' || code === 'rate_limited'
}

export const MAIL_ERROR_LABEL: Record<MailErrorCode, string> = {
  auth: 'El servidor de correo ha rechazado el usuario o la contraseña.',
  connection: 'No se ha podido conectar con el servidor de correo.',
  timeout: 'El servidor de correo no ha respondido a tiempo.',
  tls: 'No se ha podido establecer una conexión cifrada con el servidor de correo.',
  rejected: 'El servidor de correo ha rechazado el mensaje o el destinatario.',
  rate_limited: 'El servidor de correo pide esperar antes de enviar más.',
  unknown: 'Error desconocido al enviar el correo.'
}
