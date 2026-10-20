# Changelog de sesiones de desarrollo

Registro de qué se hizo, por qué, y qué queda pendiente de verificar — pensado para que el otro miembro del equipo pueda retomar sin tener que adivinar el estado real del proyecto. Se añaden entradas nuevas arriba.

---

## 2026-10-20 (merge) — Mario y Alejandro encontraron el mismo fallo por separado

`git pull` reveló que las dos sesiones en paralelo (Mario con Stripe, Alejandro con IA/tendencias) habían diagnosticado **el mismo fallo de raíz** en `useSupabaseUser()` casi a la vez, con arreglos ligeramente distintos en los mismos 4 composables (`useMyRole`, `useMyInfluencer`, `useMyManager`, `useMyBrandClient`): Mario usó `client.auth.getUser()` (resuelve contra el servidor de Supabase, es lo que Supabase recomienda para decisiones de autorización como la de `role-guard.global.ts`), Alejandro usó `client.auth.getSession()` (más rápido, no sale a red, pero Supabase avisa de no fiarse de ella para ese tipo de decisión) — y además, por su cuenta, añadió que **no hay que cachear `null`** cuando simplemente no hay `id` todavía (si no, la cuenta se queda atascada el resto de la sesión de pestaña creyendo que no tiene rol).

Resuelto el conflicto a mano combinando las dos partes buenas: `getUser()` en los 4 composables (y en `useMyBilling.ts`, que ya lo usaba) + el "no cachear `null`" de Alejandro. `nuxt.config.ts` y `useAccountCache.ts` también tenían conflicto (los dos añadimos cosas al mismo sitio) — combinados sin perder nada de ninguno de los dos lados.

Typecheck limpio tras el merge (`npx nuxi typecheck`, 0 errores).

---

## 2026-10-20 (noche) — Fallo de raíz: `useSupabaseUser()` vacío de forma intermitente en recargas normales

Al probar Stripe en el navegador (Mario), la pantalla de perfil se quedaba en "Plan gratuito" aunque la suscripción SÍ estaba guardada correctamente en la base de datos (comprobado directamente contra Supabase). Pasaba de forma intermitente — a veces la pantalla cargaba bien, a veces no, con el mismo código.

### Causa real (diagnosticada con un panel de debug temporal en pantalla, no solo con la consola)

`role-guard.global.ts` — el middleware que resuelve el rol y la ficha (influencer/manager/brand_client) de CUALQUIER página de la app — empezaba así:
```ts
const user = useSupabaseUser()
if (!user.value) return
```
`useSupabaseUser().value` lo rellena un listener aparte (`onAuthStateChange`), no está garantizado que ya tenga valor en el momento exacto en que arranca una navegación — esto ya se había diagnosticado una vez para el caso concreto de "justo después de iniciar sesión" (ver entradas antiguas de este changelog), pero resulta que el mismo fallo podía pasar en **cualquier recarga normal**, no solo justo tras el login. Cuando pasaba, el middleware se salía sin hacer nada (`return`) — sin rol, sin ficha de influencer/manager — y la página se quedaba a medias sin ningún error visible (el middleware simplemente no hacía su trabajo, no lanzaba ninguna excepción).

### Arreglo

En vez de leer ese ref que puede no estar listo, `role-guard.global.ts` ahora resuelve la sesión activamente:
```ts
const { data: { user } } = await useSupabaseClient().auth.getUser()
```
`getUser()` sí espera de verdad a tener la sesión real, no depende de que el listener ya haya avisado. Mismo cambio aplicado, por consistencia y para que no vuelva a pasar en otro sitio, a los "fallback" de `useSupabaseUser().value?.id` que tenían `useMyRole`, `useMyInfluencer`, `useMyManager`, `useMyBrandClient` y el nuevo `useMyBilling` cuando se llaman sin un `userId` explícito.

**Esto afectaba potencialmente a toda la app**, no solo a la pantalla de Stripe — cualquier recarga normal podía, en el peor momento, dejar a alguien sin rol resuelto durante esa carga. Si en algún momento anterior alguien vio una pantalla "a medias" sin explicación tras recargar, es probable que fuera esto.

