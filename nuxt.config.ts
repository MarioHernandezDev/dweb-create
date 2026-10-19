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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ],
      meta: [
        { name: 'theme-color', content: '#15161C' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      script: [
        {
          // Evita el parpadeo de tema: aplica el modo guardado antes del primer pintado.
          innerHTML:
            "(function(){try{var t=localStorage.getItem('dwc-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();",
          tagPosition: 'head'
        }
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
