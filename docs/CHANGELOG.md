# Changelog de sesiones de desarrollo

Registro de qué se hizo, por qué, y qué queda pendiente de verificar — pensado para que el otro miembro del equipo pueda retomar sin tener que adivinar el estado real del proyecto. Se añaden entradas nuevas arriba.

---

## 2026-10-19 — Arranque del entorno + roster de manager + primer paso real de ML

### Contexto de partida

Tras el último `git pull` (commit `a80e6db "Subida datos reales."`), `npm run dev` fallaba. Además, el README (Fase 2) tenía pendiente conectar las pantallas de manager a Supabase, y el motor de ML seguía siendo una simulación que no guardaba nada.

### 1. Entorno de desarrollo

- `npm install` para traer las dependencias nuevas que trajo el pull: `@nuxtjs/supabase`, `@supabase/supabase-js`, `@types/node`.
- El error al arrancar (`Cannot read properties of undefined (reading 'state')`) venía de que `@nuxtjs/supabase` se inicializaba con `SUPABASE_URL`/`SUPABASE_ANON_KEY` vacíos. Causa: no había `.env`, y la copia inicial de `.env.example` tampoco tenía valores reales.
- Se encontró que **ya existe un proyecto real en Supabase** (`qymqzddqrnsxjnwbqlgq.supabase.co`) con sus claves — probablemente añadidas por el compañero de equipo. Se corrigió un espacio de más en `SUPABASE_SERVICE_ROLE_KEY=` dentro de `.env` que podía romper el parseo.
- Se probó también levantar Supabase en local vía Docker (`npx supabase start`, ver `docs/6-SUPABASE-SETUP.md` §6) como alternativa por si el proyecto real no estaba listo. Como sí lo estaba, se paró (`npx supabase stop`) para no generar confusión entre dos backends distintos — **el proyecto real en la nube es el que usa la app**, no hace falta Docker para el día a día.
- `npm run db:seed-users` confirmado contra el proyecto real: las 3 cuentas de prueba ya existían (`manager@feedma.test`, `influencer@feedma.test`, `client@feedma.test`, contraseña `feedma-demo-2026`).

**Nota para el compañero:** el script `seed-demo-users.mjs` hace `insert` (no `upsert`) del post y la colaboración de demo cada vez que se ejecuta. Si se corrió más de una vez contra el proyecto real, habrá posts/colaboraciones de demo duplicados — se vio al consultar la tabla `posts` del roster del manager (2 copias del mismo "Reel: rutina skincare nocturna"). No es nada que se haya roto en esta sesión, pero conviene revisarlo (lo más simple: borrar el duplicado a mano desde el Table Editor, o cambiar el script a `upsert` con alguna clave estable).

### 2. Fase 2 — Manager conectado a Supabase de verdad

Las vistas de `creator` y `client` ya leían/escribían contra Supabase (composables `useMyPosts`, `useMyInfluencer`, `useMyBrandClient`, `useMyCollaborations`, `useClientPosts`, `useMySocialAccounts`). Las de `manager` seguían usando `influencers`/`influencerPosts` de `mock-data.ts`.

- **Nuevo:** `app/composables/useMyRoster.ts` — mismo patrón que `useMyPosts`/`useClientPosts`: resuelve el roster del manager logueado (`influencers` donde `manager_id` = el suyo) y las entregas de todo ese roster (`posts` filtrado por esos `influencer_id`), cacheado en `useState` y limpiado en `resetAccountCaches()` al cerrar sesión o cambiar de cuenta demo.
- **Reconectadas:** `app/pages/manager/index.vue`, `app/pages/manager/timeline.vue` y `app/pages/manager/influencers/[id].vue` (antes `manager/clients/[id].vue`) a `useMyRoster()` y a consultas directas de `influencers`/`posts`/`social_accounts` para la ficha de un influencer concreto.
- `followers`/`weeklyTarget` de cada influencer del roster van a `0` — esas columnas no existen en el esquema (ver `supabase/migrations/20261019120000_initial_schema.sql`), igual que ya hacía `client/discover.vue` con su propio listado: 0 es honesto, inventar una cifra no lo sería.

