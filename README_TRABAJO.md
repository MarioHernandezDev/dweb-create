# README_TRABAJO — rama `feature/publicaciones-ux`

> Preparado el 2026-10-28, sobre el commit base `aa7f7bd` de `main`. Esta rama y `feature/onboarding` parten del mismo commit y son independientes entre sí — ninguna depende de la otra. **Esta rama no implementa nada todavía**: este documento solo define alcance y reglas, tal como se pidió.
>
> ⚠️ Antes de fiarte de cualquier otro documento del repo sobre "cómo está organizado el trabajo", lee la nota de la sección H de este archivo — varios de esos documentos están desactualizados.

## A. Objetivo

Mejorar la experiencia de uso de las **publicaciones** de FEEDMA (el tablero Kanban de entregas de un creador y todo lo que gira alrededor de una publicación individual), para que un creador — y, donde corresponda, el partner que revisa su trabajo — entienda sin esfuerzo qué es una publicación, en qué fase está, qué puede hacer con ella y cuál es el siguiente paso, en móvil y en escritorio.

Nota importante antes de empezar: **una parte considerable de este trabajo ya se hizo** en la sesión del 2026-10-24 (ver `docs/CHANGELOG.md`, entradas 49, 50 y 52) — "fuera de plazo" real, revisión del partner desde el Calendario de una colaboración, aviso al saltarse la revisión, unificación del panel de edición con la página completa, explicaciones de contexto, Tablero colapsable en móvil. Antes de proponer una mejora, comprueba en esas entradas si ya está hecha.

## B. Alcance funcional

Pantallas y piezas que forman parte de "publicaciones":

- El Tablero del creador (`/creator/timeline`) y el detalle de una publicación (`/creator/post/[id]`).
- El panel de edición rápida de una publicación desde el Tablero.
- La vista de calendario de publicaciones dentro de una colaboración (pestaña "Calendario" en el detalle de una colaboración, tanto para el creador como para el partner).
- La revisión de una publicación por parte del partner (aprobar / pedir cambios) allí donde aparece.
- Etiquetas y checklist de una publicación.
- El historial de revisión de una publicación.

Lo que **no** es parte de este alcance (son otra cosa, aunque estén cerca):
- La negociación de una colaboración en sí (aceptar/rechazar/contraoferta) — eso vive en `NegotiationPanel.vue` y es lógica de colaboración, no de publicación.
- El chat y las ofertas de paquete — es otra funcionalidad.
- El tutorial/onboarding global de la app — es la rama `feature/onboarding`.

## C. Archivos que puede modificar

Rutas reales, comprobadas en el repo (no inventadas):

### Propios de publicaciones (modifícalos con libertad)
- `app/pages/creator/timeline.vue`
- `app/pages/creator/post/[id].vue`
- `app/components/timeline/PhaseBoard.vue`
- `app/components/timeline/BoardCard.vue`
- `app/components/timeline/DeliverableCard.vue`
- `app/components/timeline/WeekBoard.vue`
- `app/components/timeline/PostComposerSheet.vue`
- `app/components/timeline/PostEditSheet.vue`
- `app/components/timeline/PostDetailSheet.vue`
- `app/components/timeline/PostReviewActions.vue`
- `app/components/timeline/CoverUploader.vue`
- `app/composables/useMyPosts.ts`
- `app/composables/usePartnerPosts.ts`
- `app/composables/usePostRevisions.ts`
- `app/composables/useChecklist.ts`
- `app/composables/useLabels.ts`
- `app/composables/usePostEditorPanel.ts`

