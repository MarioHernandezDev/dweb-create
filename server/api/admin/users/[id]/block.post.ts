import { serverSupabaseServiceRole } from '#supabase/server'

interface BlockBody {
  banned?: boolean
}

/**
 * Bloquea/desbloquea un login usando el baneo nativo de Supabase Auth
 * (`ban_duration`) en vez de inventar una columna `blocked` propia — ya
 * impide el login él solo, sin tener que acordarse de comprobarlo en cada
 * sitio del código.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'moderator')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Falta el id de usuario.' })

  // Solo ids con forma de uuid: evita mandar a Supabase basura arbitraria.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Id de usuario no válido.' })
  }

  // Sin cuerpo, `body` llegaba undefined y `body.banned` reventaba con un 500.
  const body = await readBody<BlockBody>(event)
  if (typeof body?.banned !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Falta `banned` (true o false).' })
  }
  const client = serverSupabaseServiceRole(event)

  const { error } = await client.auth.admin.updateUserById(id, {
    ban_duration: body.banned ? '876000h' : 'none'
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  await logAdminAction(event, actor, { action: body.banned ? 'bloqueó la cuenta' : 'desbloqueó la cuenta', targetType: 'user', targetId: id, targetLabel: await accountLabel(event, id) })
  return { ok: true }
})
