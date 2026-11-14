/**
 * Alertas del panel de admin: lo que lleva demasiado tiempo sin atender o se concentra en una cuenta.
 * Función pura sobre recuentos, para poder probar los umbrales.
 */
export const ALERT_THRESHOLDS = {
  reportStaleHours: 48,
  deletionStaleHours: 72,
  hotspotReports: 3,
  hotspotDays: 30,
  spikeReports: 5
} as const

export interface AlertInput {
  staleReports: number
  oldestStaleReportHours: number | null
  staleDeletions: number
  reportsLast24h: number
  hotspots: { profileId: string | null; name: string; count: number }[]
}

export interface AdminAlert {
  id: string
  level: 'warning' | 'danger'
  title: string
  detail: string
  /** Pestaña del panel a la que lleva, con el filtro que enseña el problema. */
  tab: 'reports' | 'users'
  query?: Record<string, string>
}

export function buildAdminAlerts(i: AlertInput): AdminAlert[] {
  const out: AdminAlert[] = []
  if (i.staleReports > 0) {
    const days = i.oldestStaleReportHours ? Math.floor(i.oldestStaleReportHours / 24) : 0
    out.push({
      id: 'stale-reports', level: days >= 7 ? 'danger' : 'warning',
      title: `${i.staleReports} reporte${i.staleReports === 1 ? '' : 's'} sin resolver desde hace más de ${ALERT_THRESHOLDS.reportStaleHours} h`,
      detail: days >= 1 ? `El más antiguo lleva ${days} día${days === 1 ? '' : 's'} esperando.` : 'Conviene mirarlos hoy.',
      tab: 'reports', query: { r_status: 'pending', r_sort: 'oldest' }
    })
  }
  if (i.staleDeletions > 0) {
    out.push({
      id: 'stale-deletions', level: 'danger',
      title: `${i.staleDeletions} solicitud${i.staleDeletions === 1 ? '' : 'es'} de eliminación de cuenta sin atender (más de ${ALERT_THRESHOLDS.deletionStaleHours} h)`,
      detail: 'Quien pide borrar su cuenta espera una respuesta; hay plazos legales que cumplir.',
      tab: 'reports', query: { r_view: 'deletions' }
    })
  }
  if (i.reportsLast24h >= ALERT_THRESHOLDS.spikeReports) {
    out.push({
      id: 'report-spike', level: 'warning', title: `${i.reportsLast24h} reportes en las últimas 24 h`,
      detail: 'Más de lo habitual: puede haber una campaña de spam o un problema nuevo.', tab: 'reports', query: { r_status: 'open', r_sort: 'newest' }
    })
  }
  for (const h of i.hotspots) {
    if (h.count < ALERT_THRESHOLDS.hotspotReports) continue
    out.push({
      id: `hotspot-${h.profileId ?? h.name}`, level: 'danger',
      title: `${h.name} acumula ${h.count} reportes en ${ALERT_THRESHOLDS.hotspotDays} días`,
      detail: 'Varios reportes contra la misma cuenta: revisa su ficha y decide.',
      tab: h.profileId ? 'users' : 'reports', query: h.profileId ? { u_q: h.profileId } : undefined
    })
  }
  return out
}

/** Cuenta reportes por cuenta reportada y devuelve las que más acumulan. */
export function topHotspots(rows: { reported_profile_id: string | null; reported_name: string | null }[], limit = 5) {
  const map = new Map<string, { profileId: string | null; name: string; count: number }>()
  for (const r of rows) {
    const key = r.reported_profile_id ?? `n:${r.reported_name ?? '?'}`
    const cur = map.get(key) ?? { profileId: r.reported_profile_id, name: r.reported_name ?? 'Una cuenta', count: 0 }
    cur.count++
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}
