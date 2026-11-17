/**
 * Fase visible de una colaboración. No se guarda en ninguna parte: se deduce del estado de la colaboración, de sus
 * publicaciones y de si está pagada — así nunca se desincroniza con lo que de verdad ha pasado.
 *
 *   Aceptada       → aceptada, sin ninguna publicación empezada
 *   En producción  → alguna publicación en marcha
 *   Revisión       → alguna publicación esperando la aprobación de la marca
 *   Publicada      → todo publicado (o colaboración completada), pendiente de pago
 *   Pagada         → `paid_at` informado
 *
 * Las solicitudes pendientes y las rechazadas no tienen fase: viven en «Solicitudes».
 */
import type { PostStatus } from '../types'

export type CollabPhase = 'accepted' | 'in_production' | 'brand_review' | 'published' | 'paid'

export const COLLAB_PHASES: { value: CollabPhase; label: string }[] = [
  { value: 'accepted', label: 'Aceptada' },
  { value: 'in_production', label: 'En producción' },
  { value: 'brand_review', label: 'Revisión de marca' },
  { value: 'published', label: 'Publicada' },
  { value: 'paid', label: 'Pagada' }
]

/** Fases que se enseñan: sin cobros activos (lanzamiento gratis) el recorrido acaba en «Publicada». */
export function visiblePhases(paymentsEnabled: boolean) {
  return paymentsEnabled ? COLLAB_PHASES : COLLAB_PHASES.filter((p) => p.value !== 'paid')
}

export interface PhaseSubject { status: string; paidAt: string | null }
export interface PhasePost { status: PostStatus }

export function collabPhase(c: PhaseSubject, posts: PhasePost[]): CollabPhase | null {
  if (c.status !== 'accepted' && c.status !== 'in_progress' && c.status !== 'completed') return null
  if (c.paidAt) return 'paid'
  if (c.status === 'completed') return 'published'
  if (posts.some((p) => p.status === 'ready_for_review')) return 'brand_review'
  if (posts.length && posts.every((p) => p.status === 'published')) return 'published'
  if (posts.some((p) => p.status !== 'idea')) return 'in_production'
  return 'accepted'
}

/** Estado del pago: el dinero va directo al creador por Stripe, así que solo hay «pagado» o «por pagar». */
export function paymentState(c: PhaseSubject & { budgetCents: number | null }, paymentsEnabled = true): 'paid' | 'pending' | 'none' {
  if (c.paidAt) return 'paid'
  // Sin cobros activos no hay nada «por pagar» dentro de CIBERAN.
  if (!paymentsEnabled) return 'none'
  if (c.status !== 'accepted' && c.status !== 'in_progress' && c.status !== 'completed') return 'none'
  return c.budgetCents ? 'pending' : 'none'
}

/** Título corto de una colaboración: el del paquete aceptado o la primera frase del brief. */
export function collabTitle(c: { packageTitle?: string | null; brief: string }, max = 60): string {
  const base = (c.packageTitle?.trim() || c.brief.trim().split(/(?<=[.!?])\s|\n/)[0] || 'Colaboración').trim().replace(/\.$/, '')
  return base.length > max ? `${base.slice(0, max - 1).trimEnd()}…` : base
}

/**
 * Nombre con el que se reconoce una colaboración en su página: el del paquete aceptado; si no hay, la primera frase
 * del brief solo si es corta y entera (nunca cortada con «…»); y si tampoco, «Colaboración con {persona}». El texto
 * completo del brief se enseña aparte (`collabBriefExcerpt`), así que el título deja de depender de una frase truncada.
 * No hay un campo «nombre de campaña» en la base de datos: añadirlo exigiría una migración.
 */
export function collabDisplayName(c: { packageTitle?: string | null; brief: string }, counterpart: string, max = 48): string {
  const pkg = c.packageTitle?.trim()
  if (pkg) return pkg
  const first = (c.brief.trim().split(/(?<=[.!?])\s|\n/)[0] ?? '').trim().replace(/\.$/, '')
  if (first && first.length <= max && first.length >= 6) return first
  return counterpart ? `Colaboración con ${counterpart}` : 'Colaboración'
}

/** Brief para enseñar bajo el título, solo si el título no es ya ese mismo texto. */
export function collabBriefExcerpt(c: { brief: string }, title: string, max = 160): string | null {
  const brief = c.brief.trim().replace(/\s+/g, ' ')
  if (!brief || brief.replace(/[.:]$/, '') === title) return null
  return brief.length > max ? `${brief.slice(0, max - 1).trimEnd()}…` : brief
}

/** Importe en euros; a diferencia de `formatEuros`, un 0 se escribe «0 €» (no «Sin presupuesto»). */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100)
}
