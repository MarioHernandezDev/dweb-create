import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Regla de la hoja de ruta (1.3): toda migración nueva trae su bloque ROLLBACK.
// Las anteriores a esta fecha se escribieron sin él y no se tocan (ya están
// aplicadas); desde 2026-11-05 es obligatorio.
const FIRST_MIGRATION_WITH_ROLLBACK = '20261105100000'
// Versión duplicada heredada (dos migraciones con el mismo sello, ya aplicadas):
// no se renombra porque cambiaría el historial. No se admiten más.
const KNOWN_DUPLICATE_VERSIONS = new Set(['20261021160000'])
const dir = path.join(process.cwd(), 'supabase', 'migrations')

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

describe('migraciones', () => {
  it('los nombres son <14 dígitos>_<nombre>.sql y no se repite la versión', () => {
    const versions = files.map((f) => {
      expect(f, f).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/)
      return f.slice(0, 14)
    })
    const repeated = versions.filter((v, i) => versions.indexOf(v) !== i && !KNOWN_DUPLICATE_VERSIONS.has(v))
    expect(repeated).toEqual([])
  })

  it('las migraciones desde 2026-11-05 incluyen un bloque ROLLBACK', () => {
    const missing = files
      .filter((f) => f.slice(0, 14) >= FIRST_MIGRATION_WITH_ROLLBACK)
      .filter((f) => !/rollback/i.test(readFileSync(path.join(dir, f), 'utf8')))
    expect(missing).toEqual([])
  })
})
