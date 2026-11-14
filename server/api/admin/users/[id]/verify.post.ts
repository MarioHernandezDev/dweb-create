import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Concede o retira la insignia de «marca verificada». Solo el equipo de CIBERAN (panel de admin):
 * `partners.verified_at` no tiene UPDATE concedido al usuario, así que una marca no se la puede poner.
 * El id es el del perfil, igual que en block y grant-pro.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'admin')

  const profileId = getRouterParam(event, 'id')
  if (!profileId) throw createError({ statusCode: 400, statusMessage: 'Falta el id de usuario.' })
  const body = await readBody<{ verified?: boolean }>(event)
  if (typeof body.verified !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'verified debe ser true o false.' })

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('partners')
    .update({ verified_at: body.verified ? new Date().toISOString() : null } as never)
    .eq('profile_id', profileId)
    .select('id, verified_at')
    .maybeSingle<{ id: string; verified_at: string | null }>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'La verificación solo se puede dar a cuentas de marca (partner).' })

  await logAdminAction(event, actor, { action: body.verified ? 'verificó la marca' : 'quitó la verificación a la marca', targetType: 'user', targetId: profileId, targetLabel: await accountLabel(event, profileId) })
  return { ok: true, verifiedAt: data.verified_at }
})
