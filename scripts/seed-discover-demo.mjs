// FEEDMA — seed de datos más ricos para probar "Descubrir" (filtros, IA y
// analíticas de admin) con algo más que 1 creador + 1 partner. Crea 9
// creadores y 9 partners nuevos (más allá de los 2 de `seed-demo-users.mjs`,
// que no toca), repartidos por varias categorías de `app/utils/categories.ts`
// y con rangos de presupuesto distintos, para que los filtros, el cruce por
// categoría y el ranking por IA tengan algo real que comparar. También deja
// unas cuantas colaboraciones (en las dos direcciones — iniciadas por
// partner Y por creador, ver `initiated_by`) y un puñado de búsquedas ya
// registradas en `discovery_searches` repartidas por las últimas semanas,
// para que la pestaña "Analíticas → Descubrir" del admin no se vea vacía la
// primera vez que se abre.
//
// Mismo patrón que seed-demo-users.mjs: Admin API de verdad (nunca inserta
// a mano en auth.users), idempotente por email/nombre/brief — se puede
// volver a correr sin duplicar nada.
//
// Uso:
//   npm run db:seed-discover
// (lee SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DEMO_PASSWORD de .env,
// igual que db:seed-users — necesita la migración
// supabase/migrations/20261021150000_discovery_bidireccional.sql ya aplicada)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'feedma-demo-2026'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '\nFaltan variables de entorno.\n' +
      'Ejecuta con: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed-discover\n' +
      '(o copia .env.example a .env y rellénalo)\n'
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

