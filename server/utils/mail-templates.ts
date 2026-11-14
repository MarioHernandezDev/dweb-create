/**
 * Plantillas de correo de CIBERAN. Funciones puras: texto plano + HTML.
 *
 * El mismo `mailLayout` genera los correos de la app y las plantillas de
 * Supabase Auth (scripts/build-auth-email-templates.mjs → supabase/templates/),
 * así todos los correos se ven igual.
 *
 * Pensadas para clientes de correo: tablas, estilos en línea, sin imágenes ni
 * fuentes externas (cargan siempre, y no dan motivos a los filtros de spam),
 * versión de texto equivalente y una sola llamada a la acción.
 */

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Solo rutas internas ("/algo"): un aviso nunca debe llevar fuera de CIBERAN. */
export function absoluteAppLink(appUrl: string | undefined, path: string | null | undefined): string | null {
  if (!appUrl) return null
  try {
    const base = new URL(appUrl)
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return null
    const safePath = path && path.startsWith('/') && !path.startsWith('//') ? path : '/'
    return `${base.origin}${safePath}`
  } catch {
    return null
  }
}

export interface RenderedMail { subject: string; text: string; html: string }

// Marca: tinta, hueso y voltio (app/assets/css/tokens.css).
const C = { ink: '#121019', ink700: '#3a3544', ink500: '#57515f', bone: '#f5f1ea', bone200: '#ece6db', paper: '#fffdf9', volt: '#c6f24e' }
const FONT = `'Hanken Grotesk','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif`

export interface LayoutParts {
  /** Texto que enseña la bandeja de entrada junto al asunto. Sin HTML. */
  preheader: string
  /** Etiqueta corta sobre el título («Tu cuenta», «Avisos»). Sin HTML. */
  eyebrow: string
  title: string
  /** HTML ya seguro (escapado por quien llama). */
  bodyHtml: string
  /** `href` ya seguro: una URL escapada o un marcador de plantilla de Supabase. */
  cta?: { label: string; href: string }
  /** HTML ya seguro, en pequeño bajo el botón. */
  noteHtml?: string
  /** HTML ya seguro, pie legal. */
  footerHtml: string
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.ink700}">${html}</p>`
}

export function mailLayout(p: LayoutParts): string {
  const cta = p.cta
    ? `<tr><td style="padding:8px 0 4px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.volt}" style="border-radius:999px;background:${C.volt}"><a href="${p.cta.href}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:${C.ink};text-decoration:none;border-radius:999px">${escapeHtml(p.cta.label)}&nbsp;&rarr;</a></td></tr></table></td></tr>`
    : ''
  const note = p.noteHtml ? `<tr><td style="padding-top:20px;font-size:13px;line-height:1.55;color:${C.ink500}">${p.noteHtml}</td></tr>` : ''
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(p.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bone};font-family:${FONT};color:${C.ink};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bone}">${escapeHtml(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bone}" style="background:${C.bone}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td bgcolor="${C.ink}" style="background:${C.ink};border-radius:28px 28px 0 0;padding:22px 32px">
<span style="font-family:${FONT};font-size:18px;font-weight:800;letter-spacing:.14em;color:${C.paper}">CIBERAN</span><span style="font-size:18px;font-weight:800;color:${C.volt}">&nbsp;&#9679;</span>
</td></tr>
<tr><td bgcolor="${C.paper}" style="background:${C.paper};border-radius:0 0 28px 8px;padding:36px 32px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.ink500};padding-bottom:10px">${escapeHtml(p.eyebrow)}</td></tr>
<tr><td style="font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.01em;color:${C.ink};padding-bottom:18px">${escapeHtml(p.title)}</td></tr>
<tr><td>${p.bodyHtml}</td></tr>
${cta}${note}
</table>
</td></tr>
<tr><td style="padding:22px 32px 0;font-size:12px;line-height:1.6;color:${C.ink500}">${p.footerHtml}</td></tr>
<tr><td style="padding:10px 32px 0;font-size:12px;line-height:1.6;color:${C.ink500}">Ciberan &middot; Donde marcas y creadores trabajan juntos.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export interface DigestItem { title: string; body: string | null; link: string | null }

