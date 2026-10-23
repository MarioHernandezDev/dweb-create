// FEEDMA — borra las 18 cuentas de prueba que creó `seed-discover-demo.mjs`
// (9 creadores + 9 partners, listados abajo letra por letra para que quede
// claro qué se toca), junto con sus colaboraciones, redes sociales y
// búsquedas de ejemplo registradas. NUNCA toca `creator@feedma.test` ni
// `partner@feedma.test` (esas las crea `seed-demo-users.mjs`, un script
// aparte) — no aparecen en ninguna de las dos listas de abajo.
//
// Usa la Admin API de verdad (auth.admin.deleteUser), igual que los
// seeders crean las cuentas con auth.admin.createUser — nunca un DELETE a
// mano sobre auth.users.
//
// Por qué no basta con borrar el usuario y ya: `collaborations.creator_id`
// es NOT NULL pero su FK sigue configurada como ON DELETE SET NULL (un
// desajuste de esquema de antes de este script, no se toca aquí porque
// arreglarlo es una migración aparte) — si se borra primero el creador,
// Postgres intenta poner NULL en una columna que no lo admite y el borrado
// entero falla. Por eso aquí se borran antes las colaboraciones que
// involucren a cualquiera de estas 18 fichas, y solo después las cuentas.
// El resto (profiles, creators/partners, social_accounts, packages,
// notifications, conversations/messages, discovery_searches...) sí cascada
// limpio al borrar el usuario — comprobado fila por fila contra las
// migraciones antes de escribir este script.
//
// Uso: npm run db:cleanup-discover-demo

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\nFaltan variables de entorno. Ejecuta con: npm run db:cleanup-discover-demo (lee .env)\n')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const CREATOR_EMAILS = [
  'mateo.rivas@feedma.test', 'lucia.fernandez@feedma.test', 'diego.castillo@feedma.test',
  'valeria.soto@feedma.test', 'carla.jimenez@feedma.test', 'hugo.navarro@feedma.test',
  'elena.ruiz@feedma.test', 'marcos.pena@feedma.test', 'paula.ibanez@feedma.test'
]
const PARTNER_EMAILS = [
  'nutrifit.labs@feedma.test', 'velora@feedma.test', 'pixelforge.games@feedma.test',
  'rutasyco@feedma.test', 'mamafeliz@feedma.test', 'capitalia@feedma.test',
  'ecohogar@feedma.test', 'proforma.sport@feedma.test', 'soundwave.academy@feedma.test'
]

async function main() {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (listError) throw listError

  const allEmails = new Set([...CREATOR_EMAILS, ...PARTNER_EMAILS])
  const users = list.users.filter((u) => allEmails.has(u.email))
  if (!users.length) {
    console.log('Ninguna de las 18 cuentas existe ya — nada que borrar.')
    return
  }
  console.log(`Encontradas ${users.length} de las 18 cuentas.\n`)

  const userIds = users.map((u) => u.id)

  const { data: creatorRows } = await admin.from('creators').select('id, profile_id').in('profile_id', userIds)
  const { data: partnerRows } = await admin.from('partners').select('id, profile_id').in('profile_id', userIds)
  const creatorIds = (creatorRows ?? []).map((r) => r.id)
  const partnerIds = (partnerRows ?? []).map((r) => r.id)

  if (creatorIds.length || partnerIds.length) {
    const filters = []
    if (creatorIds.length) filters.push(`creator_id.in.(${creatorIds.join(',')})`)
    if (partnerIds.length) filters.push(`partner_id.in.(${partnerIds.join(',')})`)
    const { data: deleted, error: collabError } = await admin.from('collaborations').delete().or(filters.join(',')).select('id')
    if (collabError) throw collabError
    console.log(`✓ Colaboraciones de estas cuentas borradas: ${deleted?.length ?? 0}`)
  }

  const { error: searchError } = await admin.from('discovery_searches').delete().in('profile_id', userIds)
  if (searchError) throw searchError
  console.log('✓ Búsquedas de ejemplo (discovery_searches) de estas cuentas borradas.')

  for (const user of users) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error(`✗ No se pudo borrar ${user.email}: ${deleteError.message}`)
      continue
    }
    console.log(`✓ Cuenta borrada: ${user.email}`)
  }

  console.log('\nListo. creator@feedma.test y partner@feedma.test no se han tocado.\n')
}

main().catch((err) => {
  console.error('\n✗ Algo falló:', err.message)
  process.exit(1)
})
