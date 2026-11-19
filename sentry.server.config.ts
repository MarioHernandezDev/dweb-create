import * as Sentry from '@sentry/nuxt'

const dsn = process.env.SENTRY_DSN

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.APP_ENV || 'development',
  // @ts-expect-error opción válida en runtime; falta en los tipos de esta versión
  sendDefaultPii: false,
  tracesSampleRate: 0
})
