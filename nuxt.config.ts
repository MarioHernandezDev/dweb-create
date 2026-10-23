import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/image', '@nuxt/fonts', '@nuxt/icon/module', '@pinia/nuxt', '@nuxtjs/supabase'],
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
        { rel: 'icon', type: 'image/png', href: '/img/logo-svg.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ],
      meta: [
        // FEEDMA es de modo único claro: no hay toggle de tema ni script
        // anti-parpadeo que sincronizar, el color de la barra del navegador
        // es siempre este.
        { name: 'theme-color', content: '#fbfaff' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ]
    }
  },

  fonts: {
    families: [
      { name: 'Hanken Grotesk', provider: 'google', weights: [400, 500, 600, 700, 800] },
      // Sora: fuente de los títulos (h1/h2 y el resto de texto en "modo
      // display") desde la Fase 3 de la auditoría de usabilidad — Snasm
      // quedaba demasiado ancha para títulos largos y se reserva ahora solo
      // para el logotipo ("FEEDMA" como marca, ver --font-brand en main.css).
      { name: 'Sora', provider: 'google', weights: [400, 500, 600, 700] },
      // Snasm es una fuente local del equipo (ver app/assets/fonts) — @font-face manual en main.css.
      { name: 'Snasm', provider: 'none' }
    ]
  },

  icon: {
    mode: 'svg',
    class: 'nx-icon'
  },

  image: {
    quality: 85,
    format: ['webp'],
    // Las fotos de portada vienen de Unsplash: usamos su provider dedicado
    // (prop `provider="unsplash"` en cada NuxtImg) para que construya la URL
    // optimizada directamente contra su CDN, sin reprocesarlas en nuestro servidor.
    unsplash: {
      baseURL: 'https://images.unsplash.com/'
    }
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
    // Panel de admin (/admin) — contraseña única compartida por el equipo,
    // sin cuenta de Supabase de por medio a propósito (ver
    // server/utils/admin-session.ts). `adminSessionSecret` solo cifra la
    // cookie de sesión, nunca se compara con nada que escriba un humano.
    adminPassword: process.env.ADMIN_PASSWORD,
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET,
    public: {
      // Pública a propósito: la usa el navegador para cargar Stripe.js antes
      // del Checkout. Nunca pongas aquí ninguna de las claves de arriba.
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
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
      // Páginas públicas: todo lo demás exige sesión iniciada. /admin/* no
      // usa cuentas de Supabase en absoluto (ver server/utils/admin-
      // session.ts) — sin esto, este módulo las mandaría a /login antes de
      // que nuestra propia comprobación de contraseña entrara en juego.
      exclude: ['/', '/onboarding', '/instalaciones', '/admin', '/admin/*']
    }
  }
})
