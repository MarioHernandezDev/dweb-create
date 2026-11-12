import { describe, expect, it, vi } from 'vitest'
import {
  countOrNull, hasAnyValue, recordAccountSnapshot, snapshotFromInstagram, snapshotFromYoutube, utcDay
} from '../../../server/_disabled/social-metrics/utils/account-snapshot'

describe('utcDay', () => {
  it('usa el día UTC, no el de la zona horaria local', () => {
    expect(utcDay(new Date('2026-10-30T23:59:59Z'))).toBe('2026-10-30')
    expect(utcDay(new Date('2026-10-31T00:00:00Z'))).toBe('2026-10-31')
  })
})

describe('countOrNull', () => {
  it.each([['1234', 1234], [5, 5], [0, 0], ['0', 0], [12.4, 12]])('%j -> %j', (input, out) => {
    expect(countOrNull(input)).toBe(out)
  })
  it.each([undefined, null, '', 'abc', NaN, Infinity, -1, '-5', {}, []])('%j -> null (no es un 0)', (input) => {
    expect(countOrNull(input)).toBeNull()
  })
})

describe('snapshotFromYoutube', () => {
  it('lee los acumulados', () => {
    expect(snapshotFromYoutube({ subscriberCount: '12400', viewCount: '1250000', videoCount: '50' })).toEqual({
      followersCount: 12400, viewsTotal: 1250000, videosCount: 50
    })
  })
  it('suscriptores ocultos -> null, aunque YouTube mande un número', () => {
    const s = snapshotFromYoutube({ subscriberCount: '999', hiddenSubscriberCount: true, viewCount: '10', videoCount: '2' })
    expect(s.followersCount).toBeNull()
    expect(s.viewsTotal).toBe(10)
  })
  it('un 0 real se conserva y un campo que falta es null', () => {
    expect(snapshotFromYoutube({ subscriberCount: '0', viewCount: '0', videoCount: '0' })).toEqual({ followersCount: 0, viewsTotal: 0, videosCount: 0 })
    expect(snapshotFromYoutube({ subscriberCount: '5' })).toEqual({ followersCount: 5, viewsTotal: null, videosCount: null })
    expect(snapshotFromYoutube(undefined)).toEqual({ followersCount: null, viewsTotal: null, videosCount: null })
  })
})

describe('snapshotFromInstagram', () => {
  it('solo seguidores; lo demás no existe como acumulado', () => {
    expect(snapshotFromInstagram(321)).toEqual({ followersCount: 321, viewsTotal: null, videosCount: null })
    expect(snapshotFromInstagram(undefined).followersCount).toBeNull()
  })
})

describe('recordAccountSnapshot', () => {
  function fakeClient(result: { error: { message: string } | null } | Error) {
    const upsert = vi.fn(async () => {
      if (result instanceof Error) throw result
      return result
    })
    const from = vi.fn(() => ({ upsert }))
    return { client: { from } as never, from, upsert }
  }
  const snap = { followersCount: 100, viewsTotal: 5000, videosCount: 12 }

  it('hace upsert por (cuenta, día UTC): la misma clave que usa la restricción única', async () => {
    const { client, from, upsert } = fakeClient({ error: null })
    const ok = await recordAccountSnapshot(client, 'acc-1', snap, new Date('2026-10-30T10:00:00Z'))
    expect(ok).toBe(true)
    expect(from).toHaveBeenCalledWith('social_account_snapshots')
    expect(upsert).toHaveBeenCalledWith(
      { social_account_id: 'acc-1', observed_on: '2026-10-30', followers_count: 100, views_total: 5000, videos_count: 12 },
      { onConflict: 'social_account_id,observed_on' }
    )
  })

  it('un snapshot sin ningún dato no se escribe', async () => {
    const { client, from } = fakeClient({ error: null })
    expect(hasAnyValue({ followersCount: null, viewsTotal: null, videosCount: null })).toBe(false)
    expect(await recordAccountSnapshot(client, 'acc-1', { followersCount: null, viewsTotal: null, videosCount: null })).toBe(false)
    expect(from).not.toHaveBeenCalled()
  })

  it('guarda los null tal cual (no los convierte en 0)', async () => {
    const { client, upsert } = fakeClient({ error: null })
    await recordAccountSnapshot(client, 'acc-1', { followersCount: null, viewsTotal: 10, videosCount: null }, new Date('2026-10-30T00:00:00Z'))
    expect((upsert.mock.calls[0] as unknown[])[0]).toMatchObject({ followers_count: null, views_total: 10, videos_count: null })
  })

  it('si la base devuelve error, NO lanza (la sincronización continúa) y no filtra nada', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = fakeClient({ error: { message: 'boom' } })
    await expect(recordAccountSnapshot(client, 'acc-1', snap)).resolves.toBe(false)
    spy.mockRestore()
  })

  it('si la llamada lanza una excepción, tampoco rompe', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = fakeClient(new Error('red caída'))
    await expect(recordAccountSnapshot(client, 'acc-1', snap)).resolves.toBe(false)
    spy.mockRestore()
  })
})
