import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_ROLES, hashAdminPassword, isAdminRole, roleAtLeast, validateAdminPassword, validateMemberInput, verifyAdminPassword } from '../../server/utils/admin-roles'
import { UUID_RE, isoDay, nextDay, orIlike, pageParams, searchTerm } from '../../server/utils/admin-query'
import { ALERT_THRESHOLDS, buildAdminAlerts, topHotspots } from '../../server/utils/admin-alerts'
import { resolveAssignee } from '../../server/utils/admin-assign'
import { anonymizedEmail, decideRemoval } from '../../server/utils/admin-account-removal'
import { ACTIVITY_TYPES, applyActivityFilters } from '../../server/utils/admin-activity-query'
import { QUICK_NOTES, ageLabel, canDo } from '../../app/utils/admin-labels'
import { reviewUpdate } from '../../server/utils/report-review'

const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8')
const ID = '9bf6fd22-1ec7-4c17-89de-ef8ae63e01b3'

describe('roles y contraseñas del equipo', () => {
  it('los roles se ordenan: lectura < moderación < administración', () => {
    expect(ADMIN_ROLES).toEqual(['viewer', 'moderator', 'admin'])
    expect(roleAtLeast('viewer', 'moderator')).toBe(false)
    expect(roleAtLeast('moderator', 'moderator')).toBe(true)
    expect(roleAtLeast('admin', 'moderator')).toBe(true)
    expect(roleAtLeast('moderator', 'admin')).toBe(false)
    expect(isAdminRole('admin')).toBe(true)
    expect(isAdminRole('root')).toBe(false)
    expect(canDo('moderator', 'admin')).toBe(false)
    expect(canDo(null, 'viewer')).toBe(false)
  })
  it('la contraseña se guarda con scrypt y sal propia, y solo valida la correcta', () => {
    const a = hashAdminPassword('una-clave-larga-1')
    const b = hashAdminPassword('una-clave-larga-1')
    expect(a).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(a).not.toBe(b)
    expect(a).not.toContain('una-clave')
    expect(verifyAdminPassword('una-clave-larga-1', a)).toBe(true)
    expect(verifyAdminPassword('otra-clave-larga', a)).toBe(false)
    expect(verifyAdminPassword('x', 'texto-sin-formato')).toBe(false)
  })
  it('valida el alta de una persona del equipo', () => {
    expect(validateAdminPassword('corta')).toMatch(/10 caracteres/)
    expect(validateAdminPassword('suficientemente-larga')).toBeNull()
    const ok = validateMemberInput({ email: ' Marta@Ciberan.es ', name: ' Marta ', role: 'moderator', password: 'clave-de-equipo-1' })
    expect(ok).toMatchObject({ ok: true, value: { email: 'marta@ciberan.es', name: 'Marta', role: 'moderator' } })
    expect(validateMemberInput({ email: 'no-es-correo', name: 'Marta', role: 'admin', password: 'clave-de-equipo-1' })).toMatchObject({ ok: false })
    expect(validateMemberInput({ email: 'a@b.es', name: 'Marta', role: 'dios', password: 'clave-de-equipo-1' })).toMatchObject({ ok: false })
    expect(validateMemberInput({ email: 'a@b.es', name: 'M', role: 'admin', password: 'clave-de-equipo-1' })).toMatchObject({ ok: false })
  })
})