/** Resumen de avisos sin leer de una persona. `unsubscribeUrl`: baja directa de estos correos. */
export function notificationDigestMail(items: DigestItem[], appUrl: string | undefined, unsubscribeUrl?: string | null): RenderedMail {
  const n = items.length
  const first = items[0]
  const subject = n === 1 && first ? first.title : `Tienes ${n} avisos nuevos en Ciberan`
  const inbox = absoluteAppLink(appUrl, '/')
  const heading = n === 1 ? 'Tienes un aviso nuevo' : `Tienes ${n} avisos nuevos`
  const why = 'Recibes este correo porque tienes avisos sin leer en Ciberan.'

  const textLines = items.map((i) => {
    const url = absoluteAppLink(appUrl, i.link)
    return `· ${i.title}${i.body ? `\n  ${i.body}` : ''}${url ? `\n  ${url}` : ''}`
  })
  const text = `${heading} en Ciberan:\n\n${textLines.join('\n\n')}\n\n${inbox ? `Abrir Ciberan: ${inbox}\n\n` : ''}${why}\n${unsubscribeUrl ? `Dejar de recibir avisos por correo: ${unsubscribeUrl}` : 'Puedes desactivar los avisos por correo en tu perfil, en Avisos.'}`

  const rows = items.map((i, idx) => {
    const url = absoluteAppLink(appUrl, i.link)
    const title = url
      ? `<a href="${escapeHtml(url)}" style="color:${C.ink};font-weight:700;text-decoration:none">${escapeHtml(i.title)}</a>`
      : `<span style="color:${C.ink};font-weight:700">${escapeHtml(i.title)}</span>`
    const border = idx === items.length - 1 ? '' : `border-bottom:1px solid ${C.bone200};`
    return `<tr><td width="18" valign="top" style="padding:16px 0;${border}font-size:12px;line-height:24px;color:${C.volt}">&#9679;</td><td style="padding:14px 0;${border}font-size:16px;line-height:1.5">${title}${i.body ? `<br><span style="font-size:14px;color:${C.ink500}">${escapeHtml(i.body)}</span>` : ''}</td></tr>`
  }).join('')
  const bodyHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">${rows}</table>`
  const footerHtml = `${escapeHtml(why)} ${unsubscribeUrl
    ? `<a href="${escapeHtml(unsubscribeUrl)}" style="color:${C.ink500};text-decoration:underline">Dejar de recibir avisos por correo</a>.`
    : 'Puedes desactivar los avisos por correo en tu perfil, en Avisos.'}`
  const html = mailLayout({
    preheader: first ? (n === 1 ? (first.body ?? first.title) : items.map((i) => i.title).slice(0, 3).join(' · ')) : heading,
    eyebrow: 'Avisos',
    title: heading,
    bodyHtml,
    cta: inbox ? { label: 'Abrir Ciberan', href: escapeHtml(inbox) } : undefined,
    footerHtml
  })
  return { subject, text, html }
}

/** Aviso al equipo con las alertas del panel de admin (reportes sin atender, picos…). */
export function adminAlertsMail(alerts: { title: string; detail: string }[], appUrl: string | undefined): RenderedMail {
  const n = alerts.length
  const heading = n === 1 ? 'Hay 1 alerta en el panel' : `Hay ${n} alertas en el panel`
  const link = absoluteAppLink(appUrl, '/admin')
  const text = `${heading} de Ciberan:\n\n${alerts.map((a) => `· ${a.title}\n  ${a.detail}`).join('\n\n')}${link ? `\n\nAbrir el panel: ${link}` : ''}\n\nRecibes este correo porque tu dirección está en ADMIN_ALERT_EMAIL.`
  const bodyHtml = alerts.map((a) => paragraph(`<strong style="color:${C.ink}">${escapeHtml(a.title)}</strong><br><span style="font-size:14px;color:${C.ink500}">${escapeHtml(a.detail)}</span>`)).join('')
  return {
    subject: n === 1 ? `Alerta del panel: ${alerts[0]!.title}` : `${n} alertas en el panel de Ciberan`,
    text,
    html: mailLayout({
      preheader: alerts.map((a) => a.title).slice(0, 2).join(' · '), eyebrow: 'Panel de admin', title: heading, bodyHtml,
      cta: link ? { label: 'Abrir el panel', href: escapeHtml(link) } : undefined,
      footerHtml: 'Recibes este correo porque tu dirección está en ADMIN_ALERT_EMAIL.'
    })
  }
}

