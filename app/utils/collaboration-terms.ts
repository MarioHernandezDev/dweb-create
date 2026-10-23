/**
 * "Condiciones pactadas" de una colaboración (ver supabase/migrations/
 * 20261025150000_collaboration_terms.sql) — se fijan una sola vez al crear
 * la colaboración y quedan congeladas (un trigger lo garantiza en la base
 * de datos). Cada campo distingue "no especificado" de un valor explícito:
 * `revisionsIncluded: null` es "sin límite definido", distinto de `0`
 * ("cero revisiones incluidas"); `exclusivity` solo tiene dos valores
 * posibles (no hay un tercer estado "no especificado" para un booleano).
 */
export interface CollaborationTerms {
  scopeNotes: string | null
  revisionsIncluded: number | null
  exclusivity: boolean
  usageRights: string | null
  /** "Brief estructurado" (ver 20261025180000_collaboration_brief_fields.sql) — mismas reglas de congelación que las condiciones, en las mismas columnas de `collaborations`. */
  campaignGoal: string | null
  targetAudience: string | null
  tone: string | null
}

export function hasAnyTermsSpecified(terms: CollaborationTerms): boolean {
  return !!terms.scopeNotes || terms.revisionsIncluded !== null || terms.exclusivity || !!terms.usageRights
}

/** Independiente de `hasAnyTermsSpecified` — una subsección puede tener datos sin que la otra los tenga. */
export function hasAnyBriefSpecified(terms: CollaborationTerms): boolean {
  return !!terms.campaignGoal || !!terms.targetAudience || !!terms.tone
}

export function revisionsIncludedLabel(revisionsIncluded: number | null): string {
  if (revisionsIncluded === null) return 'Sin límite de revisiones definido'
  return revisionsIncluded === 1 ? '1 revisión incluida' : `${revisionsIncluded} revisiones incluidas`
}
