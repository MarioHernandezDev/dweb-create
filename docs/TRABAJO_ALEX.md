# TRABAJO_ALEX — rama `feature/publicaciones-ux`

> Actualizado el 2026-10-28. Este documento es **solo lo que hace Alex**: todo lo que necesitas está aquí, sin tener que leer el de la otra persona. Sustituye al antiguo `PLAN_TRABAJO_PARALELO.md` (ya borrado). Reparto aprobado el 2026-10-28; **ninguna tarea está implementada todavía.**
>
> Nomenclatura: tareas de Alex = `A-…`, tareas de Mario = `M-…`. Prioridad 1–7: 1 seguridad/datos/pagos · 2 errores en flujos principales · 3 integraciones esenciales · 4 coherencia de estados/notificaciones · 5 usabilidad · 6 onboarding · 7 visual. Complejidad B/M/A = baja/media/alta. "BD" = migración/RPC/RLS.
> Todo se ha inventariado leyendo código y documentación; **no se ejecutaron tests, build ni navegador** al hacerlo, así que "implementado" significa "hay código", no "está verificado".
## 1. Objetivo general

Hacer que FEEDMA mida de verdad: (a) conexiones con redes sociales fiables, con tokens que se refrescan, métricas reales por publicación y cuentas que se pueden desconectar bien; (b) terminar la mejora de UX de las publicaciones.

## 2. Tareas asignadas — detalle
### Redes sociales (todas)

