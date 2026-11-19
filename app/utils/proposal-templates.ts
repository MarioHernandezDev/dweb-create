/**
 * Plantillas de propuesta (tabla `proposal_templates`, migración 20261111100000). Una plantilla guarda lo que se
 * repite de una propuesta a otra; al aplicarla se rellenan los campos y se puede retocar antes de enviar.
 *  - `proposal`: la propuesta de un creador a una marca (ProposalDialog).
 *  - `invite`: la invitación de una marca a un creador (InviteDialog).
 *  - `post`: una publicación del creador (PostComposerSheet; ver utils/post-templates.ts).
 * Lo guardado es JSON: al leerlo se valida campo a campo, sin fiarse de su forma.
 */
import { USAGE_OPTIONS, type UsageOption } from './proposal'

export type TemplateKind = 'proposal' | 'invite' | 'post'
export const TEMPLATE_MAX = 15
export const TEMPLATE_NAME_MAX = 80

interface SharedTerms {
  campaignGoal: string
  targetAudience: string
  tone: string
  revisionsIncluded: number | null
  exclusivity: boolean
}
export interface ProposalTemplateData extends SharedTerms {
  rateEuros: number | null
  reels: number
  posts: number
  stories: number
  usage: UsageOption
  message: string
}
export interface InviteTemplateData extends SharedTerms {
  message: string
  budgetEuros: number | null
  scopeNotes: string
  usageRights: string
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const count = (v: unknown, max = 20) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0)
const money = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1_000_000 ? Math.round(v) : null)
const revisions = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 20 ? Math.round(v) : null)

function shared(d: Record<string, unknown>): SharedTerms {
  return {
    campaignGoal: text(d.campaignGoal, 500), targetAudience: text(d.targetAudience, 500), tone: text(d.tone, 500),
    revisionsIncluded: revisions(d.revisionsIncluded), exclusivity: d.exclusivity === true
  }
}
const asObject = (raw: unknown) => (raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {})

export function sanitizeProposalTemplate(raw: unknown): ProposalTemplateData {
  const d = asObject(raw)
  const usage = USAGE_OPTIONS.some((o) => o.value === d.usage) ? (d.usage as UsageOption) : 'none'
  return { ...shared(d), rateEuros: money(d.rateEuros), reels: count(d.reels), posts: count(d.posts), stories: count(d.stories), usage, message: text(d.message, 1000) }
}

export function sanitizeInviteTemplate(raw: unknown): InviteTemplateData {
  const d = asObject(raw)
  return { ...shared(d), message: text(d.message, 2000), budgetEuros: money(d.budgetEuros), scopeNotes: text(d.scopeNotes, 1000), usageRights: text(d.usageRights, 500) }
}

/** Nombre limpio de la plantilla, o `null` si no vale. */
export function templateName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  return name.length >= 1 && name.length <= TEMPLATE_NAME_MAX ? name : null
}
