export interface FichaCompleteness {
  bio: string | null
  categories: string[]
  minCents: number | null
  maxCents: number | null
}

/**
 * Sin bio, categorías o rango económico, la ficha pública no tiene con qué
 * mostrarse ni cruzarse en Descubrir (filtros y modo IA cruzan por
 * categorías/presupuesto; el perfil público se ve vacío sin bio) — usado
 * en los avisos de onboarding de creator/index.vue y partner/index.vue.
 */
export function isFichaIncomplete(f: FichaCompleteness): boolean {
  return !f.bio || f.categories.length === 0 || (!f.minCents && !f.maxCents)
}