| ID | Tarea | Estado actual | Prio | Compl. | Depende de | BD | Criterio de terminado |
|---|---|---|---|---|---|---|---|
| A-R1 | Verificar de extremo a extremo la conexión OAuth de Instagram y YouTube (conectar, ver datos, reconectar) | YT: código + doc; el doc dice que el usuario lo conectó, **no verificado por mí**. IG: **bloqueado** (sin cuenta de Facebook/app de Meta) | 3 | M | Decisión Q5 | No | Conexión real de ambas redes con una cuenta de creador, vista en navegador; resultado en CHANGELOG |
| A-R2 | Ciclo de vida de tokens: refrescar el token de Instagram (dura ~60 días; hoy `token_expires_at` se guarda pero **nada lo refresca**), detectar token caducado/revocado en ambas redes y mostrar estado "Reconectar" en Redes/Métricas | **No implementado** (no estaba en PENDIENTES) | 3 | A | A-R1 (IG) | Probable: columnas `status`/`last_error`/`last_synced_at` en `social_accounts` | Un token caducado simulado produce estado "reconectar" visible, no un error genérico ni datos congelados |
| A-R3 | Desconexión completa: hoy "..." solo borra la fila, **no revoca el token en el proveedor**; pasar a endpoint de servidor que revoque (Google tiene revoke; Instagram: documentar la limitación) y confirme | Parcial (solo borra fila) | 3 | B–M | A-R2 | No (borrado ya permitido por RLS) | Tras desconectar, el token deja de ser válido en Google; la UI confirma antes |
| A-R4 | Endpoints de desautorización y borrado de datos que Meta exige para pasar de modo Desarrollo a público | **No implementado** | 3 | M | M-L1 (URL pública de privacidad), A-R1 | No (borra `social_accounts`) | Meta acepta la URL de borrado; borrar desde Meta elimina la fila y tokens |
| A-R5 | Sincronización programada (hoy solo botón manual "Actualizar") y `last_synced_at` | **No implementado**; no hay scheduler ni se sabe dónde se despliega | 3 | A | Decisión Q3 (hosting) | Posible columna (con A-R2) | Un job refresca todas las cuentas conectadas sin intervención, con límite de peticiones y registro de fallos |
| A-R6 | Métricas de Instagram: alcance e interacciones (insights) | El scope `instagram_business_manage_insights` ya se pide, pero el código **solo lee `followers_count`**; nombres de métricas "por verificar contra una app real" | 3 | A | A-R1, A-R8; posible App Review de Meta | Ver A-R8 | Datos reales de alcance/interacciones en pantalla, contrastados con la app de Instagram |
| A-R7 | Vincular cada publicación del Tablero con su contenido real (vídeo de YouTube / post de Instagram) y mostrar sus métricas | **No implementado**; `posts.platform` es solo texto, no apunta a una cuenta ni a un id externo | 3 | A | A-R8 | Sí: columna(s) en `posts` (p. ej. `social_account_id` + id/URL externo) o uso de `posts.metadata` — **decisión de esquema** | Una publicación ligada a un vídeo muestra sus vistas/likes reales |
| A-R8 | Definir y construir el pipeline que escribe en `metrics` (hoy la tabla existe y **nada escribe**): qué se guarda, histórico vs último valor, idempotencia, lectura segura por RLS | **No implementado** | 3 | A | Decisión de esquema | Sí: posible ajuste de `metrics` + RLS de lectura | Una sincronización escribe filas; el creador (y el partner de una colaboración, ver A-R15) puede leerlas, nadie más |
| A-R9 | Predicción de éxito basada en rendimiento real de publicaciones anteriores | Hoy: prompt a LLM + `ml-heuristic.ts`; PENDIENTES dice "solo heurística" — **revisar cuál es la lógica real antes de empezar** | 5 | A | A-R6/R7/R8 | No | La predicción usa histórico real cuando existe y lo dice en pantalla |
| A-R10 | TikTok, X, Facebook, LinkedIn: decidir entre OAuth real o retirar el "Conectar" falso (crea filas sin token que aparecen como "sin verificar") | Decisión pendiente | 2 | B (retirar) / A (implementar) | Decisión Q4 | Posible limpieza de filas sin token (criterio explícito antes de borrar) | La pantalla de Redes no ofrece conexiones que no sean reales |
| A-R11 | Que el navegador no pueda leer las columnas `access_token_encrypted`/`refresh_token_encrypted`: la policy `social_accounts_select_self` permite `select *` al dueño | Hallazgo nuevo (cifrado, riesgo bajo, pero innecesario) | 1 | B–M | — | **RLS/grants** (restringir columnas o vista) — requiere confirmación | `select access_token_encrypted` desde el navegador falla; Redes y perfil público siguen funcionando; test de integración |
| A-R12 | Redes ↔ perfiles: métricas verificadas en perfil público y en Descubrir (hoy RPC `get_public_social_accounts`; `discover/search` suma `followers_count`) | Parcial (seguidores) | 5 | M | A-R8 | Posible ajuste del RPC público | Un partner ve en el perfil de un creador cifras verificadas y su fecha |
| A-R13 | Tests de redes: no hay tests de `token-crypto`/`oauth-state` ni de RLS de `social_accounts` | **No existen** | 2 | B–M | — | No | Unit de cifrado/estado OAuth + integración de RLS; pasan |
| A-R14 | Actualizar `docs/9-…` y `docs/10-YOUTUBE-…` al estado final; corregir comentarios obsoletos | Parcial | 7 | B | Final de R1–R8 | No | Docs coinciden con el código |
| A-R15 | Informe de resultados de una colaboración para el partner (rendimiento de las publicaciones entregadas) | **Nueva, no documentada** | 5 | M–A | A-R7, A-R8 | Lectura RLS (con A-R8) | El partner de una colaboración ve el rendimiento de sus entregas |
### Publicaciones

| ID | Tarea | Estado | Prio | Compl. | Depende de | BD | Criterio |
|---|---|---|---|---|---|---|---|
| A-P1 | Segunda vuelta de UX de publicaciones (backlog del README anterior) | Primer pase hecho y verificado (CHANGELOG 49–52) | 5 | M | — | No | Criterios del README; verificado en navegador 390px y escritorio |
| A-P2 | Hacer de la aprobación del partner una puerta real (hoy el creador puede saltarse "Para revisar" con aviso) | Decisión pendiente | 4 | M–A | Q6 | **RLS/RPC sobre `posts`** | Decisión tomada; si sí: bloqueo en servidor + test de integración |
## 3. Orden recomendado

