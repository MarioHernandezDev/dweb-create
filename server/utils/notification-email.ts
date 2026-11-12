/** Qué avisos se mandan por correo y cómo se agrupan. Lógica pura (testeable sin base de datos). */

export interface PendingNotification {
  id: string
  profile_id: string
  title: string
  body: string | null
  link: string | null
  created_at: string
}

/** Se espera un rato por si el usuario lo lee en la app; y no se manda nada con más de un día. */
export const EMAIL_GRACE_MS = 10 * 60_000
export const EMAIL_MAX_AGE_MS = 24 * 60 * 60_000
export const EMAIL_MAX_RECIPIENTS_PER_RUN = 40
export const EMAIL_MAX_ITEMS_PER_MAIL = 8

export function emailWindow(now: Date): { olderThan: string; newerThan: string } {
  return {
    olderThan: new Date(now.getTime() - EMAIL_GRACE_MS).toISOString(),
    newerThan: new Date(now.getTime() - EMAIL_MAX_AGE_MS).toISOString()
  }
}

export interface RecipientBatch { profileId: string; ids: string[]; items: PendingNotification[] }

/**
 * Un correo por persona con sus avisos pendientes (los más recientes primero en el
 * correo). `ids` incluye TODOS los suyos, también los que no caben en el correo,
 * para marcarlos como enviados y no repetirlos. Quien desactivó el correo se omite
 * aquí, pero sus avisos se devuelven en `suppressedIds` para marcarlos igualmente.
 */
export function groupForEmail(rows: PendingNotification[], optedOut: ReadonlySet<string>, maxRecipients = EMAIL_MAX_RECIPIENTS_PER_RUN): { batches: RecipientBatch[]; suppressedIds: string[] } {
  const byProfile = new Map<string, PendingNotification[]>()
  const suppressedIds: string[] = []
  for (const row of rows) {
    if (optedOut.has(row.profile_id)) { suppressedIds.push(row.id); continue }
    const list = byProfile.get(row.profile_id) ?? []
    list.push(row)
    byProfile.set(row.profile_id, list)
  }
  const batches: RecipientBatch[] = []
  for (const [profileId, list] of byProfile) {
    if (batches.length >= maxRecipients) break
    const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
    batches.push({ profileId, ids: sorted.map((r) => r.id), items: sorted.slice(0, EMAIL_MAX_ITEMS_PER_MAIL) })
  }
  return { batches, suppressedIds }
}
