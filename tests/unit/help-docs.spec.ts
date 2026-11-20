import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { helpDocs } from '../../app/utils/help-docs'

const PUBLIC = join(__dirname, '../../public')

describe('manuales de /ayuda', () => {
  it('hay un manual completo y una guía por rol', () => {
    expect(helpDocs.map((d) => d.id)).toEqual(['manual', 'creadores', 'partners'])
  })

  it('los enlaces tienen el formato esperado', () => {
    for (const d of helpDocs) {
      expect(d.href, d.id).toMatch(/^\/manuales\/[A-Z_]+\.pdf$/)
      expect(d.href.endsWith(d.filename), d.id).toBe(true)
    }
  })

  it('cada documento tiene todos sus textos y un id único', () => {
    expect(new Set(helpDocs.map((d) => d.id)).size).toBe(helpDocs.length)
    for (const d of helpDocs) {
      for (const k of ['title', 'audience', 'description', 'filename', 'version', 'icon'] as const) expect(d[k].trim(), `${d.id}.${k}`).not.toBe('')
      expect(d.highlights.length, d.id).toBeGreaterThan(0)
      expect(d.pages, d.id).toBeGreaterThan(0)
    }
  })

  // Los PDF no se suben a git (se generan en local): sin ellos, este test se salta en vez de fallar.
  const hayPdfs = helpDocs.every((d) => existsSync(join(PUBLIC, d.href)))
  it.skipIf(!hayPdfs)('cada enlace apunta a un PDF que existe en public/manuales', () => {
    for (const d of helpDocs) {
      expect(d.href, d.id).toMatch(/^\/manuales\/[A-Z_]+\.pdf$/)
      expect(d.href.endsWith(d.filename), d.id).toBe(true)
      const file = join(PUBLIC, d.href)
      expect(existsSync(file), `${d.href} no existe: ejecuta node docs/manual/_build/build.mjs`).toBe(true)
      expect(statSync(file).size, d.href).toBeGreaterThan(50_000)
      expect(readFileSync(file).subarray(0, 5).toString(), d.href).toBe('%PDF-')
    }
  })
})
