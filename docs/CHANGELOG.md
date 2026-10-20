# Changelog de sesiones de desarrollo

Registro de qué se hizo, por qué, y qué queda pendiente de verificar — pensado para que el otro miembro del equipo pueda retomar sin tener que adivinar el estado real del proyecto. Se añaden entradas nuevas arriba.

---

## 2026-10-20 (7) — El modelo gratuito por defecto ya no existía

El usuario puso su `OPENROUTER_API_KEY` y seguía sin funcionar. Causa: `meta-llama/llama-3.3-70b-instruct:free` desapareció del catálogo gratuito de OpenRouter (devolvía 404 pidiendo usar la versión de pago). Además, probando modelos gratuitos alternativos se vio que **todo el catálogo gratuito actual son modelos "reasoning"** (gastan tokens pensando antes de escribir la respuesta final) — sin un `max_tokens` explícito, el contenido llegaba vacío porque se cortaba a mitad del razonamiento.

### Arreglo

- Nuevo modelo por defecto: `nvidia/nemotron-3-super-120b-a12b:free` (probado directo contra OpenRouter con la clave real, responde bien).
- `max_tokens: 800` añadido a las dos llamadas a OpenRouter (`predict.post.ts` y `trends.get.ts`).
- `.env`, `.env.example`, `nuxt.config.ts` y `docs/8-AI-SUGGESTIONS-SETUP.md` actualizados, con nota explícita sobre el gotcha de los modelos "reasoning" para la próxima vez que un modelo gratuito desaparezca.

### Verificado

- Clave y modelo nuevo probados directo contra la API de OpenRouter (fuera de la app) — responden bien.
- `npx vue-tsc --noEmit` limpio. Servidor de pruebas reiniciado.

## 2026-10-20 (9) — Node actualizado + guardar publicaciones sin predecir

Dos cambios sueltos pedidos directamente por el usuario, sin relación entre sí.

### Node actualizado

`npm run dev` avisaba de que Node 22.20.0 no estaba soportado por Nuxt (`^22.21.0 || ^24.11.0 || >=26.0.0`). Actualizado a **22.23.2** vía `winget upgrade --id OpenJS.NodeJS.22`. Sin cambios de código — solo la versión instalada en esta máquina. El otro miembro del equipo debería comprobar su propia versión de Node si le sigue saliendo el mismo warning.

### Guardar una publicación sin tener que predecirla

Hasta ahora, `PostComposerSheet.vue` solo tenía un botón ("Predecir éxito"): crear la publicación y pedir la predicción iban siempre juntos, sin forma de simplemente anotar una idea para predecirla más tarde (ni de evitar gastar el crédito que consume predecir).

**Arreglo**: nuevo botón secundario "Guardar sin predecir", al lado del de siempre. Ambos escriben la publicación en `posts` (estado `idea`) de la misma forma — la diferencia es que este no llama a `/api/ml/predict`. Se extrajo la lógica de crear/actualizar el post a una función común (`saveDraft()`) que usan los dos botones, y el `Stage` del componente pasó de `'draft' | 'loading' | 'result'` a `'draft' | 'predicting' | 'saving' | 'result'` para poder deshabilitar/animar cada botón por separado.

Una publicación guardada así no rompe nada aguas abajo: `successScore` ya era opcional en el tipo `Post`, y tanto `DeliverableCard.vue` como `creator/post/[id].vue` ya comprobaban `v-if="post.successScore"` antes de mostrar la tarjeta de puntuación — simplemente no se muestra hasta que se prediga desde la página de detalle del post.

### Verificado

- `npx vue-tsc --noEmit` limpio.
- `node -v` → `v22.23.2` confirmado tras reinstalar.
- **Sin verificar en navegador real** el flujo completo de "Guardar sin predecir" (crear, ver que aparece en el tablero sin score, predecirlo después desde su página de detalle).

## 2026-10-20 (8) — El score de éxito no juzgaba la calidad real del contenido

