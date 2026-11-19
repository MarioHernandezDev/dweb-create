// CIBERAN — monta la base de datos de STAGING desde cero: aplica, en orden, TODAS
// las migraciones de supabase/migrations/ a la base indicada en SUPABASE_DB_URL.
//
// Seguros (el script se niega a continuar si falla alguno):
//   · APP_ENV tiene que ser exactamente "staging".
//   · La URL no puede apuntar al proyecto compartido/producción (PROD_REF).
//   · Hay que pasar --confirm=<ref del proyecto de staging> y debe aparecer en la URL.
//
// Se puede relanzar: apunta lo ya aplicado en public._staging_migrations y sigue
// por donde se quedó. Si una migración falla, se para ahí (no continúa con las demás).
//
// Uso (ver docs/12-STAGING-Y-SENTRY.md):
//   node --env-file=.env.staging scripts/staging-bootstrap.mjs --confirm=<ref-de-staging>
//   node --env-file=.env.staging scripts/staging-bootstrap.mjs --confirm=<ref> --dry-run   (solo lista)

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PROD_REF = 'qymqzddqrnsxjnwbqlgq'

export function checkTarget({ appEnv, dbUrl, confirm }) {
  if (appEnv !== 'staging') return 'APP_ENV tiene que ser "staging" (usa --env-file=.env.staging).'
  if (!dbUrl) return 'Falta SUPABASE_DB_URL.'
  if (dbUrl.includes(PROD_REF)) return 'SUPABASE_DB_URL apunta al proyecto compartido/producción. Este script solo es para staging.'
  if (!confirm || confirm.length < 8) return 'Falta --confirm=<ref del proyecto de staging>.'
  if (confirm === PROD_REF) return 'El ref indicado es el del proyecto compartido/producción.'
  if (!dbUrl.includes(confirm)) return 'El ref de --confirm no aparece en SUPABASE_DB_URL: no coincide con la base a la que te conectas.'
  return null
}

export function orderedMigrations(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
  const dryRun = process.argv.includes('--dry-run')
  const problem = checkTarget({ appEnv: process.env.APP_ENV, dbUrl: process.env.SUPABASE_DB_URL, confirm: arg('confirm') })
  if (problem) {
    console.error(`✗ ${problem}`)
    process.exit(1)
  }

  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')
  const files = orderedMigrations(dir)
  if (dryRun) {
    console.log(files.join('\n'))
    console.log(`\n${files.length} migraciones (no se ha aplicado nada).`)
    process.exit(0)
  }

  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query('create table if not exists public._staging_migrations (name text primary key, applied_at timestamptz not null default now())')
    const done = new Set((await client.query('select name from public._staging_migrations')).rows.map((r) => r.name))
    for (const file of files) {
      if (done.has(file)) continue
      const sql = readFileSync(path.join(dir, file), 'utf8')
      // Casi todas traen su propio begin/commit; las que no, se envuelven aquí.
      const ownTx = /^\s*begin\s*;/im.test(sql)
      console.log(`→ ${file}`)
      try {
        if (!ownTx) await client.query('begin')
        await client.query(sql)
        if (!ownTx) await client.query('commit')
      } catch (err) {
        await client.query('rollback').catch(() => {})
        console.error(`✗ ${file} ha fallado y se ha revertido. Corrige y relanza: seguirá desde aquí.`)
        throw err
      }
      await client.query('insert into public._staging_migrations (name) values ($1) on conflict do nothing', [file])
    }
    console.log('✓ Staging al día.')
  } finally {
    await client.end()
  }
}
