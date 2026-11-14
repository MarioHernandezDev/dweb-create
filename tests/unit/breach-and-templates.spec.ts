import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIVITY_NOTIFICATION_TYPES, MUTABLE_NOTIFICATION_TYPES } from '../../app/utils/notifications'
import { collaborationStatusMeta, isActiveCollaborationStatus } from '../../app/utils/status'
import { collabPhase, paymentState } from '../../app/utils/collab-phase'
import { TEMPLATE_MAX, sanitizeInviteTemplate, sanitizeProposalTemplate, templateName } from '../../app/utils/proposal-templates'

const root = join(__dirname, '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const sql = read('supabase', 'migrations', '20261111100000_breach_termination_and_templates.sql')

describe('terminación por incumplimiento', () => {
  it('el aviso existe en la migración, tiene icono, es «Importante» y no se puede silenciar', () => {
    expect(sql).toContain("'collaboration_terminated'")
    expect(read('app', 'pages', 'inbox.vue')).toMatch(/collaboration_terminated:\s*'ph:[a-z0-9-]+'/)
    expect((ACTIVITY_NOTIFICATION_TYPES as readonly string[]).includes('collaboration_terminated')).toBe(false)
    expect(MUTABLE_NOTIFICATION_TYPES).not.toContain('collaboration_terminated')
  })
  it('el evento se pinta en la cronología y la denuncia tiene etiqueta en el panel de admin', () => {
    expect(read('app', 'components', 'collab', 'CollabTimeline.vue')).toContain("case 'terminated':")
    expect(sql).toMatch(/'other', 'breach'/)
    expect(read('app', 'utils', 'admin-labels.ts')).toMatch(/breach:\s*'/)
  })
  it('«terminada» tiene etiqueta, no es activa, no tiene fase y no es cobrable', () => {
    expect(collaborationStatusMeta.terminated.label).toMatch(/incumplimiento/)
    expect(isActiveCollaborationStatus('terminated')).toBe(false)
    expect(collabPhase({ status: 'terminated', paidAt: null }, [])).toBeNull()
    expect(paymentState({ status: 'terminated', paidAt: null, budgetCents: 10000 })).toBe('none')
    expect(sql).toMatch(/'declined', 'cancelled', 'terminated'\)/)
  })
  it('la función exige ser parte, estado abierto y un motivo de 20 a 1000 caracteres', () => {
    expect(sql).toMatch(/current_creator_id\(\)[\s\S]+current_partner_id\(\)/)
    expect(sql).toMatch(/status not in \('accepted', 'in_progress'\)/)
    expect(sql).toMatch(/char_length\(reason\) < 20/)
    expect(sql).toMatch(/revoke execute on function public\.terminate_collaboration_for_breach\(uuid, text\) from public, anon/)
  })
})

describe('plantillas de propuesta', () => {
  it('el tope del cliente es el de la base de datos', () => {
    expect(sql).toContain(`>= ${TEMPLATE_MAX} then`)
  })
  it('una plantilla de creador se limpia campo a campo', () => {
    const t = sanitizeProposalTemplate({ rateEuros: 350.4, reels: 3, posts: -2, stories: 99, usage: '6m', message: 'Hola', exclusivity: true, revisionsIncluded: 2, tone: 7, extra: 'x' })
    expect(t).toEqual({ rateEuros: 350, reels: 3, posts: 0, stories: 20, usage: '6m', message: 'Hola', campaignGoal: '', targetAudience: '', tone: '', revisionsIncluded: 2, exclusivity: true })
    expect(sanitizeProposalTemplate({ usage: 'inventado', rateEuros: -5 })).toMatchObject({ usage: 'none', rateEuros: null })
  })
  it('datos corruptos no rompen el formulario', () => {
    for (const bad of [null, 'texto', 42, [1, 2]]) {
      expect(sanitizeProposalTemplate(bad).reels).toBe(0)
      expect(sanitizeInviteTemplate(bad)).toMatchObject({ message: '', budgetEuros: null, exclusivity: false })
    }
    expect(sanitizeInviteTemplate({ message: 'm'.repeat(5000), budgetEuros: 300, scopeNotes: '3 reels' })).toMatchObject({ budgetEuros: 300, scopeNotes: '3 reels' })
    expect(sanitizeInviteTemplate({ message: 'm'.repeat(5000) }).message.length).toBe(2000)
  })
  it('el nombre se recorta y se valida', () => {
    expect(templateName('  Pack   3 reels ')).toBe('Pack 3 reels')
    expect(templateName('   ')).toBeNull()
    expect(templateName('x'.repeat(81))).toBeNull()
  })
})

describe('acceso con Google', () => {
  it('el botón solo aparece con GOOGLE_AUTH_ENABLED y vuelve por /confirm', () => {
    const login = read('app', 'pages', 'login.vue')
    expect(login).toMatch(/v-if="googleEnabled"/)
    expect(login).toMatch(/redirectTo: `\$\{window\.location\.origin\}\/confirm`/)
    expect(read('nuxt.config.ts')).toMatch(/googleAuthEnabled: process\.env\.GOOGLE_AUTH_ENABLED === 'true'/)
  })
})
