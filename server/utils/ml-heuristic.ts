/**
 * Heurística estructural del motor de ML (ver docs/3-ML-PIPELINE.md §3.4.2 y
 * server/api/ml/predict.post.ts) — vive en su propio archivo, sin nada de
 * Nitro/Supabase, para poder probarla con un test unitario normal y
 * corriente. No sabe si el contenido es BUENO, solo si tiene la forma de un
 * post currado (longitud de título/caption, nº de hashtags).
 */
export interface PredictablePost {
  title: string
  caption: string | null
  metadata: { hashtags?: string[] } | null
}

export const MODEL_VERSION_STRUCTURAL_ONLY = 'v1-heuristic-2026.01'
export const MODEL_VERSION_WITH_LLM = 'v1-heuristic+llm-2026.01'

export function structuralScore(post: PredictablePost): number {
  const captionLength = post.caption?.length ?? 0
  const hashtagCount = post.metadata?.hashtags?.length ?? 0

  let score = 50
  score += Math.min(post.title.length, 20) * 0.5
  score += captionLength > 40 ? 10 : 0
  score += Math.min(hashtagCount, 5) * 2

  return Math.max(5, Math.min(96, Math.round(score)))
}
