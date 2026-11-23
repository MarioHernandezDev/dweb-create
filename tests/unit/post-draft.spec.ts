import { describe, it, expect } from 'vitest'
import { DRAFT_TTL_MS, draftStorageKey, isEmptyDraft, parseDraft, serializeDraft, type PostDraftInput } from '../../app/utils/post-draft'

const NOW = Date.parse('2026-11-20T10:00:00Z')
const base: PostDraftInput = {
  title: 'Reel de otoño', caption: 'Mi texto', contentType: 'reel', platform: 'instagram', extraPlatforms: ['tiktok'],
  hashtags: ['#otoño'], collaborationId: 'abc', dueDate: '2026-11-25'
}

describe('borrador de publicación', () => {
  it('se guarda y se recupera tal cual', () => {
    const draft = parseDraft(serializeDraft(base, NOW), NOW + 1000)
    expect(draft).toMatchObject({ ...base, savedAt: NOW, checklist: [] })
  })
  it('un borrador vacío no cuenta', () => {
    expect(isEmptyDraft({ title: ' ', caption: '', hashtags: [] })).toBe(true)
    expect(parseDraft(serializeDraft({ ...base, title: '', caption: '', hashtags: [] }, NOW), NOW)).toBeNull()
  })
  it('caduca a los 14 días', () => {
    const raw = serializeDraft(base, NOW)
    expect(parseDraft(raw, NOW + DRAFT_TTL_MS - 1000)).not.toBeNull()
    expect(parseDraft(raw, NOW + DRAFT_TTL_MS + 1000)).toBeNull()
  })
  it('ignora lo que no se puede entender', () => {
    for (const raw of [null, undefined, '', 'no es json', '"texto"', '123', '{}', '{"title":"x"}']) expect(parseDraft(raw as string, NOW), String(raw)).toBeNull()
  })
  it('sanea los valores raros: formato, red y fecha', () => {
    const raw = JSON.stringify({ title: 'x', savedAt: NOW, contentType: 'otra-cosa', platform: 'myspace', extraPlatforms: ['instagram', 'zzz'], dueDate: 'mañana', collaborationId: 7 })
    expect(parseDraft(raw, NOW)).toMatchObject({ contentType: 'reel', platform: 'instagram', dueDate: '', collaborationId: '' })
  })
  it('rechaza fechas de guardado en el futuro', () => {
    expect(parseDraft(serializeDraft(base, NOW + 10 * 60_000), NOW)).toBeNull()
  })
  it('la clave lleva el id de la persona', () => {
    expect(draftStorageKey('u1')).not.toBe(draftStorageKey('u2'))
  })
})
