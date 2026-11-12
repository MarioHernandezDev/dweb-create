/** GET /api/admin/mail-status — ¿está el correo configurado y acepta la conexión? No envía nada ni revela credenciales. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const resolved = mailSettings(event)
  if (!resolved.ok) return { configured: false, reason: resolved.reason, missing: resolved.missing }
  const s = resolved.settings
  const check = await verifyMail(event)
  return {
    configured: true,
    host: s.host,
    port: s.port,
    encryption: s.secure ? 'TLS' : 'STARTTLS',
    from: `${s.fromName} <${s.fromEmail}>`,
    connection: check.ok ? 'ok' : check.code
  }
})
