# Changelog de sesiones de desarrollo

Registro de qué se hizo, por qué, y qué queda pendiente de verificar — pensado para que el otro miembro del equipo pueda retomar sin tener que adivinar el estado real del proyecto. Se añaden entradas nuevas arriba.

---

## 2026-10-21 (17) — La app se sentía lenta al navegar: dos causas reales, medidas

El usuario reportó que "la web va lentísima". Medido contra el proyecto real (`curl` directo a Supabase, 3 intentos): cada ida y vuelta ronda **300-450ms**, con un pico de 1.6s si el proyecto llevaba un rato inactivo (cold start del free tier). Con eso confirmado, se repasó qué hace la app en cada navegación.

### Causa 1 — `role-guard.global.ts` salía a red en cada clic, no solo al cargar

Este middleware corre en **toda** navegación dentro de la app (es `.global.ts`) y llamaba a `client.auth.getUser()` sin condición — una ida y vuelta a Supabase de ~300-450ms en cada cambio de pantalla, para siempre, incluso con todo lo demás ya en caché. No es un despiste: se eligió `getUser()` a propósito (ver entradas "Fallo de raíz" y "(5)" más abajo) porque `useSupabaseUser().value` podía ir desactualizado justo tras iniciar sesión — así que **no se ha vuelto a ese ref**, que reabriría ese bug.

En su lugar, se cachea el resultado YA verificado contra servidor durante 30s (`USER_CACHE_TTL_MS` en `role-guard.global.ts`). Una recarga completa de página siempre arranca con la caché vacía (sigue yendo a red de inmediato, igual que antes — el caso que arregló el bug original no cambia), pero navegar varias veces dentro de esos 30s ya no repite la llamada. La caché se vacía también en `resetAccountCaches()` (logout / cambio de cuenta demo), para que una cuenta nueva no herede por error el usuario verificado de la anterior en la misma pestaña.

### Causa 2 — consultas independientes esperadas en serie en vez de en paralelo

Varias páginas hacían `await a(); await b(); await c()` para datos que no dependen entre sí — cada `await` suma su propia latencia de red en vez de solaparse. Cambiado a `Promise.all([...])` en: `creator/index.vue`, `manager/index.vue` (3 consultas → 1 ronda), `manager/profile.vue`, `client/index.vue`, `creator/post/[id].vue`.

### Qué NO se tocó (y por qué)

- Las fotos de portada (`localPhotos`/`coverPhotos` en `utils/images.ts`, algunas de 2-3MB en `public/img/`) ya pasan por `<NuxtImg>` con `width`/`height`/`quality`/`format=webp` (ver `CoverImage.vue`) — @nuxt/image las redimensiona y comprime de verdad antes de servirlas, no es el cuello de botella.
- Esto es `npm run dev` (modo desarrollo) — Vite/Nuxt en dev es siempre más lento que una build de producción (sin minificar, sin code-splitting cacheado, SSR compilado al vuelo). Para sentir la velocidad real: `npm run build && npm run preview`.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Servidor de pruebas sano (`/`, `/login` responden 200).
- **Sin medir en navegador real cuánto baja el tiempo percibido** — las dos causas están confirmadas con `curl`/lectura de código, pero falta que el usuario confirme la sensación de velocidad navegando de verdad.

## 2026-10-20 (16) — Bandeja de entrada (icono junto al perfil)

Petición directa: un icono de bandeja al lado del avatar de perfil, con avisos tipo "Has iniciado sesión" y notificaciones de invitaciones a colaborar. Pensado como base para más adelante (chat entre usuarios, o puente a email) — por ahora es de un solo sentido: el sistema avisa, el usuario lee.

### Qué se construyó