// ----------------------------------------------------------------------------
// Catálogo de creadores y partners de prueba — categorías copiadas a mano de
// app/utils/categories.ts (DISCOVERY_CATEGORIES) para que coincidan letra
// por letra; un script .mjs plano no puede importar ese .ts directamente.
// ----------------------------------------------------------------------------
const CREATORS = [
  {
    email: 'mateo.rivas@feedma.test',
    name: 'Mateo Rivas',
    niche: 'Fitness y nutrición',
    bio: 'Entrenador personal, rutinas y recetas altas en proteína para gente con poco tiempo.',
    categories: ['Fitness', 'Nutrición'],
    minRateCents: 15000,
    maxRateCents: 40000,
    lookingFor: 'Marcas de suplementos y ropa deportiva, campañas de rutinas patrocinadas.',
    socials: [{ platform: 'instagram', handle: '@mateorivas.fit', followers: 85000 }, { platform: 'tiktok', handle: '@mateorivas.fit', followers: 120000 }]
  },
  {
    email: 'lucia.fernandez@feedma.test',
    name: 'Lucía Fernández',
    niche: 'Moda y lifestyle',
    bio: 'Estilismo accesible, segunda mano y marcas pequeñas — nada de fast fashion.',
    categories: ['Moda', 'Lifestyle'],
    minRateCents: 30000,
    maxRateCents: 80000,
    lookingFor: 'Marcas de moda sostenible o de producción local, tono cercano y femenino.',
    socials: [{ platform: 'instagram', handle: '@luciafdz', followers: 210000 }, { platform: 'tiktok', handle: '@luciafdz', followers: 50000 }]
  },
  {
    email: 'diego.castillo@feedma.test',
    name: 'Diego Castillo',
    niche: 'Gaming y tecnología',
    bio: 'Reviews de hardware y directos de juegos indie — nada de AAA pagado por sorpresa.',
    categories: ['Gaming', 'Tecnología'],
    minRateCents: 10000,
    maxRateCents: 35000,
    lookingFor: 'Marcas de periféricos, hardware o apps — sin exclusividad larga.',
    socials: [{ platform: 'youtube', handle: 'DiegoCastilloGG', followers: 95000 }, { platform: 'tiktok', handle: '@diegocastillogg', followers: 60000 }]
  },
  {
    email: 'valeria.soto@feedma.test',
    name: 'Valeria Soto',
    niche: 'Viajes y gastronomía',
    bio: 'Rutas de comida callejera por el mundo, con presupuesto real, no de lujo.',
    categories: ['Viajes', 'Gastronomía'],
    minRateCents: 25000,
    maxRateCents: 60000,
    lookingFor: 'Marcas de turismo, aerolíneas o restaurantes para colaboraciones in situ.',
    socials: [{ platform: 'instagram', handle: '@valeriasoto.travel', followers: 175000 }]
  },
  {
    email: 'carla.jimenez@feedma.test',
    name: 'Carla Jiménez',
    niche: 'Familia y maternidad',
    bio: 'Maternidad real, sin postureo — rutinas con dos peques y poco tiempo de sobra.',
    categories: ['Familia y maternidad', 'Lifestyle'],
    minRateCents: 12000,
    maxRateCents: 30000,
    lookingFor: 'Marcas de puericultura, alimentación infantil o productos para el hogar.',
    socials: [{ platform: 'instagram', handle: '@carlaysufamilia', followers: 60000 }]
  },
  {
    email: 'hugo.navarro@feedma.test',
    name: 'Hugo Navarro',
    niche: 'Negocios y finanzas personales',
    bio: 'Finanzas personales explicadas sin tecnicismos — ahorro, inversión, autónomos.',
    categories: ['Negocios y emprendimiento', 'Finanzas'],
    minRateCents: 40000,
    maxRateCents: 100000,
    lookingFor: 'Apps de finanzas, bancos digitales o herramientas para autónomos.',
    socials: [{ platform: 'instagram', handle: '@hugonavarro.finanzas', followers: 40000 }, { platform: 'youtube', handle: 'HugoNavarroFinanzas', followers: 70000 }]
  },
  {
    email: 'elena.ruiz@feedma.test',
    name: 'Elena Ruiz',
    niche: 'Sostenibilidad y hogar',
    bio: 'Casa sin plástico, paso a paso — reformas pequeñas y trucos de verdad, no postureo eco.',
    categories: ['Sostenibilidad', 'Hogar y decoración'],
    minRateCents: 15000,
    maxRateCents: 40000,
    lookingFor: 'Marcas de hogar sostenible, menaje reutilizable o energía.',
    socials: [{ platform: 'instagram', handle: '@elenaruiz.eco', followers: 55000 }]
  },
  {
    email: 'marcos.pena@feedma.test',
    name: 'Marcos Peña',
    niche: 'Deporte y fitness',
    bio: 'Calistenia y entrenamiento funcional — contenido técnico, sin humo.',
    categories: ['Deporte', 'Fitness'],
    minRateCents: 18000,
    maxRateCents: 45000,
    lookingFor: 'Marcas de ropa técnica, suplementación o material deportivo.',
    socials: [{ platform: 'instagram', handle: '@marcospena.training', followers: 90000 }, { platform: 'tiktok', handle: '@marcospena.training', followers: 200000 }]
  },
  {
    email: 'paula.ibanez@feedma.test',
    name: 'Paula Ibáñez',
    niche: 'Música y educación',
    bio: 'Clases de piano y teoría musical para principiantes adultos.',
    categories: ['Música', 'Educación'],
    minRateCents: 10000,
    maxRateCents: 28000,
    lookingFor: 'Academias online, marcas de instrumentos o apps educativas.',
    socials: [{ platform: 'instagram', handle: '@paulaibanez.music', followers: 30000 }, { platform: 'youtube', handle: 'PaulaIbanezMusic', followers: 45000 }]
  }
]

