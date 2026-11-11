# 15 · Cierre para lanzamiento gratuito

Estado a 2026-11-11. Sin push, sin cobros, sin tocar recursos externos.

## Interruptores (todos apagados por defecto; solo `'true'` enciende)
`PAYMENTS_ENABLED`, `PREDICTIONS_ENABLED`, `GOOGLE_AUTH_ENABLED`. Con pagos apagados, los endpoints Stripe devuelven 403 (`assertPaymentsEnabled`). Predicciones: UI oculta y `/api/ml/predict` devuelve 403; el código se conserva.

## Verificado
- `nuxt build` de producción OK (en la VM hay que quitar `@nuxt/fonts` y stubear PNG de marca por falta de red; no afecta al repo).
- 776 tests pasan; vue-tsc limpio.
- Las 62 migraciones se reproducen desde cero en Postgres local con shim Supabase (`scripts/staging-bootstrap.mjs` las aplica en orden en staging).
- RLS: usuario solo ve lo suyo; anon sin filas en tablas sensibles.
- Métricas propias (`/creator/insights`, `/partner/insights`, pestaña Colaboraciones en admin): comprobadas con datos reales (13 iniciadas, 33 % éxito = 1/(1+1+1) en el ámbito de esa marca).

## Advisors de seguridad (producción, solo lectura)
- `current_creator_id()` / `current_partner_id()` ejecutables por anon: devuelven null sin sesión; riesgo bajo. Recomendado `revoke execute ... from anon` (migración a aplicar primero en staging).
- Funciones `get_public_*` y RPC de colaboración ejecutables por `authenticated`: es el diseño (validan `auth.uid()` dentro). 
- `discovery_searches`: RLS sin policies = acceso denegado a todos; correcto.
- Protección de contraseñas filtradas desactivada: es ajuste de panel Supabase (plan Pro). Decisión de Alex.

## Paso a producción (cuando se decida)
1. Staging: proyecto Supabase nuevo → `node scripts/staging-bootstrap.mjs` → pruebas.
2. Producción: aplicar solo migraciones nuevas 20261112100000/110000/120000 con copia previa.
3. Variables de entorno con interruptores apagados; desplegar.

## Copias y restauración
Plan free: sin backups automáticos descargables ni PITR. Antes de migrar producción: `pg_dump` manual del esquema `public` y export de Storage. PITR/backups diarios requieren plan Pro (coste: decisión de Alex).

## Limpieza de datos ficticios
Ver docs/14. Borrar solo perfiles marcados como semilla, en staging primero; nunca por patrón de email sin revisar la lista.

## Falta (email, legal, dominio, despliegue)
- Email transaccional: SMTP propio (el de Supabase por defecto tiene límite bajo).
- Legal: términos y privacidad revisados por un profesional; titular/CIF en el aviso legal.
- Dominio y hosting elegidos; `site URL` y redirects de auth actualizados.
- Sentry: DSN opcional.
