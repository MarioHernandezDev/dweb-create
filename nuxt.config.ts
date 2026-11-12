import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/image', '@nuxt/fonts', '@nuxt/icon/module', '@pinia/nuxt', '@nuxtjs/supabase', '@sentry/nuxt/module'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  components: [{ path: '~/components', pathPrefix: false }],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['gsap', 'gsap/ScrollTrigger']
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/img/brand/icon-32.png' },
        { rel: 'apple-touch-icon', href: '/img/brand/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ],
      meta: [
        // CIBERAN es de modo único claro: no hay toggle de tema ni script
        // anti-parpadeo que sincronizar, el color de la barra del navegador
        // es siempre este.
        { name: 'theme-color', content: '#121019' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ]
    }
  },

  fonts: {
    families: [
      // Sistema «Señal» (docs/design/01_DESIGN_SYSTEM.md): Hanken Grotesk para
      // leer y Bricolage Grotesque para títulos, cifras y el logotipo.
      { name: 'Hanken Grotesk', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Bricolage Grotesque', provider: 'google', weights: [500, 600, 700, 800] }
    ]
  },

  icon: {
    mode: 'svg',
    class: 'nx-icon'
  },

  image: {
    quality: 78,
    format: ['webp'],
    // Las portadas subidas a Supabase Storage (y las de demo, de varios MB) se
    // sirven redimensionadas y en webp por el optimizador de la propia app
    // (IPX): hay que permitir ese dominio. La caché larga es segura porque la
    // URL de cada portada lleva `?v=` y cambia al subir otra.
    domains: [process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : 'placeholder.supabase.co'],
    // La caché del resultado se define en `routeRules['/_ipx/**']` (más abajo).
    // Las fotos de portada de la landing vienen de Unsplash: usamos su provider dedicado
    // (prop `provider="unsplash"` en cada NuxtImg) para que construya la URL
    // optimizada directamente contra su CDN, sin reprocesarlas en nuestro servidor.
    unsplash: {
      baseURL: 'https://images.unsplash.com/'
    }
  },

  // La página Redes (/creator/socials) se eliminó: sus funciones viven en Métricas > Conexiones. Se conserva el enlace antiguo (marcadores, correos).
  // Rendimiento: antes cada enlace visible precargaba el código de su página (62+ scripts por pantalla, también
  // los de páginas que casi nadie abre). Ahora se precarga al pasar el ratón / enfocar / tocar el enlace.
  experimental: {
    defaults: {
      nuxtLink: { prefetchOn: { visibility: false, interaction: true } }
    }
  },
  // Los estáticos se sirven ya comprimidos (gzip y brotli) si no hay un CDN delante.
  nitro: {
    compressPublicAssets: true,
    // Código aparcado (ver docs/17-METRICAS-REDES-PROXIMAMENTE.md): no se compila, tampoco en el typecheck.
    typescript: { tsConfig: { exclude: ['../server/_disabled/**'] } }
  },

  typescript: { tsConfig: { exclude: ['../app/_disabled/**', '../tests/_disabled/**'] } },

  routeRules: {
    '/creator/socials': { redirect: { to: '/creator/metrics', statusCode: 302 } },
    // Imágenes optimizadas de la landing (IPX): el navegador las conserva un año.
    // Las portadas y avatares de usuarios van por /api/img (ver server/api/img.get.ts),
    // que además cachea el resultado en el servidor.
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // Código y fuentes con hash en el nombre: nunca cambian, el navegador no tiene que revalidarlos.
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // Imágenes y marca de /public: una semana, y se sirven mientras revalida si caduca.
    '/img/**': { headers: { 'cache-control': 'public, max-age=604800, stale-while-revalidate=86400' } }
  },

  runtimeConfig: {
    // Privado: solo visible en el servidor (rutas de server/api), nunca en
    // el bundle del cliente — por eso no llevan prefijo NUXT_PUBLIC_.
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    // Las sugerencias de IA se piden desde /api/ml/predict, nunca desde el
    // navegador — ver docs/8-AI-SUGGESTIONS-SETUP.md.
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    // El catálogo gratuito de OpenRouter rota — ya van dos modelos por
    // defecto que han dejado de responder (404 primero
    // `meta-llama/llama-3.3-70b-instruct:free`, luego 404 "Function not
    // found" en `nvidia/nemotron-3-super-120b-a12b:free`, aunque seguía
    // listado en el catálogo). Ver docs/CHANGELOG.md.
    openrouterModel: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free',
    // OAuth real de Instagram (Fase 4) — ver docs/9-INSTAGRAM-OAUTH-SETUP.md.
    // Los 3 son necesarios para que "Conectar" en Redes funcione de verdad;
    // sin ellos, server/api/auth/instagram/start.get.ts devuelve un 500 claro
    // en vez de dejar que el usuario entre a un flujo roto.
    instagramAppId: process.env.INSTAGRAM_APP_ID,
    instagramAppSecret: process.env.INSTAGRAM_APP_SECRET,
    instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI,
    // OAuth real de YouTube (Fase 4) — ver docs/10-YOUTUBE-OAUTH-SETUP.md.
    // Mismo criterio que Instagram: sin estos 3, "Conectar" en YouTube da un
    // 500 claro en vez de un flujo roto.
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI,
    // Clave simétrica (32 bytes en base64) para cifrar los tokens de redes
    // sociales en `social_accounts` y para firmar el `state` del OAuth. Ver
    // docs/9-INSTAGRAM-OAUTH-SETUP.md para cómo generarla. Compartida entre
    // todas las plataformas — no una por red.
    socialTokenEncryptionKey: process.env.SOCIAL_TOKEN_ENCRYPTION_KEY,
    // Secreto compartido con quien lance la sincronización programada
    // (POST /api/social/sync-all, Authorization: Bearer ...). Sin él, ese
    // endpoint responde 503 y no hace nada. Ver docs/PROPUESTA_A-R5_SYNC_ENDPOINT.md.
    syncCronSecret: process.env.SYNC_CRON_SECRET,
    // URL base de la app (p. ej. http://localhost:3000). Los callbacks de OAuth
    // devuelven al usuario aquí. Hace falta en desarrollo cuando el callback
    // llega por un túnel HTTPS (Meta no acepta http://localhost) para no
    // quedarse en el dominio del túnel, donde no hay sesión. Opcional.
    appUrl: process.env.APP_URL,
    // Correo saliente por SMTP propio (server/utils/mailer.ts, docs/16-EMAIL-SMTP.md).
    // Sin SMTP_HOST/USER/PASS el correo queda apagado y la app funciona igual.
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFromEmail: process.env.SMTP_FROM_EMAIL,
    smtpFromName: process.env.SMTP_FROM_NAME,
    // Panel de admin (/admin) — contraseña única compartida por el equipo,
    // sin cuenta de Supabase de por medio a propósito (ver
    // server/utils/admin-session.ts). `adminSessionSecret` solo cifra la
    // cookie de sesión, nunca se compara con nada que escriba un humano.
    adminPassword: process.env.ADMIN_PASSWORD,
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET,
    public: {
      // Pública a propósito: la usa el navegador para cargar Stripe.js antes
      // del Checkout. Nunca pongas aquí ninguna de las claves de arriba.
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      // El DSN de Sentry es público por diseño (va en el navegador). Vacío = desactivado.
      sentryDsn: process.env.SENTRY_DSN,
      appEnv: process.env.APP_ENV,
      // «Continuar con Google» en /login. Apagado hasta configurar el proveedor en Supabase
      // (docs/13-INTEGRACIONES-PENDIENTES.md): sin eso el botón llevaría a un error.
      googleAuthEnabled: process.env.GOOGLE_AUTH_ENABLED === 'true',
      // Cobros (Pro, pago de colaboraciones, comisión, cuenta de cobro). APAGADO por defecto:
      // lanzamiento gratis. Con esto apagado la interfaz no enseña nada de pago y los
      // endpoints de Stripe responden 403 (server/utils/payments-gate.ts). Solo 'true' lo enciende.
      paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
      // «Predicción de éxito» (IA). APAGADA por defecto en el lanzamiento gratis: no se enseña
      // y /api/ml/predict responde 403, así no gasta llamadas de IA. El código se conserva.
      predictionsEnabled: process.env.PREDICTIONS_ENABLED === 'true'
    }
  },

  supabase: {
    // El módulo por defecto lee SUPABASE_URL/SUPABASE_KEY; nuestro .env usa
    // SUPABASE_ANON_KEY (así quedó documentado en docs/6-SUPABASE-SETUP.md),
    // así que lo mapeamos explícitamente en vez de renombrar el .env de nadie.
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    // Sin tipos generados todavía (eso es `supabase gen types`, más adelante).
    types: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // Páginas públicas: todo lo demás exige sesión iniciada. /profile/* es la
      // ficha compartible: sin sesión enseña solo lo público (ver
      // server/api/public/profile), con sesión la ficha completa. /admin/* no
      // usa cuentas de Supabase en absoluto (ver server/utils/admin-
      // session.ts) — sin esto, este módulo las mandaría a /login antes de
      // que nuestra propia comprobación de contraseña entrara en juego.
      exclude: ['/', '/onboarding', '/forgot-password', '/reset-password', '/instalaciones', '/privacidad', '/terminos', '/admin', '/admin/*', '/profile/*']
    }
  }
})