### Compartidos que probablemente necesites tocar (ver sección E antes de hacerlo)
- `app/pages/creator/index.vue` ("Hoy") y `app/pages/partner/index.vue` ("Inicio") — son dashboards mixtos: tienen secciones de publicaciones (próximas entregas, "Tu calendario", el aviso de "fuera de plazo") entrelazadas con secciones que no lo son (sugerencias de Descubrir, mensajes sin leer, consejos de ficha). Es muy probable que `feature/onboarding` también necesite tocar estas dos páginas (para anclar el tour la primera vez que alguien entra). **Ver sección E.**
- `app/pages/creator/requests.vue` y `app/pages/partner/requests.vue` — la pestaña "Calendario" del detalle de una colaboración es de publicaciones; las pestañas "Brief" y "Registro" no lo son (`CollaborationTermsCard.vue`, `CollaborationLogCard.vue`, `NegotiationPanel.vue`). Si tocas estos archivos, hazlo solo en el bloque de la pestaña Calendario.
- `app/utils/status.ts` — tiene de todo: lo específico de publicaciones (`statusMeta`, `phaseDescription`, `creatorNextStepHint`, `partnerNextStepHint`, `isPostOverdue`, `overdueLabel`, `movingSkipsPartnerReview`) y lo específico de colaboraciones (`collaborationStatusMeta`, `isActiveCollaborationStatus`, `isUnresolvedCollaborationStatus`), además de utilidades genéricas (`relativeTime`, `dueLabel`, `dateDividerLabel`) que probablemente también use el onboarding para mostrar ejemplos. Añade, no reescribas lo que ya existe.
- `app/components/ui/EmptyState.vue`, `app/components/ui/StatusPill.vue`, `app/components/ui/StatusGlyph.vue`, `app/components/ui/Fab.vue` — componentes base genéricos que usan más pantallas que solo publicaciones.
- `app/types/index.ts` — si necesitas un campo nuevo en `Post`, añádelo sin tocar los demás tipos.

### Fuera de tu alcance (no los toques como parte de esta tarea)
- Todo lo de autenticación/sesión (`app/pages/login.vue`, `app/pages/onboarding.vue`, `app/middleware/role-guard.global.ts`, `app/utils/auth-errors.ts`).
- El tutorial guiado global y cualquier componente nuevo que cree la otra rama.
- `app/components/collab/**` (negociación, valoraciones, registro de colaboración) salvo que el cambio sea estrictamente dentro de la pestaña Calendario mencionada arriba.
- `app/pages/chat/**`, `app/components/chat/**`.
- Cualquier migración de `supabase/migrations/`, cualquier RPC, cualquier policy de RLS — ver sección F.
- Stripe (`server/api/stripe/**`, `server/utils/stripe*.ts`) y pagos.

## D. Límites del trabajo

- No implementes el tutorial global ni ningún componente de onboarding — eso es de la otra rama.
- No rediseñes la navegación general (`app/components/layout/AppShell.vue`, `BottomTabBar.vue`, `SideRail.vue`, `TopBar.vue`, `app/utils/nav.ts`) salvo que el cambio sea mínimo y estrictamente necesario para publicaciones (p. ej. un badge nuevo) — y en ese caso, coordínalo primero (sección E).
- No toques la lógica de aceptar/rechazar una colaboración ni de pago — eso ya funciona y está fuera de este encargo.
- No cambies el esquema de datos, RLS ni RPCs sin documentar el impacto y confirmar antes (sección F) — aunque te parezca un cambio menor.

## E. Dependencias compartidas y coordinación

**Lo que puedes cambiar sin avisar:** cualquier archivo de la lista "propios de publicaciones" de la sección C, mientras no cambies el comportamiento de una función que use otra parte de la app (por ejemplo, `useMyPosts.ts` lo usa también `creator/index.vue`, que no es tuyo del todo — ver abajo).

**Lo que hay que coordinar antes de tocar:**
- `creator/index.vue` / `partner/index.vue` — si el onboarding necesita anclar un paso del tour a algo de estas páginas (muy probable, son las páginas de inicio de cada rol), un cambio tuyo en la misma zona puede chocar. Antes de reestructurar algo ahí (no de añadir una línea suelta), avisa a tu compañero.
- `app/utils/status.ts` — si los dos necesitáis añadir algo aquí el mismo día, añadidlo cada uno al final de su bloque correspondiente, nunca reordenando ni tocando lo que ya existe del otro.
- `creator/requests.vue` / `partner/requests.vue` — igual que arriba: la pestaña Calendario es tuya, el resto de la hoja de detalle no.

**Cómo avisar:** un mensaje corto al otro antes de empezar ("voy a tocar el bloque de 'Tu calendario' en `partner/index.vue`, el resto de la página no lo toco") es suficiente — no hace falta una reunión salvo que el cambio sea estructural (mover secciones de sitio, cambiar el layout general de la página).

