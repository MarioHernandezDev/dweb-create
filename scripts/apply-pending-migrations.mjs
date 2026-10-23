// FEEDMA — aplica archivos de supabase/migrations/ conectando directamente
// a Postgres, sin pasar por el SQL Editor del dashboard de Supabase (útil
// cuando esa parte del dashboard falla, pero la base de datos en sí sigue
// funcionando — son dos cosas distintas).
//
// Cada archivo se aplica dentro de su propia transacción: si algo falla a
// mitad, se deshace entero (no se queda la migración aplicada a medias).
//
// Uso:
//   1. Supabase Dashboard → Project Settings → Database → "Connection
//      string" → pestaña "URI" → copia la cadena y sustituye
//      [YOUR-PASSWORD] por tu contraseña real de base de datos (se
//      resetea/consulta en esa misma página).
//   2. Añádela a .env (NUNCA a .env.example ni la subas a git):
//        SUPABASE_DB_URL=postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres
//   3. node --env-file=.env scripts/apply-pending-migrations.mjs 20261023090000_packages_cover_and_order.sql 20261024090000_board_labels_checklist_wip.sql

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Falta SUPABASE_DB_URL en el entorno — añádela a .env (ver cabecera de este script).')
  process.exit(1)
}

const files = process.argv.slice(2)
if (!files.length) {
  console.error('Indica uno o más archivos de supabase/migrations/ a aplicar, en orden.')
  process.exit(1)
}

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()

try {
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`→ Aplicando ${file}…`)
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('commit')
      console.log(`✓ ${file} aplicada.`)
    } catch (err) {
      await client.query('rollback')
      console.error(`✗ ${file} falló, revertida. Las anteriores de esta ejecución ya quedaron aplicadas.`)
      throw err
    }
  }
  console.log('Todo aplicado correctamente.')
} finally {
  await client.end()
}
