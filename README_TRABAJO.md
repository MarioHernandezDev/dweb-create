# README_TRABAJO — rama `feature/onboarding`

> Preparado el 2026-10-28, sobre el commit base `aa7f7bd` de `main`. Esta rama y `feature/publicaciones-ux` parten del mismo commit y son independientes entre sí — ninguna depende de la otra. **Esta rama no implementa nada todavía**: este documento solo define alcance y reglas, tal como se pidió.

## A. Objetivo

Diseñar y preparar una experiencia de bienvenida guiada para quien entra a FEEDMA por primera vez — un tutorial breve e interactivo, con un recorrido distinto para creador de contenido y para partner, que explique dónde está cada cosa, anime a dar el primer paso útil, y no vuelva a aparecer una vez visto (aunque se pueda consultar después). Para quien ya usa la app, no debe cambiar nada ni molestar.

**Aviso importante, para no confundirlo con otra cosa que ya existe:** `app/pages/onboarding.vue` **ya existe**, pero es el formulario de **alta de cuenta** (elegir rol, nombre, email, contraseña) — no tiene nada que ver con el tutorial que vas a diseñar. Tu trabajo empieza *después* de eso: cuando alguien, con su cuenta ya creada y su primer login hecho, entra por primera vez a `/creator` o `/partner`.

## B. Alcance funcional

- Bienvenida breve que explique el valor de FEEDMA.
- Recorrido guiado por los apartados principales de la app.
- Explicaciones de contexto de las funcionalidades más importantes.
- Una primera acción recomendada según el rol.
- Posibilidad de saltarlo, y de volver a consultarlo después.
- Que no se repita en cada inicio de sesión una vez visto (o saltado).
- Recorridos distintos para creador y para partner.

No forma parte de este alcance (todavía):
- El tutorial no se implementa en esta tarea, solo se prepara la rama y se documenta el plan.
- No rediseñes las pantallas de publicaciones como parte de este trabajo — es la rama `feature/publicaciones-ux`. Si el tour necesita señalar algo de esas pantallas, apunta a lo que ya existe, no lo cambies.
- No toques el formulario de alta de cuenta (`app/pages/onboarding.vue`) salvo, como mucho, para redirigir al final del registro — y eso hay que decidirlo con calma (ver sección E), no asumirlo.

## C. Archivos que puede modificar

A diferencia de la rama de publicaciones, **esta funcionalidad no existe todavía** — no hay archivos propios que enumerar porque aún no se han creado. Lo que sigue son **ubicaciones propuestas**, no rutas ya existentes:

### Nuevos, de tu funcionalidad (créalos tú cuando toque implementar)
- `app/components/onboarding/**` — componentes del tour (pasos, overlay, tarjetas de bienvenida).
- `app/composables/useOnboardingTour.ts` (o el nombre que seleccionéis) — el estado del tour: paso actual, si está visto/saltado, por rol.
- Si hace falta una página propia para "volver a consultarlo" (en vez de un overlay disparable desde cualquier sitio), decide su ruta antes de crearla y documéntala aquí.

### Existentes, que vas a necesitar leer y probablemente tocar con cuidado
- `app/components/layout/AppShell.vue` — **punto de anclaje recomendado**: ya monta una sola vez, para toda la app, piezas globales como `ConfirmDialogHost.vue`. El tour encaja ahí con el mismo patrón (un componente que se monta una vez y decide solo, con su propio composable, si debe mostrarse) — así casi no tocas el contenido de las páginas de cada rol, solo añades una línea a `AppShell.vue`. Es preferible a editar `creator/index.vue`/`partner/index.vue` directamente (ver sección E, esas dos las toca también la otra rama).
- `app/pages/confirm.vue` — es donde aterriza alguien justo después de confirmar su email y antes de ir a `roleMeta[role].home` (`/creator` o `/partner`). Es el sitio más natural para, en el futuro, decidir "esta es tu primera vez" — pero de momento solo léelo, no lo cambies sin coordinar.
- `app/utils/nav.ts` (`roleMeta`) — ya tiene el texto descriptivo de cada rol (`label`, `description`, `home`, `icon`) que te puede servir de punto de partida para los textos del tour.
- `app/utils/status.ts` — utilidades genéricas que puedes necesitar para mostrar ejemplos (`relativeTime`, `dueLabel`) — no el resto del archivo, que es de publicaciones/colaboraciones.