1. **Fase 0**: resolver Q3, Q4, Q5, Q6, Q8; hacer `git merge main` en la rama.
2. **Fase 1** (no dependen del compañero ni de Meta): A-R2 → A-R13 → A-R10 → A-R11 (tras confirmación) → A-P1.
3. **Fase 2**: A-R3 · A-R8 → A-R7 · A-R1 si ya hay cuenta de Meta · A-R4 cuando el compañero haya publicado las páginas de privacidad (M-L1).
4. **Fase 3**: A-R6 · A-R5 (necesita Q3) · A-R9 · A-R12 · A-R15 · A-P2 · A-R14 al final.

## 4. Dependencias

- A-R2 → A-R3, A-R5 · A-R8 → A-R6, A-R7 → A-R9, A-R12, A-R15.
- **Con la otra rama**: M-L1 (privacidad/términos públicos) → A-R4. M-L2 (borrar cuenta) debe eliminar `social_accounts`/tokens: coordinar con A-R3. M-S1 es dueño de `server/utils/rate-limit.ts`, que A-R5/A-R2 usarán.
- Externas: A-R1, A-R4, A-R6 dependen de la app de Meta (cuenta de Facebook, posible App Review).

## 5. Archivos que puede modificar

**Propios (libertad):**
- Redes: `server/api/auth/{instagram,youtube}/**`, `server/api/social/**`, `server/utils/{token-crypto,oauth-state,youtube,account-identity}.ts`, `app/pages/creator/socials.vue`, `app/pages/creator/metrics/**`, `app/composables/useMySocialAccounts.ts`, `app/components/social/**` y `PlatformStatCard`, `docs/9-INSTAGRAM-OAUTH-SETUP.md`, `docs/10-YOUTUBE-OAUTH-SETUP.md`.
- Publicaciones: `app/pages/creator/timeline.vue`, `app/pages/creator/post/[id].vue`, `app/components/timeline/**`, `useMyPosts`, `usePartnerPosts`, `usePostRevisions`, `useChecklist`, `useLabels`, `usePostEditorPanel`.
- Pruebas: `tests/integration/` y `tests/unit/` relacionados con lo anterior.

## 6. Archivos compartidos que requieren coordinación

Ver también las secciones 6 y 11. Los que más te afectan:
- `app/pages/creator/index.vue` y `partner/index.vue` (tus bloques de redes y entregas; el tour del compañero se ancla en `AppShell.vue`, no ahí).
- `app/pages/creator/profile.vue`: normalmente no necesitas tocarlo (facturación y ficha son del compañero).
- `app/pages/partner/requests.vue` y `creator/requests.vue` (solo tu pestaña Calendario; el botón de pago y el resto del detalle son del compañero).
- `app/types/index.ts`, `app/utils/status.ts`, `nav.ts`, `mock-data.ts` (`platformMeta` y `VERIFIED_SOCIAL_PLATFORMS` son tuyos; solo añadir al final de tu bloque).
- `nuxt.config.ts` / `.env.example` (variables de redes: añadir líneas, **nunca valores reales**), `docs/CHANGELOG.md` (título con prefijo `[Alex]`), `package.json`.
- Server: `server/api/discover/search.post.ts` suma `followers_count` de `social_accounts` — si cambias esa tabla, avisa al compañero (M-U1).

## 7. Cambios de Supabase que podrían hacer falta

Todos requieren explicar el impacto y confirmar **antes** de escribir la migración (zonas protegidas), y deben ser aditivos (ver sección 11):

| Tarea | Cambio previsto |
|---|---|
| A-R2 / A-R5 | columnas de estado, último error y último sync en `social_accounts` |
| A-R7 / A-R8 | columna(s) en `posts` (cuenta + id/URL externo) o uso de `posts.metadata`; ajuste de `metrics` y su RLS de lectura |
| A-R11 | restringir la lectura de `access_token_encrypted`/`refresh_token_encrypted` (grants por columna o vista) — cambia una policy existente |
| A-R4 | endpoint que borra datos; sin cambio de esquema |
| A-R12 | posible ajuste de `get_public_social_accounts` (RPC existente) |
| A-P2 | RLS/RPC sobre `posts` |

