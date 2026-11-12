import { describe, expect, it } from 'vitest'
import { classifyMailError, isRetryableMailError, isValidEmail, resolveMailSettings } from '../../server/utils/mail-config'
import { absoluteAppLink, escapeHtml, notificationDigestMail } from '../../server/utils/mail-templates'
import { EMAIL_MAX_ITEMS_PER_MAIL, emailWindow, groupForEmail } from '../../server/utils/notification-email'

const base = { smtpHost: 'smtp.gmail.com', smtpUser: 'info@example.com', smtpPass: 'abcd efgh ijkl mnop' }

describe('configuración SMTP', () => {
  it('sin nada configurado queda apagado, no es un error', () => {
    expect(resolveMailSettings({})).toMatchObject({ ok: false, reason: 'not_configured' })
  })
  it('a medias es inválida y dice qué falta', () => {
    expect(resolveMailSettings({ smtpHost: 'smtp.gmail.com' })).toEqual({ ok: false, reason: 'invalid', missing: ['SMTP_USER', 'SMTP_PASS'] })
  })
  it('465 por defecto con TLS directo; quita los espacios de la contraseña de aplicación', () => {
    const r = resolveMailSettings(base)
    expect(r.ok && r.settings).toMatchObject({ port: 465, secure: true, pass: 'abcdefghijklmnop', fromEmail: 'info@example.com', fromName: 'Ciberan' })
  })
  it('587 usa STARTTLS; cualquier otro puerto (sin cifrado) se rechaza', () => {
    const r = resolveMailSettings({ ...base, smtpPort: '587' })
    expect(r.ok && r.settings.secure).toBe(false)
    expect(resolveMailSettings({ ...base, smtpPort: '25' }).ok).toBe(false)
  })
  it('el nombre del remitente no puede inyectar cabeceras', () => {
    const r = resolveMailSettings({ ...base, smtpFromName: 'Ciberan\r\nBcc: x@y.z' })
    expect(r.ok && r.settings.fromName).toBe('CiberanBcc: x@y.z')
  })
  it('remitente inválido se rechaza', () => {
    expect(resolveMailSettings({ ...base, smtpFromEmail: 'no-es-correo' }).ok).toBe(false)
  })
  it('valida direcciones', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a b@c.d')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
  })
})

describe('errores de envío', () => {
  it('clasifica y decide reintento', () => {
    expect(classifyMailError({ code: 'EAUTH' })).toBe('auth')
    expect(classifyMailError({ responseCode: 535 })).toBe('auth')
    expect(classifyMailError({ code: 'ETIMEDOUT' })).toBe('timeout')
    expect(classifyMailError({ code: 'ECONNREFUSED' })).toBe('connection')
    expect(classifyMailError({ responseCode: 421 })).toBe('rate_limited')
    expect(classifyMailError({ responseCode: 550 })).toBe('rejected')
    expect(classifyMailError(null)).toBe('unknown')
    expect(isRetryableMailError('timeout')).toBe(true)
    expect(isRetryableMailError('auth')).toBe(false)
    expect(isRetryableMailError('rejected')).toBe(false)
  })
})

describe('plantillas', () => {
  it('escapa HTML', () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;')
  })
  it('solo enlaza rutas internas', () => {
    expect(absoluteAppLink('https://ciberan.app', '/creator/collab/1')).toBe('https://ciberan.app/creator/collab/1')
    expect(absoluteAppLink('https://ciberan.app', '//evil.com')).toBe('https://ciberan.app/')
    expect(absoluteAppLink('https://ciberan.app', 'https://evil.com')).toBe('https://ciberan.app/')
    expect(absoluteAppLink(undefined, '/x')).toBeNull()
    expect(absoluteAppLink('javascript:alert(1)', '/x')).toBeNull()
  })
  it('un aviso: el asunto es su título; el contenido va escapado', () => {
    const m = notificationDigestMail([{ title: 'Nueva <b>oferta</b>', body: 'De "Marca"', link: '/partner' }], 'https://ciberan.app')
    expect(m.subject).toBe('Nueva <b>oferta</b>')
    expect(m.html).toContain('Nueva &lt;b&gt;oferta&lt;/b&gt;')
    expect(m.html).not.toContain('<b>oferta')
    expect(m.text).toContain('https://ciberan.app/partner')
  })
  it('varios avisos: asunto con el recuento', () => {
    const m = notificationDigestMail([{ title: 'A', body: null, link: null }, { title: 'B', body: null, link: null }], undefined)
    expect(m.subject).toBe('Tienes 2 avisos nuevos en Ciberan')
    expect(m.html).not.toContain('href=')
  })
})

describe('agrupar avisos para el correo', () => {
  const row = (id: string, profile: string, at: string) => ({ id, profile_id: profile, title: id, body: null, link: null, created_at: at })
  it('un correo por persona, más recientes primero', () => {
    const { batches } = groupForEmail([row('1', 'a', '2026-01-01T10:00:00Z'), row('2', 'b', '2026-01-01T10:01:00Z'), row('3', 'a', '2026-01-01T10:02:00Z')], new Set())
    expect(batches).toHaveLength(2)
    expect(batches[0]).toMatchObject({ profileId: 'a', ids: ['3', '1'] })
  })
  it('quien desactivó el correo no recibe nada, pero sus avisos se marcan', () => {
    const r = groupForEmail([row('1', 'a', '2026-01-01T10:00:00Z'), row('2', 'b', '2026-01-01T10:01:00Z')], new Set(['a']))
    expect(r.batches.map((b) => b.profileId)).toEqual(['b'])
    expect(r.suppressedIds).toEqual(['1'])
  })
  it('limita lo que cabe en un correo pero marca todos', () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(String(i), 'a', `2026-01-01T10:${String(i).padStart(2, '0')}:00Z`))
    const { batches } = groupForEmail(rows, new Set())
    expect(batches[0]!.items).toHaveLength(EMAIL_MAX_ITEMS_PER_MAIL)
    expect(batches[0]!.ids).toHaveLength(12)
  })
  it('respeta el máximo de destinatarios por pasada', () => {
    const rows = Array.from({ length: 5 }, (_, i) => row(String(i), `p${i}`, '2026-01-01T10:00:00Z'))
    expect(groupForEmail(rows, new Set(), 3).batches).toHaveLength(3)
  })
  it('ventana: entre 10 minutos y 24 horas', () => {
    const w = emailWindow(new Date('2026-01-02T12:00:00Z'))
    expect(w.olderThan).toBe('2026-01-02T11:50:00.000Z')
    expect(w.newerThan).toBe('2026-01-01T12:00:00.000Z')
  })
})