const PARTNERS = [
  {
    email: 'nutrifit.labs@feedma.test',
    name: 'Nutrifit Labs',
    industry: 'Nutrición deportiva',
    bio: 'Suplementación deportiva formulada en España, sin azúcares añadidos.',
    categories: ['Nutrición', 'Fitness'],
    minBudgetCents: 20000,
    maxBudgetCents: 60000,
    lookingFor: 'Creadores de fitness o nutrición con audiencia en España, tono cercano.'
  },
  {
    email: 'velora@feedma.test',
    name: 'Vêlora',
    industry: 'Moda sostenible',
    bio: 'Ropa de producción local y materiales reciclados, tiradas cortas.',
    categories: ['Moda', 'Sostenibilidad'],
    minBudgetCents: 30000,
    maxBudgetCents: 90000,
    lookingFor: 'Creadores de moda con enfoque sostenible o de segunda mano.'
  },
  {
    email: 'pixelforge.games@feedma.test',
    name: 'PixelForge Games',
    industry: 'Videojuegos',
    bio: 'Estudio indie — lanzamos un juego nuevo cada trimestre.',
    categories: ['Gaming', 'Tecnología'],
    minBudgetCents: 15000,
    maxBudgetCents: 50000,
    lookingFor: 'Streamers o creadores de reviews de juegos indie.'
  },
  {
    email: 'rutasyco@feedma.test',
    name: 'Rutas&Co',
    industry: 'Turismo',
    bio: 'Agencia de viajes de experiencias — rutas gastronómicas y de aventura.',
    categories: ['Viajes', 'Gastronomía'],
    minBudgetCents: 30000,
    maxBudgetCents: 80000,
    lookingFor: 'Creadores de viajes con buena fotografía/vídeo, dispuestos a viajar.'
  },
  {
    email: 'mamafeliz@feedma.test',
    name: 'Mamá Feliz',
    industry: 'Puericultura',
    bio: 'Productos para bebé probados por madres reales antes de salir a la venta.',
    categories: ['Familia y maternidad', 'Lifestyle'],
    minBudgetCents: 10000,
    maxBudgetCents: 35000,
    lookingFor: 'Creadoras de maternidad, contenido auténtico, sin postureo.'
  },
  {
    email: 'capitalia@feedma.test',
    name: 'Capitalia',
    industry: 'Fintech',
    bio: 'Banco digital para autónomos y pequeños negocios.',
    categories: ['Negocios y emprendimiento', 'Finanzas'],
    minBudgetCents: 50000,
    maxBudgetCents: 150000,
    lookingFor: 'Creadores de finanzas o negocio con audiencia de autónomos/freelance.'
  },
  {
    email: 'ecohogar@feedma.test',
    name: 'EcoHogar',
    industry: 'Hogar sostenible',
    bio: 'Menaje y limpieza del hogar sin plástico de un solo uso.',
    categories: ['Sostenibilidad', 'Hogar y decoración'],
    minBudgetCents: 15000,
    maxBudgetCents: 45000,
    lookingFor: 'Creadores de sostenibilidad u hogar, contenido práctico.'
  },
  {
    email: 'proforma.sport@feedma.test',
    name: 'ProForma Sport',
    industry: 'Material deportivo',
    bio: 'Ropa técnica y accesorios para entrenamiento funcional.',
    categories: ['Deporte', 'Fitness'],
    minBudgetCents: 20000,
    maxBudgetCents: 60000,
    lookingFor: 'Creadores de deporte/fitness con contenido técnico, no solo estético.'
  },
  {
    email: 'soundwave.academy@feedma.test',
    name: 'SoundWave Academy',
    industry: 'Educación musical',
    bio: 'Academia online de música para adultos que empiezan desde cero.',
    categories: ['Música', 'Educación'],
    minBudgetCents: 10000,
    maxBudgetCents: 30000,
    lookingFor: 'Creadores de música o educación, formato clases/tutoriales.'
  }
]

async function ensureCreatorFicha(entry) {
  const user = await createDemoUser({ email: entry.email, role: 'creator', fullName: `${entry.name} (demo)` })

  const { data: creator, error } = await admin
    .from('creators')
    .upsert(
      {
        profile_id: user.id,
        display_name: entry.name,
        niche: entry.niche,
        bio: entry.bio,
        categories: entry.categories,
        min_rate_cents: entry.minRateCents,
        max_rate_cents: entry.maxRateCents,
        looking_for: entry.lookingFor
      },
      { onConflict: 'profile_id' }
    )
    .select()
    .single()
  if (error) throw error

  for (const social of entry.socials) {
    const { error: socialError } = await admin
      .from('social_accounts')
      .upsert(
        { creator_id: creator.id, platform: social.platform, handle: social.handle, followers_count: social.followers },
        { onConflict: 'creator_id,platform' }
      )
    if (socialError) throw socialError
  }

  console.log(`✓ Creador listo: ${entry.name} (${entry.categories.join(', ')})`)
  return creator
}