Recordatorio: el proyecto de Supabase es **único y compartido**; una migración aplicada desde esta rama afecta ya a la otra. Registra aquí (al final de este archivo, sección "Registro de migraciones") cada migración que apliques: fecha, archivo, qué cambia, quién la aprobó.

## 8. Pruebas y criterios de aceptación

Comandos reales: `npm run typecheck` (`vue-tsc -b --noEmit`; el antiguo `npx vue-tsc --noEmit` no revisaba nada, ver docs/audit/07) · `npm test -- --run` · `npm run build` · `npm run test:integration` (solo si tocas datos/RLS/RPC; mesura el límite de autenticación compartido).

Criterios de cada tarea: ver la tabla de la sección 2. Criterios transversales (sección 12): typecheck/tests/build limpios; interfaz vista en navegador real a 390px y escritorio; entrada en `docs/CHANGELOG.md` con "Qué se cambió / Verificado de verdad / Sin verificar"; no declarar nada verificado sin haberlo probado.

Específicos de esta rama:
- Redes: no pegar tokens, secretos ni `.env` en commits, issues ni documentos.
- Cuentas demo compartidas (`creator@feedma.test`, `partner@feedma.test`): limpiar lo que crees en las pruebas, con criterio explícito.

## 9. Fuera de tu responsabilidad

Stripe y pagos (suscripción, Connect, política de cobro, packs recurrentes), onboarding/tour, legal y RGPD, rate limiting general, panel de admin, CI/CD, verificación con clics de los flujos de colaboración y oferta, acceso cruzado entre roles, notificaciones, estados de chat, descubrimiento (salvo el dato de seguidores), perfil/fotos, accesibilidad y backups. Son de `feature/onboarding` (ver su README y la matriz del plan).

## 10. Integración y prevención de conflictos

1. `git fetch origin` y `git merge main` en la rama antes de cada sesión; resolver conflictos leyendo ambos lados.
2. Commits pequeños, `git add` de archivos concretos, nunca `git add -A` a ciegas ni secretos.
3. Avisar al compañero antes de: tocar un archivo de la sección 6, aplicar cualquier migración/RPC/policy, añadir dependencias, o lanzar `test:integration` justo antes de que él pruebe login.
4. Prohibido: `git push --force`, `git reset --hard`, `git clean -fd` y fusionar esta rama con `feature/onboarding`.
5. Cuando una tarea cumpla sus criterios: PR hacia `main` (o desde la subrama de tarea hacia `main`). Tras fusionar la primera de las dos ramas, la otra hace `git merge main` y re-verifica los archivos compartidos.
6. Comandos útiles: `git branch --show-current` · `git diff main...feature/publicaciones-ux --stat` · `git log main..feature/publicaciones-ux --oneline`.

## 11. Reglas de Supabase compartidas con Mario


Reglas propuestas (acordarlas en la Fase 0):
1. **Solo migraciones aditivas** mientras haya dos ramas activas (añadir tablas/columnas nullable o con default). Nada de renombrar, borrar columnas ni endurecer RLS de forma que rompa el código de la otra rama; si hace falta, hacerlo en dos pasos (añadir → migrar código → retirar) con aviso.
2. **Avisar antes de aplicar** cualquier migración, RPC o policy: qué cambia, qué tablas toca, qué código de la otra rama podría verse afectado. Respuesta del otro antes de aplicar.
3. **Un solo ejecutor por migración y un registro** en la sección "Registro de migraciones" del final de este documento (cada uno anota las suyas en su propio archivo, para no provocar conflictos).
4. Nombres de migración con marca de tiempo única; si dos coinciden, la segunda se renombra antes de fusionar (ya ocurrió: hay dos `20261021160000_*`).
5. **Las zonas protegidas** (Stripe, RLS, esquema, OAuth, RPCs de seguridad como `accept_collaboration_request`, `respond_offer`, `approve_post`) requieren explicar el impacto y recibir confirmación antes de tocar, igual que hasta ahora.
6. Tests de integración y cuentas demo: se escriben datos reales en el mismo proyecto y el límite de autenticación es compartido. Ejecutar `npm run test:integration` con moderación, y **avisar** si se va a lanzar justo antes de que el otro pruebe login. Limpiar residuos de prueba con criterio explícito.
7. `types: false`: los tipos de Supabase se escriben a mano; si se cambian columnas, actualizar el composable correspondiente en la misma rama.