**Si los dos necesitáis cambiar el mismo archivo el mismo día:** que lo haga quien lo tenga más avanzado, y el otro aplica su cambio encima después (coordinado, no a ciegas) — o resolvedlo en llamada si no está claro. Nunca seléis "mi versión"/"la suya" sin leer las dos partes del conflicto.

## F. Supabase y servicios externos

- **Entorno**: un único proyecto de Supabase remoto (hosteado, no local) — el que ya está configurado en `.env` (`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`). Lo comparten las dos ramas y el resto de la app. No existe un proyecto de pruebas separado — es una decisión ya tomada, documentada en `docs/CONTEXTO_PROYECTO_FEEDMA.md` §4.4.
- **Tablas que puede leer/escribir tu trabajo**: `posts`, `post_labels`, `labels`, `checklist_items`, `post_revision_notes`. Indirectamente lee `collaborations` (para saber si una publicación está ligada a una activa) y `ml_predictions` (predicción de éxito), sin escribir en ellas.
- **RPCs que ya existen y usa tu trabajo, sin tocarlas**: `approve_post`, `request_post_changes` (las usa `usePartnerPosts.ts`). Si crees que hace falta cambiar su firma o su lógica, es justo el tipo de cambio que necesita justificarlo y confirmarlo antes — no lo hagas sin pasar por esa conversación.
- **No se necesita ninguna migración nueva para el alcance previsto** de esta rama (textos, estados vacíos, organización visual, ayudas contextuales no tocan el esquema). Si durante el trabajo descubres que hace falta un campo nuevo en `posts` o similar, para — documenta qué tabla/columna, por qué, y qué otras partes de la app podrían verse afectadas, y confírmalo antes de escribir la migración.
- **Riesgo real de compartir el proyecto**: los tests de integración (`npm run test:integration`) escriben y limpian datos reales contra este mismo proyecto, usando las cuentas demo (`creator@feedma.test`/`partner@feedma.test`). Si tu compañero está probando el onboarding con cuentas nuevas creadas por `/onboarding` al mismo tiempo que tú ejecutas los tests de integración, no deberíais chocar en los datos (cuentas distintas), pero sí podéis chocar en el **límite de autenticación por contraseña** de Supabase si los dos autenticáis mucho en poco tiempo — si ves errores de "Request rate limit reached" sin motivo aparente, espera unos minutos antes de asumir que es un fallo tuyo.
- **Cómo probar sin interferir**: usa las cuentas demo para tu trabajo normal (es lo que ya se ha hecho en todas las sesiones anteriores sobre publicaciones). Evita ejecutar `npm run test:integration` muchas veces seguidas en poco tiempo.
- **Tipos generados**: no existen (`types: false` en `nuxt.config.ts`) — los tipos de los datos de Supabase se escriben a mano en cada composable (interfaces `PostRow`, etc.). Si algún día se generan con `supabase gen types`, es un cambio que afecta a toda la app, no solo a esta rama.

## G. Pruebas

Comandos reales del proyecto (`package.json`), no inventados:

```bash
npx vue-tsc --noEmit      # typecheck — no hay comando de lint en package.json
npm test -- --run          # tests unitarios (Vitest, sin red, 30 tests a fecha de este documento)
npm run build               # build de producción completo
npm run test:integration    # tests contra Supabase real — solo si tocaste composables/RPCs de publicaciones, y con cuidado con el límite de autenticación (ver sección F)
```

No hay comprobación visual automática: cualquier cambio de interfaz debe verse en un navegador real (dev server + cuenta demo) antes de darlo por bueno — no basta con que pase `vue-tsc`.

## H. Criterios para considerar terminado el trabajo

