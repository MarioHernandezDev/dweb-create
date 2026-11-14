import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isReportStatus, reviewUpdate } from '../../server/utils/report-review'

describe('revisión de reportes por el equipo', () => {
  it('solo admite los cuatro estados', () => {
    expect(isReportStatus('reviewing')).toBe(true)
    expect(isReportStatus('borrado')).toBe(false)
  })
  it('cerrar exige nota; abrir o revisar no', () => {
    expect(reviewUpdate('resolved', '').ok).toBe(false)
    expect(reviewUpdate('dismissed', 'corto').ok).toBe(false)
    expect(reviewUpdate('reviewing', '').ok).toBe(true)
    const now = new Date('2026-11-12T10:00:00Z')
    const r = reviewUpdate('resolved', '  Se habló con ambas partes; aviso a la marca.  ', now)
    expect(r).toEqual({ ok: true, patch: { status: 'resolved', admin_note: 'Se habló con ambas partes; aviso a la marca.', resolved_at: now.toISOString() } })
    const reopened = reviewUpdate('reviewing', 'se reabre')
    expect(reopened.ok && reopened.patch.resolved_at).toBeNull()
  })
  it('los endpoints de revisión exigen sesión de admin antes de nada', () => {
    for (const f of ['server/api/admin/reports/[id].patch.ts', 'server/api/admin/deletion-requests.get.ts', 'server/api/admin/deletion-requests/[id].patch.ts', 'server/api/admin/reports.get.ts']) {
      const src = readFileSync(path.join(process.cwd(), f), 'utf8')
      const guard = src.search(/await requireAdmin\(event[,)]/)
      expect(guard, f).toBeGreaterThan(-1)
      expect(guard, f).toBeLessThan(src.indexOf('serverSupabaseServiceRole(event)'))
    }
  })
  it('quien reporta solo puede insertar sus cuatro columnas', () => {
    const sql = readFileSync(path.join(process.cwd(), 'supabase/migrations/20261112120000_report_review_workflow.sql'), 'utf8')
    expect(sql).toContain('revoke all on public.reports from authenticated;')
    expect(sql).toContain('grant insert (collaboration_id, reporter_profile_id, reason, detail) on public.reports to authenticated;')
  })
})
