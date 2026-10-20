// FEEDMA — crea 2 cuentas de prueba (creador de contenido, partner) ya
// relacionadas entre sí (varias colaboraciones repartidas entre pendientes
// e historial, y varios posts repartidos por las 5 fases del tablero, uno
// de ellos fuera de plazo a propósito), para probar la app con datos
// reales de Supabase en vez de los mocks del frontend.
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

  // Varias colaboraciones con el mismo partner de demo, repartidas entre
  // pendiente ("requested", la pestaña "Solicitudes" las separa) e historial
  // (aceptada/en curso/completada/rechazada) — así esa pantalla no se ve
  // vacía ni con un único caso al entrar por primera vez. Idempotente por
  // `brief` (no hay clave natural mejor): si ya existe para este par
  // creador/partner, no se duplica al volver a correr el script.
  async function ensureCollaboration({ brief, status, budgetCents }) {
    const { data: existing, error: existingError } = await admin
      .from('collaborations')
      .select()
      .eq('partner_id', partner.id)
      .eq('creator_id', creator.id)
      .eq('brief', brief)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing) {
      console.log(`↪ Colaboración "${brief}" ya existía, reutilizándola`)
      return existing
    }

    const { data: created, error: createError } = await admin
      .from('collaborations')
      .insert({ partner_id: partner.id, creator_id: creator.id, status, brief, budget_cents: budgetCents ?? null })
      .select()
      .single()
    if (createError) throw createError
    console.log(`✓ Colaboración creada: ${brief} (${status})`)
    return created
  }

  const collaboration = await ensureCollaboration({
    brief: 'Campaña de lanzamiento de la nueva línea de skincare.',
    status: 'in_progress',
    budgetCents: 150000
  })
  const blackFriday = await ensureCollaboration({
    brief: 'Vídeo patrocinado para el Black Friday — presupuesto cerrado, a falta de fecha.',
    status: 'requested',
    budgetCents: 90000
  })
  await ensureCollaboration({
    brief: 'Serie de 3 stories semanales durante un mes, formato "rutina diaria".',
    status: 'requested',
    budgetCents: null
  })
  await ensureCollaboration({
    brief: 'Colaboración puntual para el lanzamiento de la edición limitada de verano.',
    status: 'completed',
    budgetCents: 220000
  })
  await ensureCollaboration({
    brief: 'Promoción de un producto que no encajaba con el contenido habitual de Nora.',
    status: 'declined',
    budgetCents: 60000
  })

  // Un puñado de posts repartidos por las 5 fases del tablero (ver
  // app/components/timeline/PhaseBoard.vue) — así el tablero no se ve vacío
  // ni con una sola card al entrar por primera vez. Solo 3 de los 7 van
  // atados a la colaboración (collaboration_id): el resto es "contenido
  // propio" de Nora, sin partner de por medio, como pasaría de verdad.
  // Idempotente por título (no hay clave natural mejor): si ya existe para
  // esta creadora, no se duplica al volver a correr el script.
  const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()
  const demoPosts = [
    {
      title: 'Reel: unboxing productos nuevos',
      caption: 'Lo que ha llegado esta semana, probado en directo.',
      content_type: 'reel',
      platform: 'instagram',
      status: 'idea',
      due_date: days(6)
    },
    {
      title: 'Carrusel: antes/después piel',
      caption: '',
      content_type: 'carousel',
      platform: 'instagram',
      status: 'idea',
      due_date: days(9)
    },
    {
      title: 'Story: detrás de cámaras del rodaje',
      caption: 'Un vistazo rápido al set antes de publicar el vídeo largo.',
      content_type: 'story',
      platform: 'instagram',
      status: 'in_production',
      due_date: days(1)
    },
    {
      title: 'Carrusel: tips de aplicación',
      caption: 'Tres errores comunes al aplicar el sérum.',
      content_type: 'carousel',
      platform: 'tiktok',
      status: 'in_production',
      due_date: days(-2) // fuera de plazo a propósito, para ver el aviso en el tablero
    },
    {
      title: 'Reel: rutina skincare nocturna',
      caption: 'Cuatro pasos, cinco minutos, piel lista para mañana.',
      content_type: 'reel',
      platform: 'instagram',
      status: 'ready_for_review',
      due_date: days(2),
      collaboration_id: collaboration.id
    },
    {
      title: 'Vídeo: review completa de la línea',
      caption: 'Qué me ha parecido cada producto, sin filtros.',
      content_type: 'video',
      platform: 'youtube',
      status: 'scheduled',
      due_date: days(4),
      collaboration_id: collaboration.id
    },
    {
      title: 'Imagen: packaging final de la colección',
      caption: 'La foto que cerró la campaña.',
      content_type: 'image',
      platform: 'instagram',
      status: 'published',
      due_date: days(-5),
      collaboration_id: collaboration.id
    }
  ]

  for (const post of demoPosts) {
    const { data: existingPost, error: existingPostError } = await admin
      .from('posts')
      .select('id')
      .eq('creator_id', creator.id)
      .eq('title', post.title)
      .maybeSingle()
    if (existingPostError) throw existingPostError

    if (existingPost) {
      console.log(`↪ "${post.title}" ya existía, no se crea otra vez`)
      continue
    }

    const { error: postError } = await admin.from('posts').insert({ creator_id: creator.id, ...post })
    if (postError) throw postError
    console.log(`✓ Post creado: ${post.title} (${post.status})`)
  }

  // Una contraoferta de ejemplo en la colaboración pendiente del Black
  // Friday, para ver el hilo de negociación con datos reales al entrar por
  // primera vez (ver NegotiationPanel.vue). Necesita la migración
  // 20261021140000_collaboration_offers_and_reports.sql ya aplicada — si
  // no lo está, se avisa y se sigue sin romper el resto del seed.
  try {
    const { data: existingOffer, error: existingOfferError } = await admin
      .from('collaboration_offers')
      .select('id')
      .eq('collaboration_id', blackFriday.id)
      .maybeSingle()
    if (existingOfferError) throw existingOfferError

    if (existingOffer) {
      console.log('↪ Ya había una contraoferta de ejemplo en "Vídeo patrocinado para el Black Friday"')
    } else {
      const { error: offerError } = await admin.from('collaboration_offers').insert({
        collaboration_id: blackFriday.id,
        proposed_by: 'creator',
        budget_cents: 110000,
        message: 'Con el alcance que pedís, necesito subir un poco el presupuesto.'
      })
      if (offerError) throw offerError
      console.log('✓ Contraoferta de ejemplo creada (Nora pide 1100€ en vez de los 900€ iniciales)')
    }
  } catch (err) {
    console.log(`↪ No se ha podido crear la contraoferta de ejemplo (¿falta aplicar la migración de collaboration_offers?): ${err.message}`)
  }

  console.log('\nListo. 2 cuentas de prueba, ya relacionadas entre sí:\n')
  console.log('  creator@feedma.test  (Creador de contenido — Nora Blake)')
  console.log('  partner@feedma.test  (Partner — Alma Beauty Co., colaborando con Nora)')
  console.log(`\n  Contraseña de las dos: ${DEMO_PASSWORD}`)
  console.log('\n5 colaboraciones con Alma Beauty Co. (2 pendientes, 3 en el historial) y posts repartidos por las 5 fases del tablero (uno de ellos fuera de plazo, a propósito).\n')
}

main().catch((err) => {
  console.error('\n✗ Algo falló:', err.message)
  process.exit(1)
})