## 12. Criterios de finalización (valen para toda tarea)

1. `npm run typecheck`, `npm test -- --run` y `npm run build` limpios.
2. `npm run test:integration` si se tocaron datos/RLS/RPC (respetando el límite de autenticación).
3. Cambios de interfaz **vistos en un navegador real** (390px y escritorio) con cuenta demo o cuenta nueva según el caso. Que compile no basta.
4. Entrada en `docs/CHANGELOG.md` con "Qué se cambió / Verificado de verdad / Sin verificar".
5. Si hay migración: documentada, aprobada por el otro y registrada antes de aplicarse.
6. Integración: PR hacia `main`; antes, `git merge main` en la rama y repetir 1–3 tras resolver conflictos. Tras fusionar la primera rama, la segunda se actualiza con `main` y se re-verifican los flujos de los archivos compartidos de la sección 6. No se fusionan las dos ramas entre sí.
7. Una tarea no pasa a "hecha" por existir código: debe constar qué se probó y cómo.

## 13. Decisiones pendientes que te afectan

| # | Pregunta | Bloquea | Mi recomendación |
|---|---|---|---|
| Q3 | ¿Dónde se despliega y qué scheduler hay (cron del host, Supabase pg_cron, GitHub Actions)? | A-R5, M-S1 | Decidir antes de diseñar sync; sin respuesta, A-R5 queda en espera |
| Q4 | TikTok/X/Facebook/LinkedIn: ¿OAuth real o retirar el "Conectar" falso? | A-R10 | Retirar ahora (Instagram/YouTube solo); reabrir cuando haya demanda |
| Q5 | ¿Hay ya cuenta de Facebook/app de Meta disponible? | A-R1, A-R4, A-R6 | Si no, tratar Instagram como bloqueado y avanzar el resto |
| Q6 | ¿La aprobación del partner debe ser un bloqueo real (cambio de RLS)? | A-P2 | No por ahora; mantener el aviso |
| Q8 | Estrategia de ramas: ¿trabajar en las ramas actuales o crear subramas por tarea (`feature/redes-*`, `feature/pagos-*`)? El nombre `feature/publicaciones-ux` ya no refleja su alcance | Todo | Subramas cortas por tarea, creadas desde la rama actual; PR a `main` |
| Q11 | ¿Aceptáis el reparto o se mueve algo para equilibrar (p. ej. mover A-P1 a otra persona o dejar M-D5 fuera)? | — | Mantenerlo; revisar tras la Fase 1 |
## 14. Relación con `docs/PENDIENTES.md`

| Punto de PENDIENTES | Estado según el código | Tarea |
|---|---|---|
| §2 Métricas solo seguidores | Confirmado (`creator/metrics/index.vue`). **Añadido:** la tabla `metrics` nunca se escribe | A-R6/R7/R8 |
| §2 "Predicción basada en heurística" | **Por revisar**: `predict.post.ts` construye un prompt para un LLM además de `ml-heuristic.ts` | A-R9 |
| §3 OAuth Instagram/YouTube de extremo a extremo | Pendiente de verificar; IG bloqueado | A-R1 |
| §7 Aprobación no es puerta real | Decisión pendiente | A-P2 |
| §7 Onboarding / publicaciones segunda vuelta | Pendiente | M-O1 / A-P1 |
Otras discrepancias detectadas (no están en PENDIENTES):

- Doc 9 y el comentario de `useMySocialAccounts.ts` describen el estado de YouTube de forma inconsistente (uno dice "sin OAuth todavía").
- Nada en PENDIENTES cubre: refresco de tokens de Instagram, revocación al desconectar, callbacks de Meta, tabla `metrics` sin uso, filas falsas de TikTok/X, lectura de columnas de tokens por el navegador.
## 15. Qué hace la otra persona

