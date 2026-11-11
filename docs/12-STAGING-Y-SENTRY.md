# Staging, Sentry y puerta de migraciones

*Preparado 2026-11-06. Nada de esto está contratado ni aplicado en producción.*

## 1. Staging (segundo proyecto de Supabase)
Coste: el plan gratuito permite 2 proyectos activos por organización (se pausan tras 1 semana sin actividad). Si la organización ya tiene 2 proyectos o está en Pro, un proyecto extra son ≈10 $/mes de cómputo (en Pro, con 10 $ de crédito que cubre una instancia Micro). **Hay que mirar en el panel cuántos proyectos hay hoy antes de crearlo.**

Pasos (cuando se autorice):
1. Crear el proyecto `ciberan-staging` en el panel de Supabase (misma región).
2. Crear `.env.staging` (no se sube a git) con `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `APP_ENV=staging`.
3. Aplicar **todas** las migraciones en orden: `node --env-file=.env.staging scripts/apply-pending-migrations.mjs <archivos…>` (empezar por `20261020*`; la duplicada `20261021160000` se aplica con sus dos archivos).
4. Sembrar datos: `node --env-file=.env.staging scripts/seed-demo-users.mjs`.
5. Pruebas: `npx vitest run --config vitest.integration.config.ts` con las variables de staging cargadas.
6. Solo si todo está en verde: pasar a producción.

## 2. Puerta antes de producción (las 5 + bucket)
Migraciones: `20261105100000`, `110000`, `120000`, `130000`, `140000` y `20261106100000_post_media_bucket_hardening`. Condiciones, todas obligatorias:
- [ ] Pasadas en staging + integración en verde.
- [ ] Copia reciente de producción **y** restauración de prueba (panel → Database → Backups; PITR es de pago).
- [ ] Confirmado que nadie más empuja a `main`.
- [ ] Autorización expresa.

## 3. Sentry
Plan Developer gratuito (≈5.000 errores/mes, 1 usuario). Ya cableado en `sentry.client.config.ts` / `sentry.server.config.ts` y `nuxt.config.ts`; **sin `SENTRY_DSN` está inerte**. Sin trazas, sin replays, sin datos personales. Para activarlo: crear cuenta y proyecto «Nuxt» en sentry.io y poner `SENTRY_DSN` y `APP_ENV` en el entorno. Prueba: provocar un error y comprobar que llega.
