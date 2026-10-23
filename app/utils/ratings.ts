/**
 * Umbral para mostrar una media de valoraciones como un número de verdad.
 * Con menos reseñas, un "5,0" o un "1,0" no dice nada fiable y puede
 * penalizar o inflar a alguien nuevo de forma injusta — se pide esperar a
 * tener una base mínima, igual que pide el roadmap de producto.
 */
export const MIN_RATINGS_TO_SHOW = 3

export interface RatingSummary {
  avgStars: number
  ratingCount: number
}

/** Texto honesto para la media — nunca inventa un número con pocos datos. */
export function formatRatingSummary(summary: RatingSummary): string {
  if (summary.ratingCount === 0) return 'Sin valoraciones todavía'
  if (summary.ratingCount < MIN_RATINGS_TO_SHOW) {
    return `${summary.ratingCount} valoración${summary.ratingCount === 1 ? '' : 'es'} — todavía pocas para mostrar una media fiable`
  }
  const stars = summary.avgStars.toFixed(1).replace('.', ',')
  return `${stars} · ${summary.ratingCount} valoraciones`
}

export function hasEnoughRatingsToShowAverage(ratingCount: number): boolean {
  return ratingCount >= MIN_RATINGS_TO_SHOW
}