- **`supabase/migrations/20261021110000_notifications.sql`** (nueva, sin aplicar todavía): tabla `notifications` (profile_id, type, title, body, link, read_at) con RLS de solo lectura/marcar-como-leída propia — nunca se inserta desde el cliente, solo desde triggers `security definer` (mismo criterio que `metrics`/`subscriptions`: sin policy de insert para "authenticated" = bloqueado del todo). Función helper `public.notify(...)` y los triggers que la usan:
  - **Alta de cuenta** → se añade a `handle_new_user()` (redefinida entera, mismo cuerpo que ya tenía + el aviso).
  - **Inicio de sesión** → trigger nuevo sobre `auth.users` cuando cambia `last_sign_in_at` (eso solo pasa en un inicio de sesión real — password, magic link, confirmación de email — nunca en un refresco de token, así que no hay spam en cada recarga).
  - **Colaboración nueva / aceptada / rechazada / asignada por el manager** → dos triggers nuevos sobre `collaborations` (insert y update).
  - **Solicitud de plantilla nueva / aceptada / rechazada** → trigger nuevo sobre `roster_requests` (insert) + `handle_roster_request_accepted()` redefinida para avisar en los dos sentidos, no solo mover `manager_id`.
- **`app/composables/useNotifications.ts`** (nuevo): lee las últimas 30, `unreadCount`, `markRead`/`markAllRead`.
- **`app/components/layout/TopBar.vue`**: icono de bandeja (`ph:tray-fill`) a la izquierda del avatar, con contador de no leídas — se recarga en cada visita a cualquier pantalla (no solo la primera vez), para que el número se note fresco al navegar.
- **`app/pages/inbox.vue`** (nueva): lista de avisos, tocar uno lo marca como leído y navega a su `link` si tiene. Vive fuera de `/manager`, `/creator`, `/client` a propósito — una sola pantalla sirve a los 3 roles, resuelve el rol con `useMyRole()` solo para que `AppShell` pinte la barra lateral/de navegación correcta.

### Qué queda fuera (a propósito, lo dijo el propio usuario: "más adelante pensaremos")

- Sin chat entre usuarios, sin puente a email/push — solo en la base de datos de FEEDMA.
- Sin Realtime: no llega sola sin recargar/navegar (se refresca al visitar cualquier pantalla, no con websocket). Si se quiere instantáneo, es una ampliación sobre esta misma tabla con `supabase.channel(...).on('postgres_changes', ...)`.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Servidor de pruebas sano; `/inbox` responde 302 sin sesión, como el resto de rutas protegidas.
- **Falta aplicar la migración** y **probar en navegador real**: iniciar sesión y ver el aviso "Has iniciado sesión", contactar desde Descubrir y ver llegar el aviso al influencer/manager, aceptar/rechazar y ver llegar el aviso a la marca.

## 2026-10-20 (15) — La relación manager↔influencer no tenía ninguna forma de crearse

Mario (como manager) probó la app y no le aparecía ningún influencer en su roster. No era un bug de visualización: `influencers.manager_id` existe desde el esquema inicial, pero **no había ni una sola pantalla en toda la app que lo rellenase**. El paso "¿trabajas solo o con un manager?" de `onboarding.vue` era puramente decorativo (el propio comentario del código lo admitía: "Unirte al roster de una agencia es un paso aparte, todavía manual") — en la práctica, un manager nunca podía tener roster salvo tocando la base de datos a mano.

Importante distinguir esto de las "colaboraciones" (Nivel 2, entrada 14): esas son encargos puntuales marca→influencer/manager con brief y presupuesto. Manager↔influencer es otra cosa — representación/pertenencia a plantilla — y no encajaba en esa tabla (`collaborations.brand_client_id` es obligatorio).

### Qué se construyó

