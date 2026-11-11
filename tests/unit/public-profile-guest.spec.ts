import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isPublicRole, isUuid, safeWebsite, toGuestProfile } from '../../server/utils/public-profile'

const creatorRow = {
  id: '39e31592-6636-4789-aec0-cf8f1a81d067',
  profile_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  display_name: 'Marcos',
  bio: 'Calistenia',
  categories: ['Fitness'],
  looking_for: 'Marcas de deporte',
  cover_url: null,
  created_at: '2026-01-01T00:00:00Z',
  headline: 'Sin humo',
  location: 'Granada',
  // Campos que la fila real también trae y que NO deben salir:
  min_rate_cents: 18000,
  max_rate_cents: 45000,
  audience: { countries: [{ label: 'España', pct: 80 }] },
  stripe_account_id: 'acct_123'
}

describe('ficha pública sin sesión', () => {
  it('no expone el id de la cuenta, tarifas, audiencia ni datos de pago', () => {
    const p = toGuestProfile('creator', creatorRow, 'https://x.test/a.png', [{ platform: 'instagram', handle: '@marcos', followers_count: '290000' }])
    const json = JSON.stringify(p)
    expect(json).not.toContain(creatorRow.profile_id)
    expect(json).not.toContain('acct_123')
    expect(json).not.toContain('18000')
    expect(json).not.toContain('España')
    expect(p.minCents).toBeNull()
    expect(p.maxCents).toBeNull()
    expect(p.audience).toEqual({})
    expect(p.profileId).toBe(creatorRow.id)
    expect(p.verifiedSocials).toEqual([{ platform: 'instagram', handle: '@marcos', followersCount: 290000 }])
    expect(p.name).toBe('Marcos')
    expect(p.lookingFor).toBe('Marcas de deporte')
  })

  it('las claves de la ficha son una lista cerrada', () => {
    const p = toGuestProfile('creator', creatorRow, null, [])
    expect(Object.keys(p).sort()).toEqual([
      'audience', 'avatarUrl', 'bio', 'categories', 'chatPrivacy', 'collaborationTypes', 'coverUrl', 'createdAt', 'headline', 'id',
      'industry', 'location', 'lookingFor', 'maxCents', 'minCents', 'name', 'profileId', 'role', 'verifiedSocials', 'website'
    ])
  })

  it('marca: web solo http(s), sin presupuesto', () => {
    const row = { id: creatorRow.id, profile_id: creatorRow.profile_id, company_name: 'Alma', industry: 'Belleza', website: 'javascript:alert(1)', collaboration_types: ['paid'], created_at: 'x', min_budget_cents: 5 }
    const p = toGuestProfile('partner', row, null, [{ platform: 'instagram' }])
    expect(p.website).toBeNull()
    expect(p.verifiedSocials).toEqual([])
    expect(p.collaborationTypes).toEqual(['paid'])
    expect(safeWebsite('https://alma.test')).toBe('https://alma.test/')
    expect(safeWebsite('ftp://alma.test')).toBeNull()
  })

  it('valida rol e id antes de consultar', () => {
    expect(isPublicRole('creator')).toBe(true)
    expect(isPublicRole('admin')).toBe(false)
    expect(isUuid(creatorRow.id)).toBe(true)
    expect(isUuid("1' or '1'='1")).toBe(false)
  })

  it('el endpoint respeta el interruptor de la cuenta, limita por IP y no selecciona columnas privadas', () => {
    const src = readFileSync(path.join(process.cwd(), 'server/api/public/profile/[role]/[id].get.ts'), 'utf8')
    expect(src).toContain('public_profile_enabled === false')
    expect(src).toContain('enforceRateLimit')
    expect(src).not.toMatch(/rate_cents|budget_cents|audience|stripe|chat_privacy|select\('\*'\)/)
    expect(src).not.toContain('get_public_collaborations')
  })

  it('la ruta del perfil está excluida del redirect a login', () => {
    expect(readFileSync(path.join(process.cwd(), 'nuxt.config.ts'), 'utf8')).toContain("'/profile/*'")
  })
})
