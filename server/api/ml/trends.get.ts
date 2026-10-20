import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { ContentType, Platform } from '~/types'

/**
 * GET /api/ml/trends — motor de tendencias real (ver docs/3-ML-PIPELINE.md
 * §3.2 "Trend Engine" y §3.5 "Fase 1 MVP"). Ojo con lo que esto NO es: no hay
 * ninguna fuente externa de tendencias conectada (ni Google Trends, ni
 * scraping de hashtags virales — eso sigue siendo trabajo futuro, igual que
 * el pgvector/embeddings de la Fase 2 del documento). Lo que sí es real:
 *
 * - El nicho y los posts propios del influencer SÍ vienen de Supabase de
 *   verdad (nada de mock-data.ts).
 * - Las ideas de contenido las genera el LLM gratuito de OpenRouter (mismo
 *   que /api/ml/predict) a partir de ese nicho y esos posts, para no repetir
 *   lo que ya ha publicado. El "potencial estimado" (score/growthPct) es una
 *   estimación del modelo, no una métrica medida — por eso el front ya no
 *   dice "detectadas en las últimas 48 horas".
 * - Si no hay `OPENROUTER_API_KEY`, o el LLM falla, cae en una lista fija de
 *   ideas genéricas por plataforma (sin pretender que son tendencias reales).
 * - Los resultados se guardan de verdad en `trends` (igual que las
 *   sugerencias de /api/ml/predict en `ml_predictions`) y se reutilizan
 *   durante 24h por nicho, para no llamar al LLM en cada visita a la página.
 */

interface InfluencerRow {
  id: string
  niche: string | null
}

interface OwnPostRow {
  title: string
  platform: Platform
  content_type: ContentType
}

interface TrendIdea {
  platform: Platform
  topic: string
  format: string
  hashtags: string[]
  score: number
  growthPct: number
}

interface TrendRow {
  id: string
  platform: string
  topic: string
  format: string | null
  hashtags: string[] | null
  score: string | number | null
  growth_pct: string | number | null
}

const FRESH_WINDOW_HOURS = 24
const MIN_CACHED = 3
const TARGET_COUNT = 4
const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin']