- **`supabase/migrations/20261021090000_roster_requests.sql`** (nueva, sin aplicar todavía): tabla `roster_requests` (influencer_id, manager_id, status `requested`/`accepted`/`declined`) con su RLS — el influencer crea la solicitud, el manager la acepta/rechaza. Un trigger (`handle_roster_request_accepted`, security definer) es quien de verdad mueve `influencers.manager_id` al aceptar — hacía falta porque la policy `influencers_update_self_or_manager` exige que el manager YA sea el manager del influencer para poder tocar su ficha (paradoja del huevo y la gallina en el primer ingreso).
- **`app/composables/useRosterRequests.ts`** (nuevo): mismo patrón que `useCollabRequests` (`resolveOwner` detecta si pregunta un influencer o un manager); `sendRequest(managerId)` para pedir unirse, `accept`/`decline` para el manager.
- **`app/pages/creator/discover.vue`** (nueva): directorio de agencias (mismo estilo que `client/discover.vue`), botón "Pedir unirme" por agencia, con el estado de la solicitud si ya existe una.
- **`app/pages/manager/roster-requests.vue`** (nueva): bandeja de solicitudes entrantes, aceptar/rechazar.
- **Puntos de entrada**: fila "Agencia" en `creator/profile.vue` (muestra el nombre del manager actual o "Trabajas solo"); fila "Solicitudes de plantilla" con contador en `manager/profile.vue`; banner en `manager/index.vue` cuando hay solicitudes pendientes (mismo patrón que el de colaboraciones).
- **`rosterRequestStatusMeta`** en `utils/status.ts`.
- Al aceptar, se invalida la caché de `useMyRoster()` para que el roster del manager se vea actualizado en la siguiente visita sin tener que recargar a mano.

### Qué queda fuera

- No hay forma de que un influencer "deje" a su manager (quitarse el `manager_id`) ni de que el manager lo expulse — solo alta, no baja. Pulido para otra sesión si hace falta.
- Sin notificaciones reales, igual que en el resto de bandejas de solicitudes.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Servidor de pruebas sano; `/creator/discover` y `/manager/roster-requests` responden 302 sin sesión, como el resto de rutas protegidas.
- **Falta aplicar la migración** en Supabase (SQL Editor) y **probar en navegador real**: un influencer pide unirse → el manager lo ve en `/manager/roster-requests` → acepta → el influencer aparece en el roster del manager en `/manager`.

## 2026-10-20 (14) — Cierra el circuito marca↔creador (Nivel 2 de la hoja de ruta)

Tras un repaso a fondo del proyecto ("¿qué le faltaría a alguien usando la web ahora mismo?"), salió el hallazgo más importante de toda esta sesión: el marketplace tenía un circuito **abierto a la mitad**. `client/discover.vue` ya creaba una colaboración real (`status: 'requested'`) al "Contactar", pero ni el influencer ni el manager tenían ninguna pantalla para verla — cero resultados grepeando "collaboration" en todo `app/pages/creator/` y `app/pages/manager/`. Y aunque la hubieran visto, nada vinculaba un post a esa colaboración al crearlo, así que el calendario de aprobación de la marca (ya construido, con `approve_post`/`request_post_changes` funcionando) nunca iba a tener nada real que mostrar. Encima, "Pagar" se podía pulsar con la colaboración todavía sin aceptar por nadie.

Buena noticia encontrada al mirar el esquema: la RLS de `collaborations` ya estaba pensada para esto desde el principio (`collaborations_update_involved_parties`, con un comentario explícito: *"la marca crea la solicitud; el manager (si aplica) la asigna; cualquiera de las tres partes implicadas puede actualizarla"*) — no hizo falta ninguna migración, solo construir la pantalla que faltaba.

### Qué se construyó

