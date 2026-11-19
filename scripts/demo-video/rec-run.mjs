// Graba la demo guiada de CIBERAN en la app de DEMO (localhost:3300, Supabase local).
// Uso: node rec-run.mjs <depsVideoDir> <demoAppDir> <outDir> <carpetaImagenes>
// Requiere una base recién sembrada (reseed.sh). Escribe <outDir>/timeline.json y los fotogramas.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { overlayInitScript, Recorder, Actor } from './rec-lib.mjs'
import { recordCard } from './rec-cards.mjs'

const [depsDir, demoAppDir, outDir, IMG] = process.argv.slice(2)
const { chromium } = createRequire(`${depsDir}/package.json`)('playwright-core')
const password = readFileSync(`${demoAppDir}/.env`, 'utf8').match(/^DEMO_PASSWORD=(.+)$/m)[1]
const BASE = 'http://localhost:3300'
rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--force-device-scale-factor=1.5'] })
const ctxOpts = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, locale: 'es-ES', timezoneId: 'Europe/Madrid' }
const problems = []
async function login(email, label) {
  const ctx = await browser.newContext(ctxOpts)
  await ctx.addInitScript(overlayInitScript)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${e.message.slice(0, 200)}`))
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()} ${r.url().replace(BASE, '').slice(0, 150)}`) })
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.locator('button[type=submit]').first().click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
  await page.waitForLoadState('networkidle')
  return page
}
const rec = new Recorder(`${outDir}/frames`)
const N = new Actor(await login('nova@demo.ciberan.test', 'NOVA'), 'nova', rec)
const A = new Actor(await login('arezz@demo.ciberan.test', 'AREZZ'), 'arezz', rec)
const cardsPage = await (await browser.newContext(ctxOpts)).newPage()
const card = (c, ms = 3600) => recordCard(cardsPage, rec, `${outDir}/cards`, c, ms)
const dlg = (p) => p.getByRole('dialog').last()

// Escena: posiciona sin grabar, luego graba el cuerpo.
async function scene(actor, name, url, body) {
  actor.cap = null; actor.badgeText = null
  const u = typeof url === 'function' ? url() : url
  if (u) await actor.goto(u); else await actor.reapply()
  await rec.start(actor.page, name)
  try {
    await body(actor, actor.page)
    if (await actor.page.getByRole('alertdialog').isVisible().catch(() => false)) problems.push(`[${name}] la escena termina con un diálogo de confirmación abierto`)
  } finally { await actor.caption(null); await actor.badge(null); await actor.dwell(350); await rec.stop() }
  console.log(`escena ${name} ok`)
}

