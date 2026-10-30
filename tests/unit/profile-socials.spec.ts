import { describe, expect, it } from 'vitest'
import { socialChipFor, socialChips } from '../../app/utils/profile-socials'
import type { SocialAccount } from '../../app/types'

const acc = (over: Partial<SocialAccount> = {}): SocialAccount => ({
  id: 'x', platform: 'youtube', handle: '@canal', followers: 10, deltaPct: 0, connected: true, status: 'connected', ...over
})

describe('socialChipFor', () => {
  it('solo el estado "connected" es verificada (ok)', () => {
    expect(socialChipFor(acc())).toMatchObject({ tone: 'ok', statusText: 'Conectada', handle: '@canal' })
  })

  it('caducada, revocada o sin permiso se rotulan con su causa y no son ok', () => {
    expect(socialChipFor(acc({ status: 'expired' }))).toMatchObject({ tone: 'attention', statusText: 'Acceso caducado' })
    expect(socialChipFor(acc({ status: 'revoked' }))).toMatchObject({ tone: 'attention', statusText: 'Acceso revocado' })
    expect(socialChipFor(acc({ status: 'missing_permissions' }))).toMatchObject({ tone: 'attention', statusText: 'Falta un permiso' })
  })

  it('con token pero sin estado guardado no se afirma que esté verificada', () => {
    expect(socialChipFor(acc({ status: undefined })).tone).toBe('attention')
  })

  it('sin conexión es "off", sin usuario y sin estado verificado', () => {
    expect(socialChipFor(acc({ connected: false, handle: '', status: undefined }))).toMatchObject({ tone: 'off', statusText: 'Sin conectar', handle: '' })
  })
})

describe('socialChips', () => {
  it('excluye las plataformas "próximamente"', () => {
    const chips = socialChips([acc(), acc({ platform: 'tiktok', connected: false, handle: '' })])
    expect(chips.map((c) => c.platform)).toEqual(['youtube'])
  })
})