Mario lleva Stripe y pagos, legal/RGPD, seguridad transversal (límites de uso, admin, acceso entre roles), verificación con clics, CI, notificaciones y chat, descubrimiento, perfil, accesibilidad y el onboarding. **Lo único de Mario que te bloquea: M-L1 (páginas públicas de privacidad y términos) → tu A-R4.** Y su M-L2 (borrar cuenta) debe borrar también `social_accounts`/tokens: se coordina con tu A-R3.
---

## Anexo — alcance y riesgos heredados del README anterior (publicaciones)

- El Tablero y el detalle de publicación ya se rediseñaron (CHANGELOG 49, 50 y 52): antes de proponer una mejora, comprueba si ya está hecha.
- `PhaseBoard.vue` sincroniza `board` con `posts` a mano alrededor de `vuedraggable`: si lo tocas, prueba arrastrando de verdad. El selector de fase de cada card es la única vía en móvil para columnas colapsadas; no lo rompas.
- No conviertas el aviso de saltarse la revisión en un bloqueo sin cerrar antes Q6 (es un cambio de permisos, no de interfaz).
- Los textos de contexto no deben repetir lo que ya dice el estado.
- Si creas publicaciones de prueba contra el proyecto compartido, bórralas al terminar.
- `README.md` raíz y `docs/5-FRONTEND-WORK-SPLIT.md` están desactualizados; para el estado real usa `docs/CHANGELOG.md`, `docs/CONTEXTO_PROYECTO_FEEDMA.md`, `docs/PENDIENTES.md` y este documento.

## Registro de migraciones aplicadas desde esta rama

