import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { type BlockerRow, emailMatches, planAccountDeletion, toDeletionBlockers } from '../../server/utils/account-deletion'
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

describe('eliminación de cuenta: qué hay que cerrar', () => {
  const row = (over: Partial<BlockerRow>): BlockerRow => ({
    id: 'c1', status: 'requested', initiated_by: 'creator', brief: 'Propuesta: 4 reels', package_title: null,
    creator_id: 'cr1', partner_id: 'pa1', creator: { display_name: 'Ana' }, partner: { company_name: 'SoundWave' }, ...over
  })
  const mineCreator = { creatorId: 'cr1', partnerId: null }

  it('una solicitud que envié se puede retirar, y apunta a mi colaboración', () => {
    const [b] = toDeletionBlockers([row({})], mineCreator)
    expect(b).toMatchObject({ id: 'c1', action: 'withdraw', counterpart: 'SoundWave', href: '/creator/collaborations/c1', title: 'Propuesta: 4 reels' })
  })
  it('una solicitud recibida se responde; una en marcha se cierra', () => {
    const rows = [row({ id: 'a', initiated_by: 'partner' }), row({ id: 'b', status: 'in_progress' }), row({ id: 'c', status: 'accepted', initiated_by: 'partner' })]
    expect(toDeletionBlockers(rows, mineCreator).map((b) => [b.id, b.action])).toEqual([['a', 'respond'], ['b', 'close'], ['c', 'close']])
  })
  it('desde la ficha de partner la contraparte es el creador y el enlace va a /partner', () => {
    const [b] = toDeletionBlockers([row({ initiated_by: 'partner' })], { creatorId: null, partnerId: 'pa1' })
    expect(b).toMatchObject({ action: 'withdraw', counterpart: 'Ana', href: '/partner/collaborations/c1' })
  })
  it('ignora las que no están abiertas y recorta los títulos largos', () => {
    const rows = [row({ id: 'x', status: 'completed' }), row({ id: 'y', brief: null, package_title: 'a'.repeat(120) }), row({ id: 'z', brief: null, package_title: null })]
    const list = toDeletionBlockers(rows, mineCreator)
    expect(list.map((b) => b.id)).toEqual(['y', 'z'])
    expect(list[0]!.title.length).toBeLessThanOrEqual(70)
    expect(list[1]!.title).toBe('Colaboración sin título')
  })
  it('el POST devuelve la lista en el 409 y existe un GET que solo lee', () => {
    expect(read('server/api/account/delete.post.ts')).toMatch(/statusCode: 409[\s\S]*blockers/)
    const get = read('server/api/account/delete.get.ts')
    expect(get).toMatch(/serverSupabaseUser/)
    expect(get).toMatch(/enforceUserRateLimit/)
    expect(get).not.toMatch(/\.delete\(|deleteUser|\.update\(/)
  })
  it('retirar una solicitud solo la puede quien la envió, está limitada a usuarios con sesión y es reversible', () => {
    const sql = read('supabase/migrations/20261114100000_withdraw_collaboration_request.sql')
    expect(sql).toMatch(/Solo puede retirar la solicitud quien la envió/)
    expect(sql).toMatch(/coll\.status <> 'requested'/)
    expect(sql).toMatch(/revoke execute on function public\.withdraw_collaboration_request\(uuid\) from public, anon/)
    expect(sql).toMatch(/grant execute on function public\.withdraw_collaboration_request\(uuid\) to authenticated/)
    expect(sql).toMatch(/ROLLBACK/)
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
