# Staging, Sentry y puerta de migraciones

*Preparado 2026-11-06. Nada de esto está contratado ni aplicado en producción.*

## 1. Staging (segundo proyecto de Supabase)
Coste: el plan gratuito permite 2 proyectos activos por organización (se pausan tras 1 semana sin actividad). Si la organización ya tiene 2 proyectos o está en Pro, un proyecto extra son ≈10 $/mes de cómputo (en Pro, con 10 $ de crédito que cubre una instancia Micro). **Hay que mirar en el panel cuántos proyectos hay hoy antes de crearlo.**

Pasos (cuando se autorice; actualizado 2026-11-11):
1. Crear el proyecto `ciberan-staging` en el panel de Supabase (misma región). **Es lo único que no está hecho: implica una decisión de coste.**
2. Crear `.env.staging` (no se sube a git: `.env.*` está en `.gitignore`) con:
   ```
   APP_ENV=staging
   SUPABASE_URL=https://<ref-staging>.supabase.co
   SUPABASE_ANON_KEY=…
   SUPABASE_SERVICE_ROLE_KEY=…
   SUPABASE_DB_URL=postgresql://postgres:<contraseña>@db.<ref-staging>.supabase.co:5432/postgres
   PAYMENTS_ENABLED=
   SOCIAL_TOKEN_ENCRYPTION_KEY=<una clave nueva, distinta de la de producción>
   ADMIN_PASSWORD=<otra distinta>
   ```
3. Aplicar **todas** las migraciones en orden con el script preparado:
   `node --env-file=.env.staging scripts/staging-bootstrap.mjs --confirm=<ref-staging>`
   (`--dry-run` solo las lista). El script se niega a correr si `APP_ENV` no es `staging`, si la URL apunta al proyecto compartido o si el `--confirm` no coincide con la URL. Se puede relanzar: sigue por donde se quedó.
   **Aviso:** la cadena completa de migraciones nunca se ha reproducido desde cero (la base compartida se montó a mano y por partes). La primera ejecución en staging es la prueba: si alguna migración antigua falla por orden o dependencias, se corrige ahí, no en producción.
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