try {
  // ------------------------------------------------------------------ Intro
  await card({ id: 'intro', kind: 'intro', kicker: 'Cómo funciona, paso a paso', title: 'Encuentra, negocia y gestiona <em>colaboraciones</em>',
    subtitle: 'Un recorrido por la app con un creador y una marca de ejemplo.', note: 'Demostración con cuentas, imágenes y cifras ficticias · AREZZ (creador) y NOVA STUDIO (marca)',
    srt: 'CIBERAN — Cómo funciona, paso a paso' }, 5200)

  // ------------------------------------------------------------------ Módulo 1
  await card({ id: 'm1', kicker: 'Módulo 1 de 6', title: 'Conoce a <em>AREZZ</em>', subtitle: 'El día a día de un creador en CIBERAN: su panel y sus métricas.' })
  await scene(A, 'arezz-hoy', `${BASE}/creator`, async (a, p) => {
    await a.caption('Este es «Hoy», el panel de AREZZ', { n: 'Paso 1', wait: 1700 })
    await a.caption('De un vistazo: colaboraciones, solicitudes, entregas y objetivo semanal', { n: 'Paso 1' })
    await a.highlightBlock(p.getByText('Colaboraciones activas').first(), { minW: 900, minH: 90, ms: 2400 })
    await a.caption('Y lo próximo que necesita su atención', { n: 'Paso 1' })
    await a.highlightBlock(p.getByText('Necesita tu atención').first(), { minW: 300, minH: 120, ms: 2000 })
  })
  await scene(A, 'arezz-metricas', `${BASE}/creator/metrics`, async (a, p) => {
    await a.badge('Cifras ficticias de demostración')
    await a.caption('Métricas: los seguidores de cada red conectada', { n: 'Paso 2' })
    await a.highlightBlock(p.getByText('Seguidores totales').first(), { minW: 900, minH: 150, ms: 2400 })
    await a.scroll(330, 1100)
    await a.caption('Cada red, con su peso en el total y su última actualización', { n: 'Paso 2' })
    await a.highlightBlock(p.getByText('@arezz.demo').first(), { minW: 380, minH: 200, ms: 2200 })
    await a.scroll(520, 1300)
    await a.caption('Hoy se conectan Instagram y YouTube; el resto aparece como «Próximamente»', { n: 'Paso 2', wait: 2600 })
  })

  // ------------------------------------------------------------------ Módulo 2
  await card({ id: 'm2', kicker: 'Módulo 2 de 6', title: '<em>Descubre</em> creadores', subtitle: 'NOVA STUDIO busca a quién confiar el lanzamiento de su cápsula de otoño.' })
  await scene(N, 'nova-descubre', `${BASE}/partner`, async (a, p) => {
    await a.caption('NOVA STUDIO, una marca de moda sostenible, entra en CIBERAN', { n: 'Paso 3', wait: 2200 })
    await a.caption('Va a Descubrir…', { n: 'Paso 3' })
    await a.click(p.getByRole('link', { name: 'Descubrir' }).first(), { after: 1200 })
    await a.caption('…y filtra por la categoría que le interesa: Moda', { n: 'Paso 3' })
    await a.click(p.getByRole('button', { name: 'Filtros' }))
    await a.click(p.getByRole('button', { name: 'Moda', exact: true }).first())
    const search = p.getByRole('button', { name: 'Buscar', exact: true })
    if (await search.isVisible().catch(() => false)) await a.click(search, { after: 1500 })
    await a.caption('AREZZ encaja: moda, lifestyle y viajes', { n: 'Paso 4' })
    await a.highlightBlock(p.locator(':text-is("AREZZ")').first(), { minW: 230, minH: 300, ms: 2200 })
    await a.click(p.locator(':text-is("AREZZ")').first(), { after: 1400 })
  })
  await scene(N, 'nova-perfil', null, async (a, p) => {
    await a.badge('Cifras ficticias de demostración')
    await a.caption('Su perfil público: categorías, redes conectadas y tarifa', { n: 'Paso 5' })
    await a.highlightBlock(p.getByText('Instagram · 48,2 mil').first(), { minW: 500, minH: 30, ms: 2200 })
    await a.highlightBlock(p.getByText('Datos clave').first(), { minW: 300, minH: 200, ms: 1800 })
    await a.caption('Su reputación: valoraciones de colaboraciones ya completadas', { n: 'Paso 5' })
    await a.highlightBlock(p.getByText('Reputación').first(), { minW: 300, minH: 100, ms: 2000 })
    await a.caption('Y su catálogo de paquetes, cada uno con su precio', { n: 'Paso 6' })
    await a.highlightBlock(p.getByText('Campaña completa').first(), { minW: 300, minH: 300, ms: 2600 })
    await a.badge(null)
    await a.scrollTop()
  })

  // ------------------------------------------------------------------ Módulo 3
  await card({ id: 'm3', kicker: 'Módulo 3 de 6', title: '<em>Negocia</em> colaboraciones', subtitle: 'Chat, ofertas y contraofertas hasta cerrar el trato.' })
  let chatUrlNova = ''
  await scene(N, 'nova-chat', null, async (a, p) => {
    await a.caption('NOVA abre una conversación con AREZZ', { n: 'Paso 7' })
    await a.click(p.getByRole('button', { name: 'Iniciar chat' }), { after: 1500 })
    chatUrlNova = p.url()
    await a.type(p.getByPlaceholder('Escribe un mensaje…'), '¡Hola AREZZ! Somos NOVA STUDIO. Lanzamos nuestra cápsula de otoño y tu estilo encaja muy bien.', { delay: 22 })
    await a.click(p.getByRole('button', { name: 'Enviar mensaje' }), { after: 1000 })
    await a.caption('Y le envía una oferta sobre uno de sus paquetes', { n: 'Paso 8' })
    await a.click(p.getByRole('button', { name: 'Oferta', exact: true }), { after: 900 })
    await a.click(dlg(p).locator('button', { hasText: 'Campaña completa' }).first(), { after: 800 })
    await a.caption('Propone 900 € por la campaña completa (en catálogo: 1.200 €)', { n: 'Paso 8' })
    await a.type(p.locator('#chat-offer-price'), '900', { clear: true, delay: 90 })
    await a.type(p.locator('#chat-offer-message'), 'Nos encantaría lanzar la cápsula contigo. ¿Te encaja 900 € por la campaña completa?', { delay: 20 })
    await a.click(p.getByRole('button', { name: 'Enviar oferta' }), { after: 1600 })
  })
  await scene(A, 'arezz-recibe', `${BASE}/chat`, async (a, p) => {
    await a.caption('AREZZ recibe la oferta en su chat', { n: 'Paso 9' })
    await a.click(p.locator(':text-is("NOVA STUDIO")').first(), { after: 1500 })
    await a.highlightBlock(p.getByText('Oferta de NOVA STUDIO').last(), { minW: 420, minH: 150, ms: 2400 })
    await a.caption('Negocia: responde con su precio…', { n: 'Paso 10' })
    await a.type(p.getByPlaceholder('Escribe un mensaje…'), '¡Me encanta la cápsula! Mi tarifa para la campaña completa es 1.200 €, pero puedo dejarla en 1.050 € si cerramos esta semana.', { delay: 18 })
    await a.click(p.getByRole('button', { name: 'Enviar mensaje' }), { after: 1000 })
    await a.caption('…y rechaza esta primera oferta', { n: 'Paso 10' })
    await a.click(p.locator('[data-offer-decline]').first(), { after: 800 })
    await a.click(p.getByRole('alertdialog').getByRole('button', { name: 'Rechazar' }), { after: 1500 })
  })
  await scene(N, 'nova-contraoferta', chatUrlNova, async (a, p) => {
    await a.caption('NOVA lee la respuesta de AREZZ…', { n: 'Paso 11' })
    await a.highlightBlock(p.getByText('Mi tarifa para la campaña completa').last(), { minW: 300, minH: 60, ms: 2200 })
    await a.caption('…y manda una nueva oferta: 1.050 €', { n: 'Paso 11' })
    await a.click(p.getByRole('button', { name: 'Oferta', exact: true }), { after: 900 })
    await a.click(dlg(p).locator('button', { hasText: 'Campaña completa' }).first(), { after: 800 })
    await a.type(p.locator('#chat-offer-price'), '1050', { clear: true, delay: 90 })
    await a.type(p.locator('#chat-offer-message'), '¡Trato! 1.050 € por la campaña completa. Queremos publicar la primera pieza la semana que viene.', { delay: 20 })
    await a.click(p.getByRole('button', { name: 'Enviar oferta' }), { after: 1600 })
  })
  await scene(A, 'arezz-acepta', () => A.page.url(), async (a, p) => {
    await a.caption('AREZZ acepta la nueva oferta', { n: 'Paso 12' })
    await a.click(p.locator('[data-offer-accept]').first(), { after: 1800 })
    await a.caption('La colaboración se crea sola, con el precio acordado', { n: 'Paso 12' })
    await a.highlightBlock(p.getByText('Oferta de NOVA STUDIO').last(), { minW: 420, minH: 150, ms: 2200 })
    await a.click(p.getByText('Ver colaboración').last(), { after: 1500 })
    await a.highlightBlock(p.getByText('1050 €').first(), { minW: 600, minH: 120, ms: 2200 })
  })

  // ------------------------------------------------------------------ Módulo 4
  await card({ id: 'm4', kicker: 'Módulo 4 de 6', title: '<em>Gestiona</em> tus proyectos', subtitle: 'CIBERAN Studio: cada publicación, de la idea a la entrega.' })
  let postUrl = ''
  await scene(A, 'arezz-studio', `${BASE}/creator/timeline`, async (a, p) => {
    await a.caption('CIBERAN Studio: el tablero de publicaciones de AREZZ, por fases', { n: 'Paso 13', wait: 2600 })
    await a.caption('Crea la publicación de la colaboración', { n: 'Paso 13' })
    await a.click(p.getByRole('button', { name: 'Nueva publicación' }).first(), { after: 900 })
    await a.type(p.locator('#post-title'), 'Cápsula Otoño · NOVA × AREZZ', { delay: 30 })
    await a.type(p.locator('#post-caption'), 'Mi selección de la nueva cápsula de otoño de @novastudio: tejidos reciclados y cortes urbanos.', { delay: 16 })
    await a.caption('Vinculada a la colaboración con NOVA STUDIO', { n: 'Paso 13' })
    await a.select(p.locator('#post-collab'), 'NOVA STUDIO')
    await a.fill(p.locator('#post-due-date'), new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10))
    await a.type(p.locator('#post-hashtags'), '#novastudio #modasostenible #publi', { delay: 25 })
    await a.caption('Una estimación orientativa del borrador (sin IA: solo longitud y hashtags)', { n: 'Paso 13' })
    await a.click(p.getByRole('button', { name: 'Predecir éxito' }), { after: 3400 })
    await a.click(p.locator('[data-open-publication]'), { after: 1500 })
    postUrl = p.url()
  })
  await scene(A, 'arezz-entrega', null, async (a, p) => {
    await a.caption('Sube la pieza…', { n: 'Paso 14' })
    await a.upload(p.locator('button:has-text("Añadir foto")').first(), `${IMG}/nova-capsula-v1.png`)
    await a.caption('…y la avanza de fase: en producción', { n: 'Paso 14' })
    await a.click(p.getByRole('button', { name: /^Mover a/ }), { after: 1500 })
    await a.caption('Lista: la envía a revisión de NOVA STUDIO', { n: 'Paso 15' })
    await a.click(p.getByRole('button', { name: /^Mover a/ }), { after: 1500 })
    await a.highlightBlock(p.getByText('A la espera de que el partner').first(), { minW: 500, minH: 30, ms: 2200 })
  })

  // ------------------------------------------------------------------ Módulo 5
  await card({ id: 'm5', kicker: 'Módulo 5 de 6', title: '<em>Revisa</em> y aprueba', subtitle: 'La marca revisa la entrega, pide cambios y la aprueba antes de publicar.' })
  await scene(N, 'nova-pide-cambios', `${BASE}/partner`, async (a, p) => {
    await a.caption('NOVA ve la entrega pendiente de revisar', { n: 'Paso 16' })
    await a.highlightBlock(p.getByRole('button', { name: 'Revisar' }).first(), { minW: 800, minH: 300, ms: 2200 })
    await a.click(p.getByRole('button', { name: 'Revisar' }).first(), { after: 1200 })
    await a.caption('Pide un cambio concreto', { n: 'Paso 16' })
    await a.click(dlg(p).getByRole('button', { name: 'Pedir cambios' }), { after: 700 })
    await a.type(p.getByPlaceholder('Sé concreto — esto es justo lo que verá el creador…'), '¡Nos encanta! ¿Podéis añadir el código AREZZ20 en la imagen y mencionarlo en el texto?', { delay: 18 })
    await a.click(dlg(p).getByRole('button', { name: 'Enviar' }), { after: 1600 })
  })
  await scene(A, 'arezz-corrige', `${BASE}/inbox`, async (a, p) => {
    await a.caption('AREZZ recibe el aviso con el comentario', { n: 'Paso 17' })
    await a.highlightBlock(p.getByText('Te han pedido cambios').first(), { minW: 600, minH: 100, ms: 2000 })
    await a.click(p.getByText('Te han pedido cambios').first(), { after: 1600 })
    await a.highlightBlock(p.getByText('NOVA STUDIO ha pedido cambios').first(), { minW: 500, minH: 80, ms: 2200 })
    await a.caption('Cambia la imagen y el texto…', { n: 'Paso 17' })
    await a.upload(p.locator('button:has-text("Cambiar foto")').first(), `${IMG}/nova-capsula-v2.png`)
    await a.type(p.locator('textarea').first(), 'Mi selección de la nueva cápsula de otoño de @novastudio: tejidos reciclados y cortes urbanos. Usa AREZZ20 para un 20 % en el lanzamiento.', { clear: true, delay: 14 })
    await a.click(p.getByRole('button', { name: 'Guardar cambios' }), { after: 1300 })
    await a.caption('…y la vuelve a enviar a revisión', { n: 'Paso 17' })
    await a.click(p.getByRole('button', { name: /^Mover a/ }), { after: 1600 })
  })
  await scene(N, 'nova-aprueba', `${BASE}/partner`, async (a, p) => {
    await a.caption('NOVA revisa la nueva versión…', { n: 'Paso 18' })
    await a.click(p.getByRole('button', { name: 'Revisar' }).first(), { after: 1600 })
    await a.click(dlg(p).getByText('+ Añadir un comentario'), { after: 500 })
    await a.type(dlg(p).getByPlaceholder('Comentario opcional al aprobar…'), '¡Perfecta! Adelante con la publicación.', { delay: 24 })
    await a.caption('…y la aprueba', { n: 'Paso 18' })
    await a.click(dlg(p).getByRole('button', { name: 'Aprobar' }), { after: 1800 })
    await a.caption('Queda programada en su calendario', { n: 'Paso 18' })
    await a.highlightBlock(p.getByText('Tu calendario').first(), { minW: 800, minH: 200, ms: 2600 })
  })
  await scene(A, 'arezz-publica', () => postUrl, async (a, p) => {
    await a.caption('Aprobada: AREZZ la publica y lo marca en CIBERAN', { n: 'Paso 19' })
    await a.click(p.getByRole('button', { name: /^Mover a/ }), { after: 1600 })
    // Publicada = ya no hay fase siguiente. Si aparece un diálogo o sigue el botón, la escena no vale.
    await p.getByRole('button', { name: /^Mover a/ }).waitFor({ state: 'detached', timeout: 5000 })
    await a.click(p.getByText('Volver al tablero').first(), { after: 1600 })
    await a.highlightBlock(p.getByText('Cápsula Otoño · NOVA × AREZZ').first(), { minW: 230, minH: 200, ms: 2400 })
  })

  // ------------------------------------------------------------------ Módulo 6
  await card({ id: 'm6', kicker: 'Módulo 6 de 6', title: '<em>Cierra</em> y valora', subtitle: 'La colaboración se completa y cada parte valora a la otra.' })
  await scene(N, 'nova-completa', `${BASE}/partner/requests`, async (a, p) => {
    await a.caption('NOVA marca la colaboración como completada', { n: 'Paso 20' })
    await a.click(p.getByText('En curso', { exact: true }).first(), { after: 900 })
    await a.click(p.locator(':text-is("AREZZ")').first(), { after: 1000 })
    await a.click(dlg(p).getByRole('button', { name: 'Marcar como completada' }), { after: 800 })
    await a.click(p.getByRole('alertdialog').getByRole('button', { name: 'Marcar como completada' }), { after: 1600 })
    await a.caption('Y valora el trabajo de AREZZ', { n: 'Paso 20' })
    await a.click(dlg(p).getByRole('button', { name: '5 estrellas', exact: true }), { after: 500 })
    await a.type(p.getByPlaceholder('Comentario opcional (comunicación, cumplimiento de plazos…)'), 'Contenido precioso, entregado a tiempo y muy abierto al feedback.', { delay: 18 })
    await a.click(p.getByRole('button', { name: 'Enviar valoración' }), { after: 1600 })
  })
  await scene(A, 'arezz-valora', `${BASE}/creator/requests`, async (a, p) => {
    await a.caption('AREZZ también valora a NOVA STUDIO', { n: 'Paso 21' })
    await a.click(p.getByText('Historial', { exact: true }).first(), { after: 900 })
    await a.click(p.locator(':text-is("NOVA STUDIO")').first(), { after: 1000 })
    await a.click(dlg(p).getByRole('button', { name: '5 estrellas', exact: true }), { after: 500 })
    await a.type(p.getByPlaceholder('Comentario opcional (comunicación, cumplimiento de plazos…)'), 'Brief claro, feedback concreto y trato muy cercano.', { delay: 18 })
    await a.click(p.getByRole('button', { name: 'Enviar valoración' }), { after: 1500 })
    await a.caption('Las valoraciones construyen la reputación de cada perfil', { n: 'Paso 21', wait: 2400 })
  })

  // ------------------------------------------------------------------ Cierre
  await card({ id: 'outro', kind: 'outro', kicker: 'Descubre · Negocia · Gestiona', title: 'Del primer mensaje a la <em>publicación aprobada</em>',
    note: 'Vídeo de demostración grabado en un entorno aislado · cuentas, imágenes y cifras ficticias', srt: 'CIBERAN — Del primer mensaje a la publicación aprobada' }, 5600)
} catch (e) {
  console.log('FALLO:', e.message.split('\n').slice(0, 5).join('\n'))
  await N.page.screenshot({ path: `${outDir}/fallo-nova.png` }).catch(() => {})
  await A.page.screenshot({ path: `${outDir}/fallo-arezz.png` }).catch(() => {})
  if (rec.current) await rec.stop()
}
writeFileSync(`${outDir}/timeline.json`, JSON.stringify(rec.clips, null, 1))
console.log(`${rec.clips.length} clips, ${rec.clips.reduce((s, c) => s + c.frames.length, 0)} fotogramas`)
console.log(problems.length ? `PROBLEMAS:\n  ${[...new Set(problems)].join('\n  ')}` : 'Sin errores de página ni peticiones fallidas.')
await browser.close()
