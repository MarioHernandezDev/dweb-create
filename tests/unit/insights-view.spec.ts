import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { METRIC_NOTES, formatDecimal, formatEurosAvg, formatHours, formatPct, monthLabel, sampleNote } from '../../app/utils/insights-view'

const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8')

describe('presentación de las métricas propias', () => {
  it('sin dato escribe una raya, nunca un cero', () => {
    expect([formatPct(null), formatHours(null), formatDecimal(null), formatEurosAvg(null)]).toEqual(['—', '—', '—', '—'])
    expect(sampleNote(null, 'x', 'xs')).toBe('Aún sin datos suficientes')
  })
  it('formatea porcentajes, tiempos, medias e importes', () => {
    expect(formatPct({ value: 1 / 3, n: 3 })).toBe('33 %')
    expect(formatHours({ value: 0.5, n: 1 })).toBe('30 min')
    expect(formatHours({ value: 4.25, n: 2 })).toBe('4,3 h')
    expect(formatHours({ value: 30, n: 2 })).toBe('30 h')
    expect(formatHours({ value: 72, n: 2 })).toBe('3 días')
    expect(formatDecimal({ value: 4.5, n: 2 })).toBe('4,5')
    expect(formatEurosAvg({ value: 20000, n: 3 }).replace(/\s/g, ' ')).toBe('200 €')
    expect(sampleNote({ value: 1, n: 1 }, 'entrega', 'entregas')).toBe('sobre 1 entrega')
    expect(sampleNote({ value: 1, n: 4 }, 'entrega', 'entregas')).toBe('sobre 4 entregas')
    expect(monthLabel('2026-09')).toBe('sep 26')
  })
  it('explica cómo se calcula cada indicador, incluido que cancelar no es éxito', () => {
    expect(METRIC_NOTES.length).toBeGreaterThanOrEqual(8)
    expect(METRIC_NOTES.find((n) => n.term === 'Completadas con éxito')!.text).toMatch(/nunca cuenta como éxito/)
  })
  it('los paneles existen por rol, separados de las métricas de redes, y están en el menú', () => {
    for (const r of ['creator', 'partner']) expect(read(`app/pages/${r}/insights.vue`)).toContain(`<CollabInsights scope="${r}"`)
    const nav = read('app/utils/nav.ts')
    expect(nav).toContain("to: '/creator/insights'")
    expect(nav).toContain("to: '/partner/insights'")
    expect(nav).toContain("to: '/creator/metrics'")
    expect(read('app/pages/admin/index.vue')).toContain('<CollabInsights scope="platform"')
  })
  it('la predicción está apagada salvo PREDICTIONS_ENABLED=true y su endpoint se cierra antes de nada', () => {
    expect(read('nuxt.config.ts')).toContain("predictionsEnabled: process.env.PREDICTIONS_ENABLED === 'true'")
    const src = read('server/api/ml/predict.post.ts')
    expect(src.indexOf('assertPredictionsEnabled(event)')).toBeGreaterThan(-1)
    expect(src.indexOf('assertPredictionsEnabled(event)')).toBeLessThan(src.indexOf('serverSupabaseUser(event)'))
  })
})