export function testMail(): RenderedMail {
  const footer = 'Correo de prueba enviado desde el panel de administración de Ciberan.'
  return {
    subject: 'Prueba de correo de Ciberan',
    text: `El envío de correo de Ciberan funciona.\n\nSi lees esto, la conexión, el cifrado y el remitente están bien configurados.\n\n${footer}`,
    html: mailLayout({
      preheader: 'La conexión, el cifrado y el remitente están bien configurados.',
      eyebrow: 'Prueba',
      title: 'El correo funciona',
      bodyHtml: paragraph('Si lees esto, la conexión, el cifrado y el remitente de Ciberan están bien configurados.'),
      footerHtml: escapeHtml(footer)
    })
  }
}

/**
 * Plantillas de Supabase Auth. Los `{{ .Variable }}` los sustituye Supabase al enviar.
 * El asunto se copia a mano en el panel (Authentication > Emails > Templates).
 */
export interface AuthTemplate { file: string; panelName: string; subject: string; html: string }

export function authEmailTemplates(): AuthTemplate[] {
  const url = '{{ .ConfirmationURL }}'
  const ignore = (what: string) => `Si no has sido tú, ignora este correo: ${what}.`
  const fallback = `Si el botón no funciona, copia este enlace en tu navegador:<br><span style="word-break:break-all;color:${C.ink700}">${url}</span>`
  const footer = 'Has recibido este correo porque alguien usó esta dirección en Ciberan. Nunca te pediremos la contraseña por correo.'
  const build = (file: string, panelName: string, subject: string, eyebrow: string, title: string, preheader: string, body: string, label: string, note: string): AuthTemplate => ({
    file, panelName, subject,
    html: mailLayout({ preheader, eyebrow, title, bodyHtml: paragraph(body), cta: { label, href: url }, noteHtml: `${note}<br><br>${fallback}`, footerHtml: footer })
  })
  return [
    build('confirmation.html', 'Confirm signup', 'Confirma tu correo para entrar en Ciberan', 'Tu cuenta', 'Confirma tu correo',
      'Un clic y tu cuenta de Ciberan queda activa.',
      'Gracias por registrarte en Ciberan. Confirma que este correo es tuyo y tu cuenta quedará activa.',
      'Confirmar mi correo', ignore('no se creará ninguna cuenta')),
    build('recovery.html', 'Reset password', 'Cambia tu contraseña de Ciberan', 'Tu cuenta', 'Elige una contraseña nueva',
      'Enlace para cambiar tu contraseña de Ciberan.',
      'Hemos recibido una petición para cambiar la contraseña de tu cuenta. El enlace caduca pronto y solo sirve una vez.',
      'Cambiar contraseña', ignore('tu contraseña seguirá siendo la misma')),
    build('email_change.html', 'Change email address', 'Confirma tu nuevo correo en Ciberan', 'Tu cuenta', 'Confirma tu nuevo correo',
      'Confirma el cambio de correo de tu cuenta de Ciberan.',
      'Has pedido cambiar el correo de tu cuenta a <strong>{{ .NewEmail }}</strong>. Confírmalo para terminar el cambio.',
      'Confirmar nuevo correo', ignore('tu correo no cambiará')),
    build('magic_link.html', 'Magic link', 'Tu enlace para entrar en Ciberan', 'Acceso', 'Entra en Ciberan',
      'Enlace de acceso de un solo uso.',
      'Usa este enlace para entrar en tu cuenta. Caduca pronto y solo sirve una vez.',
      'Entrar en Ciberan', ignore('nadie podrá entrar sin este enlace')),
    build('invite.html', 'Invite user', 'Te han invitado a Ciberan', 'Invitación', 'Te han invitado a Ciberan',
      'Acepta la invitación y crea tu cuenta.',
      'Ciberan es donde marcas y creadores encuentran con quién trabajar y llevan sus colaboraciones de principio a fin. Acepta la invitación para crear tu cuenta.',
      'Aceptar invitación', 'Si no esperabas esta invitación, ignora este correo.')
  ]
}