describe('paginación y búsqueda del admin', () => {
  it('pagina con límites razonables', () => {
    expect(pageParams({})).toEqual({ page: 1, pageSize: 25, from: 0, to: 24 })
    expect(pageParams({ page: '3', pageSize: '10' })).toEqual({ page: 3, pageSize: 10, from: 20, to: 29 })
    expect(pageParams({ page: '-4', pageSize: '100000' })).toMatchObject({ page: 1, pageSize: 100 })
    expect(pageParams({ page: 'abc', pageSize: '0' })).toMatchObject({ page: 1, pageSize: 25 })
  })
  it('la búsqueda no puede colar sintaxis del filtro de la base', () => {
    expect(searchTerm('  ana,(x) %_*  ')).toBe('ana x')
    expect(searchTerm('a"b\'c`d\\e:f;g')).toBe('a b c d e f g')
    expect(searchTerm('x'.repeat(200))).toHaveLength(80)
    expect(searchTerm(42)).toBe('')
    expect(orIlike(['email', 'full_name'], 'ana')).toBe('email.ilike.%ana%,full_name.ilike.%ana%')
    expect(UUID_RE.test(ID)).toBe(true)
    expect(UUID_RE.test('no-es-uuid')).toBe(false)
  })
  it('las fechas del filtro son días válidos y «hasta» incluye el día entero', () => {
    expect(isoDay('2026-11-14')).toBe('2026-11-14')
    expect(isoDay('14/11/2026')).toBeNull()
    expect(isoDay('2026-13-45')).toBeNull()
    expect(nextDay('2026-11-30')).toBe('2026-12-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
  })
  it('el feed de actividad aplica solo filtros válidos', () => {
    const calls: [string, ...unknown[]][] = []
    const q: Record<string, (...a: unknown[]) => unknown> = {}
    for (const m of ['in', 'or', 'eq', 'gte', 'lt']) q[m] = (...a: unknown[]) => { calls.push([m, ...a]); return q }
    applyActivityFilters(q as never, { types: 'signup,hackeado,payment', q: 'ana', profile: ID, from: '2026-11-01', to: '2026-11-14' })
    expect(calls).toEqual([
      ['in', 'type', ['signup', 'payment']],
      ['or', 'summary.ilike.%ana%'],
      ['eq', 'profile_id', ID],
      ['gte', 'created_at', '2026-11-01T00:00:00Z'],
      ['lt', 'created_at', '2026-11-15T00:00:00Z']
    ])
    calls.length = 0
    applyActivityFilters(q as never, { profile: 'x', from: 'mal', types: 'nada' })
    expect(calls).toEqual([])
    expect(ACTIVITY_TYPES).toContain('admin_action')
  })
})

describe('alertas del panel', () => {
  const base = { staleReports: 0, oldestStaleReportHours: null, staleDeletions: 0, reportsLast24h: 0, hotspots: [] }
  it('sin nada atrasado no hay alertas', () => {
    expect(buildAdminAlerts(base)).toEqual([])
  })
  it('un reporte atrasado avisa, y se vuelve grave a la semana', () => {
    const [soft] = buildAdminAlerts({ ...base, staleReports: 2, oldestStaleReportHours: 60 })
    expect(soft).toMatchObject({ id: 'stale-reports', level: 'warning', tab: 'reports' })
    expect(soft!.title).toContain('2 reportes')
    expect(soft!.detail).toContain('2 días')
    const [hard] = buildAdminAlerts({ ...base, staleReports: 1, oldestStaleReportHours: 24 * 8 })
    expect(hard).toMatchObject({ level: 'danger' })
  })
  it('las eliminaciones sin atender son siempre graves y llevan a su bandeja', () => {
    const [a] = buildAdminAlerts({ ...base, staleDeletions: 1 })
    expect(a).toMatchObject({ id: 'stale-deletions', level: 'danger', query: { r_view: 'deletions' } })
  })
  it('detecta picos y cuentas con varios reportes', () => {
    const alerts = buildAdminAlerts({ ...base, reportsLast24h: ALERT_THRESHOLDS.spikeReports, hotspots: [{ profileId: ID, name: 'SoundWave', count: 3 }, { profileId: null, name: 'Poco', count: 2 }] })
    expect(alerts.map((a) => a.id)).toEqual(['report-spike', `hotspot-${ID}`])
    expect(alerts[1]).toMatchObject({ tab: 'users', query: { u_q: ID } })
  })
  it('agrupa reportes por cuenta reportada', () => {
    const rows = [
      { reported_profile_id: 'a', reported_name: 'A' }, { reported_profile_id: 'b', reported_name: 'B' },
      { reported_profile_id: 'a', reported_name: 'A' }, { reported_profile_id: null, reported_name: 'Sin id' }
    ]
    expect(topHotspots(rows)[0]).toEqual({ profileId: 'a', name: 'A', count: 2 })
    expect(topHotspots(rows, 2)).toHaveLength(2)
  })
})

describe('asignación y notas', () => {
  it('interpreta a quién se asigna', () => {
    expect(resolveAssignee(undefined, null)).toMatchObject({ ok: true, skip: true })
    expect(resolveAssignee(null, 'm1')).toEqual({ ok: true, skip: false, value: null })
    expect(resolveAssignee('none', 'm1')).toEqual({ ok: true, skip: false, value: null })
    expect(resolveAssignee('me', 'm1')).toEqual({ ok: true, skip: false, value: 'm1' })
    expect(resolveAssignee('me', null)).toMatchObject({ ok: false })
    expect(resolveAssignee(ID, null)).toEqual({ ok: true, skip: false, value: ID })
    expect(resolveAssignee('cualquiera', 'm1')).toMatchObject({ ok: false })
  })
  it('todas las notas rápidas valen para cerrar un reporte', () => {
    for (const n of QUICK_NOTES) expect(reviewUpdate('resolved', n.text).ok, n.label).toBe(true)
  })
  it('la antigüedad se lee a golpe de vista', () => {
    const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
    expect(ageLabel(ago(0.2))).toBe('menos de 1 h')
    expect(ageLabel(ago(5))).toBe('5 h')
    expect(ageLabel(ago(24 * 3))).toBe('3 d')
  })
})

describe('eliminar una cuenta desde el admin', () => {
  const ok = { mode: 'anonymize', confirmEmail: 'ana@x.es', accountEmail: 'Ana@X.es', statuses: [] as string[], acknowledgeSharedHistory: false }
  it('hay que escribir el correo y elegir modo', () => {
    expect(decideRemoval(ok)).toEqual({ ok: true })
    expect(decideRemoval({ ...ok, confirmEmail: 'otra@x.es' })).toMatchObject({ ok: false, code: 'email_mismatch' })
    expect(decideRemoval({ ...ok, mode: 'borrar' })).toMatchObject({ ok: false, code: 'bad_mode' })
  })
  it('con colaboraciones abiertas no se toca nada', () => {
    expect(decideRemoval({ ...ok, statuses: ['completed', 'in_progress'] })).toMatchObject({ ok: false, code: 'blocked' })
    expect(decideRemoval({ ...ok, mode: 'delete', statuses: ['requested'], acknowledgeSharedHistory: true })).toMatchObject({ ok: false, code: 'blocked' })
  })
  it('borrar del todo con historial compartido exige reconocerlo; anonimizar no', () => {
    expect(decideRemoval({ ...ok, mode: 'delete', statuses: ['completed'] })).toMatchObject({ ok: false, code: 'needs_acknowledge' })
    expect(decideRemoval({ ...ok, mode: 'delete', statuses: ['completed'], acknowledgeSharedHistory: true })).toEqual({ ok: true })
    expect(decideRemoval({ ...ok, mode: 'anonymize', statuses: ['completed', 'terminated'] })).toEqual({ ok: true })
    expect(decideRemoval({ ...ok, mode: 'delete', statuses: [] })).toEqual({ ok: true })
  })
  it('la cuenta anonimizada queda con un correo imposible de entregar', () => {
    expect(anonymizedEmail(ID)).toBe(`eliminada-${ID}@anon.invalid`)
  })
})

describe('permisos y registro en los endpoints del admin', () => {
  const needs = (file: string, role: string) => expect(read(file), file).toMatch(new RegExp(`requireAdmin\\(event, '${role}'\\)`))
  it('cada acción exige el rol que toca', () => {
    needs('server/api/admin/users/[id]/block.post.ts', 'moderator')
    needs('server/api/admin/users/[id]/verify.post.ts', 'admin')
    needs('server/api/admin/users/[id]/grant-pro.post.ts', 'admin')
    needs('server/api/admin/users/[id]/delete.post.ts', 'admin')
    needs('server/api/admin/team.get.ts', 'admin')
    needs('server/api/admin/team.post.ts', 'admin')
    needs('server/api/admin/team/[id].patch.ts', 'admin')
    needs('server/api/admin/reports/[id].patch.ts', 'moderator')
    needs('server/api/admin/reports/bulk.post.ts', 'moderator')
    needs('server/api/admin/deletion-requests/[id].patch.ts', 'moderator')
  })
  it('las lecturas están detrás de la sesión de admin', () => {
    for (const f of ['users.get', 'activity.get', 'activity-export.get', 'reports.get', 'deletion-requests.get', 'overview.get', 'analytics.get', 'platform-metrics.get', 'users/[id].get', 'team-options.get']) {
      expect(read(`server/api/admin/${f}.ts`), f).toMatch(/requireAdmin\(event/)
    }
  })
  it('las acciones sensibles dejan constancia de quién las hizo', () => {
    for (const f of ['users/[id]/block.post', 'users/[id]/verify.post', 'users/[id]/grant-pro.post', 'users/[id]/delete.post', 'team.post', 'team/[id].patch', 'reports/[id].patch', 'reports/bulk.post', 'deletion-requests/[id].patch', 'activity-export.get', 'login.post']) {
      expect(read(`server/api/admin/${f}.ts`), f).toMatch(/logAdminAction\(/)
    }
  })
  it('la lista del equipo nunca devuelve el hash de la contraseña', () => {
    const src = read('server/api/admin/team.get.ts')
    expect(src).not.toMatch(/select\([^)]*password_hash/)
    expect(src).not.toMatch(/passwordHash|password_hash:/)
  })
  it('el login por persona comprueba rol y estado, y la contraseña compartida se puede apagar', () => {
    const src = read('server/api/admin/login.post.ts')
    expect(src).toMatch(/verifyAdminPassword/)
    expect(src).toMatch(/!data\.active/)
    expect(src).toMatch(/adminSharedLoginDisabled/)
    expect(read('nuxt.config.ts')).toMatch(/adminSharedLoginDisabled: process\.env\.ADMIN_DISABLE_SHARED_LOGIN === '1'/)
  })
  it('la sesión con cuenta personal vuelve a mirar la base (si la desactivan, se corta)', () => {
    const src = read('server/utils/admin-session.ts')
    expect(src).toMatch(/from\('admin_members'\)/)
    expect(src).toMatch(/!data\.active/)
    expect(src).toMatch(/session\.clear\(\)/)
  })
  it('las listas se paginan y filtran en la base, sin traerlo todo', () => {
    for (const f of ['users.get', 'activity.get', 'reports.get', 'deletion-requests.get']) {
      const src = read(`server/api/admin/${f}.ts`)
      expect(src, f).toMatch(/\.range\(from, to\)/)
      expect(src, f).toMatch(/count: 'exact'/)
    }
    expect(read('server/api/admin/users.get.ts')).not.toMatch(/listUsers/)
    expect(read('server/api/admin/analytics.get.ts')).toMatch(/rpc\('admin_analytics'/)
  })
  it('el borrado de cuenta del admin no se salta las comprobaciones', () => {
    const src = read('server/api/admin/users/[id]/delete.post.ts')
    expect(src).toMatch(/decideRemoval\(/)
    expect(src.indexOf('decideRemoval(')).toBeLessThan(src.indexOf('deleteUser('))
    expect(src.indexOf('decideRemoval(')).toBeLessThan(src.indexOf('admin_anonymize_account'))
  })
  it('borrar del todo con historial quita antes las colaboraciones (su clave foránea no admite null)', () => {
    const src = read('server/api/admin/users/[id]/delete.post.ts')
    expect(src).toMatch(/from\('collaborations'\)\.delete\(\)\.eq\(column, sideId\)/)
    expect(src.indexOf("from('collaborations').delete()")).toBeLessThan(src.indexOf('admin.deleteUser('))
  })
  it('el cron de alertas exige el secreto y no hace nada sin correo configurado', () => {
    const src = read('server/api/notifications/admin-alerts.post.ts')
    expect(src).toMatch(/verifyCronSecret/)
    expect(src).toMatch(/no_alert_email/)
  })
})

describe('migración del panel de admin', () => {
  const sql = read('supabase/migrations/20261114120000_admin_team_audit_and_views.sql')
  it('es aditiva y trae su ROLLBACK', () => {
    expect(sql).toMatch(/ROLLBACK/)
    expect(sql).not.toMatch(/drop table(?! if exists public\.admin_)/i)
    expect(sql).not.toMatch(/delete from public\.(profiles|collaborations|reports|creators|partners)\b/i)
  })
  it('las tablas, vistas y funciones nuevas solo las lee la clave de servicio', () => {
    expect(sql).toMatch(/revoke all on public\.admin_members from anon, authenticated/)
    expect(sql).toMatch(/revoke all on public\.admin_audit_log from anon, authenticated/)
    expect(sql).toMatch(/revoke all on public\.admin_users_view, public\.admin_reports_view, public\.admin_deletion_requests_view, public\.admin_activity_view from public, anon, authenticated/)
    expect(sql).toMatch(/revoke all on function public\.admin_analytics\(text\) from public, anon, authenticated/)
    expect(sql).toMatch(/revoke all on function public\.admin_anonymize_account\(uuid\) from public, anon, authenticated/)
    expect(sql).toMatch(/enable row level security/)
  })
  it('anonimizar conserva el registro compartido: no borra colaboraciones ni chats', () => {
    const fn = sql.slice(sql.indexOf('create or replace function public.admin_anonymize_account'))
    expect(fn).not.toMatch(/delete from public\.(collaborations|messages|conversations|reports)/)
    expect(fn).toMatch(/collaboration_id is null/)
  })
})
