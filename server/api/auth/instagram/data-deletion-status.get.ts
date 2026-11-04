/**
 * GET /api/auth/instagram/data-deletion-status?code=… — página a la que Meta
 * remite a la persona tras pedir la eliminación de datos (A-R4). El borrado se
 * hace en el momento de la solicitud, así que cualquier código con formato válido
 * se muestra como completado; el servidor no guarda nada de la solicitud.
 */
export default defineEventHandler((event) => {
  const code = String(getQuery(event).code ?? '')
  const valid = /^[0-9a-f-]{36}$/i.test(code)
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const body = valid
    ? `<h1>Solicitud completada</h1><p>Hemos eliminado la cuenta de Instagram conectada a CIBERAN y los datos asociados (métricas e instantáneas).</p><p>Código de confirmación: <code>${code}</code></p>`
    : '<h1>Código no válido</h1><p>No reconocemos este código de confirmación.</p>'
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Eliminación de datos · CIBERAN</title><style>body{font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5}</style></head><body>${body}</body></html>`
})
