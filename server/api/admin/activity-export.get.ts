import { serverSupabaseServiceRole } from '#supabase/server'
import { toCsv } from '../../../app/utils/data-export'
import { applyActivityFilters } from '../../utils/admin-activity-query'

const MAX_ROWS = 5000

/** CSV del historial con los mismos filtros que la lista (hasta 5000 filas, las más recientes). Se abre bien en Excel. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const q = getQuery(event)
  const client = serverSupabaseServiceRole(event)

  const query = applyActivityFilters(client.from('admin_activity_view').select('type, created_at, summary, profile_id'), q)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(MAX_ROWS)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = ((data ?? []) as { type: string; created_at: string; summary: string; profile_id: string | null }[]).map((r) => ({
    fecha: r.created_at, tipo: r.type, descripcion: r.summary, cuenta: r.profile_id
  }))
  await logAdminAction(event, actor, { action: 'exportó el historial de actividad', detail: { filas: rows.length } })
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="ciberan-actividad-${new Date().toISOString().slice(0, 10)}.csv"`)
  return `﻿${toCsv(['fecha', 'tipo', 'descripcion', 'cuenta'], rows)}`
})
