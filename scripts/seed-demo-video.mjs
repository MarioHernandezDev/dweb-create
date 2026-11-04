// FEEDMA — escenario de la demo en vídeo (AREZZ × NOVA STUDIO) para un Supabase LOCAL.
//
// SOLO ENTORNO AISLADO: aborta si SUPABASE_URL no apunta a 127.0.0.1/localhost y
// si la base ya tiene usuarios (hay que partir de `supabase db reset` local).
// Todos los datos son ficticios: cuentas @demo.feedma.test, imágenes ilustradas
// generadas para la demo y estadísticas inventadas (ver docs/demo/DEMO_DATA_PLAN.md).
//
// Deja preparado el contexto (perfiles, paquetes, redes, historial, tablero). El
// flujo que se enseña en el vídeo (conversación, ofertas, colaboración nueva,
// publicación, revisión y cierre) NO se siembra: se hace en la propia app al grabar.
//
// Uso (desde una copia de la app con un .env que apunte al Supabase local):
//   npx supabase db reset --local
//   node --env-file=.env scripts/seed-demo-video.mjs <carpeta-con-las-imagenes-png>

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, DEMO_PASSWORD } = process.env
const imagesDir = process.argv[2]
if (!SUPABASE_URL || !SERVICE_KEY || !DEMO_PASSWORD || !imagesDir) {
  console.error('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD o la carpeta de imágenes.')
  process.exit(1)
}
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(SUPABASE_URL)) {
  console.error('ABORTADO: este script solo se ejecuta contra un Supabase local (http://127.0.0.1:<puerto>).')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const DAY = 86_400_000
const now = Date.now()
const at = (days, hour = 10, minute = 0) => {
  const d = new Date(now + days * DAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}
const DEMO_TOKEN = 'demo:sin-token-real' // cuenta "conectada" sin credenciales reales

async function run(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}
// `withId = false` para las tablas sin columna id (social_account_snapshots, post_labels).
const insert = (table, rows, withId = true) => run(`insert ${table}`, withId ? admin.from(table).insert(rows).select('id') : admin.from(table).insert(rows))
const insertOne = async (table, row) => (await insert(table, row))[0].id

async function upload(userId, name, file) {
  const path = `${userId}/${name}`
  await run(`subida ${path}`, admin.storage.from('post-media').upload(path, readFileSync(`${imagesDir}/${file}.png`), { upsert: true, contentType: 'image/png' }))
  return admin.storage.from('post-media').getPublicUrl(path).data.publicUrl
}

async function createUser({ email, role, name, detail }) {
  const data = await run(email, admin.auth.admin.createUser({
    email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { role, full_name: name, detail }
  }))
  return data.user.id
}

// ---------------------------------------------------------------------------
// Personajes (todos ficticios)
// ---------------------------------------------------------------------------
const CREATORS = [
  {
    key: 'arezz', email: 'arezz@demo.feedma.test', name: 'AREZZ', niche: 'Moda urbana y lifestyle', avatar: 'arezz-avatar', cover: 'arezz-cover',
    bio: 'Creo contenido de moda urbana, looks reales y escapadas de fin de semana. Me importa que cada colaboración encaje con lo que de verdad uso.',
    categories: ['Moda', 'Lifestyle', 'Viajes'], rate: [30_000, 150_000], weekly: 4,
    lookingFor: 'Marcas de moda y lifestyle con producto propio, mejor si es sostenible.',
    // Solo redes que la app sabe conectar (Instagram y YouTube; TikTok sale como "Próximamente").
    socials: [['instagram', '@arezz.demo', 48_200], ['youtube', 'AREZZ (demo)', 12_600]]
  },
  { key: 'sofia', email: 'sofia.lagos@demo.feedma.test', name: 'Sofía Lagos', niche: 'Viajes y moda', avatar: 'c-sofia', cover: 'c-sofia-cover', bio: 'Viajes con maleta pequeña y looks para cada ciudad.', categories: ['Viajes', 'Moda', 'Lifestyle'], rate: [30_000, 100_000], socials: [['instagram', '@sofialagos.demo', 36_700]] },
  { key: 'iker', email: 'iker.sanz@demo.feedma.test', name: 'Iker Sanz', niche: 'Cuidado personal', avatar: 'c-iker', cover: 'c-iker-cover', bio: 'Rutinas de cuidado personal sin complicaciones.', categories: ['Belleza', 'Moda'], rate: [25_000, 80_000], socials: [['instagram', '@ikersanz.demo', 15_300]] },
  { key: 'lia', email: 'lia.montes@demo.feedma.test', name: 'Lía Montes', niche: 'Fitness y nutrición', avatar: 'c-lia', cover: 'c-lia-cover', bio: 'Entrenamientos cortos para gente con poco tiempo.', categories: ['Fitness', 'Nutrición'], rate: [25_000, 90_000], socials: [['instagram', '@liamontes.demo', 22_400]] },
  { key: 'dani', email: 'dani.ortega@demo.feedma.test', name: 'Dani Ortega', niche: 'Tecnología', avatar: 'c-dani', cover: 'c-dani-cover', bio: 'Reseñas de tecnología explicadas sin jerga.', categories: ['Tecnología', 'Gaming'], rate: [30_000, 120_000], socials: [['youtube', 'Dani Ortega (demo)', 54_000]] },
  { key: 'marta', email: 'marta.vidal@demo.feedma.test', name: 'Marta Vidal', niche: 'Gastronomía', avatar: 'c-marta', cover: 'c-marta-cover', bio: 'Recetas de temporada y sitios donde comer bien.', categories: ['Gastronomía', 'Viajes'], rate: [20_000, 70_000], socials: [['instagram', '@martavidal.demo', 18_900]] },
  { key: 'kenji', email: 'kenji.ruiz@demo.feedma.test', name: 'Kenji Ruiz', niche: 'Gaming', avatar: 'c-kenji', cover: 'c-kenji-cover', bio: 'Directos y análisis de videojuegos independientes.', categories: ['Gaming', 'Tecnología'], rate: [35_000, 150_000], socials: [['youtube', 'Kenji Ruiz (demo)', 88_000]] }
]
const PARTNERS = [
  {
    key: 'nova', email: 'nova@demo.feedma.test', name: 'NOVA STUDIO', industry: 'Moda sostenible', avatar: 'nova-logo', cover: 'nova-cover',
    bio: 'Estudio de diseño que lanza colecciones cápsula de ropa urbana con tejidos reciclados. Producción local y tiradas cortas.',
    categories: ['Moda', 'Sostenibilidad', 'Lifestyle'], budget: [50_000, 250_000],
    lookingFor: 'Creadores de moda urbana y lifestyle para lanzar nuestra cápsula de otoño en Instagram y TikTok.'
  },
  { key: 'brisa', email: 'atelier.brisa@demo.feedma.test', name: 'Atelier Brisa', industry: 'Moda y complementos', avatar: 'p-brisa', cover: 'p-brisa-cover', bio: 'Bolsos y complementos de piel vegetal.', categories: ['Moda', 'Sostenibilidad'], budget: [40_000, 150_000] },
  { key: 'lucuma', email: 'lucuma.cafe@demo.feedma.test', name: 'Lúcuma Café', industry: 'Hostelería', avatar: 'p-lucuma', cover: 'p-lucuma-cover', bio: 'Cafetería de especialidad y brunch.', categories: ['Gastronomía', 'Lifestyle'], budget: [20_000, 60_000] },
  { key: 'pulso', email: 'pulso.fitwear@demo.feedma.test', name: 'Pulso Fitwear', industry: 'Ropa deportiva', avatar: 'p-pulso', cover: 'p-pulso-cover', bio: 'Ropa técnica para entrenar en la ciudad.', categories: ['Deporte', 'Fitness', 'Moda'], budget: [30_000, 120_000] }
]

// Hay que partir de una base local recién reiniciada.
const existing = await run('listUsers', admin.auth.admin.listUsers({ perPage: 1 }))
if (existing.users.length) {
  console.error('ABORTADO: la base local ya tiene usuarios. Ejecuta antes `npx supabase db reset --local`.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 1. Cuentas (el trigger de alta crea perfil, ficha, créditos y bienvenida).
// ---------------------------------------------------------------------------
const P = {} // key -> { profileId, roleId }
for (const c of CREATORS) {
  const profileId = await createUser({ email: c.email, role: 'creator', name: c.name, detail: c.niche })
  const avatarUrl = await upload(profileId, 'avatar.png', c.avatar)
  const coverUrl = c.cover ? await upload(profileId, 'cover.png', c.cover) : null
  await run('perfil', admin.from('profiles').update({ avatar_url: avatarUrl, created_at: at(-200) }).eq('id', profileId))
  const row = await run('ficha creador', admin.from('creators').update({
    bio: c.bio, categories: c.categories, min_rate_cents: c.rate[0], max_rate_cents: c.rate[1], looking_for: c.lookingFor ?? null,
    avatar_url: avatarUrl, cover_url: coverUrl, weekly_post_target: c.weekly ?? 3, created_at: at(-200)
  }).eq('profile_id', profileId).select('id').single())
  P[c.key] = { profileId, roleId: row.id }
}
for (const p of PARTNERS) {
  const profileId = await createUser({ email: p.email, role: 'partner', name: p.name, detail: p.industry })
  const avatarUrl = await upload(profileId, 'avatar.png', p.avatar)
  const coverUrl = p.cover ? await upload(profileId, 'cover.png', p.cover) : null
  await run('perfil', admin.from('profiles').update({ avatar_url: avatarUrl, created_at: at(-180) }).eq('id', profileId))
  const row = await run('ficha partner', admin.from('partners').update({
    bio: p.bio, categories: p.categories, min_budget_cents: p.budget[0], max_budget_cents: p.budget[1], looking_for: p.lookingFor ?? null,
    cover_url: coverUrl, created_at: at(-180)
  }).eq('profile_id', profileId).select('id').single())
  P[p.key] = { profileId, roleId: row.id }
}
console.log(`Cuentas: ${CREATORS.length} creadores y ${PARTNERS.length} partners.`)

// ---------------------------------------------------------------------------
// 2. Redes "conectadas" de demostración y su evolución (cifras inventadas).
// ---------------------------------------------------------------------------
for (const c of CREATORS) {
  for (const [platform, handle, followers] of c.socials) {
    const id = await insertOne('social_accounts', {
      creator_id: P[c.key].roleId, platform, handle, access_token_encrypted: DEMO_TOKEN, followers_count: followers,
      connected_at: at(-120), status: 'connected', last_synced_at: at(0, 8), last_sync_attempt_at: at(0, 8), external_account_id: `demo-${c.key}-${platform}`
    })
    if (c.key !== 'arezz') continue
    // 45 días de histórico con crecimiento suave (solo AREZZ, que es quien se enseña).
    const snapshots = []
    for (let d = 44; d >= 0; d--) {
      const factor = 1 - d * 0.0021 + Math.sin(d / 3) * 0.0012
      snapshots.push({
        social_account_id: id, observed_on: at(-d).slice(0, 10), followers_count: Math.round(followers * factor),
        views_total: platform === 'youtube' ? Math.round(1_480_000 - d * 9_300) : null,
        videos_count: platform === 'youtube' ? 96 - Math.floor(d / 7) : null
      })
    }
    await insert('social_account_snapshots', snapshots, false)
  }
}

// ---------------------------------------------------------------------------
// 3. Paquetes de AREZZ.
// ---------------------------------------------------------------------------
const packages = [
  ['Reel de lanzamiento', 'Un reel vertical de 30–45 s presentando tu producto en un look real: guion, grabación y edición incluidos.', 45_000, ['1 reel de 30–45 s', 'Guion y edición', '1 ronda de cambios', 'Entrega en 7 días'], 'pkg-reel'],
  ['Campaña completa', 'Lanzamiento en varias piezas coordinadas durante una semana: reels, stories y carrusel.', 120_000, ['2 reels', '4 stories con enlace', 'Carrusel de 5 fotos', '2 rondas de cambios', 'Informe de resultados'], 'pkg-campana'],
  ['Carrusel de producto', 'Sesión de fotos con tu producto en 5 looks distintos, con texto y hashtags.', 30_000, ['Carrusel de 5 fotos', 'Texto y hashtags', '1 ronda de cambios'], 'pkg-carrusel']
]
for (const [i, [title, description, price, deliverables, cover]] of packages.entries()) {
  await insert('packages', {
    profile_id: P.arezz.profileId, title, description, price_cents: price, deliverables, active: true,
    cover_url: await upload(P.arezz.profileId, `package-${i + 1}.png`, cover), sort_order: i + 1, created_at: at(-90), updated_at: at(-90)
  })
}

// ---------------------------------------------------------------------------
// 4. Historial: colaboraciones cerradas (con sus condiciones) y valoraciones.
// ---------------------------------------------------------------------------
const pastCollab = ({ creator, partner, initiatedBy, brief, budget, created, paid, completed, terms }) => insertOne('collaborations', {
  creator_id: P[creator].roleId, partner_id: P[partner].roleId, status: 'completed', brief, budget_cents: budget, initiated_by: initiatedBy,
  created_at: at(created), updated_at: at(completed), paid_at: at(paid),
  campaign_goal: terms.goal, target_audience: terms.audience, tone: terms.tone, scope_notes: terms.scope,
  revisions_included: terms.revisions, exclusivity: false, usage_rights: terms.usage
})
const rate = (collabId, from, to, stars, comment, day) => insert('collaboration_ratings', {
  collaboration_id: collabId, rater_profile_id: P[from].profileId, ratee_profile_id: P[to].profileId, stars, comment, created_at: at(day)
})
const brisaCollab = await pastCollab({
  creator: 'arezz', partner: 'brisa', initiatedBy: 'partner', budget: 80_000, created: -40, paid: -38, completed: -12,
  brief: 'Reel presentando la nueva línea de bolsos de piel vegetal en un look de otoño.',
  terms: { goal: 'Dar a conocer la línea Brisa Veg', audience: 'Mujeres de 22 a 35 años interesadas en moda consciente', tone: 'Cercano y estético', scope: '1 reel de 30–45 s y 3 stories', revisions: 2, usage: 'Uso orgánico en las redes de la marca durante 6 meses' }
})
const lucumaCollab = await pastCollab({
  creator: 'arezz', partner: 'lucuma', initiatedBy: 'creator', budget: 45_000, created: -70, paid: -66, completed: -45,
  brief: 'Carrusel del brunch de temporada para el fin de semana de apertura.',
  terms: { goal: 'Llenar el primer fin de semana de brunch', audience: 'Público joven de la ciudad', tone: 'Desenfadado', scope: 'Carrusel de 5 fotos', revisions: 1, usage: 'Solo redes de AREZZ' }
})
const pulsoCollab = await pastCollab({
  creator: 'arezz', partner: 'pulso', initiatedBy: 'partner', budget: 60_000, created: -110, paid: -105, completed: -90,
  brief: 'Reel de entrenamiento urbano con la colección de running.',
  terms: { goal: 'Lanzamiento de la colección de running', audience: 'Runners urbanos', tone: 'Enérgico', scope: '1 reel y 2 stories', revisions: 1, usage: 'Redes de la marca durante 3 meses' }
})
const sofiaCollab = await pastCollab({
  creator: 'sofia', partner: 'nova', initiatedBy: 'partner', budget: 60_000, created: -50, paid: -48, completed: -30,
  brief: 'Reel de viaje con prendas de la colección de verano.',
  terms: { goal: 'Cerrar la temporada de verano', audience: 'Viajeros de 25 a 40 años', tone: 'Inspirador', scope: '1 reel y 3 stories', revisions: 2, usage: 'Redes de la marca durante 6 meses' }
})
await rate(brisaCollab, 'brisa', 'arezz', 5, 'Entregó el reel antes de plazo y cuidó muchísimo el producto. Repetiremos.', -11)
await rate(brisaCollab, 'arezz', 'brisa', 5, 'Brief muy claro y pago puntual.', -11)
await rate(lucumaCollab, 'lucuma', 'arezz', 5, 'Muy profesional y con ideas propias.', -44)
await rate(lucumaCollab, 'arezz', 'lucuma', 4, 'Todo bien; el producto llegó un día tarde.', -44)
await rate(pulsoCollab, 'pulso', 'arezz', 4, 'Buen resultado; una de las entregas se retrasó un día.', -89)
await rate(pulsoCollab, 'arezz', 'pulso', 4, null, -89)
await rate(sofiaCollab, 'sofia', 'nova', 5, 'Brief claro y feedback rapidísimo.', -29)
await rate(sofiaCollab, 'nova', 'sofia', 5, 'Contenido precioso y muy buena comunicación.', -29)

// NOVA tiene además una solicitud abierta con otro creador (campaña en marcha) y un perfil guardado.
await insert('collaborations', {
  creator_id: P.iker.roleId, partner_id: P.nova.roleId, status: 'requested', initiated_by: 'partner', budget_cents: 40_000,
  brief: 'Carrusel de cuidado personal con la línea de básicos de NOVA.', created_at: at(-2), updated_at: at(-2),
  campaign_goal: 'Presentar la línea de básicos', target_audience: 'Hombres de 20 a 35 años', tone: 'Natural',
  scope_notes: 'Carrusel de 5 fotos', revisions_included: 1, exclusivity: false, usage_rights: 'Redes de la marca durante 3 meses'
})
await insert('saved_profiles', { owner_profile_id: P.nova.profileId, target_creator_id: P.sofia.roleId, created_at: at(-31) })

// ---------------------------------------------------------------------------
// 5. Tablero de AREZZ (FEEDMA Studio): publicaciones en varias fases.
// ---------------------------------------------------------------------------
async function post({ title, caption, type, platform, status, due, published = null, collab = null, image = null, hashtags = [] }) {
  const id = await insertOne('posts', {
    creator_id: P.arezz.roleId, collaboration_id: collab, title, caption, content_type: type, platform, status,
    due_date: at(due, 18), published_at: published === null ? null : at(published, 19),
    metadata: hashtags.length ? { hashtags } : {}, created_at: at(Math.min(due, published ?? due) - 9), updated_at: at(Math.min(due, published ?? due) - 9)
  })
  if (image) await run('media', admin.from('posts').update({ media_url: await upload(P.arezz.profileId, `${id}.png`, image) }).eq('id', id))
  return id
}
const otono = await post({ title: 'Look de otoño con Atelier Brisa', caption: 'Mi look para estas tardes de otoño, con el bolso de piel vegetal de @atelierbrisa.', type: 'reel', platform: 'instagram', status: 'published', due: -14, published: -14, collab: brisaCollab, image: 'post-otono', hashtags: ['otoño', 'modasostenible', 'publi'] })
const brunch = await post({ title: 'Brunch de domingo en Lúcuma', caption: 'Plan de domingo resuelto. Gracias @lucumacafe por invitarme a probar la carta nueva.', type: 'carousel', platform: 'instagram', status: 'published', due: -50, published: -50, collab: lucumaCollab, image: 'post-cafe', hashtags: ['brunch', 'planesdedomingo', 'publi'] })
await post({ title: 'Un día en Madrid', caption: 'Vlog: ruta de tiendas de segunda mano y cafés por Malasaña.', type: 'video', platform: 'youtube', status: 'scheduled', due: 3, image: 'post-madrid', hashtags: ['vlog', 'madrid'] })
const sneakers = await post({ title: 'Sneakers en rotación', caption: 'Las 5 zapatillas que más uso este mes y cómo las combino.', type: 'reel', platform: 'instagram', status: 'in_production', due: 5, image: 'post-sneakers', hashtags: ['sneakers', 'outfit'] })
await post({ title: 'Rutina de mañana', caption: 'Cómo me preparo en 20 minutos los días de rodaje.', type: 'reel', platform: 'instagram', status: 'idea', due: 12, image: 'post-rutina' })
await post({ title: 'Preguntas y respuestas', caption: 'Respondo lo que más me preguntáis sobre colaborar con marcas.', type: 'video', platform: 'youtube', status: 'idea', due: 16 })
await insert('checklist_items', [['Guion', true], ['Grabación', true], ['Edición', false], ['Subtítulos', false]]
  .map(([text, done], i) => ({ post_id: sneakers, text, done, sort_order: i })))
const labelCollab = await insertOne('labels', { creator_id: P.arezz.roleId, name: 'Colaboración', color: '#7040e8' })
const labelOrganic = await insertOne('labels', { creator_id: P.arezz.roleId, name: 'Orgánico', color: '#16a34a' })
await insert('post_labels', [[otono, labelCollab], [brunch, labelCollab], [sneakers, labelOrganic]].map(([post_id, label_id]) => ({ post_id, label_id })), false)

// Sin métricas por publicación: la propia app avisa de que alcance e interacciones por
// publicación todavía no están conectados (Instagram sin permiso de insights), así que
// sembrarlas enseñaría algo que la app real no puede obtener.

// ---------------------------------------------------------------------------
// 6. Una conversación antigua (AREZZ ↔ Atelier Brisa) para que el chat no esté vacío.
//    Participantes en el mismo orden que _get_or_create_conversation (least/greatest).
// ---------------------------------------------------------------------------
const [one, two] = [P.arezz.profileId, P.brisa.profileId].sort()
const convId = await insertOne('conversations', {
  participant_one_id: one, participant_two_id: two, created_at: at(-41), last_message_at: at(-11, 12),
  participant_one_last_read_at: at(-11, 12), participant_two_last_read_at: at(-11, 12)
})
await insert('messages', [
  ['brisa', '¡Hola AREZZ! Nos encantó tu último look. ¿Te apetece presentar nuestra línea de bolsos?', -41, 10],
  ['arezz', '¡Claro! Os paso el paquete de reel y lo vemos.', -41, 12],
  ['brisa', 'Perfecto. El reel ha funcionado genial, ¡gracias!', -11, 11],
  ['arezz', '¡A vosotros! Cuando queráis repetimos.', -11, 12]
].map(([who, body, day, h]) => ({ conversation_id: convId, sender_id: P[who].profileId, kind: 'text', body, created_at: at(day, h) })))

// ---------------------------------------------------------------------------
// 7. Avisos: fuera los que generaron los triggers al sembrar; quedan los de bienvenida, leídos.
// ---------------------------------------------------------------------------
await run('avisos', admin.from('notifications').delete().neq('type', 'welcome'))
await run('avisos leídos', admin.from('notifications').update({ read_at: at(-200), created_at: at(-200) }).not('id', 'is', null))

const count = async (table) => (await admin.from(table).select('*', { count: 'exact', head: true })).count
console.log('Sembrado:', JSON.stringify({
  creadores: await count('creators'), partners: await count('partners'), paquetes: await count('packages'),
  colaboraciones: await count('collaborations'), publicaciones: await count('posts'), redes: await count('social_accounts'),
  historico: await count('social_account_snapshots'), valoraciones: await count('collaboration_ratings'), avisos: await count('notifications')
}))