- `npx vue-tsc --noEmit`, `npm test -- --run` y `npm run build` pasan limpios.
- Si se tocó algo que usa `usePartnerPosts.ts`/`usePostRevisions.ts`/RPCs, `npm run test:integration` pasa (o se repitió tras el límite de autenticación, no se interpretó un fallo de rate limit como regresión).
- El cambio se ha visto de verdad en un navegador (no solo deducido del código) en al menos un móvil estrecho (~390px) y en escritorio, con una cuenta demo real.
- Cada cambio queda documentado en `docs/CHANGELOG.md` (nueva entrada arriba, con qué se cambió, qué se verificó de verdad y qué no) — es la convención que ya sigue todo el proyecto, no la rompas.
- No se ha tocado ningún archivo fuera del alcance de la sección C sin coordinarlo antes (sección E).

> **Nota sobre otros documentos del repo**: `README.md` (raíz) tiene una sección "Fases del proyecto" y `docs/5-FRONTEND-WORK-SPLIT.md` describe un reparto de trabajo — los dos son de una fase muy anterior del proyecto (frontend con datos de mentira, 3 roles en vez de 2) y están desactualizados; el propio `docs/5-FRONTEND-WORK-SPLIT.md` ya se marca a sí mismo como parcialmente desfasado. Para el estado real del proyecto, usa `docs/CHANGELOG.md`, `docs/CONTEXTO_PROYECTO_FEEDMA.md`, `docs/PENDIENTES.md` y `docs/10-ROADMAP-FUTURO.md`.

## I. Procedimiento Git

Comprobar en qué rama estás:
```bash
git branch --show-current
```

Cambiar a esta rama (si no estás ya en ella):
```bash
git checkout feature/publicaciones-ux
```

Antes de empezar cada sesión de trabajo, traer lo último de `main` por si hubo algo urgente fuera de esta preparación (no debería haberlo, pero por seguridad):
```bash
git fetch origin
git log main..origin/main --oneline   # comprobar si hay algo nuevo antes de mezclarlo
```

Revisar el estado y los cambios:
```bash
git status
git diff
```

Hacer commits pequeños y descriptivos (igual que el resto del historial del proyecto — mensaje corto en primera línea, cuerpo opcional con el porqué):
```bash
git add <archivos concretos, nunca `git add -A` a ciegas>
git commit -m "Publicaciones: <qué cambia y por qué>"
```

Subir la rama (primera vez necesita `-u`):
```bash
git push -u origin feature/publicaciones-ux
```

Comprobar diferencias con `main` antes de proponer integrar:
```bash
git diff main...feature/publicaciones-ux --stat   # qué archivos cambiaron
git diff main...feature/publicaciones-ux           # el diff completo
git log main..feature/publicaciones-ux --oneline   # commits propios de esta rama
```

Preparar la integración: cuando el trabajo esté terminado (sección H cumplida), abre un Pull Request hacia `main` en vez de fusionar en local — deja rastro de qué cambió y por qué, y da pie a una revisión cruzada antes de fusionar. No fusiones esta rama con `feature/onboarding` ni al revés por tu cuenta.

## J. Riesgos y precauciones

- **Romper el arrastre del Tablero sin darte cuenta**: `PhaseBoard.vue` tiene lógica no trivial alrededor de `vuedraggable` (el `board` reactive se sincroniza a mano con `posts`, ver los comentarios del propio archivo) — si tocas la lógica de sincronización, prueba arrastrar de verdad en el navegador, no solo leer el código.
- **El selector de fase de cada card es la alternativa sin arrastrar** — en móvil, es el único camino para mover algo a una columna colapsada. Si cambias `BoardCard.vue`, no rompas ese selector.
- **No conviertas el aviso de "te vas a saltar la revisión" en un bloqueo real** sin confirmar antes — hoy es solo una confirmación (`movingSkipsPartnerReview` en `utils/status.ts`), convertirlo en un bloqueo de verdad sería un cambio de permisos/RLS, no de interfaz.
- **Los textos nuevos de contexto (estados vacíos, "qué hacer ahora") no deben repetir lo que ya dice el estado/fase** — el objetivo de este trabajo es reducir confusión, no añadir más texto por añadir.
- **Cuidado con dejar residuos de prueba reales**: si creas publicaciones de prueba contra el proyecto de Supabase compartido para probar un cambio, bórralas al terminar — ya ha pasado varias veces en este proyecto que datos de prueba se quedan mezclados con datos reales (ver `docs/CONTEXTO_PROYECTO_FEEDMA.md` §4.3 para el precedente).