- **`app/composables/useCollabRequests.ts`** (nuevo): solicitudes dirigidas al influencer o manager logueado. `acceptAsInfluencer`/`decline` para solicitudes directas a un influencer; `acceptAsManager(id, influencerId)` para las dirigidas a una agencia — acepta y asigna a alguien de la plantilla en el mismo gesto, porque la fila todavía no tiene ningún `influencer_id` concreto hasta ese momento.
- **`app/pages/creator/requests.vue`** y **`app/pages/manager/requests.vue`** (nuevas): bandeja de solicitudes con aceptar/rechazar. La de manager añade el selector de a quién de su roster asignarla.
- **Nav + aviso en el home**: nueva entrada "Solicitudes" en `roleNav` (creator y manager) y una tarjeta tipo la que ya usaba `client/index.vue` ("Tienes N solicitudes nuevas") en ambos `index.vue`.
- **`PostComposerSheet.vue`**: nuevo selector "Colaboración" (solo aparece si hay alguna `accepted`/`in_progress`) — si se elige una, el post se crea con `collaboration_id` de verdad. `useMyPosts.ts`/`NewPostInput`/`Post` actualizados para llevarlo.
- **Gatear "Pagar"**: `client/profile.vue` ya no muestra el botón si el estado no es `accepted`/`in_progress`/`completed` (antes se podía pagar una solicitud que la otra parte ni sabía que existía) — y por si alguien se salta la UI, `server/api/stripe/pay-collaboration.post.ts` ahora rechaza el pago en el servidor con el mismo criterio.
- **`CollaborationStatus`** (nuevo en `~/types`) + `collaborationStatusMeta` (en `utils/status.ts`) y `formatEuros` (movido de `client/profile.vue` a `utils/mock-data.ts`, ahora compartido por las 3 pantallas nuevas/tocadas).

### Qué queda fuera

- **Sin notificaciones de verdad** — el aviso es solo un contador en el home, no hay push/email cuando llega una solicitud nueva.
- **"Pagar" sigue sin comprobar si el influencer/manager tiene Connect verificado** antes de dejar pulsar el botón (el servidor sí lo comprueba y lo rechaza, pero la marca no se entera hasta que lo intenta) — pulido para otra sesión.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Servidor de pruebas sano; `/creator/requests` y `/manager/requests` responden (302 sin sesión, como el resto de rutas protegidas).
- **Sin probar en navegador real** el flujo completo: marca contacta → influencer/manager ve la solicitud y acepta (o manager asigna) → el creador crea un post vinculado → la marca lo ve en su calendario y lo aprueba → ahora sí puede pagar.

## 2026-10-20 (13) — Registro real: el hueco más grave de todos

Pedido explícitamente por el usuario tras un repaso general del estado del proyecto (ver esa conversación): "si alguien usara la web ahora mismo, ¿qué le faltaría?". La respuesta más importante no era ninguna de las fases en curso — era que **no existía ninguna forma real de darse de alta**. `/onboarding` tenía toda la pinta de un registro (selector de rol, pasos, animaciones) pero nunca llamaba a `signUp()`: el botón final solo navegaba a la home del rol elegido, sin sesión ni ficha creada — el guard de rutas lo habría devuelto a `/login` igual. El propio enlace en `login.vue` ya lo admitía: *"Mira cómo sería el registro"*. La landing nueva de Mario enlaza "Crear cuenta" directamente a esa maqueta.

### Causa de fondo

`handle_new_user()` (el trigger que corre al crear un usuario en `auth.users`) solo insertaba en `profiles` — nunca en `influencers`/`managers`/`brand_clients`. Aunque alguien hubiera llamado a `signUp()` a mano, se habría quedado con una cuenta a medias (rol sabido, pero sin ficha con la que ningún composable de la app sabe trabajar).

### Arreglo

