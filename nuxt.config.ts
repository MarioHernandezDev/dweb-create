import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/image', '@nuxt/fonts', '@nuxt/icon/module', '@pinia/nuxt'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  components: [{ path: '~/components', pathPrefix: false }],

  vite: {
    plugins: [tailwindcss()]
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
  }
})