| Fecha | Archivo | Qué cambia | Aprobada por |
|---|---|---|---|
| 2026-10-28 | `20261028120000_social_accounts_lockdown.sql` | `social_accounts`: el navegador ya no inserta ni actualiza; solo lee `id, creator_id, platform, handle, followers_count, connected_at`; mantiene el borrado propio | Alex (con la aceptación de Mario, según Alex); aplicada por Alex en el SQL Editor |
| 2026-10-28 | `20261028130000_social_accounts_status_columns.sql` | `social_accounts`: añade `status`, `last_error_code`, `last_error_at`, `last_synced_at`, `last_sync_attempt_at`, `sync_lock_until`, `external_account_id`, `is_verified` (generada) e índice único parcial `(platform, external_account_id)`; el navegador solo lee `status`, `last_synced_at`, `last_error_code`, `is_verified` | Alex; aplicada por Alex en el SQL Editor |
| 2026-10-30 | `20261030100000_post_external_links.sql` | Tabla nueva `post_external_links` (vínculo publicación ↔ contenido externo: un vínculo por publicación, el mismo contenido no en dos publicaciones, plataforma coherente con la cuenta); `unique (id, platform)` en `social_accounts`; el navegador solo lee (creador dueño o partner de la colaboración), solo escribe el servidor | Alex; aplicada por Alex en el SQL Editor |
| 2026-10-30 | `20261030110000_metrics_and_account_snapshots.sql` | Tabla nueva `social_account_snapshots` (acumulados por cuenta y día, nullable, solo lee el creador dueño); `metrics`: `views/likes/comments/shares/saves` pasan a nullable sin default y se añaden `source`, `measured_on`, `measured_at`, `reach`, `unavailable_metrics` y unicidad `(post_id, source, measured_on)`; sin escritura desde el navegador | Alex; aplicada por Alex en el SQL Editor |
| 2026-10-30 | `20261030120000_posts_collaboration_check.sql` | RLS de `posts`: `posts_insert_self` y `posts_update_self` pasan a exigir que `collaboration_id` sea NULL o una colaboración del propio creador (antes solo se comprobaba `creator_id`) | Alex; **Aplicada por Alex (verificada 6/6 con `posts-collaboration-rls.spec.ts` el 2026-11-03); Mario conforme** |
| 2026-11-03 | `20261103100000_chat_limits.sql` | Chat: límites de longitud (2000 / 500) y frecuencia (30 mensajes/min, 20 ofertas/h) en `send_text_message` y `create_offer`; `CHECK NOT VALID` e índices | Alex; **Aplicada por Alex; verificada con su prueba de integración (2026-11-03)**; Mario conforme. Pruebas: `tests/integration/chat-limits.spec.ts` |
| 2026-11-03 | `20261103110000_offers_keep_on_package_delete.sql` | `offers.package_id` nullable con `on delete set null`, `package_title`, trigger que borra solo ofertas pendientes del paquete; `create_offer` guarda el título | Alex; **Aplicada por Alex; verificada con su prueba de integración (2026-11-03)**; Mario conforme. Pruebas: `tests/integration/offers-package-delete.spec.ts` |
| 2026-11-03 | `20261103120000_posts_published_at.sql` | Trigger que escribe `posts.published_at` al pasar a `published` | Alex; **Aplicada por Alex; verificada con su prueba de integración (2026-11-03)**. Pruebas: `tests/integration/posts-published-at.spec.ts` |
| 2026-11-03 | `20261103130000_social_accounts_server_only_delete.sql` | H0-08: el navegador ya no puede borrar `social_accounts` (se quita `grant delete` y `social_accounts_delete_self`); solo borra el servidor | Alex; **Aplicada por Alex; verificada con la auditoría de catálogo (2026-11-03): `authenticated` sin DELETE/INSERT/UPDATE, solo SELECT de 10 columnas, única política `social_accounts_select_self`; `social-accounts-rls.spec.ts` 16/16**. Ver `docs/audit/07_CRITICAL_FINDINGS_VALIDATION.md` |
| 2026-11-03 | `20261103140000_function_execute_privileges.sql` | H0-03: `notify`, `_get_or_create_conversation` y `has_accepted_offer_between` sin EXECUTE para `anon`/`authenticated`; RPC de la app sin EXECUTE para `anon` | Alex; **Aplicada por Alex; verificada contra la base real para `anon`: 18/18 dan 42501 y `current_*_id` siguen accesibles**. Parte `authenticated` verificada con la auditoría de catálogo: las 3 internas solo para `service_role`; `function-privileges.spec.ts` 23/23 y `offers.spec.ts` 4/4 (regresión) |
| 2026-11-03 | `20261103150000_billing_webhook_idempotency.sql` | H0-02: `credit_ledger.stripe_invoice_id` único y CHECK de `subscriptions.status` con los 8 estados de Stripe | Alex; **Aplicada por Alex; columna `stripe_invoice_id` comprobada en la base real** (va en la misma transacción que el CHECK). CHECK con los 8 estados verificado en el catálogo. Circuito completo con Stripe CLI: pendiente |
| 2026-11-03 | `20261103160000_restore_handle_new_user.sql` | H0-17: restaura `handle_new_user()` (estaba la versión de `20261020180000`, que no creaba la ficha en las altas nuevas) | Alex; **Aplicada por Alex; verificada en el catálogo: cuerpo vivo idéntico a la migración, trigger activo, columnas presentes; 32/32 funciones ya coinciden con su última migración**. `signup-trigger.spec.ts` 2/2 contra la base real. Pendiente: un alta real desde `/onboarding` en navegador |
| 2026-11-03 | `20261103170000_column_privileges_hardening.sql` | Auditoría de seguridad (Fase 2): permisos por columna para `authenticated` en `collaborations` (alta sin estado, pago ni oferta; sin UPDATE), `profiles` (nombre, avatar y privacidad del chat), `creators`/`partners` (solo campos de ficha; sin alta desde el navegador; el id de Stripe Connect ya no se puede leer) y `notifications` (`read_at`) | Alex; **Aplicada por Alex; verificada en el catálogo (solo lectura): permisos como en la migración, sin políticas de alta en `creators`/`partners`, las 6 funciones que escriben en estas tablas son SECURITY DEFINER**. Pendiente: regresión en navegador (Fase 3) |