Reportado por el usuario: escribiendo caption deliberadamente malo, `/api/ml/predict` seguía dando ~60-70%. Con razón: `heuristicScore` (ahora `structuralScore`) solo mira longitud de título/caption y nº de hashtags — nunca supo si el contenido tenía sentido o era bueno.

### Arreglo

El mismo LLM gratuito que ya generaba las sugerencias ahora también evalúa la calidad real del caption (`quality_score` 0-100, pedido en el mismo prompt/petición — sin coste extra) y se mezcla con la heurística estructural, pesando más la IA (60/40): `successScore = quality_score*0.6 + structuralScore*0.4`. Sin LLM (o si falla), se cae solo en la heurística estructural, igual que antes — documentado con `model_version` distinto (`v1-heuristic-2026.01` vs `v1-heuristic+llm-2026.01`) para poder diferenciarlas si hace falta depurar más adelante.

Probado directo contra OpenRouter con un caption basura a propósito: `quality_score: 12` (antes el score estructural solo daba 74). Con el blend, el resultado final bajaría a ~37 en ese caso — mucho más realista.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Prompt probado directo contra OpenRouter con contenido malo de verdad: el LLM penaliza como se esperaba.
- **Sin verificar en navegador real** con una sesión de usuario de verdad — pendiente que el usuario reintente predecir con contenido malo y bueno y confirme que el score ahora varía de forma realista.

## 2026-10-20 (6) — Motor de tendencias real (`/api/ml/trends`)

Siguiente pieza de Fase 4 tras cerrar las sugerencias de IA. `creator/trends.vue` vivía solo de `mock-data.ts`.

### Qué es real y qué no

No hay ninguna fuente externa de tendencias conectada (Google Trends, scraping de hashtags virales, pgvector/embeddings — eso sigue siendo trabajo futuro, igual que en `docs/3-ML-PIPELINE.md`). Lo que sí es real:

- El nicho del influencer y sus posts propios (para no repetir ideas) se leen de Supabase de verdad.
- Las 4 ideas de contenido las genera el mismo LLM gratuito de OpenRouter que usa `/api/ml/predict`, a partir de ese nicho y esos posts.
- El "potencial estimado" (`score`/`growthPct`) es una estimación del propio modelo, no una métrica medida — por eso se quitó del subtítulo de la página la frase "detectadas en las últimas 48 horas", que habría sido falsa.
- Sin `OPENROUTER_API_KEY`, o si el LLM falla, cae en una lista fija de 4 ideas genéricas por formato (no pretenden ser tendencias detectadas, son buenas prácticas conocidas).
- Los resultados se guardan de verdad en `trends` y se reutilizan 24h por nicho (no se llama al LLM en cada visita a la página).

### Qué se añadió

- **`supabase/migrations/20261020120000_trends_display_fields.sql`**: añade a `trends` las columnas `niche`, `hashtags`, `format`, `growth_pct` (todas nullable/con default — no rompe filas existentes). Aplicada a mano en el SQL Editor de Supabase (sin CLI logueada en esta máquina) y confirmada: una consulta a esas columnas ya no da error de columna inexistente.
- **`server/api/ml/trends.get.ts`** (nuevo): resuelve la ficha/nicho del influencer logueado, comprueba caché de `trends` por nicho (24h), si no hay suficiente pide ideas al LLM con el contexto de sus propios posts, valida/recorta la respuesta igual que `fetchAiSuggestions` en `predict.post.ts`, y guarda lo que use (LLM o fallback) en `trends`.
- **`app/composables/useMyTrends.ts`** (nuevo): mismo patrón `useState` + `ensureLoaded` que el resto de composables de cuenta; registrado en `resetAccountCaches()`.
- **`app/pages/creator/trends.vue`**: ya no importa `trendSuggestions` de `mock-data.ts` — llama a `useMyTrends().ensureLoaded()`. Subtítulo corregido (ya no afirma "detectadas").
- **`app/utils/mock-data.ts`**: quitado `trendSuggestions` (ya no lo usa nada).

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Columnas nuevas de `trends` confirmadas contra el proyecto real (consulta sin error).
- **Sin verificar en navegador real**: `serverSupabaseUser` necesita la cookie de sesión real de `@nuxtjs/supabase`, que no se puede simular fácilmente por `curl` (mismo límite que ya tuvimos con `/api/ml/predict` — solo se pudo confirmar el camino sin sesión). Pendiente que alguien abra `/creator/trends` ya logueado y confirme que carga ideas sin error.