- **`supabase/migrations/20261020180000_real_signup.sql`**: `handle_new_user()` ahora también crea la ficha del rol, leyendo de `raw_user_meta_data` (`role`, `full_name`, `name` → display_name/agency_name/company_name según el rol, `detail` → niche/focus/industry, opcional). Se hace en el trigger (`security definer`) y no desde el cliente tras el `signUp()` porque el proyecto exige confirmar el email (`mailer_autoconfirm: false`, comprobado contra el proyecto real) — en ese momento todavía no hay sesión con la que cumplir las policies `..._insert_own` de esas 3 tablas.
- **`app/pages/onboarding.vue`**: mismos pasos de siempre (elegir rol, solo/manager para influencer) + un paso 3 real — nombre, nombre de agencia/empresa si aplica, campo opcional (nicho/especialidad/sector), email, contraseña — que llama a `supabase.auth.signUp()` de verdad. Paso final honesto: "revisa tu email", no "ya estás dentro" (porque no lo está todavía, hasta confirmar).
- **`app/pages/confirm.vue`** (nuevo): a donde Supabase redirige tras confirmar el email (`redirectOptions.callback` en `nuxt.config.ts`, ya apuntaba aquí pero la página no existía — habría dado 404). Resuelve el rol y manda a cada uno a su home, igual que hace `login.vue` tras iniciar sesión.
- **`login.vue` / landing (`LandingHero.vue`, `LandingCta.vue`)**: texto corregido — ya no dice "mira cómo sería"/"ver cómo registrarte", ahora es real.

### Qué queda fuera

- **"Busco un manager" sigue sin acción real** — no existe ningún mecanismo para unirse al roster de una agencia desde la app (ni para que una agencia invite). Ese paso del formulario es solo para ajustar expectativas, no persiste nada. Es trabajo aparte.
- **La app sigue sin desplegar en ningún sitio público** — esto resuelve "cualquiera puede registrarse", no "cualquiera puede llegar a la web". Sigue siendo el otro bloqueante gordo (ver recomendación de hoja de ruta en la conversación).

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- `mailer_autoconfirm`/`disable_signup` comprobados contra el proyecto real vía la API de Supabase (confirmación requerida, alta permitida).
- **Sin aplicar la migración al proyecto real todavía** — pendiente, mismo camino de siempre (SQL Editor, sin CLI logueada en esta máquina).
- **Sin probar en navegador real**: registrarse de verdad, recibir el email (Supabase con el envío por defecto tiene un límite bajo de correos/hora en el plan gratis — si se prueban muchas altas seguidas puede dar "rate limit exceeded", no es un bug), confirmar, y comprobar que `/confirm` resuelve bien el rol y aterriza en la home correcta con la ficha ya creada.

## 2026-10-20 (12) — Consumo de créditos por predicción

Instagram se quedó en pausa (bloqueado en la verificación por SMS de Meta — se retoma más adelante). Mientras tanto, siguiente hueco de Fase 4 que no depende de ninguna app externa ni del trabajo de Mario: el composer ya decía "Consume 1 crédito de tu plan" desde hace tiempo, pero `/api/ml/predict` nunca tocaba `credit_ledger` — era puro texto decorativo. `docs/3-ML-PIPELINE.md`/`4-ROADMAP-AND-TASKS.md` ya dejaban esto como decisión pendiente ("definir número de créditos gratis/mes por plan"), así que se decidió con el usuario antes de tocar código.

### Decisión de producto (confirmada con el usuario)

- **Free**: 3 créditos de regalo, una sola vez al crear la ficha de influencer. Sin recarga mensual todavía (ver "qué queda fuera" abajo).
- **Pro** (influencer, 19,99€/mes) y **Agencia** (manager, 49,99€/mes): 20 créditos en cada cobro con éxito de Stripe (primer pago y cada renovación). En Agencia, **cada influencer de la plantilla del manager recibe sus 20 por separado** — no es un pozo común que se reparte.

### Qué se construyó

