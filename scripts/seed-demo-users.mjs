// FEEDMA — crea 2 cuentas de prueba (creador de contenido, partner) ya
// relacionadas entre sí (una colaboración y un post esperando aprobación),
// para probar la app con datos reales de Supabase en vez de los mocks del
// frontend.
//
// Usa la Admin API oficial de Supabase (auth.admin.createUser), NUNCA inserta
// a mano en auth.users — así el hash de la contraseña y el login quedan
// garantizados por Supabase, no por nosotros.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed-users
//
// La SERVICE_ROLE_KEY tiene permisos totales (salta RLS). Solo se usa aquí,
// en un script local, nunca en el frontend ni en un commit.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'feedma-demo-2026'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '\nFaltan variables de entorno.\n' +
      'Ejecuta con:\n' +
      '  SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_SERVICE_ROLE_KEY=tu-clave npm run db:seed-users\n' +
      '(o copia .env.example a .env y rellénalo — ver supabase/README.md)\n'
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createDemoUser({ email, role, fullName }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name: fullName }
  })

  if (error) {
    // Si ya existe, lo buscamos en vez de fallar — el script es re-ejecutable.
    if (error.message.includes('already been registered')) {
      const { data: list, error: listError } = await admin.auth.admin.listUsers()
      if (listError) throw listError
      const existing = list.users.find((u) => u.email === email)
      if (!existing) throw error
      console.log(`↪ ${email} ya existía, reutilizando su cuenta`)
      return existing
    }
    throw error
  }

  console.log(`✓ Usuario creado: ${email}`)
  return data.user
}

async function main() {
  const creatorUser = await createDemoUser({
    email: 'creator@feedma.test',
    role: 'creator',
    fullName: 'Nora Blake (demo)'
  })
  const partnerUser = await createDemoUser({
    email: 'partner@feedma.test',
    role: 'partner',
    fullName: 'Alma Beauty Co. (demo)'
  })

  // El trigger on_auth_user_created ya creó la fila en `profiles` para cada
  // uno. Ahora rellenamos su ficha de rol (creators / partners), con upsert
  // para que el script se pueda repetir sin error.
  const { data: creator, error: creatorError } = await admin
    .from('creators')
    .upsert({ profile_id: creatorUser.id, display_name: 'Nora Blake', niche: 'Belleza y skincare' }, { onConflict: 'profile_id' })
    .select()
    .single()
  if (creatorError) throw creatorError

  const { data: partner, error: partnerError } = await admin
    .from('partners')
    .upsert({ profile_id: partnerUser.id, company_name: 'Alma Beauty Co.', industry: 'Belleza' }, { onConflict: 'profile_id' })
    .select()
    .single()
  if (partnerError) throw partnerError

  // Los relacionamos: una colaboración en curso + un post esperando revisión,
  // para que de entrada haya algo real que aprobar/editar en cada vista.
  // `collaborations`/`posts` no tienen una clave natural con la que hacer
  // upsert, así que comprobamos a mano si ya existen antes de insertar —
  // si no, cada vez que se vuelve a correr el script (p.ej. en otra máquina
  // del equipo) se duplica la colaboración y el post de demo.
  let collaboration
  const { data: existingCollaboration, error: existingCollabError } = await admin
    .from('collaborations')
    .select()
    .eq('partner_id', partner.id)
    .eq('creator_id', creator.id)
    .maybeSingle()
  if (existingCollabError) throw existingCollabError

  if (existingCollaboration) {
    collaboration = existingCollaboration
    console.log('↪ La colaboración de demo ya existía, reutilizándola')
  } else {
    const { data: newCollaboration, error: collabError } = await admin
      .from('collaborations')
      .insert({
        partner_id: partner.id,
        creator_id: creator.id,
        status: 'in_progress',
        brief: 'Campaña de lanzamiento de la nueva línea de skincare.'
      })
      .select()
      .single()
    if (collabError) throw collabError
    collaboration = newCollaboration
  }

  const { data: existingPost, error: existingPostError } = await admin
    .from('posts')
    .select('id')
    .eq('collaboration_id', collaboration.id)
    .maybeSingle()
  if (existingPostError) throw existingPostError

  if (existingPost) {
    console.log('↪ El post de demo ya existía, no se crea otro')
  } else {
    const { error: postError } = await admin.from('posts').insert({
      creator_id: creator.id,
      collaboration_id: collaboration.id,
      title: 'Reel: rutina skincare nocturna',
      caption: 'Cuatro pasos, cinco minutos, piel lista para mañana.',
      content_type: 'reel',
      platform: 'instagram',
      status: 'ready_for_review',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    })
    if (postError) throw postError
  }

  console.log('\nListo. 2 cuentas de prueba, ya relacionadas entre sí:\n')
  console.log('  creator@feedma.test  (Creador de contenido — Nora Blake)')
  console.log('  partner@feedma.test  (Partner — Alma Beauty Co., colaborando con Nora)')
  console.log(`\n  Contraseña de las dos: ${DEMO_PASSWORD}`)
  console.log('\nHay 1 colaboración en curso y 1 post esperando aprobación de Alma Beauty Co.\n')
}

main().catch((err) => {
  console.error('\n✗ Algo falló:', err.message)
  process.exit(1)
})