### Fuera de tu alcance (no los toques como parte de esta tarea)
- `app/pages/creator/timeline.vue`, `app/pages/creator/post/[id].vue`, `app/components/timeline/**`, `app/composables/useMyPosts.ts`/`usePartnerPosts.ts`/`usePostRevisions.ts`/`useChecklist.ts`/`useLabels.ts`/`usePostEditorPanel.ts` — es la rama `feature/publicaciones-ux`.
- `app/components/collab/**` (negociación, valoraciones).
- `app/pages/login.vue`, `app/middleware/role-guard.global.ts` salvo que el plan del tour exija tocarlos de verdad — y en ese caso, coordinar primero (sección E).
- Cualquier migración de `supabase/migrations/`, RPC o policy de RLS sin coordinar antes (sección F).
- Stripe, pagos, panel de administración.

## D. Límites del trabajo

- No rediseñes las pantallas ni los componentes específicos de publicaciones como parte de tu trabajo — si el tour necesita señalar el Tablero o una publicación, hazlo apuntando a lo que ya existe (con un overlay/spotlight encima, por ejemplo), no cambiando esas pantallas.
- No toques la navegación general (`AppShell.vue`, `BottomTabBar.vue`, `SideRail.vue`, `TopBar.vue`) más allá de añadir el punto de montaje del tour — no es tu tarea rediseñarla.
- No implementes el tour todavía en esta preparación — primero define el diseño (pasos, contenido por rol, mecanismo de "saltar"/"volver a ver") y revísalo con el resto del equipo antes de construirlo, tal como pidió el usuario.

## E. Dependencias compartidas y coordinación

**Lo que puedes hacer sin avisar:** crear archivos nuevos en `app/components/onboarding/**` y tu propio composable — mientras no dependan de cambiar algo que ya existe.

**Lo que hay que coordinar antes de tocar:**
- `app/components/layout/AppShell.vue` — es el archivo compartido más probable entre las dos ramas. La otra persona trabaja en publicaciones y no debería necesitar tocar este archivo a menudo, pero si los dos necesitáis añadir algo aquí el mismo día, añadidlo cada uno sin tocar lo que puso el otro, y avisad antes de hacerlo.
- `creator/index.vue` / `partner/index.vue` — **evítalos si puedes** (ver recomendación de usar `AppShell.vue` como punto de anclaje en la sección C); si el diseño del tour acaba necesitando señalar algo muy concreto de esas páginas con coordenadas/anclas en el propio HTML (no solo un overlay flotante), avisa antes de tocarlas — la otra rama trabaja activamente ahí.
- `app/pages/confirm.vue`, `app/pages/onboarding.vue`, `app/middleware/role-guard.global.ts` — tocar el flujo de "qué pasa justo después de crear la cuenta" es sensible (afecta a cada alta nueva, incluidas las cuentas demo si no se filtran bien) — decide el diseño, compártelo, y no lo implementes sin que quede claro que no rompe el alta normal.

**Cómo avisar:** igual que en la otra rama — un mensaje corto antes de tocar algo de la lista de arriba. Si los dos necesitáis el mismo archivo compartido el mismo día, que lo use primero quien lo tenga más avanzado y el otro aplica su cambio encima después, coordinado.

## F. Supabase y servicios externos

