/** Estados de revisión de un reporte y qué cambios admite el panel de admin. */
export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export function isReportStatus(v: unknown): v is ReportStatus {
  return typeof v === 'string' && (REPORT_STATUSES as readonly string[]).includes(v)
}

/** Cerrar un reporte (resuelto o desestimado) exige dejar por escrito qué se decidió. */
export function reviewUpdate(status: ReportStatus, note: unknown, now = new Date()): { ok: true; patch: { status: ReportStatus; admin_note: string | null; resolved_at: string | null } } | { ok: false; message: string } {
  const text = typeof note === 'string' ? note.trim().slice(0, 2000) : ''
  const closing = status === 'resolved' || status === 'dismissed'
  if (closing && text.length < 10) return { ok: false, message: 'Para cerrar el reporte, anota qué se ha decidido (mínimo 10 caracteres).' }
  return { ok: true, patch: { status, admin_note: text || null, resolved_at: closing ? now.toISOString() : null } }
}
