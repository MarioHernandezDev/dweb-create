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
  /** Perfil (auth) de la ficha: lo necesita «Enviar mensaje» desde la tarjeta. */
  profileId: string
  /** Colaboraciones aceptadas, en curso o completadas. Dato real, derivado de `collaborations`. */
  collabCount: number
  /** Mediana, en horas, de lo que tarda en responder a una solicitud (null si no hay datos). */
  responseHours: number | null
  /** Redes con actividad real (cuentas vinculadas del creador; publicaciones del partner). */
  platforms: string[]
  /** Marca verificada por el equipo de CIBERAN (siempre false para creadores). */
  verified: boolean
  /** Formatos que ofrece la marca (post, reel, stories, ambassador); vacío para creadores. */
  collaborationTypes: string[]
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
  created_at: string
  profile_id: string
  social_accounts: { followers_count: number; platform: string }[] | null
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
  created_at: string
  profile_id: string
  verified_at: string | null
  collaboration_types: string[] | null
}

const CANDIDATE_POOL_LIMIT = 200
// Con `reasoning: { enabled: false }` (ver fetchAiRanking) probado en real
// con 11 candidatos: ~10s. Se mantiene el tope en 16 — ya cubre de sobra la
// bolsa real de demo, y un prompt más largo sigue tardando más aunque el
// modelo ya no "piense" de más.
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

const chunk = <T>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))

/**
 * Rellena `collabCount`, `responseHours` y (para partners) `platforms` a partir de lo que ya hay en la base de
 * datos — nada inventado: si no hay datos suficientes, el campo queda vacío y la tarjeta no lo enseña.
 *  - colaboraciones: aceptadas, en curso o completadas de esa ficha.
 *  - tiempo de respuesta: mediana entre el evento `requested` y el primer `accepted`/`declined` posterior,
 *    solo en solicitudes que le enviaron a esa ficha (la otra parte las inició).
 *  - redes de un partner: las de las publicaciones de sus colaboraciones.
 */
