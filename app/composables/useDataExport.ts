import { buildExportFile, exportFilename, exportQueriesFor } from '~/utils/data-export'

/** Reúne los datos de la cuenta y los descarga como un archivo JSON. Todo se lee con la sesión del usuario. */
export function useDataExport() {
  const client = useSupabaseClient()
  const { resolveMyProfileId } = useMyProfileId()
  const { ensureRole } = useMyRole()
  const exporting = ref(false)
  const error = ref('')

  async function download(): Promise<boolean> {
    if (exporting.value) return false
    exporting.value = true
    error.value = ''
    try {
      const profileId = await resolveMyProfileId()
      const role = await ensureRole()
      if (!profileId || (role !== 'creator' && role !== 'partner')) throw new Error('sin sesión')
      const db = client as unknown as { from: (t: string) => any }

      const { data: authData } = await client.auth.getUser()
      const [{ data: profile }, { data: ficha }] = await Promise.all([
        db.from('profiles').select('id,role,full_name,avatar_url,chat_privacy,created_at').eq('id', profileId).maybeSingle(),
        role === 'creator'
          ? db.from('creators').select('id,display_name,niche,bio,headline,location,categories,min_rate_cents,max_rate_cents,looking_for,audience,avatar_url,cover_url,weekly_post_target,show_collaborations,created_at').eq('profile_id', profileId).maybeSingle()
          : db.from('partners').select('id,company_name,industry,bio,headline,location,website,categories,min_budget_cents,max_budget_cents,looking_for,collaboration_types,cover_url,verified_at,show_collaborations,created_at').eq('profile_id', profileId).maybeSingle()
      ])
      const roleId: string | null = ficha?.id ?? null
      const { data: collabs } = roleId
        ? await db.from('collaborations').select('id').eq(role === 'creator' ? 'creator_id' : 'partner_id', roleId)
        : { data: [] }
      const collabIds: string[] = (collabs ?? []).map((c: { id: string }) => c.id)

      const datos: Record<string, unknown[]> = {}
      const incompleto: string[] = []
      await Promise.all(exportQueriesFor(role).map(async (q) => {
        let query = db.from(q.table).select(q.columns)
        if (q.filter.by === 'profile') query = query.eq(q.filter.column, profileId)
        else if (q.filter.by === 'creator' || q.filter.by === 'partner') {
          if (!roleId) { datos[q.section] = []; return }
          query = query.eq(q.filter.column, roleId)
        } else {
          if (!collabIds.length) { datos[q.section] = []; return }
          query = query.in(q.filter.column, collabIds)
        }
        const { data, error: e } = await query.limit(5000)
        if (e) { incompleto.push(q.section); datos[q.section] = []; return }
        datos[q.section] = data ?? []
      }))
      if (role === 'creator' && roleId) {
        // Redes conectadas: solo datos visibles (nunca los tokens).
        const { data, error: e } = await db.from('social_accounts').select('platform,handle,followers_count,connected_at,status,is_verified').eq('creator_id', roleId)
        if (e) incompleto.push('redes_conectadas')
        datos.redes_conectadas = data ?? []
      }

      const file = buildExportFile(
        { email: authData.user?.email ?? null, alta: authData.user?.created_at ?? null, perfil: profile ?? null, ficha: ficha ?? null },
        datos, incompleto.sort()
      )
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename()
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return true
    } catch (e) {
      console.error('[useDataExport]', (e as Error).message)
      error.value = 'No se ha podido preparar la descarga. Inténtalo de nuevo.'
      return false
    } finally {
      exporting.value = false
    }
  }

  return { exporting, error, download }
}