## 2026-10-20 (5) — Mismo bug sigue tras recargar: causa real encontrada

El usuario confirmó que, tras recargar, el composer seguía dando el mismo error. El arreglo anterior (no cachear `null` cuando falta el `id`) evitaba que quedara **atascado para siempre**, pero no evitaba que **el primer intento** siguiera fallando — y si ese primer intento es justo el que el usuario prueba, parece que "no se arregló nada".

### Causa real

`role-guard.global.ts` corta en seco en la primera línea (`if (!user.value) return`) si `useSupabaseUser()` todavía no tiene valor — y en ese caso **no llega a llamar a `ensureInfluencer`/`ensureBrandClient`/`ensureManager`** en absoluto. Encima, `login.vue` solo llama a `ensureRole(data.user?.id)` tras iniciar sesión; nunca llama a `ensureInfluencer`. Así que la ficha de rol se queda en `undefined` hasta que algo la pida de verdad — y en ese momento posterior (p. ej. al abrir el composer), los 4 composables caían en `useSupabaseUser().value?.id` para resolver el id.

El problema de fondo: `useSupabaseUser()` es un ref que actualiza un *listener* (`onAuthStateChange`), no una promesa — puede ir un paso por detrás de la sesión real, sobre todo justo tras cargar la página o iniciar sesión, que es exactamente cuando el usuario estaba probando. Si en ese instante el ref todavía no tiene id, el composable se rendía (`return null`) aunque la sesión sí existiera ya a nivel del cliente de Supabase.

### Arreglo

En los 4 composables (`useMyRole`, `useMyInfluencer`, `useMyBrandClient`, `useMyManager`): si no hay `id` por el camino rápido (`userId` explícito o `useSupabaseUser().value?.id`), ahora se espera a `client.auth.getSession()` antes de rendirse. `getSession()` es una promesa que resuelve cuando el cliente termina de leer la sesión de verdad (cookies/localStorage), así que no depende de que el ref reactivo ya se haya puesto al día — debería resolver el id en el primer intento, no solo en el segundo.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Servidor de pruebas reiniciado y respondiendo (`curl` → `200` en `/`).
- **Sin verificar en navegador real todavía** — pendiente que el usuario reintente el flujo completo (recargar o volver a entrar, abrir el composer, pedir predicción) y confirme si el error desaparece ahora sí.

## 2026-10-20 (4) — Bug real: "No se ha encontrado tu ficha de influencer"

Reportado por el usuario al probar el composer por primera vez en el navegador real (lo que llevábamos varias entradas sin poder verificar).

### Causa

`useMyRole.ts`, `useMyInfluencer.ts`, `useMyBrandClient.ts` y `useMyManager.ts` comparten el mismo patrón: cachean su resultado en `useState` y, si no reciben un `userId` explícito, caen en `useSupabaseUser().value?.id`. El problema es que cuando ese `id` todavía no estaba disponible (p. ej. justo tras un login o un cambio de cuenta demo, mientras `useSupabaseUser()` se pone al día — el propio comentario del código ya avisaba de esto), el `null` resultante se guardaba en el `useState` de todas formas. Como `useState` no se reintenta solo, esa cuenta quedaba **atascada el resto de la sesión de pestaña** creyendo que no tenía ficha de rol, aunque el dato en Supabase fuera perfecto — confirmado consultando la base real con la sesión de `influencer@feedma.test`: su fila en `profiles` y en `influencers` están bien, vinculadas entre sí.

No se ha podido reproducir el momento exacto de la carrera sin un navegador para depurar en vivo (seguimos sin uno en esta sesión), pero el fallo de diseño es real e independiente de la causa exacta: cachear un `null` que en realidad significa "no se pudo intentar la consulta todavía" es indistinguible de "esta cuenta de verdad no tiene ficha".

