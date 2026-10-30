import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
// buildHistoryContext / MeasuredViewsRow vienen de server/utils/history-context.ts
// (auto-import de Nitro, igual que structuralScore en predict.post.ts).

/**
 * GET /api/ml/history-context?postId=… — rendimiento real de las demás
 * publicaciones medidas del mismo creador en la misma plataforma (A-R9).
 * Solo informa: no cambia el score. Devuelve `history: null` si no hay
 * muestra suficiente. Solo el dueño de la publicación (misma comprobación
 * que predict.post.ts, porque se lee con service_role).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceRateLimit(event, `ml-history:${user.sub}`, 30, 60_000)

  const postId = String(getQuery(event).postId ?? '')
  if (!UUID.test(postId)) throw createError({ statusCode: 400, statusMessage: 'postId no válido.' })

  const client = serverSupabaseServiceRole(event)
  const { data: post } = await client.from('posts').select('id, creator_id, platform').eq('id', postId).maybeSingle<{ id: string; creator_id: string; platform: string }>()
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada.' })
  const { data: creator } = await client.from('creators').select('profile_id').eq('id', post.creator_id).maybeSingle<{ profile_id: string }>()
  if (!creator || creator.profile_id !== user.sub) throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada.' })

  if (post.platform !== 'youtube' && post.platform !== 'instagram') return { platform: post.platform, history: null }

  const { data: others } = await client.from('posts').select('id').eq('creator_id', post.creator_id).eq('platform', post.platform).neq('id', post.id).limit(500)
  const ids = (others ?? []).map((p: { id: string }) => p.id)
  if (!ids.length) return { platform: post.platform, history: null }

  const { data: rows, error } = await client.from('metrics').select('post_id, views, measured_on').in('post_id', ids).eq('source', post.platform)
  if (error) throw createError({ statusCode: 500, statusMessage: 'No se ha podido leer el histórico.' })

  return { platform: post.platform, history: buildHistoryContext((rows ?? []) as MeasuredViewsRow[]) }
})