- **Entorno**: el mismo proyecto de Supabase remoto compartido que usa toda la app (`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` en `.env`) — no hay proyecto de pruebas separado. Ver `docs/CONTEXTO_PROYECTO_FEEDMA.md` §4.4 para el porqué.
- **Persistencia del progreso del tour — pendiente de decidir, no implementar todavía**: hacen falta datos para saber si alguien ya vio (o saltó) el tour. Dos caminos razonables, a decidir antes de construir nada:
  1. **Una columna nueva en `profiles`** (p. ej. `onboarding_completed_at timestamptz`) — mismo patrón que ya se usó para añadir `chat_privacy` (`20261021160000_chat_packages_offers.sql`) o `avatar_url` (`20261022090000_profile_avatar.sql`): una migración pequeña, con `add column if not exists`. Esto es un cambio de esquema real — documenta la columna exacta, por qué, y qué RLS necesitaría (probablemente ninguna nueva, ya que `profiles` ya tiene policies de lectura/escritura del propio perfil) y confírmalo con el resto del equipo antes de escribir la migración.
  2. **Guardarlo en el propio navegador** (`localStorage`), sin tocar la base de datos — más simple y sin riesgo de esquema, pero no sigue a la persona entre dispositivos y se pierde si limpia datos del navegador. Puede ser suficiente para una primera versión.
  - Mientras no se decida, no asumas ninguna de las dos — es justo el tipo de decisión que el usuario pidió explícitamente documentar, no tomar por tu cuenta.
- **No apliques ninguna migración a este proyecto compartido sin que esté acordada** — un cambio de esquema aquí afecta también a la cuenta de cada creador/partner real, no es un entorno de pruebas aislado.
- **Cuentas para probar el tour**: usa cuentas nuevas, creadas de verdad a través de `/onboarding` (el alta real), en vez de las cuentas demo del equipo (`creator@feedma.test`/`partner@feedma.test`) — esas las usa constantemente el trabajo de publicaciones y el resto del equipo; si el tour les añade estado (marcado como "visto"), podría interferir con sus pruebas. Borra las cuentas de prueba que crees para probar el tour cuando termines una sesión de trabajo (puede hacerse desde el propio panel de Supabase o pidiendo ayuda con `service_role` si hace falta borrar en cascada).
- **Rate limit de autenticación**: Supabase limita los intentos de login por contraseña en una ventana de tiempo. Si pruebas el flujo de alta+primer login muchas veces seguidas, puedes agotarlo — si ves "Request rate limit reached", es eso, no un fallo de tu código; espera unos minutos.
- **Otros servicios compartidos**: ninguno más debería afectarte directamente (Stripe, OpenRouter y OAuth de Instagram/YouTube no son parte de este alcance), salvo que el tour quiera mostrar un ejemplo de alguno de ellos — en ese caso, son solo lectura de datos que ya existen, no una integración nueva.

## G. Pruebas

Comandos reales del proyecto (`package.json`), no inventados:

```bash
npx vue-tsc --noEmit      # typecheck — no hay comando de lint en package.json
npm test -- --run          # tests unitarios (Vitest, sin red, 30 tests a fecha de este documento)
npm run build               # build de producción completo
```

`npm run test:integration` solo hace falta si tu trabajo acaba tocando de verdad algo de Supabase (por ejemplo, si se decide la columna de `profiles` de la sección F) — mientras el tour sea solo interfaz y estado local/propio, no debería hacer falta.

No hay comprobación visual automática: el tour es, por naturaleza, una experiencia muy visual y de interacción (pasos, overlays, animaciones) — tiene que verse y probarse de verdad en un navegador, en móvil y escritorio, antes de darlo por terminado.

## H. Criterios para considerar terminado el trabajo

Para esta fase de preparación (la que cubre este documento): ninguno — no hay código que terminar todavía. Para cuando se empiece a implementar el tour de verdad:

- El diseño (pasos, contenido por rol, mecanismo de saltar/volver a ver, dónde se persiste el progreso) se ha compartido y acordado antes de escribir código, tal como pidió el usuario.
- `npx vue-tsc --noEmit`, `npm test -- --run` y `npm run build` pasan limpios.
- El tour se ha visto de verdad en un navegador, con una cuenta nueva real (no demo), en móvil estrecho (~390px) y en escritorio.
- Saltar el tour funciona, y no obliga a nadie que ya lo vio a verlo de nuevo en el siguiente login.
- Ningún cambio compartido (sección E) se ha hecho sin coordinarlo.
- Si se tocó Supabase, la migración se documentó y acordó antes de aplicarse (sección F), y queda registrada en `docs/CHANGELOG.md`.

> **Nota sobre otros documentos del repo**: `README.md` (raíz) tiene una sección "Fases del proyecto" y `docs/5-FRONTEND-WORK-SPLIT.md` describe un reparto de trabajo — los dos son de una fase muy anterior del proyecto (frontend con datos de mentira, 3 roles en vez de 2) y están desactualizados. Para el estado real, usa `docs/CHANGELOG.md`, `docs/CONTEXTO_PROYECTO_FEEDMA.md`, `docs/PENDIENTES.md` y `docs/10-ROADMAP-FUTURO.md`.

## I. Procedimiento Git

Comprobar en qué rama estás:
```bash
git branch --show-current
```

Cambiar a esta rama (si no estás ya en ella):
```bash
git checkout feature/onboarding
```

Antes de empezar cada sesión de trabajo:
```bash
git fetch origin
git log main..origin/main --oneline   # comprobar si hay algo nuevo en main antes de seguir
```

Revisar el estado y los cambios:
```bash
git status
git diff
```

Hacer commits pequeños y descriptivos:
```bash
git add <archivos concretos, nunca `git add -A` a ciegas>
git commit -m "Onboarding: <qué cambia y por qué>"
```

Subir la rama (primera vez necesita `-u`):
```bash
git push -u origin feature/onboarding
```

Comprobar diferencias con `main` antes de proponer integrar:
```bash
git diff main...feature/onboarding --stat   # qué archivos cambiaron
git diff main...feature/onboarding           # el diff completo
git log main..feature/onboarding --oneline   # commits propios de esta rama
```

Preparar la integración: abre un Pull Request hacia `main` cuando el diseño esté implementado y cumpla la sección H — no fusiones en local, y no fusiones esta rama con `feature/publicaciones-ux` ni al revés por tu cuenta.

## J. Riesgos y precauciones

- **El riesgo más real de esta funcionalidad es que moleste en vez de ayudar** — el usuario fue explícito: "no quiero que el tutorial aparezca cada vez que se inicia sesión ni que bloquee la aplicación". Antes de dar nada por terminado, comprueba que cerrar/saltar el tour de verdad lo deja cerrado en el siguiente login, no solo en esa pestaña.
- **No implementes el tutorial global todavía** — el usuario fue explícito en que primero hay que estabilizar publicaciones; esta rama es para preparar el terreno y, como mucho, diseñar/documentar, no para lanzar el tour a producción sin esa luz verde.
- **Cuidado con anclar el tour a elementos concretos del HTML de páginas que la otra rama está cambiando activamente** (`creator/index.vue`, `partner/index.vue`, `creator/timeline.vue`) — si el tour depende de que un botón esté exactamente en tal sitio con tal clase, un cambio de la otra rama puede romper el tour en silencio. Prefiere anclar por elementos estables (rutas de navegación, landmarks con `aria-label`) en vez de posiciones o estructuras internas de una pantalla que no es tuya.
- **No crees cuentas de prueba del tour contra el proyecto compartido sin limpiarlas** — mismo motivo que con publicaciones: ya ha pasado antes que residuos de prueba se queden mezclados con datos reales (ver `docs/CONTEXTO_PROYECTO_FEEDMA.md` §4.3).
- **Si el diseño acaba necesitando la columna nueva en `profiles`** (sección F), recuerda que es una tabla que lee y escribe prácticamente toda la app (login, perfil, chat, notificaciones) — una migración mal pensada ahí tiene más radio de impacto del que parece a primera vista.