- **`supabase/migrations/20261020160000_credit_grants.sql`**: trigger `grant_welcome_credits()` que concede los 3 créditos al crear una fila en `influencers`, + backfill para las fichas que ya existían (las 3 cuentas demo) y que sin esto se habrían quedado atascadas en 0 para siempre.
- **`server/utils/stripe-plans.ts`**: `monthlyCredits` por plan (20/20).
- **`server/api/stripe/webhook.post.ts`**: nuevo handler para `invoice.paid` (no `checkout.session.completed`, a propósito — así el primer cobro y las renovaciones comparten un único camino de código en vez de desincronizarse). Si el titular es un influencer, concede directo; si es un manager (Agencia), reparte entre toda su plantilla actual.
- **`server/api/ml/predict.post.ts`**: antes de llamar al LLM, suma `credit_ledger` del influencer — si el saldo es ≤ 0, `402` ("Sin créditos disponibles..."). Tras guardar la predicción con éxito, descuenta 1 crédito (`reason: 'ml_prediction'`, `related_post_id`). Devuelve `creditsRemaining` para que el cliente no tenga que recargar para ver el saldo nuevo.
- **`app/composables/useMyCredits.ts`** (nuevo): mismo patrón `useState`/`ensureLoaded` que el resto — lee `credit_ledger` directo (ya hay policy de select para el propio influencer), suma en el cliente. Registrado en `resetAccountCaches()`.
- **`PostComposerSheet.vue` / `creator/post/[id].vue`**: el texto fijo de "1 crédito" se sustituyó por el saldo real; el botón de predecir se deshabilita a 0 créditos; el error 402 se distingue del resto ("Sin créditos disponibles. Mejora tu plan...") en vez del genérico "no se ha podido predecir".

### Qué queda fuera de esta primera versión

- **El plan Free no se recarga solo cada mes** — los 3 créditos son un regalo único. Añadir una recarga mensual para Free necesitaría un cron (Supabase Scheduled Function o similar), que no existe todavía en el proyecto.
- **`/api/ml/trends` no consume créditos** — el `reason: 'trend_generation'` ya existe en el esquema pero no se usa: las ideas de tendencia se cachean 24h por nicho (recurso compartido, no "1 acción = 1 crédito" tan limpio como una predicción), así que se dejó fuera a propósito en vez de improvisar una regla.
- **Sin UI de "comprar créditos sueltos"** — solo se recarga vía suscripción.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Servidor de pruebas sano; ruta sin sesión sigue devolviendo `401`.
- **Sin aplicar la migración al proyecto real todavía** (misma limitación de siempre: sin `supabase login` en esta máquina) — pendiente que el usuario la ejecute en el SQL Editor de Supabase.
- **Sin verificar en navegador real**: que el regalo de bienvenida llegue a las cuentas demo tras el backfill, que predecir descuente de verdad, que el botón se bloquee a 0, y que una renovación de Stripe (con `stripe listen` + `STRIPE_WEBHOOK_SECRET`) recargue el saldo.

## 2026-10-20 (11) — OAuth real de Instagram: código listo, falta la app de Meta

Siguiente hueco libre de Fase 4 tras el merge con Mario (Stripe es su terreno, la landing la va a tocar él también — ver conversación). De las redes sociales, solo Instagram por ahora; verificado contra la documentación oficial de Meta (`developers.facebook.com`, vía búsqueda web, no solo memoria) antes de escribir nada, porque este tipo de API cambia de nombre/endpoints con cierta frecuencia.

### Qué se construyó