**Verificado contra el proyecto real** (login por API + consultas REST con el token de sesión, sin guardar el token en disco):
- Login de `manager@feedma.test` funciona.
- Con su sesión, `GET /influencers` devuelve solo a Nora Blake (su único influencer en el roster) — el RLS (`is_in_my_roster`) filtra correctamente.
- `GET /posts` con esa misma sesión devuelve solo las entregas de Nora Blake, no las de otros influencers.

Lo que queda intencionadamente en mock, porque depende de integraciones de Fase 4 que todavía no existen:
- `creator/metrics.vue` y `manager/metrics.vue` (`metricsByPlatform`, `engagementSeries`) — no hay sincronización real de redes sociales que alimente la tabla `metrics`.
- `creator/trends.vue` (`trendSuggestions`) — el motor de tendencias real es Fase 4.
- Las sugerencias cualitativas de IA (`suggestionsForDraft`) en el composer y en el detalle de post.

README actualizado: se marcaron como hechas las dos tareas de Fase 2 que quedaban pendientes (clave `SERVICE_ROLE_KEY` + seed, y "cambiar cada pantalla para pedir datos a Supabase").

### 3. Primer paso real del motor de ML (`/api/ml/predict`)

Hasta ahora, "Predecir éxito" (tanto en `PostComposerSheet.vue` como en `creator/post/[id].vue`) era un `setTimeout` que solo vivía en el cliente: la puntuación se perdía al recargar la página, y nunca se escribía en `ml_predictions`.

- **Nuevo:** `server/api/ml/predict.post.ts`. Implementa la "Fase 1 MVP" descrita en `docs/3-ML-PIPELINE.md` §3.5: un modelo heurístico explicable (sin LLM, sin datos propios entrenados todavía — eso sigue siendo trabajo de Fase 4). Verifica que el usuario autenticado es dueño del post (o su manager, igual que la policy de RLS de `posts`) antes de escribir, usando `serverSupabaseUser` + `serverSupabaseServiceRole` de `@nuxtjs/supabase` (el cliente no tiene permiso de insert en `ml_predictions` a propósito — solo el servidor puede escribir ahí).
- `creator/post/[id].vue` ahora llama a esta ruta real en vez de simular el cálculo localmente; el resultado sí sobrevive a un recargado de página.

**Dejado fuera a propósito en esta primera versión** (para no inventar más de lo que hay):
- `PostComposerSheet.vue` (crear + predecir antes de guardar) sigue con el cálculo local: en ese punto el post **todavía no existe** en Supabase (se crea al pulsar "Programar"), así que no hay `post_id` contra el que persistir la predicción. Para arreglarlo de verdad habría que crear el post en estado `idea` antes de predecir, en vez de al final — es un cambio de flujo, no solo de backend, y se ha dejado para decidirlo con calma.
- Enriquecimiento con LLM (sugerencias de copy/hashtags/horario) — necesita una clave de API que todavía no está en `.env`.
- Consumo de `credit_ledger` — falta decidir cómo se cargan créditos iniciales a las cuentas de demo/reales.

**Verificado:** `npx vue-tsc --noEmit` sin errores en todo el proyecto. La ruta responde `401` sin sesión (probado con `curl`). El camino autenticado completo (sesión real de navegador) **no se ha podido probar en esta sesión** por no tener un navegador disponible para simular las cookies de Supabase — recomendado probarlo a mano una vez se lea esto: entrar como `influencer@feedma.test`, abrir un post existente, pulsar "Predecir", recargar la página y comprobar que la puntuación sigue ahí.

### Recomendación para lo siguiente

Por orden del propio README:
1. **Repaso en móvil real** (Fase 1, pendiente) — nadie más que una persona con el teléfono en la mano puede hacerlo.
2. **Fase 3 (Stripe)** es técnicamente la siguiente fase — pero necesita que alguien del equipo cree una cuenta de Stripe en modo de pruebas primero (como se hizo con Supabase); no es algo que se pueda hacer sin esa cuenta.
3. Si se prefiere seguir avanzando sin esperar a Stripe, el siguiente hueco con más valor y sin bloqueos externos es terminar de verificar a mano el flujo de `/api/ml/predict` en el navegador, y decidir cómo resolver el caso del composer (crear el post como "idea" antes de predecir).
