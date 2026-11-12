/** Plantillas de correo de la app. Funciones puras: texto plano + HTML sencillo, con todo lo variable escapado. */

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

function layout(title: string, bodyHtml: string, footer: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16161a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:13px;letter-spacing:.08em;font-weight:700;color:#6b6b76;padding-bottom:16px">CIBERAN</td></tr>
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">${escapeHtml(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.55">${bodyHtml}</td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#6b6b76;padding-top:24px;border-top:1px solid #ececf0">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`
}

export interface DigestItem { title: string; body: string | null; link: string | null }

/** Resumen de avisos sin leer de una persona. */
export function notificationDigestMail(items: DigestItem[], appUrl: string | undefined): RenderedMail {
  const n = items.length
  const first = items[0]
  const subject = n === 1 && first ? first.title : `Tienes ${n} avisos nuevos en Ciberan`
  const inbox = absoluteAppLink(appUrl, '/')
  const footer = 'Recibes este correo porque tienes avisos sin leer en Ciberan. Puedes desactivar los avisos por correo en Ajustes > Avisos.'

  const textLines = items.map((i) => {
    const url = absoluteAppLink(appUrl, i.link)
    return `· ${i.title}${i.body ? `\n  ${i.body}` : ''}${url ? `\n  ${url}` : ''}`
  })
  const text = `${n === 1 ? 'Tienes un aviso nuevo' : `Tienes ${n} avisos nuevos`} en Ciberan:\n\n${textLines.join('\n\n')}\n\n${inbox ? `Abrir Ciberan: ${inbox}\n\n` : ''}${footer}`

  const rows = items.map((i) => {
    const url = absoluteAppLink(appUrl, i.link)
    const title = url ? `<a href="${escapeHtml(url)}" style="color:#16161a;font-weight:600;text-decoration:underline">${escapeHtml(i.title)}</a>` : `<strong>${escapeHtml(i.title)}</strong>`
    return `<p style="margin:0 0 14px">${title}${i.body ? `<br><span style="color:#4a4a55">${escapeHtml(i.body)}</span>` : ''}</p>`
  }).join('')
  const button = inbox ? `<p style="margin:20px 0 0"><a href="${escapeHtml(inbox)}" style="display:inline-block;background:#16161a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Abrir Ciberan</a></p>` : ''
  const html = layout(n === 1 ? 'Tienes un aviso nuevo' : `Tienes ${n} avisos nuevos`, rows + button, footer)
  return { subject, text, html }
}

export function testMail(): RenderedMail {
  const footer = 'Correo de prueba enviado desde el panel de administración de Ciberan.'
  return {
    subject: 'Prueba de correo de Ciberan',
    text: `El envío de correo de Ciberan funciona.\n\n${footer}`,
    html: layout('El correo funciona', '<p style="margin:0">El envío de correo de Ciberan está bien configurado.</p>', footer)
  }
}
