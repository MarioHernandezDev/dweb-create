import * as Sentry from '@sentry/nuxt'

// Sin SENTRY_DSN no se envía nada (el SDK queda inerte). Plan gratuito: ~5.000
// errores/mes, así que solo errores (sin trazas ni replays) y sin datos personales.
const dsn = useRuntimeConfig().public.sentryDsn as string | undefined

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: (useRuntimeConfig().public.appEnv as string) || 'development',
  // @ts-expect-error opción válida en runtime; falta en los tipos de esta versión
  sendDefaultPii: false,
  tracesSampleRate: 0
})
