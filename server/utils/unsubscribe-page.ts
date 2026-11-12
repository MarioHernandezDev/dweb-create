import { escapeHtml } from './mail-templates'

/** Página mínima de baja de los avisos por correo (sin JavaScript ni recursos externos). */
export function unsubscribePage(state: 'confirm' | 'done' | 'invalid' | 'error', token?: string): string {
  const copy = {
    confirm: ['¿Dejar de recibir avisos por correo?', 'Seguirás viendo tus avisos dentro de Ciberan. Los correos de tu cuenta (verificación, contraseña) llegan siempre.'],
    done: ['Hecho: ya no recibirás avisos por correo', 'Puedes volver a activarlos cuando quieras en tu perfil, en Avisos.'],
    invalid: ['Este enlace no es válido', 'Puedes desactivar los avisos por correo desde tu perfil en Ciberan, en Avisos.'],
    error: ['No se ha podido guardar el cambio', 'Inténtalo de nuevo en unos minutos o desactívalos desde tu perfil, en Avisos.']
  }[state]
  const form = state === 'confirm' && token
    ? `<form method="post" action="/api/notifications/unsubscribe?token=${escapeHtml(encodeURIComponent(token))}"><button type="submit">Sí, dejar de recibirlos</button></form>`
    : ''
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Avisos por correo · Ciberan</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f1ea;color:#121019;font-family:'Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;padding:24px;box-sizing:border-box}main{max-width:440px;background:#fffdf9;border-radius:28px 28px 28px 8px;padding:36px 32px}.b{font-weight:800;letter-spacing:.14em;font-size:14px;margin:0 0 20px}h1{font-size:26px;line-height:1.15;margin:0 0 12px}p{font-size:16px;line-height:1.6;color:#3a3544;margin:0 0 24px}button{font:inherit;font-weight:700;background:#c6f24e;color:#121019;border:0;border-radius:999px;padding:14px 28px;cursor:pointer}button:focus-visible{outline:3px solid #121019;outline-offset:3px}</style></head>
<body><main><p class="b">CIBERAN</p><h1>${escapeHtml(copy[0]!)}</h1><p>${escapeHtml(copy[1]!)}</p>${form}</main></body></html>`
}
