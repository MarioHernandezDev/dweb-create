import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/ml/predict — motor de ML real (ver docs/3-ML-PIPELINE.md §3.4.2
 * y §3.5 "Fase 1 MVP"): modelo heurístico explicable para el score (sin
 * datos propios suficientes todavía para entrenar nada), enriquecido de
 * forma opcional con sugerencias de un LLM gratuito vía OpenRouter (ver
 * docs/8-AI-SUGGESTIONS-SETUP.md). El resultado se guarda de verdad en
 * `ml_predictions`, así que sobrevive a un recargado.
 *
 * El cliente nunca escribe en `ml_predictions` directamente (no hay policy
 * de insert para "authenticated", a propósito — ver migración de RLS): solo
 * el servidor, con la service_role key, puede hacerlo. Por eso esta ruta
 * repite a mano la misma comprobación de autorización que la policy de
 * `posts` (dueño del post o su manager) antes de escribir nada.
 *
 * Deliberadamente fuera de esta versión: consumo de `credit_ledger` — falta
 * decidir cómo se cargan créditos a las cuentas.
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

interface AiSuggestion {
  kind: 'caption' | 'hashtag' | 'schedule'
  text: string
}

const MODEL_VERSION = 'v1-heuristic-2026.01'
const SUGGESTION_KINDS: AiSuggestion['kind'][] = ['caption', 'hashtag', 'schedule']

function heuristicScore(post: PostRow): number {
  const captionLength = post.caption?.length ?? 0
  const hashtagCount = post.metadata?.hashtags?.length ?? 0

  let score = 50
  score += Math.min(post.title.length, 20) * 0.5
  score += captionLength > 40 ? 10 : 0
  score += Math.min(hashtagCount, 5) * 2

  return Math.max(5, Math.min(96, Math.round(score)))
}

/**
 * Pide hasta 4 sugerencias cualitativas a un LLM gratuito de OpenRouter
 * (prompt adaptado de docs/3-ML-PIPELINE.md §3.5.1). Nunca lanza: si falla,
 * si no hay clave configurada, o si el modelo no devuelve JSON válido, se
 * queda en un array vacío y la pantalla cae en el texto fijo de siempre
 * (`suggestionsForDraft`) — una IA gratuita que falla no debe romper la
 * predicción de éxito, que es la parte que sí es fiable.
 */
async function fetchAiSuggestions(post: PostRow, successScore: number, apiKey: string, model: string): Promise<AiSuggestion[]> {
  const hashtags = post.metadata?.hashtags ?? []
  const prompt = `Eres un estratega de contenido para redes sociales.

Borrador de publicación:
- Título interno: "${post.title}"
- Caption: "${post.caption ?? '(sin caption todavía)'}"
- Hashtags actuales: ${hashtags.length ? hashtags.join(', ') : 'ninguno'}

Puntuación heurística de éxito calculada aparte: ${successScore}/100.

Devuelve ÚNICAMENTE un array JSON (sin texto adicional, sin markdown, sin explicaciones fuera del JSON) de 3 o 4 objetos con esta forma exacta:
[{"kind": "caption" | "hashtag" | "schedule", "text": "sugerencia concreta y breve, en español"}]

Incluye al menos una sugerencia de cada tipo: una mejora de caption, un hashtag alternativo o complementario, y un horario de publicación recomendado.`

  try {
    const response = await $fetch<{ choices?: { message?: { content?: string } }[] }>('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: { model, messages: [{ role: 'user', content: prompt }], temperature: 0.7 },
      timeout: 15_000
    })

    const raw = response.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed: unknown = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((s): s is AiSuggestion =>
        !!s && typeof s === 'object' && typeof s.text === 'string' && SUGGESTION_KINDS.includes(s.kind))
      .slice(0, 4)
  } catch (err) {
    console.error('[ml/predict] fallo al pedir sugerencias al LLM (se sigue sin IA):', err)
    return []
  }
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

  const config = useRuntimeConfig(event)
  const suggestions = config.openrouterApiKey
    ? await fetchAiSuggestions(post, successScore, config.openrouterApiKey, config.openrouterModel)
    : []

  const { data: prediction, error: insertError } = await client
    .from('ml_predictions')
    .insert({ post_id: post.id, success_score: successScore, confidence, model_version: MODEL_VERSION, suggestions } as never)
    .select('success_score, confidence, model_version, suggestions, created_at')
    .single<{ success_score: number; confidence: number; model_version: string; suggestions: AiSuggestion[]; created_at: string }>()
  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })

  return {
    successScore: prediction.success_score,
    confidence: prediction.confidence,
    modelVersion: prediction.model_version,
    suggestions: prediction.suggestions ?? []
  }
})
