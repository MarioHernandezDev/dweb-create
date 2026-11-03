import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
// MODEL_VERSION_STRUCTURAL_ONLY / MODEL_VERSION_WITH_LLM / structuralScore
// vienen de server/utils/ml-heuristic.ts — Nitro las auto-importa como
// globales, mismo criterio que `plans`/`platformFeeCents`/`useStripe` en el
// resto de server/api/stripe/*.ts (sin import explícito a propósito).

/**
 * POST /api/ml/predict — motor de ML real (ver docs/3-ML-PIPELINE.md §3.4.2
 * y §3.5 "Fase 1 MVP"). El score final mezcla dos señales:
 *
 * 1. `structuralScore`: heurística explicable por reglas (longitud de
 *    título/caption, nº de hashtags) — no sabe si el contenido es BUENO,
 *    solo si tiene la forma de un post currado. Funciona siempre, sin IA.
 * 2. `qualityScore`: el mismo LLM gratuito de OpenRouter que ya genera las
 *    sugerencias (ver docs/8-AI-SUGGESTIONS-SETUP.md) juzga si el caption
 *    tiene sentido/es atractivo/no es de muy baja calidad — esto es lo que
 *    faltaba: sin esto, escribir cualquier cosa larga con hashtags daba un
 *    score decente sin importar si el contenido era bueno o malo de verdad.
 *
 * Si no hay clave de OpenRouter o el LLM falla, se cae en `structuralScore`
 * solo (documentado, no es un error) — el resultado se guarda de verdad en
 * `ml_predictions`, así que sobrevive a un recargado.
 *
 * El cliente nunca escribe en `ml_predictions` directamente (no hay policy
 * de insert para "authenticated", a propósito — ver migración de RLS): solo
 * el servidor, con la service_role key, puede hacerlo. Por eso esta ruta
 * repite a mano la misma comprobación de autorización que la policy de
 * `posts` (dueño del post) antes de escribir nada.
 *
 * Deliberadamente fuera de esta versión: consumo de `credit_ledger` — falta
 * decidir cómo se cargan créditos a las cuentas.
 */

interface PredictBody {
  postId?: string
}

interface PostRow {
  id: string
  creator_id: string
  title: string
  caption: string | null
  metadata: { hashtags?: string[] } | null
}

interface CreatorRow {
  id: string
  profile_id: string
}

interface AiSuggestion {
  kind: 'caption' | 'hashtag' | 'schedule'
  text: string
}

const SUGGESTION_KINDS: AiSuggestion['kind'][] = ['caption', 'hashtag', 'schedule']

interface AiEvaluation {
  qualityScore: number | null
  suggestions: AiSuggestion[]
}

/**
 * Pide al LLM gratuito de OpenRouter que juzgue la calidad REAL del
 * contenido (no solo su forma) y de paso genere hasta 4 sugerencias
 * (prompt adaptado de docs/3-ML-PIPELINE.md §3.5.1). Nunca lanza: si falla,
 * si no hay clave configurada, o si el modelo no devuelve JSON válido, se
 * queda sin `qualityScore` (el handler cae en `structuralScore` solo) y sin
 * sugerencias (la pantalla cae en el texto fijo de siempre) — una IA
 * gratuita que falla no debe romper la predicción, que debe seguir dando
 * algún resultado siempre.
 */