// Ideas genéricas de respaldo si no hay LLM configurado o falla: no son
// "tendencias detectadas", son buenas prácticas de formato conocidas por
// plataforma — honestas sobre lo que son.
const FALLBACK_IDEAS: TrendIdea[] = [
  { platform: 'tiktok', topic: 'Antes/después de un proceso real de tu trabajo', format: 'Vídeo corto con corte rápido', hashtags: ['#detrasdecamaras', '#procesoreal'], score: 62, growthPct: 12 },
  { platform: 'instagram', topic: 'Pregunta directa a tu audiencia en los primeros 3 segundos', format: 'Reel o carrusel de 3-4 láminas', hashtags: ['#preguntadeldia'], score: 58, growthPct: 9 },
  { platform: 'youtube', topic: 'Explicación de un error común en tu nicho y cómo evitarlo', format: 'Vídeo de 6-10 minutos', hashtags: ['#erroresacomunes'], score: 55, growthPct: 7 },
  { platform: 'instagram', topic: 'Comparativa honesta de dos opciones que tu audiencia suele dudar entre', format: 'Carrusel con capturas', hashtags: ['#comparativa'], score: 54, growthPct: 6 }
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function mapDbRow(row: TrendRow) {
  return {
    id: row.id,
    platform: row.platform as Platform,
    topic: row.topic,
    trendScore: Math.round(Number(row.score ?? 0)),
    growthPct: Math.round(Number(row.growth_pct ?? 0)),
    hashtags: row.hashtags ?? [],
    format: row.format ?? ''
  }
}

/**
 * Pide al LLM gratuito ideas de contenido para el nicho del influencer,
 * evitando repetir lo que ya ha publicado. Nunca lanza: si falla o no
 * devuelve JSON válido, se queda en `[]` y el handler usa `FALLBACK_IDEAS`.
 */
async function fetchAiTrendIdeas(niche: string, ownPosts: OwnPostRow[], apiKey: string, model: string): Promise<TrendIdea[]> {
  const recentTopics = ownPosts.length
    ? ownPosts.map((p) => `- (${p.platform}, ${p.content_type}) "${p.title}"`).join('\n')
    : '(todavía no ha publicado nada, no hay que evitar repetir nada concreto)'

  const prompt = `Eres un estratega de contenido para redes sociales, especializado en el nicho: "${niche}".

Publicaciones recientes de este creador (para no repetir las mismas ideas):
${recentTopics}

Devuelve ÚNICAMENTE un array JSON (sin texto adicional, sin markdown) de exactamente 4 ideas de contenido nuevas y variadas para este nicho, con esta forma exacta:
[{"platform": "instagram" | "tiktok" | "youtube" | "x" | "facebook" | "linkedin", "topic": "idea concreta, en español, una frase", "format": "formato sugerido, breve", "hashtags": ["#tag1", "#tag2", "#tag3"], "score": 0-100 (potencial estimado por ti, no un dato medido), "growthPct": 0-60 (crecimiento estimado por ti, no un dato medido)}]

Varía la plataforma entre las 4 ideas cuando tenga sentido para el nicho.`

  try {
    const response = await $fetch<{ choices?: { message?: { content?: string } }[] }>('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // Ver el mismo comentario en predict.post.ts: los modelos gratuitos de
      // OpenRouter son "reasoning" y necesitan presupuesto de tokens de
      // sobra o se cortan antes de escribir el JSON final.
      body: { model, messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 800 },
      timeout: 15_000
    })

    const raw = response.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed: unknown = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
      .filter((i) => typeof i.topic === 'string' && typeof i.format === 'string' && PLATFORMS.includes(i.platform as Platform))
      .map((i) => ({
        platform: i.platform as Platform,
        topic: i.topic as string,
        format: i.format as string,
        hashtags: Array.isArray(i.hashtags) ? i.hashtags.filter((h): h is string => typeof h === 'string').slice(0, 5) : [],
        score: clamp(Math.round(Number(i.score) || 50), 5, 98),
        growthPct: clamp(Math.round(Number(i.growthPct) || 10), 0, 60)
      }))
      .slice(0, TARGET_COUNT)
  } catch (err) {
    console.error('[ml/trends] fallo al pedir ideas al LLM (se cae al listado genérico):', err)
    return []
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

  const client = serverSupabaseServiceRole(event)

  const { data: influencer } = await client
    .from('influencers')
    .select('id, niche')
    .eq('profile_id', user.sub)
    .maybeSingle<InfluencerRow>()
  if (!influencer) throw createError({ statusCode: 403, statusMessage: 'Esta ruta es solo para creadores.' })

  const niche = influencer.niche?.trim() || 'general'

  const freshSince = new Date(Date.now() - FRESH_WINDOW_HOURS * 3_600_000).toISOString()
  const { data: cached } = await client
    .from('trends')
    .select('id, platform, topic, format, hashtags, score, growth_pct')
    .eq('niche', niche)
    .gte('detected_at', freshSince)
    .order('detected_at', { ascending: false })
    .limit(TARGET_COUNT)
    .returns<TrendRow[]>()

  if (cached && cached.length >= MIN_CACHED) {
    return { trends: cached.map(mapDbRow) }
  }

  const { data: ownPosts } = await client
    .from('posts')
    .select('title, platform, content_type')
    .eq('influencer_id', influencer.id)
    .order('created_at', { ascending: false })
    .limit(8)
    .returns<OwnPostRow[]>()

  const config = useRuntimeConfig(event)
  let ideas = config.openrouterApiKey
    ? await fetchAiTrendIdeas(niche, ownPosts ?? [], config.openrouterApiKey, config.openrouterModel)
    : []
  if (!ideas.length) ideas = FALLBACK_IDEAS

  const { data: inserted, error: insertError } = await client
    .from('trends')
    .insert(ideas.map((idea) => ({
      niche,
      platform: idea.platform,
      topic: idea.topic,
      format: idea.format,
      hashtags: idea.hashtags,
      score: idea.score,
      growth_pct: idea.growthPct
    })) as never)
    .select('id, platform, topic, format, hashtags, score, growth_pct')
    .returns<TrendRow[]>()
  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })

  return { trends: inserted.map(mapDbRow) }
})
