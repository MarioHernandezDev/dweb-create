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
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Falta el id de usuario.' })

  const body = await readBody<BlockBody>(event)
  const client = serverSupabaseServiceRole(event)

  const { error } = await client.auth.admin.updateUserById(id, {
    ban_duration: body.banned ? '876000h' : 'none'
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { ok: true }
})