async function enrichActivity(client: { from: (table: string) => any }, viewerRole: ViewerRole, results: DiscoveryResult[]) {
  if (!results.length) return
  const targetCol = viewerRole === 'creator' ? 'partner_id' : 'creator_id'
  const initiatorOfRequest = viewerRole === 'creator' ? 'creator' : 'partner'
  try {
    const collabRows: { id: string; target: string; status: string; initiated_by: string }[] = []
    for (const ids of chunk(results.map((r) => r.id), 80)) {
      const { data } = await client.from('collaborations').select(`id, ${targetCol}, status, initiated_by`).in(targetCol, ids)
      for (const row of (data ?? []) as unknown as Record<string, string>[]) {
        collabRows.push({ id: row.id as string, target: row[targetCol] as string, status: row.status as string, initiated_by: row.initiated_by as string })
      }
    }
    if (!collabRows.length) return

    const byTarget = new Map<string, typeof collabRows>()
    for (const c of collabRows) byTarget.set(c.target, [...(byTarget.get(c.target) ?? []), c])

    const requestIds = collabRows.filter((c) => c.initiated_by === initiatorOfRequest).map((c) => c.id)
    const events: { collaboration_id: string; kind: string; created_at: string; seq: number }[] = []
    for (const ids of chunk(requestIds, 80)) {
      const { data } = await client.from('collaboration_events').select('collaboration_id, kind, created_at, seq').in('collaboration_id', ids).in('kind', ['requested', 'accepted', 'declined'])
      events.push(...((data ?? []) as typeof events))
    }
    const eventsByCollab = new Map<string, typeof events>()
    for (const e of events) eventsByCollab.set(e.collaboration_id, [...(eventsByCollab.get(e.collaboration_id) ?? []), e])

    const platformsByCollab = new Map<string, Set<string>>()
    if (viewerRole === 'creator') {
      for (const ids of chunk(collabRows.map((c) => c.id), 80)) {
        const { data } = await client.from('posts').select('collaboration_id, platform').in('collaboration_id', ids)
        for (const p of (data ?? []) as { collaboration_id: string; platform: string }[]) {
          platformsByCollab.set(p.collaboration_id, (platformsByCollab.get(p.collaboration_id) ?? new Set()).add(p.platform))
        }
      }
    }

    for (const r of results) {
      const mine = byTarget.get(r.id) ?? []
      r.collabCount = mine.filter((c) => ['accepted', 'in_progress', 'completed'].includes(c.status)).length
      const hours: number[] = []
      for (const c of mine) {
        const list = (eventsByCollab.get(c.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.seq - b.seq)
        const asked = list.find((e) => e.kind === 'requested')
        const answered = asked ? list.find((e) => (e.kind === 'accepted' || e.kind === 'declined') && e.created_at >= asked.created_at) : null
        if (asked && answered) hours.push((Date.parse(answered.created_at) - Date.parse(asked.created_at)) / 3_600_000)
      }
      if (hours.length) {
        hours.sort((a, b) => a - b)
        const mid = Math.floor(hours.length / 2)
        const median = hours.length % 2 ? hours[mid]! : (hours[mid - 1]! + hours[mid]!) / 2
        r.responseHours = Math.round(median * 10) / 10
      }
      if (viewerRole === 'creator') {
        const set = new Set<string>()
        for (const c of mine) for (const p of platformsByCollab.get(c.id) ?? []) set.add(p)
        r.platforms = [...set]
      }
    }
  } catch (err) {
    // Es información de apoyo: si falla, las tarjetas salen sin ella en vez de romper la búsqueda.
    console.error('[discover/search] no se pudo calcular la actividad de los resultados:', err)
  }
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

  const prompt = `Eres el motor de "Descubrir" de CIBERAN, un marketplace donde creadores de contenido y marcas (partners) se encuentran. Un ${viewerRole === 'creator' ? 'creador de contenido' : 'partner'} ha escrito esta búsqueda en lenguaje natural:

"${queryText}"

Candidatos disponibles (${targetLabel}):
${list}

Puntúa cada candidato de 0 a 100 según lo bien que encaja con lo que pide la búsqueda (categorías, presupuesto si lo menciona, tono). Sé honesto: si un candidato no tiene relación real, dale una puntuación baja en vez de inflarla.

Devuelve ÚNICAMENTE un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{"ranked": [{"id": "uuid del candidato", "score": 0-100, "reason": "1 frase breve en español explicando el porqué"}], "extracted_categories": ["categorías que detectas en la búsqueda, de una lista cerrada típica de nichos (moda, fitness, belleza, gaming, viajes, tecnología, etc.)"], "summary": "resumen de 1 frase de qué está pidiendo la persona, para analíticas internas"}`

  try {
    const response = await $fetch<{ choices?: { message?: { content?: string; reasoning?: string }; finish_reason?: string }[]; error?: { message?: string } }>(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 3000,
          // Causa real del hallazgo #6 ("la IA no reordena ni da motivo",
          // ~30-57s de espera): el modelo gratuito actual es "reasoning"
          // (nemotron-3.5-lightning) y gastaba TODO `max_tokens` "pensando
          // en voz alta" (campo `reasoning` de la respuesta) antes de
          // escribir el JSON pedido — `finish_reason: "length"` con
          // `content: null`, confirmado probándolo en real contra 11
          // candidatos reales. Sin JSON que parsear, el handler caía en el
          // orden por filtros (empate a 50 sin filtro de categorías, por
          // eso el orden no cambiaba) con `reason` siempre a null — no era
          // un fallo silencioso aislado, pasaba la mayoría de las veces.
          // `reasoning: { enabled: false }` lo desactiva: mismo candidato,
          // misma pregunta, de 57.7s a 9.6s y con el ranking real aplicado
          // (verificado: un creador de fitness pasa a encabezar una
          // búsqueda de fitness, en vez de quedarse el orden de siempre).
          reasoning: { enabled: false }
        },
        // 30s de margen: con el razonamiento desactivado la respuesta real
        // tarda unos 10s con el tope de 16 candidatos (AI_CANDIDATE_CAP);
        // antes hacían falta 60s porque el modelo tardaba eso solo en
        // "pensar" sin llegar a responder.
        timeout: 30_000
      }
    )

    if (response.choices?.[0]?.finish_reason === 'length') {
      console.error('[discover/search] la respuesta del LLM se cortó por max_tokens (se sigue solo con el orden por filtros).')
      return { ranked: [], extractedCategories: [], summary: null }
    }

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
  // El modo `ai` llama al LLM y cada búsqueda escribe en `discovery_searches`.
  // El id del usuario es el claim `sub` (`user.id` no existe en los claims).
  enforceRateLimit(event, `discover-search:${user.sub}`, 20, 60_000)

  const body = await readBody<DiscoverBody>(event)
  const mode = body.mode === 'ai' ? 'ai' : 'filters'
  const queryText = body.queryText?.trim() || null
  const filterCategories = body.filters?.categories ?? []
  const minBudgetCents = body.filters?.minBudgetCents ?? null
  const maxBudgetCents = body.filters?.maxBudgetCents ?? null

  const client = serverSupabaseServiceRole(event)

  // Las dos comprobaciones a la vez (un viaje a la base de datos en vez de dos en serie para un partner).
  const [{ data: ownCreator }, { data: ownPartner }] = await Promise.all([
    client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>(),
    client.from('partners').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  ])
  let viewerRole: ViewerRole
  if (ownCreator) {
    viewerRole = 'creator'
  } else {
    if (!ownPartner) throw createError({ statusCode: 403, statusMessage: 'No tienes una ficha de creador ni de partner.' })
    viewerRole = 'partner'
  }

  let results: DiscoveryResult[] = []

  // `.order('created_at')`: sin filtro de categorías, heuristicScore() da el
  // mismo 50 a todos — sin esto, el orden final dependía de lo que
  // Postgres devolviera sin más (no garantizado, podía cambiar entre
  // peticiones idénticas). Array.prototype.sort es estable (ES2019+), así
  // que con las puntuaciones empatadas este orden de la base de datos es
  // justo el que se conserva al pintar — "más recientes primero" en vez de
  // arbitrario.
  if (viewerRole === 'creator') {
    const { data, error } = await client
      .from('partners')
      .select('id, profile_id, company_name, bio, categories, looking_for, min_budget_cents, max_budget_cents, cover_url, created_at, verified_at, collaboration_types')
      .order('created_at', { ascending: false })
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
      reason: null,
      profileId: r.profile_id,
      collabCount: 0,
      responseHours: null,
      platforms: [],
      verified: !!r.verified_at,
      collaborationTypes: r.collaboration_types ?? []
    }))
  } else {
    const { data, error } = await client
      .from('creators')
      .select('id, profile_id, display_name, bio, categories, looking_for, min_rate_cents, max_rate_cents, cover_url, created_at, social_accounts(followers_count, platform)')
      .order('created_at', { ascending: false })
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
      reason: null,
      profileId: r.profile_id,
      collabCount: 0,
      responseHours: null,
      platforms: [...new Set((r.social_accounts ?? []).map((a) => a.platform))],
      verified: false,
      collaborationTypes: []
    }))
  }

  // Datos reales de actividad (colaboraciones, tiempo de respuesta, redes) para las tarjetas.
  await enrichActivity(client, viewerRole, results)

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
  // Sin esperarlo: es solo analítica y no debe alargar la respuesta (un viaje más a la base de datos).
  const logSearch = (async () => {
    try {
      const { error: logError } = await client.from('discovery_searches').insert({
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
      if (logError) console.error('[discover/search] fallo al registrar la búsqueda (no afecta al resultado):', logError.message)
    } catch (err) {
      console.error('[discover/search] fallo al registrar la búsqueda (no afecta al resultado):', err)
    }
  })()
  // `waitUntil` mantiene viva la tarea en plataformas serverless tras responder; si no existe, simplemente sigue en segundo plano.
  if (typeof event.waitUntil === 'function') event.waitUntil(logSearch)

  // `aiExtracted` antes se calculaba solo para el registro de analíticas y
  // se tiraba — la ficha-resumen de Destacados en el cliente lo necesita de
  // verdad para explicar qué ha entendido la IA de la búsqueda.
  return { viewerRole, results, aiSummary: aiExtracted?.summary ?? null, aiCategories: aiExtracted?.categories ?? [] }
})