- **`server/utils/token-crypto.ts`**: cifra/descifra con AES-256-GCM (IV aleatorio por cifrado, todo empaquetado en una sola cadena base64) — probado a mano con un script suelto (roundtrip correcto, manipular el texto cifrado se detecta y falla al descifrar).
- **`server/utils/oauth-state.ts`**: el parámetro `state` del OAuth lleva el `influencerId` firmado con HMAC-SHA256 (mismo secreto que el cifrado) en vez de depender de una tabla o cookie nueva — caduca a los 10 minutos. Probado a mano (firma válida, secreto incorrecto, texto manipulado).
- **`server/api/auth/instagram/start.get.ts`**: resuelve el influencer logueado, construye la URL de autorización de `instagram.com` con el scope mínimo (`instagram_business_basic` — solo identificar la cuenta, nada de publicar/mensajes/comentarios) y redirige el navegador entero (no es un fetch).
- **`server/api/auth/instagram/callback.get.ts`**: cadena de 3 llamadas server-to-server (código → token corto → token largo de 60 días → perfil básico), cifra el token y hace `upsert` en `social_accounts`. Nunca guarda el token en texto plano. Vuelve a `/creator/socials?instagram=connected` o `...=error&reason=...`.
- **`nuxt.config.ts` / `.env` / `.env.example`**: `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`/`INSTAGRAM_REDIRECT_URI` (vacíos, hay que rellenarlos — ver `docs/9-INSTAGRAM-OAUTH-SETUP.md`) y `SOCIAL_TOKEN_ENCRYPTION_KEY` (generada ya para este equipo, 32 bytes en base64).
- **`useMySocialAccounts.ts`**: `connect('instagram')` ahora navega a `/api/auth/instagram/start` en vez de insertar una fila de mentira; el resto de plataformas sigue igual que antes (sin OAuth todavía).
- **`creator/socials.vue`**: mensaje de éxito/error al volver del OAuth, leído de la query de la URL.
- **`docs/9-INSTAGRAM-OAUTH-SETUP.md`** (nuevo, estilo de `docs/6`/`docs/7`/`docs/8`): cómo crear la app en Meta for Developers, registrar el redirect URI, y qué cuentas pueden probarlo sin pasar por App Review.

### Qué es real y qué no

No se pide el número de seguidores (necesitaría `instagram_business_manage_insights`, un permiso más) ni se refresca el token solo (dura 60 días, se puede refrescar pero no hay ningún cron que lo haga todavía). Conectar la cuenta es el primer paso — todavía no hay ninguna llamada que traiga métricas reales con ese token (`creator/metrics.vue` sigue mock, es trabajo aparte).

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio.
- Lógica de cifrado y de firma del `state` probada de forma aislada (scripts sueltos, fuera de la app) — funciona como se espera.
- Ruta sin sesión devuelve `401` (probado con `curl`), igual que el resto de rutas de servidor de este proyecto.
- **Sin verificar el flujo completo todavía**: hace falta que alguien cree la app en Meta for Developers (no se puede hacer desde aquí, necesita una cuenta de Facebook del equipo) y pruebe "Conectar" de verdad con una cuenta de Instagram profesional. Pendiente de confirmación en vivo.

## 2026-10-20 (10) — Merge con la rama estable de Mario (Stripe + su propio arreglo de `useSupabaseUser()`)

`git pull` reveló que las dos sesiones en paralelo habían divergido desde el mismo punto (justo después de "Migracion supabase public.trend") sin llegar a verse: Mario subió Stripe (suscripciones + Connect) y, de forma completamente independiente, encontró y arregló **el mismo fallo de raíz** en `useSupabaseUser()` que las entradas (4)/(5) de abajo documentan desde este lado — ver su propia entrada "(merge) — Mario y Alejandro encontraron el mismo fallo por separado" más abajo para el detalle de cómo lo resolvió él (usó `getUser()` en vez de `getSession()`).

Conflictos solo en 2 archivos (todo lo demás — los archivos nuevos de Stripe, la reconciliación de los composables — se fusionó solo, sin tocar nada):

- **`nuxt.config.ts`**: ambos lados tocaron `openrouterModel` en la misma línea. Resuelto quedándonos con el modelo nuevo (`nvidia/nemotron-3-super-120b-a12b:free` — el antiguo ya no existe, ver entrada (7)) y manteniendo el bloque `public.stripePublishableKey` que añadió Mario para el Checkout de Stripe.
- **`docs/CHANGELOG.md`** (este archivo): ambos lados añadimos entradas nuevas arriba a la vez. Resuelto conservando las de los dos, en dos bloques (primero las de esta sesión, luego las de Mario) en vez de intentar intercalarlas por hora exacta, que no se puede reconstruir con fiabilidad entre dos sesiones en paralelo.

`npx vue-tsc --noEmit` limpio tras el merge.

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
