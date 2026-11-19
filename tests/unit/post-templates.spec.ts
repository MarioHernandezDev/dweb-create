import { describe, expect, it } from 'vitest'
import { duplicateDueDate, duplicateTitle, postTemplateFrom, sanitizePostTemplate, TEMPLATE_CHECKLIST_MAX, TITLE_MAX } from '../../app/utils/post-templates'

describe('sanitizePostTemplate', () => {
  it('rellena con valores seguros lo que falta o llega mal', () => {
    expect(sanitizePostTemplate(null)).toEqual({ title: '', caption: '', contentType: 'reel', platform: 'instagram', extraPlatforms: [], hashtags: [], checklist: [] })
    const t = sanitizePostTemplate({ title: 5, platform: 'myspace', contentType: 'holograma', extraPlatforms: 'x', hashtags: [1, 'moda'], checklist: ['  guion  ', '', 7] })
    expect(t.platform).toBe('instagram')
    expect(t.contentType).toBe('reel')
    expect(t.title).toBe('')
    expect(t.extraPlatforms).toEqual([])
    expect(t.hashtags).toEqual(['moda'])
    expect(t.checklist).toEqual(['guion'])
  })
  it('las redes extra no repiten la principal ni se duplican, y todo respeta los máximos', () => {
    const t = sanitizePostTemplate({ platform: 'tiktok', extraPlatforms: ['tiktok', 'x', 'x', 'facebook', 'nada'], checklist: Array.from({ length: 30 }, (_, i) => `tarea ${i}`), title: 'a'.repeat(300) })
    expect(t.extraPlatforms).toEqual(['x', 'facebook'])
    expect(t.checklist).toHaveLength(TEMPLATE_CHECKLIST_MAX)
    expect(t.title).toHaveLength(TITLE_MAX)
  })
  it('una plantilla hecha desde una publicación conserva lo que se repite', () => {
    const t = postTemplateFrom({ title: 'Unboxing', caption: 'Mira esto', contentType: 'video', platform: 'youtube', extraPlatforms: ['tiktok'], hashtags: ['unboxing'] }, ['Guion', 'Grabar'])
    expect(t).toMatchObject({ title: 'Unboxing', platform: 'youtube', extraPlatforms: ['tiktok'], hashtags: ['unboxing'], checklist: ['Guion', 'Grabar'] })
  })
})

describe('plantilla desde un duplicado', () => {
  it('no arrastra el «(copia)» del título', () => {
    const t = postTemplateFrom({ title: 'Unboxing (copia)', caption: '', contentType: 'reel', platform: 'instagram', hashtags: [] }, [])
    expect(t.title).toBe('Unboxing')
  })
})

describe('duplicar una publicación', () => {
  it('el título termina en «(copia)» sin acumularse ni pasarse del máximo', () => {
    expect(duplicateTitle('Reel de otoño')).toBe('Reel de otoño (copia)')
    expect(duplicateTitle('Reel de otoño (copia)')).toBe('Reel de otoño (copia)')
    expect(duplicateTitle('x'.repeat(200))).toHaveLength(TITLE_MAX)
    expect(duplicateTitle('x'.repeat(200)).endsWith(' (copia)')).toBe(true)
  })
  it('la fecha es una semana después, o dentro de 3 días si la original ya pasó', () => {
    const hoy = new Date(2026, 10, 19, 10)
    expect(duplicateDueDate('2026-11-25', hoy)).toBe('2026-12-02')
    expect(duplicateDueDate('2026-11-10', hoy)).toBe('2026-11-22')
    expect(duplicateDueDate('', hoy)).toBe('2026-11-22')
  })
})
