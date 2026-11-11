import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { emailMatches, planAccountDeletion } from '../../server/utils/account-deletion'
import { TERMS_VERSION } from '../../app/utils/legal'

const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8')

describe('eliminación de cuenta', () => {
  it('con colaboraciones abiertas no se elimina', () => {
    expect(planAccountDeletion(['completed', 'accepted'])).toBe('blocked')
    expect(planAccountDeletion(['requested'])).toBe('blocked')
    expect(planAccountDeletion(['in_progress', 'declined'])).toBe('blocked')
  })
  it('con historial compartido pasa a revisión; sin historial se borra al momento', () => {
    expect(planAccountDeletion(['completed'])).toBe('request')
    expect(planAccountDeletion(['cancelled', 'declined'])).toBe('request')
    expect(planAccountDeletion(['terminated'])).toBe('request')
    expect(planAccountDeletion([])).toBe('delete_now')
    expect(planAccountDeletion(['declined'])).toBe('delete_now')
  })
  it('exige escribir el email de la cuenta', () => {
    expect(emailMatches(' Ana@Test.es ', 'ana@test.es')).toBe(true)
    expect(emailMatches('otra@test.es', 'ana@test.es')).toBe(false)
    expect(emailMatches('', 'ana@test.es')).toBe(false)
    expect(emailMatches(undefined, 'ana@test.es')).toBe(false)
    expect(emailMatches('ana@test.es', undefined)).toBe(false)
  })
  it('el endpoint comprueba sesión, email y colaboraciones antes de borrar', () => {
    const src = read('server/api/account/delete.post.ts')
    const order = ['serverSupabaseUser(event)', 'emailMatches(', 'planAccountDeletion(', 'auth.admin.deleteUser(user.sub)'].map((s) => src.indexOf(s))
    expect(order.every((i) => i > -1)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // Solo puede borrar la cuenta de la sesión, nunca un id que venga en la petición.
    expect(src).not.toMatch(/deleteUser\(body/)
  })
})

describe('términos con versión', () => {
  it('la versión es una fecha y el alta la envía', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const signup = read('app/pages/onboarding.vue')
    expect(signup).toContain('terms_version: TERMS_VERSION')
    expect(signup).toContain('v-model="acceptedTerms" type="checkbox" required')
  })
  it('la aceptación solo se escribe con la función de base de datos', () => {
    const sql = read('supabase/migrations/20261112110000_account_terms_onboarding_deletion.sql')
    expect(sql).toContain('create or replace function public.accept_terms(p_version text)')
    expect(sql).not.toMatch(/grant update \([^)]*terms_/)
    expect(read('app/components/layout/AppShell.vue')).toContain('<TermsGate />')
  })
})
