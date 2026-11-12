import nodemailer, { type Transporter } from 'nodemailer'
import type { H3Event } from 'h3'
import { type MailErrorCode, type MailSettings, classifyMailError, isRetryableMailError, isValidEmail, resolveMailSettings } from './mail-config'

/**
 * Correo saliente de CIBERAN por SMTP propio (docs/16-EMAIL-SMTP.md).
 *
 *  - Credenciales solo desde variables de entorno (runtimeConfig privado).
 *  - Siempre cifrado: 465 con TLS implícito o 587 con STARTTLS obligatorio,
 *    TLS 1.2 como mínimo y certificado verificado.
 *  - `sendMail` NUNCA lanza: devuelve un resultado. Un correo que falla no debe
 *    tumbar la acción que lo dispara.
 *  - Sin configuración, queda apagado (`skipped`) y la app sigue igual.
 *  - No se registran destinatarios, contenido ni credenciales: solo códigos.
 *
 * Los correos de registro, verificación y recuperación de contraseña los envía
 * Supabase Auth con este MISMO buzón, configurado en su panel (ver el documento).
 */
export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
  /** Enlace de baja: añade las cabeceras List-Unsubscribe que piden Gmail y Yahoo a los correos automáticos. */
  unsubscribeUrl?: string | null
  /** Correo generado por el sistema (avisos): evita respuestas automáticas en cadena. */
  automated?: boolean
}

export type MailResult =
  | { ok: true; messageId: string }
  | { ok: false; skipped: true; reason: 'not_configured' | 'invalid_config' | 'invalid_recipient' }
  | { ok: false; skipped: false; code: MailErrorCode }

let cached: { key: string; transporter: Transporter } | null = null

function transporterFor(s: MailSettings): Transporter {
  const key = `${s.host}:${s.port}:${s.user}:${s.pass.length}`
  if (cached?.key === key) return cached.transporter
  cached?.transporter.close()
  const transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    requireTLS: !s.secure,
    auth: { user: s.user, pass: s.pass },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  })
  cached = { key, transporter }
  return transporter
}

/** Baja con un clic solo si el enlace es HTTPS (lo exige el estándar, RFC 8058). */
export function mailHeaders(message: Pick<MailMessage, 'unsubscribeUrl' | 'automated'>): Record<string, string> {
  const headers: Record<string, string> = {}
  if (message.automated) headers['Auto-Submitted'] = 'auto-generated'
  const url = message.unsubscribeUrl
  if (url && /^https?:\/\/[^\s<>]+$/.test(url)) {
    headers['List-Unsubscribe'] = `<${url}>`
    if (url.startsWith('https://')) headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }
  return headers
}

export function mailSettings(event?: H3Event) {
  const config = useRuntimeConfig(event)
  return resolveMailSettings(config as never)
}

export async function sendMail(message: MailMessage, event?: H3Event): Promise<MailResult> {
  const resolved = mailSettings(event)
  if (!resolved.ok) return { ok: false, skipped: true, reason: resolved.reason === 'not_configured' ? 'not_configured' : 'invalid_config' }
  if (!isValidEmail(message.to)) return { ok: false, skipped: true, reason: 'invalid_recipient' }
  const s = resolved.settings
  const transporter = transporterFor(s)
  const payload = {
    from: { name: s.fromName, address: s.fromEmail },
    to: message.to,
    subject: message.subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
    text: message.text,
    html: message.html,
    replyTo: s.fromEmail,
    headers: mailHeaders(message)
  }
  let lastCode: MailErrorCode = 'unknown'
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await transporter.sendMail(payload)
      return { ok: true, messageId: String(info.messageId ?? '') }
    } catch (err) {
      lastCode = classifyMailError(err)
      if (attempt === 2 || !isRetryableMailError(lastCode)) break
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  console.error(`[mail] envío fallido: ${lastCode}`)
  return { ok: false, skipped: false, code: lastCode }
}

/** Comprueba conexión, cifrado y credenciales sin enviar nada. */
export async function verifyMail(event?: H3Event): Promise<{ ok: true } | { ok: false; code: MailErrorCode | 'not_configured' | 'invalid_config'; missing?: string[] }> {
  const resolved = mailSettings(event)
  if (!resolved.ok) return { ok: false, code: resolved.reason === 'not_configured' ? 'not_configured' : 'invalid_config', missing: resolved.missing }
  try {
    await transporterFor(resolved.settings).verify()
    return { ok: true }
  } catch (err) {
    return { ok: false, code: classifyMailError(err) }
  }
}