async function ensurePartnerFicha(entry) {
  const user = await createDemoUser({ email: entry.email, role: 'partner', fullName: `${entry.name} (demo)` })

  const { data: partner, error } = await admin
    .from('partners')
    .upsert(
      {
        profile_id: user.id,
        company_name: entry.name,
        industry: entry.industry,
        bio: entry.bio,
        categories: entry.categories,
        min_budget_cents: entry.minBudgetCents,
        max_budget_cents: entry.maxBudgetCents,
        looking_for: entry.lookingFor
      },
      { onConflict: 'profile_id' }
    )
    .select()
    .single()
  if (error) throw error

  console.log(`✓ Partner listo: ${entry.name} (${entry.categories.join(', ')})`)
  return partner
}

async function ensureCollaboration({ partner, creator, initiatedBy, status, budgetCents, brief }) {
  const { data: existing, error: existingError } = await admin
    .from('collaborations')
    .select()
    .eq('partner_id', partner.id)
    .eq('creator_id', creator.id)
    .eq('brief', brief)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) {
    console.log(`↪ Colaboración "${brief.slice(0, 40)}…" ya existía`)
    return existing
  }

  const { data: created, error: createError } = await admin
    .from('collaborations')
    .insert({ partner_id: partner.id, creator_id: creator.id, initiated_by: initiatedBy, status, brief, budget_cents: budgetCents ?? null })
    .select()
    .single()
  if (createError) throw createError
  console.log(`✓ Colaboración creada (${initiatedBy === 'partner' ? 'propuesta por partner' : 'propuesta por creador'}, ${status}): ${brief.slice(0, 50)}…`)
  return created
}

// ----------------------------------------------------------------------------
// Búsquedas de ejemplo en discovery_searches — repartidas en las últimas 7
// semanas, mezclando filtros/IA y creator/partner, para que la pestaña
// "Analíticas → Descubrir" del admin tenga algo que mostrar de entrada.
// Se insertan directamente (con service_role, igual que el resto del
// script) en vez de pasar por /api/discover/search — no hace falta un
// navegador real para dejar este rastro de ejemplo.
// ----------------------------------------------------------------------------
async function seedDiscoverySearches({ creatorProfileIds, partnerProfileIds }) {
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

  const rows = [
    { profileId: partnerProfileIds[0], role: 'partner', mode: 'ai', queryText: 'busco un creador de fitness o nutrición, presupuesto 200-500€, tono cercano', categories: ['Fitness', 'Nutrición'], results: 3, daysAgo: 2 },
    { profileId: partnerProfileIds[1], role: 'partner', mode: 'filters', queryText: null, categories: ['Moda'], results: 2, daysAgo: 4 },
    { profileId: partnerProfileIds[2], role: 'partner', mode: 'ai', queryText: 'creadores de gaming que hagan reviews de periféricos, no solo directos', categories: ['Gaming'], results: 1, daysAgo: 6 },
    { profileId: creatorProfileIds[0], role: 'creator', mode: 'filters', queryText: null, categories: ['Fitness'], results: 2, daysAgo: 9 },
    { profileId: creatorProfileIds[1], role: 'creator', mode: 'ai', queryText: 'marcas de moda sostenible con presupuesto superior a 300€', categories: ['Moda', 'Sostenibilidad'], results: 2, daysAgo: 11 },
    { profileId: partnerProfileIds[3], role: 'partner', mode: 'filters', queryText: null, categories: ['Viajes', 'Gastronomía'], results: 1, daysAgo: 14 },
    { profileId: creatorProfileIds[2], role: 'creator', mode: 'ai', queryText: 'marcas de tecnología o gaming para colaboración puntual', categories: ['Gaming', 'Tecnología'], results: 3, daysAgo: 16 },
    { profileId: partnerProfileIds[5], role: 'partner', mode: 'ai', queryText: 'creador de finanzas para autónomos, español, serio pero cercano', categories: ['Finanzas', 'Negocios y emprendimiento'], results: 1, daysAgo: 20 },
    { profileId: creatorProfileIds[4], role: 'creator', mode: 'filters', queryText: null, categories: ['Familia y maternidad'], results: 0, daysAgo: 23 },
    { profileId: partnerProfileIds[7], role: 'partner', mode: 'filters', queryText: null, categories: ['Deporte', 'Fitness'], results: 2, daysAgo: 28 },
    { profileId: creatorProfileIds[6], role: 'creator', mode: 'ai', queryText: 'marcas de hogar sostenible que paguen bien', categories: ['Sostenibilidad', 'Hogar y decoración'], results: 1, daysAgo: 33 },
    { profileId: partnerProfileIds[8], role: 'partner', mode: 'filters', queryText: null, categories: ['Música', 'Educación'], results: 1, daysAgo: 40 }
  ]

  for (const row of rows) {
    if (!row.profileId) continue
    // Idempotencia por `profile_id` a secas (en este seed cada fila usa un
    // perfil distinto, no hace falta más) — comparar por `created_at` exacto
    // sería frágil: `Date.now()` cambia entre la comprobación y el insert,
    // y entre una ejecución del script y la siguiente, así que nunca
    // volvería a coincidir y se duplicaría en cada re-ejecución.
    const { data: existing, error: existingError } = await admin
      .from('discovery_searches')
      .select('id')
      .eq('profile_id', row.profileId)
      .limit(1)
    if (existingError) throw existingError
    if (existing?.length) continue

    const { error } = await admin.from('discovery_searches').insert({
      profile_id: row.profileId,
      searcher_role: row.role,
      mode: row.mode,
      query_text: row.queryText,
      filters: { categories: row.categories },
      results_count: row.results,
      created_at: daysAgo(row.daysAgo)
    })
    if (error) throw error
  }
  console.log(`✓ ${rows.filter((r) => r.profileId).length} búsquedas de ejemplo registradas en discovery_searches`)
}

