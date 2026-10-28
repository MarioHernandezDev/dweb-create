import { describe, expect, it } from 'vitest'
import { isComingSoonPlatform, platformMeta, socialAccountState, VERIFIED_SOCIAL_PLATFORMS } from '../../app/utils/mock-data'
import type { SocialAccount } from '../../app/types'

const account = (connected: boolean): SocialAccount => ({
  id: 'x', platform: 'instagram', handle: '', followers: 0, deltaPct: 0, connected
})

describe('plataformas sociales (A-R10)', () => {
  it('Instagram y YouTube son las únicas con conexión real', () => {
    expect(VERIFIED_SOCIAL_PLATFORMS).toEqual(['instagram', 'youtube'])
    expect(isComingSoonPlatform('instagram')).toBe(false)
    expect(isComingSoonPlatform('youtube')).toBe(false)
  })

  it.each(['tiktok', 'x', 'facebook', 'linkedin'] as const)('%s es "Próximamente"', (platform) => {
    expect(isComingSoonPlatform(platform)).toBe(true)
  })

  it('cada plataforma del catálogo es una cosa o la otra, sin huecos', () => {
    const real = Object.keys(platformMeta).filter((p) => !isComingSoonPlatform(p as keyof typeof platformMeta))
    expect(real.sort()).toEqual([...VERIFIED_SOCIAL_PLATFORMS].sort())
  })

  it('el estado de una cuenta solo puede ser conectada o sin conectar', () => {
    expect(socialAccountState(account(true))).toBe('connected')
    expect(socialAccountState(account(false))).toBe('disconnected')
  })
})
