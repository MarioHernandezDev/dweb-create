import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * DELETE /api/social/link-post?postId= — desvincula una publicación de su
 * contenido externo (A-R7). Borra también las métricas guardadas de esa
 * publicación: describían el contenido que ya no está vinculado y dejarlas
 * sueltas permitiría mezclarlas con otro vínculo futuro. Solo el dueño de la
 * publicación; idempotente (sin vínculo no hay nada que borrar).
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'social-write', user.sub)

  const postId = getQuery(event).postId
  if (typeof postId !== 'string' || !UUID.test(postId)) throw createError({ statusCode: 400, statusMessage: 'Publicación no válida.' })

  const client = serverSupabaseServiceRole(event)
  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden desvincular publicaciones.' })

  const { data: post } = await client.from('posts').select('id').eq('id', postId).eq('creator_id', creator.id).maybeSingle<{ id: string }>()
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada.' })

  if (!(await removeExternalLink(client, post.id))) {
    throw createError({ statusCode: 500, statusMessage: 'No se ha podido desvincular. Inténtalo de nuevo.' })
  }
  return { ok: true }
})
