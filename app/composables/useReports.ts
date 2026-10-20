export type ReportReason = 'spam' | 'unrealistic_budget' | 'inappropriate' | 'other'

/**
 * Reportar una solicitud/colaboración (spam, presupuesto poco serio...).
 * Solo escritura: no hay panel de moderación todavía (no existe un rol
 * admin en la app), así que esto de momento solo guarda el aviso para
 * revisarlo a mano desde el Table Editor de Supabase — ver RLS en
 * supabase/migrations/20261021140000_collaboration_offers_and_reports.sql.
 */
export function useReports() {
  const client = useSupabaseClient()
  const reporting = useState<boolean>('reports-posting', () => false)

  async function reportCollaboration(collaborationId: string, reason: ReportReason, detail?: string) {
    reporting.value = true
    try {
      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError || !userData.user) throw userError ?? new Error('No hay sesión activa.')

      const { error } = await client.from('reports').insert({
        collaboration_id: collaborationId,
        reporter_profile_id: userData.user.id,
        reason,
        detail: detail || null
      } as never)
      if (error) throw error
    } finally {
      reporting.value = false
    }
  }

  return { reporting, reportCollaboration }
}