### Arreglo

En los 4 composables: si no hay `id` disponible, se devuelve `null` para esa llamada **sin** escribir en el `useState` — se deja en `undefined` para que la siguiente llamada lo reintente de verdad.

**Para quien tenga la sesión ya atascada con este bug**, el arreglo de código no lo deshace solo: hace falta recargar la página (o cerrar sesión y volver a entrar) para que el `useState` arranque limpio. A partir de ahí no debería repetirse.

**Sin verificar en navegador real** si esto cierra el bug del todo o si queda algún otro punto de carrera en `role-guard.global.ts` — recomendado que quien lo reportó confirme si, tras recargar, el composer ya predice sin este error.

## 2026-10-20 (3) — Sugerencias de IA reales (OpenRouter, gratis)

Seguimiento directo de la entrada anterior: el usuario quería avanzar en Fase 4 en paralelo a que el compañero monta Stripe, sin gastar dinero en una API de pago. Se decidió OpenRouter por tener modelos `:free`.

### Qué se añadió

- **`nuxt.config.ts`**: nuevo `runtimeConfig` (solo servidor) con `openrouterApiKey`/`openrouterModel`.
- **`.env` / `.env.example`**: `OPENROUTER_API_KEY` (vacía — hay que rellenarla, ver `docs/8-AI-SUGGESTIONS-SETUP.md`) y `OPENROUTER_MODEL` (con un valor por defecto gratuito).
- **`server/api/ml/predict.post.ts`**: nueva función `fetchAiSuggestions()` que pide al modelo configurado un array JSON de hasta 4 sugerencias (prompt adaptado de `docs/3-ML-PIPELINE.md` §3.5.1), validado y recortado antes de guardarlo. Si no hay clave, o el LLM falla, o no devuelve JSON parseable, se queda en `[]` sin lanzar error — la puntuación heurística (que no depende de esto) se calcula y guarda igual.
- **Persistencia de verdad** (antes solo se guardaba `success_score`/`confidence`, las sugerencias se quedaban siempre en el texto fijo del cliente): se añadió la columna `suggestions` al `insert`/`select` de `ml_predictions`, se añadieron `confidence`/`suggestions` al tipo `Post` y a `useMyPosts.ts` (igual patrón que ya se usó para que `successScore` sobreviviera a un recargado), y se conectó en `creator/post/[id].vue` y `PostComposerSheet.vue` — ambos caen en `suggestionsForDraft` (mock) si no hay sugerencias reales todavía, cero regresión para quien no configure la clave.
- **`docs/8-AI-SUGGESTIONS-SETUP.md`** (nuevo, estilo de `docs/6`/`docs/7`): cómo crear la cuenta y la clave gratis, qué hacer si el modelo por defecto deja de estar disponible, y qué queda fuera (créditos, rate limiting propio, motor de tendencias).

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio en todo el proyecto.
- El endpoint sigue devolviendo `401` sin sesión tras los cambios (probado con `curl`).
- **Sin probar con una clave real de OpenRouter** — no se ha configurado ninguna en esta sesión (la tiene que generar el usuario, ver la guía). El camino "sin clave" (`suggestions: []`, cae en el texto fijo) sí es el que está corriendo ahora mismo y no rompe nada.
- Sigue sin poder probarse el flujo completo autenticado en un navegador real, por lo mismo de siempre: no hay uno disponible en esta sesión.

## 2026-10-20 (2) — Pull de "Subida pre-stripe" + limpieza del duplicado de demo

Tras el `git pull` del commit `4a8b541 "Subida pre-stripe"` (el compañero, preparando Fase 3): sin conflictos con lo de las dos entradas anteriores — arregló exactamente el pendiente del composer, hizo idempotente `seed-demo-users.mjs`, limpió `mock-data.ts` y dejó `docs/7-STRIPE-SETUP.md` listo para crear la cuenta de Stripe con Connect (de momento solo documentación, sin tocar código ni `package.json` todavía).

