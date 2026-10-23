import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/discover/search — motor único de "Descubrir", usado tanto por
 * /creator/discover (busca partners) como por /partner/discover (busca
 * creadores): la dirección se decide sola, mirando de qué ficha es dueño
 * quien llama, nunca de un `role` que mandara el cliente.
 *
 * Dos modos:
 * - `filters`: cruce estructural por categorías (solapamiento de arrays) y
 *   rango económico. Funciona siempre, sin IA.
 * - `ai`: además de los filtros, pide al mismo LLM gratuito de OpenRouter
 *   que ya usa `/api/ml/predict` (ver docs/8-AI-SUGGESTIONS-SETUP.md) que
 *   interprete `queryText` en lenguaje natural ("busco algo de moda
 *   sostenible, presupuesto 300-500€") y puntúe/explique el match contra
 *   cada candidato. Si no hay clave o el LLM falla, se cae en el orden por
 *   filtros (documentado, no es un error) — igual que `predict.post.ts`.
 *
 * Cada búsqueda (sea del modo que sea) deja un registro en
 * `discovery_searches` — es la materia prima de la vista de analíticas del
 * admin ("qué pide la gente"), para ir afinando el producto poco a poco.
 */

type ViewerRole = 'creator' | 'partner'

interface DiscoverBody {
  mode?: 'filters' | 'ai'
  queryText?: string
  filters?: {
    categories?: string[]
    minBudgetCents?: number | null
    maxBudgetCents?: number | null
  }
}

export interface DiscoveryResult {
  id: string
  name: string
  bio: string | null
  categories: string[]
  lookingFor: string | null
  minCents: number | null
  maxCents: number | null
  followers: number
  coverUrl: string | null
  score: number
  reason: string | null
}

interface CreatorCandidateRow {
  id: string
  display_name: string
  bio: string | null
  categories: string[] | null
  looking_for: string | null
  min_rate_cents: number | null
  max_rate_cents: number | null
  cover_url: string | null
  social_accounts: { followers_count: number }[] | null
}

interface PartnerCandidateRow {
  id: string
  company_name: string
  bio: string | null
  categories: string[] | null
  looking_for: string | null
  min_budget_cents: number | null
  max_budget_cents: number | null
  cover_url: string | null
}

const CANDIDATE_POOL_LIMIT = 200
// Probado directo contra OpenRouter con el modelo gratuito actual
// (nemotron-3.5-lightning, "reasoning"): 10 candidatos ya tardan ~30s él
// solo. Con 30 candidatos la respuesta se arrastra tanto que la sección de
// Destacados tarda una eternidad en aparecer — 16 es el punto en el que la
// espera deja de sentirse rota sin perder candidatos reales de la bolsa.
const AI_CANDIDATE_CAP = 16

function overlapCount(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setB = new Set(b)
  return a.filter((c) => setB.has(c)).length
}

function budgetCompatible(minA: number | null, maxA: number | null, minB: number | null, maxB: number | null): boolean {
  // Sin datos suficientes de un lado u otro, no se excluye — mejor mostrar
  // de más que esconder a alguien que simplemente no ha rellenado su ficha
  // todavía (la adopción de estos campos nuevos es gradual).
  if (minA == null && maxA == null) return true
  if (minB == null && maxB == null) return true
  const loA = minA ?? 0
  const hiA = maxA ?? Number.MAX_SAFE_INTEGER
  const loB = minB ?? 0
  const hiB = maxB ?? Number.MAX_SAFE_INTEGER
  return loA <= hiB && loB <= hiA
}

function heuristicScore(candidateCategories: string[], filterCategories: string[]): number {
  const overlap = overlapCount(candidateCategories, filterCategories)
  return filterCategories.length ? Math.round((overlap / filterCategories.length) * 100) : 50
}

interface AiRanked {
  id: string
  score: number
  reason: string
}

interface AiEvaluation {
  ranked: AiRanked[]
  extractedCategories: string[]
  summary: string | null
}

/**
 * Prompt adaptado del mismo patrón que `fetchAiEvaluation` en
 * `server/api/ml/predict.post.ts` — nunca lanza: si falla o no hay JSON
 * válido, se devuelve un resultado vacío y el handler cae en el orden por
 * filtros, que siempre funciona.
 */
async function fetchAiRanking(
  queryText: string,
  viewerRole: ViewerRole,
  candidates: { id: string; name: string; bio: string | null; categories: string[]; lookingFor: string | null }[],
  apiKey: string,
  model: string
): Promise<AiEvaluation> {
  const targetLabel = viewerRole === 'creator' ? 'partners (marcas)' : 'creadores de contenido'
  const list = candidates
    .map((c, i) => `${i + 1}. id=${c.id} | nombre="${c.name}" | categorías=${c.categories.join(', ') || 'sin especificar'} | bio="${c.bio ?? ''}" | busca="${c.lookingFor ?? ''}"`)
    .join('\n')

  const prompt = `Eres el motor de "Descubrir" de FEEDMA, un marketplace donde creadores de contenido y marcas (partners) se encuentran. Un ${viewerRole === 'creator' ? 'creador de contenido' : 'partner'} ha escrito esta búsqueda en lenguaje natural:

"${queryText}"

Candidatos disponibles (${targetLabel}):
${list}

Puntúa cada candidato de 0 a 100 según lo bien que encaja con lo que pide la búsqueda (categorías, presupuesto si lo menciona, tono). Sé honesto: si un candidato no tiene relación real, dale una puntuación baja en vez de inflarla.

Devuelve ÚNICAMENTE un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{"ranked": [{"id": "uuid del candidato", "score": 0-100, "reason": "1 frase breve en español explicando el porqué"}], "extracted_categories": ["categorías que detectas en la búsqueda, de una lista cerrada típica de nichos (moda, fitness, belleza, gaming, viajes, tecnología, etc.)"], "summary": "resumen de 1 frase de qué está pidiendo la persona, para analíticas internas"}`

  try {
    const response = await $fetch<{ choices?: { message?: { content?: string } }[]; error?: { message?: string } }>(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        // `max_tokens` generoso a propósito (igual que predict.post.ts, pero
        // más alto): los modelos gratuitos de OpenRouter son "reasoning"
        // (gastan tokens pensando antes de escribir la respuesta) y aquí se
        // les pide puntuar y justificar varios candidatos a la vez, no uno
        // solo — con un límite bajo el JSON llega cortado a mitad del
        // razonamiento, antes de escribirse de verdad.
        body: { model, messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 3000 },
        // 60s, no 30: probado directo contra OpenRouter con el modelo
        // gratuito actual (nemotron-3.5-lightning) puntuando 10 candidatos
        // reales — ~30s él solo, sin contar la ida/vuelta HTTP. Con el tope
        // de 30 candidatos (AI_CANDIDATE_CAP) 30s se queda corto y tira
        // "timeout" en vez de responder, cayendo al orden por filtros sin
        // que de verdad hiciera falta.
        timeout: 60_000
      }
    )

    if (response.error) {
      console.error('[discover/search] el LLM devolvió un error (se sigue solo con el orden por filtros):', response.error.message)
      return { ranked: [], extractedCategories: [], summary: null }
    }

    const raw = response.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`[discover/search] la respuesta del LLM no traía JSON reconocible (se sigue solo con el orden por filtros). Longitud de la respuesta: ${raw.length}.`)
      return { ranked: [], extractedCategories: [], summary: null }
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const ranked = Array.isArray(parsed.ranked)
      ? parsed.ranked
        .filter((r): r is AiRanked =>
          !!r && typeof r === 'object' && typeof (r as Record<string, unknown>).id === 'string' && typeof (r as Record<string, unknown>).score === 'number')
        .map((r) => ({ id: r.id, score: Math.max(0, Math.min(100, Math.round(r.score))), reason: typeof r.reason === 'string' ? r.reason : '' }))
      : []
    const extractedCategories = Array.isArray(parsed.extracted_categories)
      ? parsed.extracted_categories.filter((c): c is string => typeof c === 'string')
      : []
    const summary = typeof parsed.summary === 'string' ? parsed.summary : null

    return { ranked, extractedCategories, summary }
  } catch (err) {
    console.error('[discover/search] fallo al pedir ranking al LLM (se sigue solo con el orden por filtros):', err)
    return { ranked: [], extractedCategories: [], summary: null }
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

  const body = await readBody<DiscoverBody>(event)
  const mode = body.mode === 'ai' ? 'ai' : 'filters'
  const queryText = body.queryText?.trim() || null
  const filterCategories = body.filters?.categories ?? []
  const minBudgetCents = body.filters?.minBudgetCents ?? null
  const maxBudgetCents = body.filters?.maxBudgetCents ?? null

  const client = serverSupabaseServiceRole(event)

  const { data: ownCreator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  let viewerRole: ViewerRole
  if (ownCreator) {
    viewerRole = 'creator'
  } else {
    const { data: ownPartner } = await client.from('partners').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
    if (!ownPartner) throw createError({ statusCode: 403, statusMessage: 'No tienes una ficha de creador ni de partner.' })
    viewerRole = 'partner'
  }

  let results: DiscoveryResult[] = []

  if (viewerRole === 'creator') {
    const { data, error } = await client
      .from('partners')
      .select('id, company_name, bio, categories, looking_for, min_budget_cents, max_budget_cents, cover_url')
      .limit(CANDIDATE_POOL_LIMIT)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    const rows = (data ?? []) as PartnerCandidateRow[]
    const filtered = rows.filter((r) => {
      const categories = r.categories ?? []
      const categoryOk = !filterCategories.length || overlapCount(categories, filterCategories) > 0
      const budgetOk = budgetCompatible(minBudgetCents, maxBudgetCents, r.min_budget_cents, r.max_budget_cents)
      return categoryOk && budgetOk
    })

    results = filtered.map((r) => ({
      id: r.id,
      name: r.company_name,
      bio: r.bio,
      categories: r.categories ?? [],
      lookingFor: r.looking_for,
      minCents: r.min_budget_cents,
      maxCents: r.max_budget_cents,
      followers: 0,
      coverUrl: r.cover_url,
      score: heuristicScore(r.categories ?? [], filterCategories),
      reason: null
    }))
  } else {
    const { data, error } = await client
      .from('creators')
      .select('id, display_name, bio, categories, looking_for, min_rate_cents, max_rate_cents, cover_url, social_accounts(followers_count)')
      .limit(CANDIDATE_POOL_LIMIT)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    const rows = (data ?? []) as unknown as CreatorCandidateRow[]
    const filtered = rows.filter((r) => {
      const categories = r.categories ?? []
      const categoryOk = !filterCategories.length || overlapCount(categories, filterCategories) > 0
      const budgetOk = budgetCompatible(minBudgetCents, maxBudgetCents, r.min_rate_cents, r.max_rate_cents)
      return categoryOk && budgetOk
    })

    results = filtered.map((r) => ({
      id: r.id,
      name: r.display_name,
      bio: r.bio,
      categories: r.categories ?? [],
      lookingFor: r.looking_for,
      minCents: r.min_rate_cents,
      maxCents: r.max_rate_cents,
      followers: (r.social_accounts ?? []).reduce((sum, s) => sum + (s.followers_count ?? 0), 0),
      coverUrl: r.cover_url,
      score: heuristicScore(r.categories ?? [], filterCategories),
      reason: null
    }))
  }

  let aiExtracted: { categories: string[]; summary: string | null } | null = null

  if (mode === 'ai' && queryText) {
    const config = useRuntimeConfig(event)
    if (config.openrouterApiKey) {
      const pool = results.slice(0, AI_CANDIDATE_CAP)
      const evaluation = await fetchAiRanking(
        queryText,
        viewerRole,
        pool.map((r) => ({ id: r.id, name: r.name, bio: r.bio, categories: r.categories, lookingFor: r.lookingFor })),
        config.openrouterApiKey,
        config.openrouterModel
      )
      if (evaluation.ranked.length) {
        const scoreById = new Map(evaluation.ranked.map((r) => [r.id, r]))
        results = results
          .map((r) => {
            const ranked = scoreById.get(r.id)
            return ranked ? { ...r, score: ranked.score, reason: ranked.reason || null } : r
          })
          .sort((a, b) => b.score - a.score)
        aiExtracted = { categories: evaluation.extractedCategories, summary: evaluation.summary }
      } else {
        console.error('[discover/search] el LLM no devolvió ningún candidato puntuado (se sigue solo con el orden por filtros).')
      }
    } else {
      console.error('[discover/search] modo IA pedido pero no hay OPENROUTER_API_KEY configurada (se sigue solo con el orden por filtros).')
    }
  }

  if (!aiExtracted) results = results.sort((a, b) => b.score - a.score)

  // Registro para analíticas de admin — da igual si falla (no debe romper
  // la búsqueda del usuario por un problema de logging).
  try {
    await client.from('discovery_searches').insert({
      profile_id: user.sub,
      searcher_role: viewerRole,
      mode,
      query_text: queryText,
      filters: {
        categories: filterCategories,
        minBudgetCents,
        maxBudgetCents,
        ...(aiExtracted ? { aiExtractedCategories: aiExtracted.categories, aiSummary: aiExtracted.summary } : {})
      },
      results_count: results.length
    } as never)
  } catch (err) {
    console.error('[discover/search] fallo al registrar la búsqueda (no afecta al resultado):', err)
  }

  // `aiExtracted` antes se calculaba solo para el registro de analíticas y
  // se tiraba — la ficha-resumen de Destacados en el cliente lo necesita de
  // verdad para explicar qué ha entendido la IA de la búsqueda.
  return { viewerRole, results, aiSummary: aiExtracted?.summary ?? null, aiCategories: aiExtracted?.categories ?? [] }
})
