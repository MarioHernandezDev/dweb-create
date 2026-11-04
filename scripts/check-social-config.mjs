// Comprueba la configuración de redes sociales ANTES de desplegar. No hace peticiones
// de red ni imprime ningún valor secreto: solo dice qué está bien y qué falta.
//
// Uso:  node --env-file=.env.production scripts/check-social-config.mjs
//       (o con las variables ya definidas en el entorno del servidor)
// Sale con código 1 si hay algún error.

const env = process.env
const problems = []
const warnings = []
const ok = []
const has = (k) => typeof env[k] === 'string' && env[k].trim() !== ''
const check = (cond, good, bad, level = 'error') => {
  if (cond) ok.push(good)
  else (level === 'error' ? problems : warnings).push(bad)
}

const appUrl = (env.APP_URL ?? '').replace(/\/+$/, '')
check(has('APP_URL') && appUrl.startsWith('https://'), 'APP_URL es HTTPS', 'APP_URL debe estar definida y empezar por https:// (Meta lo exige; sin ella el callback no vuelve a la app).')
if (/localhost|127\.0\.0\.1/.test(appUrl)) problems.push('APP_URL apunta a localhost: en producción debe ser el dominio público.')

// Instagram
for (const k of ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_REDIRECT_URI']) check(has(k), `${k} definida`, `${k} falta.`)
if (has('INSTAGRAM_REDIRECT_URI') && appUrl) {
  check(env.INSTAGRAM_REDIRECT_URI === `${appUrl}/api/auth/instagram/callback`, 'INSTAGRAM_REDIRECT_URI coincide con APP_URL',
    `INSTAGRAM_REDIRECT_URI debe ser ${appUrl}/api/auth/instagram/callback (y estar igual en el panel de Meta).`)
}

// YouTube
for (const k of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI']) check(has(k), `${k} definida`, `${k} falta.`)
if (has('YOUTUBE_REDIRECT_URI') && appUrl) {
  check(env.YOUTUBE_REDIRECT_URI === `${appUrl}/api/auth/youtube/callback`, 'YOUTUBE_REDIRECT_URI coincide con APP_URL',
    `YOUTUBE_REDIRECT_URI debe ser ${appUrl}/api/auth/youtube/callback (y estar igual en Google Cloud).`)
}

// Cifrado de tokens
if (!has('SOCIAL_TOKEN_ENCRYPTION_KEY')) problems.push('SOCIAL_TOKEN_ENCRYPTION_KEY falta (32 bytes en base64). Cambiarla después deja las cuentas conectadas ilegibles.')
else check(Buffer.from(env.SOCIAL_TOKEN_ENCRYPTION_KEY, 'base64').length === 32, 'SOCIAL_TOKEN_ENCRYPTION_KEY decodifica a 32 bytes', 'SOCIAL_TOKEN_ENCRYPTION_KEY debe decodificar a 32 bytes en base64.')

// Sincronización programada
if (!has('SYNC_CRON_SECRET')) problems.push('SYNC_CRON_SECRET falta: /api/social/sync-all responderá 503 y las métricas no se actualizarán solas.')
else check(env.SYNC_CRON_SECRET.length >= 32, 'SYNC_CRON_SECRET tiene longitud suficiente', 'SYNC_CRON_SECRET es corto: usa 32 bytes aleatorios en base64.')

check(has('SUPABASE_SERVICE_ROLE_KEY'), 'SUPABASE_SERVICE_ROLE_KEY definida', 'SUPABASE_SERVICE_ROLE_KEY falta: el servidor no puede guardar tokens ni métricas.')

console.log('\nConfiguración de redes sociales\n')
for (const m of ok) console.log(`  OK     ${m}`)
for (const m of warnings) console.log(`  AVISO  ${m}`)
for (const m of problems) console.log(`  ERROR  ${m}`)

if (appUrl) {
  console.log('\nQué poner en los paneles de los proveedores (copiar tal cual):')
  console.log('  Meta (Instagram API with Instagram login):')
  console.log(`    URI de redirección OAuth ....... ${appUrl}/api/auth/instagram/callback`)
  console.log(`    URL de desautorización ......... ${appUrl}/api/auth/instagram/deauthorize`)
  console.log(`    URL de eliminación de datos .... ${appUrl}/api/auth/instagram/data-deletion`)
  console.log(`    URL de política de privacidad .. ${appUrl}/privacidad`)
  console.log(`    URL de términos ................ ${appUrl}/terminos`)
  console.log('  Google Cloud (OAuth client, aplicación web):')
  console.log(`    URI de redirección autorizada .. ${appUrl}/api/auth/youtube/callback`)
}

console.log(problems.length ? `\n${problems.length} error(es). Corrígelos antes de desplegar.\n` : '\nTodo correcto.\n')
process.exit(problems.length ? 1 : 0)