async function fetchAiEvaluation(post: PostRow, structural: number, apiKey: string, model: string): Promise<AiEvaluation> {
  const hashtags = post.metadata?.hashtags ?? []
  const prompt = `Eres un estratega de contenido para redes sociales. Evalúa este borrador con criterio real — no seas generoso solo porque tiene texto o hashtags.

Borrador de publicación:
- Título interno: "${post.title}"
- Caption: "${post.caption ?? '(sin caption todavía)'}"
- Hashtags actuales: ${hashtags.length ? hashtags.join(', ') : 'ninguno'}

Puntuación heurística estructural calculada aparte (solo mide longitud/forma, no la calidad del contenido): ${structural}/100.

Devuelve ÚNICAMENTE un objeto JSON (sin texto adicional, sin markdown, sin explicaciones fuera del JSON) con esta forma exacta:
{"quality_score": 0-100 (tu evaluación honesta de si el caption tiene sentido, es atractivo y está bien escrito — penaliza fuerte si es confuso, ofensivo, vacío de contenido real o de muy baja calidad), "suggestions": [{"kind": "caption" | "hashtag" | "schedule", "text": "sugerencia concreta y breve, en español"}]}

En "suggestions" incluye 3 o 4 objetos, al menos uno de cada tipo: una mejora de caption (si el caption es malo, dilo claramente y explica por qué), un hashtag alternativo o complementario, y un horario de publicación recomendado.`

  try {
    const response = await $fetch<{ choices?: { message?: { content?: string } }[] }>('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // `max_tokens` generoso a propósito: los modelos gratuitos actuales de
      // OpenRouter son todos "reasoning" (gastan tokens pensando antes de
      // escribir la respuesta final) — con un límite bajo, el contenido
      // llega vacío porque se corta a mitad del razonamiento, antes de
      // escribir el JSON de verdad.
      body: { model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 800 },
      timeout: 15_000
    })

    const raw = response.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { qualityScore: null, suggestions: [] }

    const parsed: unknown = JSON.parse(jsonMatch[0])
    if (!parsed || typeof parsed !== 'object') return { qualityScore: null, suggestions: [] }

    const obj = parsed as Record<string, unknown>
    const qualityScore = typeof obj.quality_score === 'number' && Number.isFinite(obj.quality_score)
      ? Math.max(0, Math.min(100, Math.round(obj.quality_score)))
      : null

    const suggestions = Array.isArray(obj.suggestions)
      ? obj.suggestions
        .filter((s): s is AiSuggestion =>
          !!s && typeof s === 'object' && typeof s.text === 'string' && SUGGESTION_KINDS.includes(s.kind))
        .slice(0, 4)
      : []

    return { qualityScore, suggestions }
  } catch (err) {
    console.error('[ml/predict] fallo al pedir evaluación al LLM (se sigue solo con la heurística estructural):', err)
    return { qualityScore: null, suggestions: [] }
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  // Cada predicción puede llamar al LLM: 10 por minuto y usuario frena el abuso.
  // `serverSupabaseUser` devuelve los claims del JWT: el id es `sub` (`user.id` no
  // existe y dejaba un único cupo compartido por todos los usuarios).
  enforceRateLimit(event, `ml-predict:${user.sub}`, 10, 60_000)

  const body = await readBody<PredictBody>(event)
  if (!body?.postId) throw createError({ statusCode: 400, statusMessage: 'Falta postId.' })

  const client = serverSupabaseServiceRole(event)

  const { data: post } = await client
    .from('posts')
    .select('id, creator_id, title, caption, metadata')
    .eq('id', body.postId)
    .maybeSingle<PostRow>()
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada.' })

  const { data: creator } = await client
    .from('creators')
    .select('id, profile_id')
    .eq('id', post.creator_id)
    .maybeSingle<CreatorRow>()
  if (!creator) throw createError({ statusCode: 404, statusMessage: 'Creador no encontrado.' })
  if (creator.profile_id !== user.sub) throw createError({ statusCode: 403, statusMessage: 'No tienes permiso sobre esta publicación.' })

  // Créditos (ver README Fase 4 — "Consumo de créditos" y
  // supabase/migrations/20261020160000_credit_grants.sql): se comprueba
  // ANTES de llamar al LLM, para no gastar esa llamada en una cuenta sin
  // saldo. `credit_ledger` es un libro de movimientos (positivos = concedidos,
  // negativos = gastados) — el saldo es su suma, no hay columna cacheada.
  const { data: ledgerRows } = await client.from('credit_ledger').select('amount').eq('creator_id', post.creator_id)
  const creditBalance = ((ledgerRows ?? []) as { amount: number }[]).reduce((sum, row) => sum + row.amount, 0)
  if (creditBalance <= 0) {
    throw createError({ statusCode: 402, statusMessage: 'Sin créditos disponibles. Mejora tu plan para seguir prediciendo.' })
  }

  const structural = structuralScore(post)

  const config = useRuntimeConfig(event)
  const evaluation = config.openrouterApiKey
    ? await fetchAiEvaluation(post, structural, config.openrouterApiKey, config.openrouterModel)
    : { qualityScore: null, suggestions: [] }

  // Si el LLM dio una evaluación de calidad real, pesa más que la forma
  // estructural (60/40) — es la señal que de verdad distingue un caption
  // bueno de uno malo. Sin LLM (o si falló), solo queda la estructural.
  const successScore = evaluation.qualityScore !== null
    ? Math.max(5, Math.min(96, Math.round(evaluation.qualityScore * 0.6 + structural * 0.4)))
    : structural
  const modelVersion = evaluation.qualityScore !== null ? MODEL_VERSION_WITH_LLM : MODEL_VERSION_STRUCTURAL_ONLY
  const suggestions = evaluation.suggestions

  // `confidence` se queda a null a propósito: no hay ninguna señal real que
  // la respalde (antes era `0.7 + Math.random() * 0.15` — un número con
  // pinta de estadística que no medía nada). Lo que SÍ es honesto mostrar es
  // si el score viene solo de la heurística de forma o si además lo juzgó
  // el LLM sobre el contenido real — eso lo dice `model_version`.
  const { data: prediction, error: insertError } = await client
    .from('ml_predictions')
    .insert({ post_id: post.id, success_score: successScore, confidence: null, model_version: modelVersion, suggestions } as never)
    .select('success_score, model_version, suggestions, created_at')
    .single<{ success_score: number; model_version: string; suggestions: AiSuggestion[]; created_at: string }>()
  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })

  // Se descuenta DESPUÉS de guardar la predicción con éxito, no antes — si
  // algo falla guardando, no se cobra un crédito por nada. Si esta segunda
  // escritura fallara (poco probable, misma base de datos), la predicción
  // ya quedó guardada igualmente: se prefiere un crédito de más a perder el
  // resultado ya calculado.
  const { error: ledgerError } = await client
    .from('credit_ledger')
    .insert({ creator_id: post.creator_id, amount: -1, reason: 'ml_prediction', related_post_id: post.id } as never)
  if (ledgerError) console.error('[ml/predict] fallo al descontar el crédito (la predicción ya se guardó igual):', ledgerError.message)

  return {
    successScore: prediction.success_score,
    modelVersion: prediction.model_version,
    aiEvaluated: prediction.model_version.includes('llm'),
    suggestions: prediction.suggestions ?? [],
    creditsRemaining: creditBalance - 1
  }
})
