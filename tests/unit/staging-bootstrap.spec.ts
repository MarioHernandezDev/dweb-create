import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error script .mjs sin tipos
import { checkTarget, orderedMigrations } from '../../scripts/staging-bootstrap.mjs'

const PROD = 'qymqzddqrnsxjnwbqlgq'
const url = (ref: string) => `postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`

describe('script de staging', () => {
  it('nunca corre contra el proyecto compartido/producción', () => {
    expect(checkTarget({ appEnv: 'staging', dbUrl: url(PROD), confirm: PROD })).toMatch(/producción/)
    expect(checkTarget({ appEnv: 'staging', dbUrl: url(PROD), confirm: 'abcdefghijklmnop' })).toMatch(/producción/)
  })
  it('exige APP_ENV=staging, la URL y un --confirm que coincida', () => {
    expect(checkTarget({ appEnv: 'production', dbUrl: url('abcdefghijklmnop'), confirm: 'abcdefghijklmnop' })).toMatch(/APP_ENV/)
    expect(checkTarget({ appEnv: 'staging', dbUrl: '', confirm: 'abcdefghijklmnop' })).toMatch(/SUPABASE_DB_URL/)
    expect(checkTarget({ appEnv: 'staging', dbUrl: url('abcdefghijklmnop'), confirm: undefined })).toMatch(/--confirm/)
    expect(checkTarget({ appEnv: 'staging', dbUrl: url('abcdefghijklmnop'), confirm: 'zzzzzzzzzzzzzzzz' })).toMatch(/no coincide/)
    expect(checkTarget({ appEnv: 'staging', dbUrl: url('abcdefghijklmnop'), confirm: 'abcdefghijklmnop' })).toBeNull()
  })
  it('aplica las migraciones en orden de versión', () => {
    const files = orderedMigrations(path.join(process.cwd(), 'supabase', 'migrations')) as string[]
    expect(files.length).toBeGreaterThan(60)
    expect([...files].sort()).toEqual(files)
    expect(files[0]!.slice(0, 8) <= files.at(-1)!.slice(0, 8)).toBe(true)
  })
})