`npm install` (sin dependencias nuevas) y `npx vue-tsc --noEmit` limpios tras el pull.

**Duplicado de demo limpiado** (el que avisaba la entrada de ayer): la colaboración y el post de las 20:08 del 19-10 (creados al re-ejecutar `db:seed-users` tras arreglar el `.env`) eran un duplicado exacto de los de las 14:26. Confirmado con el usuario antes de borrar nada (es dato del proyecto real compartido), y borrados con la `service_role` key — primero el post, luego la colaboración, el borrado en cascada se habría llevado cualquier `ml_predictions`/`metrics` atado a ese post si los hubiera tenido (no los tenía). Verificado: ahora solo queda un post y una colaboración entre Alma Beauty Co. y Nora Blake.

## 2026-10-20 — Limpieza tras el roster de manager + composer conectado a `/api/ml/predict`

Seguimiento de la sesión anterior (commit `b65e5c6`), a partir de su propia recomendación: "terminar de verificar el flujo de `/api/ml/predict` y decidir el caso del composer".

### 1. `PostComposerSheet.vue` ahora persiste de verdad

"Predecir éxito" en el composer seguía siendo el cálculo local original (`setTimeout` + fórmula en el cliente) — `/api/ml/predict` no existía todavía cuando se escribió ese componente. Ahora:

- El primer "Predecir éxito" crea el post de verdad (estado `idea`, vía `useMyPosts().createPost`) y llama a `/api/ml/predict` con su `postId` — la puntuación ya sobrevive a un recargado, igual que en `creator/post/[id].vue`.
- Si se pulsa "Editar" y se predice otra vez, se actualiza ese mismo post (`updatePost`) en vez de crear uno duplicado — se guarda su id en `createdPostId` mientras la hoja está abierta.
- "Programar" ya no crea nada (el post quedó guardado al predecir): solo cierra la hoja.
- Añadido un mensaje de error visible si `/api/ml/predict` falla (antes no había ningún aviso al usuario).

**Sin verificar en navegador real** (seguimos sin uno disponible en esta sesión) — recomendado probarlo a mano: crear una publicación nueva desde el FAB, predecir, recargar la página y comprobar que el post y su puntuación siguen ahí.

### 2. Typecheck roto por la limpieza de `mock-data.ts` + error preexistente en `server/api/ml/predict.post.ts`

- `managers`, `influencers`, `influencerPosts` y `socialAccounts` de `mock-data.ts` ya no los usaba ninguna pantalla (todo lo real pasó a Supabase en los dos commits anteriores) — eliminados, junto con `useCreatorPosts.ts` (lo mismo, ya sin uso). Mismo criterio que se viene aplicando: si no lo importa nadie, fuera.
- De paso, `npx nuxi typecheck` encontró 3 errores en `server/api/ml/predict.post.ts` (`.single()` sin tipo explícito, igual que el problema que ya había salido antes en `useMyRole.ts`/`useMyPosts.ts` por no haber tipos generados de la base de datos) — no los causó esta sesión, estaban ya en el commit `b65e5c6`; corregido con `.single<{...}>()` como en el resto de composables.

### 3. Seed de demo ahora es idempotente de verdad

La entrada anterior de este changelog avisaba de colaboraciones/posts de demo duplicados por correr `db:seed-users` más de una vez (el script hacía `insert` liso, sin comprobar si ya existían). Corregido: ahora comprueba primero si ya hay una colaboración `brand_client_id` + `influencer_id` igual, y si ya hay un post para esa colaboración, y solo inserta si no existen.

**Importante:** esto evita duplicados *futuros* — no he tocado el proyecto real de Supabase para borrar el duplicado que ya se detectó (borrar filas a mano en una base de datos compartida no es algo que deba hacer sin que alguien del equipo lo confirme). Si sigue ahí, toca revisarlo a mano desde el Table Editor.

Typecheck limpio (`npx nuxi typecheck`, 0 errores) al cerrar esta sesión.

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