Typecheck limpio (`npx nuxi typecheck`, 0 errores). Pendiente de que Mario confirme en el navegador que la pantalla de perfil ya carga bien de forma consistente tras varias recargas seguidas.

---

## 2026-10-20 (tarde) — Arranque de Fase 3: suscripciones + Connect (sin probar aún)

Cuenta de Stripe creada por Mario (modo de pruebas, Connect activado — la pantalla ya no pide elegir "Standard/Express/Custom" a mano, Stripe lo mueve a parámetros de API; por defecto sin especificar nada ya equivale a Standard, ver `docs/7-STRIPE-SETUP.md`). Claves `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` en `.env`.

### Qué se construyó

- `npm install stripe`. `runtimeConfig` nuevo en `nuxt.config.ts` (secret/webhook secret solo servidor, publishable key pública).
- `server/utils/stripe.ts` (cliente compartido), `server/utils/stripe-plans.ts` (precios en código, sin Products/Prices en el Dashboard de Stripe — Checkout con `price_data` inline), `server/utils/account-identity.ts` (resuelve si el usuario logueado es manager o influencer).
- `server/api/stripe/create-checkout-session.post.ts` — suscripción (Influencer → "Pro" 19,99€/mes, Manager → "Agencia" 49,99€/mes).
- `server/api/stripe/connect/account-link.post.ts` — crea la cuenta Connect (si no existe) y el enlace de onboarding.
- `server/api/stripe/webhook.post.ts` — firma verificada con `stripe.webhooks.constructEvent`; escucha `checkout.session.completed` (guarda la suscripción), `customer.subscription.updated/deleted` (mantiene el estado al día) y `account.updated` (marca `stripe_connect_onboarded`).
- Migración `supabase/migrations/20261020090000_stripe_connect_accounts.sql`: añade `stripe_connect_account_id`/`stripe_connect_onboarded` a `managers` e `influencers`.
- `useMyBilling.ts` (composable nuevo) + sección "Pagos" en `creator/profile.vue` y `manager/profile.vue`: muestra el plan actual, botón para suscribirse, y si la cuenta de Connect ya está verificada o hace falta conectarla.
- `useMyInfluencer`/`useMyManager` ahora también leen `stripe_connect_onboarded`. `resetAccountCaches()` vacía también la suscripción cacheada.

### Sin verificar en navegador real todavía

Como con el resto de este proyecto, sin navegador disponible en esta sesión no se ha podido probar el flujo completo. **Dos cosas pendientes antes de que funcione de verdad:**

1. **Aplicar la migración nueva**: `npx supabase db push` (necesita tu sesión de `supabase login`, no la tengo yo).
2. **Rellenar `STRIPE_WEBHOOK_SECRET`**: correr `stripe listen --forward-to localhost:3000/api/stripe/webhook` y pegar el `whsec_...` que imprime, en `.env`.

Con esos dos pasos, probar: entrar como `influencer@feedma.test`, perfil → "Mejorar a Pro" → tarjeta de pruebas `4242 4242 4242 4242` → confirmar que vuelve a FEEDMA con "Suscripción activada" y que el plan ya no pone "Plan gratuito" (recargando la página, para confirmar que quedó guardado y no es solo estado local). Repetir con "Conectar" en Cuenta de pagos.

### Lo que esto NO es todavía: el cobro real de una colaboración

Importante no confundirlo: lo de hoy deja a managers/influencers listos para *recibir* dinero (cuenta Connect verificada) y a FEEDMA cobrando su cuota de suscripción — pero **no existe todavía ningún sitio en la app donde una marca pague por una colaboración concreta**. `collaborations.budget_cents` existe en el esquema pero no se captura en ningún formulario, y no hay ninguna llamada a `stripe.paymentIntents.create` con `application_fee_amount` (que es como Connect cobra la comisión de FEEDMA sobre un pago de un tercero). Eso es trabajo nuevo — probablemente lo siguiente después de verificar que suscripciones + onboarding de Connect funcionan de verdad.

Typecheck limpio (`npx nuxi typecheck`, 0 errores) al cerrar esta sesión.

---

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
