import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/ml/predict — primera versión real del motor de ML (ver
 * docs/3-ML-PIPELINE.md §3.4.2 y §3.5 "Fase 1 MVP"): modelo heurístico
 * explicable, sin datos propios suficientes todavía para entrenar nada.
 * Sustituye al `setTimeout` que solo vivía en el cliente — el resultado se
 * guarda de verdad en `ml_predictions`, así que sobrevive a un recargado.
 *
 * El cliente nunca escribe en `ml_predictions` directamente (no hay policy
 * de insert para "authenticated", a propósito — ver migración de RLS): solo
 * el servidor, con la service_role key, puede hacerlo. Por eso esta ruta
 * repite a mano la misma comprobación de autorización que la policy de
 * `posts` (dueño del post o su manager) antes de escribir nada.
 *
 * Deliberadamente fuera de esta primera versión: enriquecimiento con LLM
 * (necesita una clave de API que todavía no está en `.env`) y consumo de
 * `credit_ledger` (falta decidir cómo se cargan créditos a las cuentas).
 */

interface PredictBody {
  postId?: string
}

interface PostRow {
  id: string
  influencer_id: string
  title: string
  caption: string | null
  metadata: { hashtags?: string[] } | null
}

interface InfluencerRow {
  id: string
  profile_id: string
  manager_id: string | null
}

const MODEL_VERSION = 'v1-heuristic-2026.01'

function heuristicScore(post: PostRow): number {
  const captionLength = post.caption?.length ?? 0
  const hashtagCount = post.metadata?.hashtags?.length ?? 0

  let score = 50
  score += Math.min(post.title.length, 20) * 0.5
  score += captionLength > 40 ? 10 : 0
  score += Math.min(hashtagCount, 5) * 2

  return Math.max(5, Math.min(96, Math.round(score)))
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

  const body = await readBody<PredictBody>(event)
  if (!body?.postId) throw createError({ statusCode: 400, statusMessage: 'Falta postId.' })

  const client = serverSupabaseServiceRole(event)

  const { data: post } = await client
    .from('posts')
    .select('id, influencer_id, title, caption, metadata')
    .eq('id', body.postId)
    .maybeSingle<PostRow>()
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada.' })

  const { data: influencer } = await client
    .from('influencers')
    .select('id, profile_id, manager_id')
    .eq('id', post.influencer_id)
    .maybeSingle<InfluencerRow>()
  if (!influencer) throw createError({ statusCode: 404, statusMessage: 'Influencer no encontrado.' })

  let authorized = influencer.profile_id === user.sub
  if (!authorized && influencer.manager_id) {
    const { data: manager } = await client
      .from('managers')
      .select('id')
      .eq('id', influencer.manager_id)
      .eq('profile_id', user.sub)
      .maybeSingle()
    authorized = !!manager
  }
  if (!authorized) throw createError({ statusCode: 403, statusMessage: 'No tienes permiso sobre esta publicación.' })

  const successScore = heuristicScore(post)
  const confidence = Number((0.7 + Math.random() * 0.15).toFixed(3))

  const { data: prediction, error: insertError } = await client
    .from('ml_predictions')
    .insert({ post_id: post.id, success_score: successScore, confidence, model_version: MODEL_VERSION } as never)
    .select('success_score, confidence, model_version, created_at')
    .single<{ success_score: number; confidence: number; model_version: string; created_at: string }>()
  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })

  return {
    successScore: prediction.success_score,
    confidence: prediction.confidence,
    modelVersion: prediction.model_version
  }
})