async function main() {
  console.log('Creando/actualizando 9 creadores de contenido de prueba…\n')
  const creators = []
  for (const entry of CREATORS) creators.push(await ensureCreatorFicha(entry))

  console.log('\nCreando/actualizando 9 partners de prueba…\n')
  const partners = []
  for (const entry of PARTNERS) partners.push(await ensurePartnerFicha(entry))

  console.log('\nCreando colaboraciones de ejemplo (en las dos direcciones)…\n')
  await ensureCollaboration({
    partner: partners[0], creator: creators[0], initiatedBy: 'partner', status: 'requested', budgetCents: 30000,
    brief: 'Pack de 4 reels mensuales sobre rutinas de entreno con nuestra línea de proteína.'
  })
  await ensureCollaboration({
    partner: partners[7], creator: creators[0], initiatedBy: 'creator', status: 'requested', budgetCents: 35000,
    brief: 'Os propongo una review técnica de vuestra nueva ropa de entrenamiento funcional.'
  })
  await ensureCollaboration({
    partner: partners[1], creator: creators[1], initiatedBy: 'partner', status: 'accepted', budgetCents: 60000,
    brief: 'Campaña de la nueva colección cápsula, 2 looks en carrusel + 1 reel.'
  })
  await ensureCollaboration({
    partner: partners[2], creator: creators[2], initiatedBy: 'partner', status: 'in_progress', budgetCents: 40000,
    brief: 'Review en vídeo del lanzamiento de nuestro juego indie la semana que viene.'
  })
  await ensureCollaboration({
    partner: partners[5], creator: creators[5], initiatedBy: 'creator', status: 'declined', budgetCents: 70000,
    brief: 'Propuesta de serie "finanzas para autónomos" patrocinada por Capitalia.'
  })
  await ensureCollaboration({
    partner: partners[3], creator: creators[3], initiatedBy: 'partner', status: 'completed', budgetCents: 50000,
    brief: 'Ruta gastronómica de 3 días, cobertura en stories + 1 vídeo resumen.'
  })

  console.log('\nRegistrando búsquedas de ejemplo para las analíticas de admin…\n')
  await seedDiscoverySearches({
    creatorProfileIds: creators.map((c) => c.profile_id),
    partnerProfileIds: partners.map((p) => p.profile_id)
  })

  console.log('\nListo. 9 creadores + 9 partners nuevos (contraseña para todos: ' + DEMO_PASSWORD + '), 6 colaboraciones de ejemplo en ambas direcciones, y 12 búsquedas de ejemplo para la pestaña Analíticas → Descubrir del admin.\n')
  console.log('Prueba /creator/discover y /partner/discover con filtros (Fitness, Moda, Gaming…) y con "Buscar con IA".\n')
}

main().catch((err) => {
  console.error('\n✗ Algo falló:', err.message)
  process.exit(1)
})
