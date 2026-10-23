# Changelog de sesiones de desarrollo

Registro de qué se hizo, por qué, y qué queda pendiente de verificar — pensado para que el otro miembro del equipo pueda retomar sin tener que adivinar el estado real del proyecto. Se añaden entradas nuevas arriba.

---

## 2026-10-23 (35) — Fase 0 del traspaso CONTEXT.md: commit del backlog, rama nueva, dos bugs verificados y corregidos

Traspaso técnico recibido de una auditoría de usabilidad hecha en navegador por otra sesión (`CONTEXT.md`, 21+2 hallazgos). Antes de aplicar nada, se verificaron en código real las pistas más críticas, tal y como pide el propio documento ("salen de nombres de archivo, no de leer el código").

### Verificado en código (no solo hipótesis)

- **#3 — Residuos de test en el chat real**: causa raíz confirmada. `messages.offer_id` es `on delete set null`, no `cascade` — el test "ciclo completo" de `offers.spec.ts` dejaba un mensaje de sistema real y permanente en la conversación de las cuentas demo en cada ejecución (el precio de prueba, 111,11 €, coincidía exacto con los ~20 mensajes que reportó la auditoría). Corregido: el test captura el id del mensaje y lo borra explícitamente con `service_role`. Limpiados los 12 mensajes ya acumulados esta sesión.
- **N2 — "Mensajes sin leer" con el nombre equivocado**: causa raíz confirmada. `resetAccountCaches()` nunca vaciaba el estado de `useChat()` — al cambiar de cuenta sin recarga completa, la lista de conversaciones quedaba calculada con el perfil de la cuenta anterior. Añadido `useChat().reset()`. (No se tocó `realtimeStarted`/el canal de Realtime — resetearlo forzaría una segunda suscripción duplicada; queda como hallazgo relacionado pero distinto, sin corregir todavía.)
- **N1 — no es un fallo, son dos definiciones distintas**: "Solicitudes pendientes" (Inicio del partner) = solo lo que espera tu respuesta; "Pendientes" (Colaboraciones) = todo lo sin resolver. Ambas correctas, mal nombradas igual.

### Hecho

- Commiteado en `main` todo el backlog acumulado de la sesión (Fase C completa + reorganización de navegación, fases 1-3) — el árbol no estaba limpio, lo que impedía empezar la Fase 0 según el propio documento.
- Creada la rama `fase0-usabilidad-prep` para este trabajo.
- Corregidos y verificados los dos bugs anteriores (60/60 tests de integración, 30/30 unitarios, build limpio).
- `DESIGN.md` aparece borrado en el árbol, sin commitear, de origen desconocido — se ha dejado explícitamente sin tocar hasta confirmar con el usuario.

### Pendiente (depende de decisiones ya tomadas por el usuario, no de código)

- Entorno de pruebas: segundo proyecto de Supabase en la nube — pendiente de que se cree y se compartan sus credenciales; no se puede provisionar desde aquí.
- Accesos demo solo en desarrollo (`import.meta.dev` o variable de entorno) — Fase 1 del plan de CONTEXT.md, no de la Fase 0.
- El resto de hallazgos de prioridad media/baja del informe siguen sin tocar, a la espera de las fases siguientes.

## 2026-10-23 (34) — Reorganización de navegación, Fase 3 (retirada de "Colaboraciones" en Ajustes + fix de enlaces)

Antes de retirar la pestaña antigua, el usuario pidió una auditoría explícita de 4 puntos. Se encontró un hueco real (no cubierto en Fase 2) y, al revisar los enlaces de notificación relacionados, un bug preexistente sin relación con esta reorganización.

### Hueco encontrado y corregido

`server/api/stripe/pay-collaboration.post.ts` tenía el destino de vuelta de Stripe **fijo por código**: `success_url`/`cancel_url` apuntaban siempre a `/partner/profile?payment=...`, sin importar desde qué pantalla se inició el pago. Con el botón "Pagar" ya añadido a `/partner/requests` en la Fase 2, esto significaba volver de Stripe a una pantalla distinta de la que se estaba viendo — justo el "perder el contexto" que se quería evitar. El cobro en sí (`paid_at`, vía webhook) es completamente independiente de esta URL, así que el cambio es seguro: cero riesgo sobre el dinero real.

- `success_url`/`cancel_url` ahora apuntan a `/partner/requests?payment=...&collaboration=<id>`.
- `partner/requests.vue` lee esos parámetros: fuerza un refresco real de las colaboraciones (el webhook puede haber escrito `paid_at` hace solo un instante), muestra el mismo aviso "Pago enviado"/"Pago cancelado" que antes solo existía en Ajustes, y **reabre automáticamente la hoja de detalle de esa misma colaboración** — no solo "la misma página", el mismo contexto exacto.

### Enlaces de notificación corregidos (`supabase/migrations/20261025190000_fix_notification_links.sql`)

- `notify_collaboration_updated()` y `respond_offer()`: apuntaban a `/partner/profile` (la pestaña que se retira). Ahora apuntan a `/partner/requests`.
- **Bug preexistente, no causado por esta reorganización**, encontrado al revisar lo anterior: `submit_collaboration_rating()` tenía los enlaces **cruzados** — cuando el partner valoraba, el aviso al creador (quien lo recibe) apuntaba a `/partner/profile` (una ruta que un creador no puede abrir); cuando el creador valoraba, el aviso al partner apuntaba a `/creator/requests`. Corregido: el enlace de cada aviso es siempre la ruta de quien lo recibe, no la del rol de quien valora.

### Retirada de la pestaña "Colaboraciones" de `partner/profile.vue`

Confirmado antes de retirarla que no se perdía ninguna función: la lista de colaboraciones + pagar/completar/valorar ya estaba íntegra (y mejor, con pestañas Pendientes/Historial) en `/partner/requests`; el enlace "Descubrir más" deja de hacer falta porque "Descubrir" ya es un destino de menú principal desde la Fase 1. Se elimina el bloque entero, el aviso de pago de esa página y todo el código que solo usaban (`payableStatuses`, `confirmPay`, `confirmMarkCompleted`, `formatDate`, el `useMyCollaborations()` de esa página).

### Verificado de verdad

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- Migración aplicada y confirmada.
- **`tests/integration/notification-links.spec.ts`** (nuevo, 5 tests): `mark_collaboration_completed` y `submit_collaboration_rating` en ambas direcciones, sobre colaboraciones de prueba aisladas (nunca sobre las cuentas de demo compartidas — `collaboration_ratings` no tiene policy de delete), comprobando el `link` real guardado en `notifications`. `offers.spec.ts` ampliado con la misma comprobación sobre su propio ciclo completo ya existente. **60/60 en toda la suite de integración**, sin regresiones.
- SSR real: `/partner/requests?payment=success&collaboration=<id>` muestra el aviso; `/partner/profile` ya no contiene la pestaña ni su contenido (confirmado por `grep` que solo queda el nombre "Colaboraciones" del menú de navegación, no de la pestaña retirada).

### Sin verificar

- La interacción real en navegador: completar un pago de verdad en Stripe y comprobar visualmente que la hoja de la colaboración se reabre sola al volver — no hay herramienta de navegador en esta sesión. El mecanismo se verificó pieza por pieza (URL de redirección, lectura de query params, refresco forzado, apertura de la hoja) pero no de principio a fin con un pago real.

### Pendiente

Fase 4 (opcional, fusionar Redes+Métricas en "Mis redes" — pendiente de validar con datos de uso reales si penaliza a quien usa Métricas a menudo).

## 2026-10-23 (33) — Reorganización de navegación, Fase 2 (detalle de colaboración en dos niveles)

Segunda fase del plan acordado. Reorganiza `creator/requests.vue` y `partner/requests.vue` en los dos niveles presentados en el documento: Nivel 1 fijo (quién, estado, acción del momento) + pestañas Brief/Calendario/Registro para consulta ocasional.

### Qué se cambió

- **Nivel 1, siempre visible, nunca en pestaña**: avatar + nombre + `StatusPill` (sin cambios) + una línea del brief truncada a 1 línea (antes el párrafo completo) + la acción del momento según estado: `NegotiationPanel` (negociar), **"Pagar"** (nuevo aquí), "Marcar como completada" o `RatingPrompt`.
- **Adelanto explícito, pedido por el usuario**: el botón "Pagar" y "Marcar como completada" para el partner, hasta ahora solo en `partner/profile.vue` (pestaña "Colaboraciones" de Ajustes — el hallazgo central de la auditoría), se añaden aquí reutilizando exactamente el mismo composable (`useMyCollaborations`: `payForCollaboration`, `markCompleted`, `paying`, `payError`) — ninguna lógica de negocio nueva, ningún cambio de RLS/Stripe. La pestaña de Ajustes **se deja intacta por ahora** (no se retira todavía, eso sigue siendo la Fase 3, una vez confirmado que este sitio cubre todos los casos). Como consecuencia, `handleAccept` en `partner/requests.vue` ya no cierra la hoja ni redirige a `/partner/profile?tab=collabs` — se queda en la misma hoja, ya con el botón de pago visible.
- **Pestaña "Brief"**: fusiona el brief libre + `CollaborationTermsCard` (campaña/condiciones) + las fechas (pedida/resuelta/cobrado) — mismos componentes, sin cambios internos.
- **Pestaña "Calendario"**: el `WeekBoard` acotado ya no es de solo lectura — pulsar un entregable expande, dentro de la misma pestaña (sin sheet nueva, sin navegar), un bloque con portada/caption/estado y su **checklist de solo lectura** (reutilizando `useChecklist()`, misma tabla ya visible desde la migración de "seguimiento del progreso"). Resuelve directamente lo que pedía el usuario: consultar un entregable sin salir de la colaboración y sin buscarlo de nuevo en el dashboard general. Edición del checklist sigue siendo tarea exclusiva del Tablero/dashboard, no se duplica aquí.
- **Pestaña "Registro"**: `CollaborationLogCard`, sin cambios — ya no compite visualmente con el brief ni con la acción principal.
- `SegmentedTabs` (mismo componente ya usado en "Pendientes/Historial" de estas mismas páginas) para las 3 pestañas — sin patrón visual nuevo.

### Verificado de verdad

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- **55/55 en toda la suite de integración**, sin regresiones — coherente con que no se tocó ninguna migración, policy ni RPC; solo se reutilizan composables ya probados.
- SSR real con sesión de las dos cuentas demo sobre `/creator/requests` y `/partner/requests`: `200`, sin errores.

### Sin verificar

- La interacción real con las pestañas y el bloque expandido del checklist en móvil (si las tres etiquetas de `SegmentedTabs` quedan cómodas al tacto, si el contenido de cada pestaña se siente "demasiado largo") — no hay herramienta de navegador en esta sesión. Tampoco se puede confirmar visualmente si el truncado a 1 línea del brief corta en un punto razonable en pantallas muy estrechas.

### Pendiente (ya acordado, no implementado todavía)

Fase 3 (retirar la pestaña "Colaboraciones" de `partner/profile.vue` una vez confirmado en la práctica que el nuevo sitio cubre todos los casos) y Fase 4 (fusionar Redes+Métricas en "Mis redes", opcional).

## 2026-10-23 (32) — Reorganización de navegación, Fase 1 (renombrados + accesos secundarios)

Primera fase del plan de reorganización de navegación acordado tras la auditoría de usabilidad completa (documento en Claude Docs). Solo navegación/textos — sin tocar rutas, RLS, datos ni pagos.

### Qué se cambió

- **`app/utils/nav.ts`**: "Solicitudes" → "Colaboraciones" (ambos roles, mismo nombre que ya usaba la pestaña de Ajustes del partner para la misma entidad); "Calendario" → "Inicio" (partner — esa página es un dashboard completo, no solo un calendario; la sección interna sigue llamándose "Tu calendario"). Nueva función `secondaryNav(role)`: Chat / Bandeja de entrada / Guardados / Ajustes — destinos reales que antes solo existían como icono sin texto en `TopBar.vue`, o sin ningún acceso desde ningún menú (caso de Guardados).
- **`SideRail.vue`** (escritorio): nuevo bloque de texto bajo la cuenta con Chat/Bandeja/Guardados (badges de no-leído reutilizando `useNotifications`/`useChat`, sin disparar un segundo `refresh()` — se lee el estado que `TopBar.vue` ya mantiene al día en cada página).
- **`BottomTabBar.vue`** (móvil): el botón "Más" ya no depende de que sobren items del rol — el partner, con solo 3 destinos, nunca lo tenía; ahora siempre reúne el overflow del rol (si lo hay) + los 4 accesos secundarios, con badge agregado de no-leídos.
- Títulos de página (`useHead`/`AppShell title`) de `creator/requests.vue`, `partner/requests.vue` y `partner/index.vue` actualizados a juego con los nombres nuevos.

### Verificado de verdad

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- SSR real con sesión de las dos cuentas demo: confirmado por `grep` sobre el HTML real que `SideRail` renderiza los 9 (creador) / 7 (partner) textos esperados, que no queda ningún "Solicitudes"/"Calendario" suelto, que los títulos de página dicen "Colaboraciones", y que el botón "Más" del partner ahora existe (antes no se renderizaba en absoluto).
- **55/55 en toda la suite de integración**, sin regresiones — coherente con que esta fase no toca RLS/RPC/esquema.

### Sin verificar

- La interacción real con el menú "Más" en móvil (abrir la hoja, pulsar un destino) y el aspecto visual del nuevo bloque secundario en `SideRail` — no hay herramienta de navegador en esta sesión.

### Pendiente (siguientes fases, ya acordadas, no implementadas todavía)

Fase 2 (reorganizar el detalle de una colaboración en dos niveles con pestañas Brief/Calendario/Registro), Fase 3 (mover pago/completar/valorar de `partner/profile.vue` a `partner/requests.vue`), Fase 4 (opcional: fusionar Redes+Métricas en "Mis redes").

## 2026-10-23 (31) — Brief estructurado + calendario compartido (coherencia visual, cero componentes nuevos)

Cierra los dos últimos huecos de Fase C. Instrucción explícita del usuario: priorizar la cohesión visual de FEEDMA sobre todo — reutilizar lo que ya existe, no crear nada que parezca de otra aplicación. Auditoría previa: no existe ningún calendario-cuadrícula en FEEDMA — la única vista "por fecha" es `WeekBoard.vue`+`DeliverableCard.vue`, y la propia app **ya la llama "Tu calendario"** en el dashboard del partner. El creador no tenía esa vista (solo su Kanban, que el roadmap pide no duplicar), y ninguna de las dos estaba acotada a una colaboración concreta.

### Qué se construyó

- **Calendario compartido, sin migración ni componente nuevo**: `WeekBoard`/`DeliverableCard` reutilizados tal cual, filtrados a los posts de la colaboración abierta, dentro de la misma hoja de detalle donde ya viven Condiciones/Registro — en `creator/requests.vue` y `partner/requests.vue`. **Limitación real encontrada al auditar la reutilización** antes de tocar código: `BottomSheet.vue` limita su panel a `md:max-w-md` (~448px), pero la rejilla a 2 columnas de `WeekBoard` se activa por ancho de **viewport**, no de contenedor (así son los breakpoints de Tailwind) — metida tal cual, en escritorio se habría visto una rejilla de 2 columnas apretada en 448px. Arreglo mínimo: `WeekBoard` gana `twoColumn` (por defecto `true`, cero cambio en su uso actual) y `DeliverableCard` gana `interactive` (por defecto `true`) — en el calendario acotado se usan ambos en `false`: una columna, cards informativas sin `role`/`tabindex`/cursor de mano. Decisión explícita: no se abre ninguna segunda hoja (`PostDetailSheet`) desde dentro de la ya abierta — no tiene precedente en la app, así que las cards son de solo lectura, simétrico entre creador y partner.
- **Brief estructurado, misma migración y mismo trigger de "condiciones pactadas", ampliados**: `supabase/migrations/20261025180000_collaboration_brief_fields.sql` añade 3 columnas opcionales (`campaign_goal`, `target_audience`, `tone`) a la MISMA fila de `collaborations`, y `create or replace function prevent_collaboration_terms_update()` (la misma de la sesión pasada, no una nueva) amplía su comparación a estas 3 columnas — el trigger ya existente sigue apuntando al mismo nombre, cero piezas nuevas de seguridad. Se integran dentro de `CollaborationTermsCard.vue` (subsección "Sobre la campaña", mismo `<dl>`, visualmente separada de "Condiciones pactadas") y dentro del mismo desplegable ya existente de los formularios de contacto, renombrado de "Condiciones (opcional)" a "Detalles de la propuesta (opcional)" — **un solo desplegable, no dos**.

### Verificado de verdad contra Supabase real

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- Revisado que `partner/index.vue` sigue pasando `WeekBoard` sin los props nuevos — comportamiento idéntico al de antes, confirmado por `grep`.
- Migración aplicada y confirmada por API.
- **`tests/integration/collaboration-terms.spec.ts`** ampliado (no un archivo nuevo) con los 3 campos nuevos: se guardan y leen bien con valores explícitos y en una colaboración sin nada (`null`); el intento de modificación directa (ya cubierto para las 4 columnas anteriores) se extiende a estas 3, incluido un intento con `service_role` sobre `tone` — bloqueado por el mismo trigger ampliado. **55/55 en toda la suite de integración**, sin regresiones.
- SSR real con sesión de las dos cuentas demo sobre `/creator/requests`, `/partner/requests`, `/creator/discover`, `/partner/discover` y `/partner`: las 5, `200`, sin errores.

### Sin verificar

- Cómo se ve de verdad la rejilla a una columna dentro de la hoja en escritorio, y el desplegable ampliado del formulario de contacto — no hay herramienta de navegador en esta sesión. La hoja de detalle solo se renderiza del lado del cliente al abrirla (`detailReq`/`detailCollab` empiezan en `null`), así que la comprobación SSR confirma que la página carga sin romperse, no el aspecto final de las secciones nuevas.

## 2026-10-23 (30) — Registro de incidencias y cambios acordados

Cierra el último de los tres huecos de Fase C identificados en la auditoría previa (brief estructurado, calendario compartido, registro de incidencias — los otros dos quedan pendientes, son decisiones de diseño que conviene acordar antes de tocar código). **Distinción auditada antes de construir nada**: ya existía `reports` — pero es un aviso confidencial al admin (spam, presupuesto poco serio), de solo escritura; lo que pide el roadmap aquí es otra cosa, un registro visible para **las dos partes**.

### Qué se construyó

- **`supabase/migrations/20261025170000_collaboration_log.sql`**: tabla `collaboration_log_entries` (`kind` check `'incident'|'agreed_change'`, `detail` con check de no-vacío-tras-trim y ≤1000 caracteres **a nivel de tabla**, no solo en la interfaz — se aplica a cualquier insert, incluido `service_role`). RLS de select para las dos partes; insert con `with check` puro (sin RPC — no hay transición de estado que proteger): `author_profile_id = auth.uid()` evita que nadie suplante al autor, y el `exists(...)` evita asociar una entrada a una colaboración ajena. **Sin policy de update/delete para `authenticated`** — a diferencia de "condiciones pactadas" (que lleva un trigger porque esas columnas sí se actualizan por otras vías legítimas), aquí no hay ningún update/delete legítimo de ninguna fila entera, así que la ausencia de policy ya es protección completa; se deja a propósito que `service_role` pueda borrar vía cascada (limpieza de datos de prueba). Columna `seq` (`generated always as identity`) como segundo criterio de orden real, no decorativo, para cuando dos entradas comparten `created_at`. Trigger `after insert` que notifica **exclusivamente a la otra parte** (nunca a quien escribe) — mismo patrón que `notify_collaboration_offer_created`.
- **`app/composables/useCollaborationLog.ts`** (nuevo) + **`CollaborationLogCard.vue`** (nuevo, junto a `CollaborationTermsCard.vue`): lista cronológica + formulario (incidencia/cambio acordado), inserción nunca optimista (si falla, no se muestra como guardada). Bajo "cambio acordado", nota explícita: no mueve ningún dato de la colaboración por sí solo, es solo constancia escrita. Montado en `creator/requests.vue` y `partner/requests.vue`.

### Verificado de verdad contra Supabase real

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- Migración aplicada y confirmada por API.
- **`tests/integration/collaboration-log.spec.ts`** (nuevo, 9 tests, en verde): detalle vacío/espacios y >1000 caracteres rechazados de verdad; suplantación de `author_profile_id` rechazada; un perfil ajeno no lee ni inserta; **camino feliz en las dos direcciones con comprobación real de notificaciones** (el creador registra una incidencia → el partner recibe exactamente una notificación con el enlace correcto, el creador autor no recibe ninguna; y al revés); las dos partes leen las entradas en el mismo orden en dos lecturas distintas; **intento real de `update`/`delete`** desde ambos clientes autenticados confirmado sin ningún efecto comparando contra el valor real guardado. **54/54 en toda la suite de integración**, sin regresiones.
- SSR real con sesión de las dos cuentas demo sobre `/creator/requests` y `/partner/requests`: `200`, sin errores.

### Sin verificar

- Rellenar el formulario en el navegador y ver la lista/notificación pintada de verdad — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (29) — Seguimiento del progreso: el partner ve el checklist real

Siguiente hueco de Fase C, encontrado ya **documentado en el propio código**: `app/composables/usePartnerPosts.ts` tenía, literal, `labelIds: []` / `checklist: { total: 0, done: 0 }` fijos a mano, con el comentario "el partner no las ve todavía". El checklist (`checklist_items`) ya existía y ya lo usaba el creador — el partner simplemente no tenía permiso de lectura. Resultado real: ningún "seguimiento del progreso" más allá de la fase general (`StatusPill`).

### Qué se construyó

- **`supabase/migrations/20261025160000_checklist_partner_visibility.sql`**: la policy de select de `checklist_items` gana la misma rama "partner con colaboración activa sobre el post" que ya usa `posts_select_scoped` desde hace semanas — ningún concepto nuevo. Las policies de insert/update/delete no se tocaron: el partner sigue sin poder escribir nada, esto es puramente visibilidad. `labels`/`post_labels` se quedaron fuera a propósito (organización personal del creador, no información de progreso que pida el roadmap).
- **`usePartnerPosts.ts`**: un único `select('post_id, done').in('post_id', ...)` agregado en cliente, sustituyendo los ceros fijos — un solo viaje de red para todos los posts visibles.
- **`DeliverableCard.vue`** (card exclusiva del dashboard del partner): mismo indicador "✓ X/Y" que `BoardCard.vue` ya tenía para el creador.
- **`PostDetailSheet.vue`** (hoja de detalle, exclusiva del partner): sección "Checklist" de solo lectura (sin checkbox interactivo — es información, no una acción suya), reutilizando `useChecklist.ts` sin tocarlo.

### Verificado de verdad

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- Migración aplicada y confirmada por API.
- **`tests/integration/checklist-visibility.spec.ts`** (nuevo, 5 tests, en verde contra el proyecto real, sobre un post+item aislados): el partner con colaboración activa lee el item; el creador sigue viéndolo (la rama "own" no se rompió); un perfil ajeno no lo lee; y un intento real de insert/update/delete por el partner confirmado sin ningún efecto en la base de datos. **45/45 en toda la suite de integración** (incluidos los incrementos anteriores de esta sesión, sin regresiones).
- SSR real con sesión del partner de demo sobre `/partner`: `200`, sin errores.

### Sin verificar

- El indicador "✓ X/Y" pintado de verdad en una card y la sección de checklist dentro de la hoja de detalle — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (28) — Condiciones pactadas en la propuesta de colaboración

Siguiente hueco concreto de Fase C. El roadmap pide explícitamente "condiciones pactadas: revisiones incluidas, exclusividad, derechos de uso y alcance" — hasta ahora `collaborations.brief` era un único texto libre de presentación; ninguna de esas cuatro cosas quedaba nunca escrita en ningún sitio, y el creador aceptaba/rechazaba una solicitud sin saberlo por escrito.

### Qué se construyó

- **`supabase/migrations/20261025150000_collaboration_terms.sql`**: 4 columnas nuevas en `collaborations` (`scope_notes`, `revisions_included`, `exclusivity`, `usage_rights`), todas opcionales salvo `exclusivity` (`false` por defecto). Se fijan una sola vez al enviar la propuesta inicial (igual que `brief`/`budget_cents`) y quedan **congeladas de verdad**: antes de diseñar esto se auditó que ya no existe ninguna policy de `update` para el cliente sobre `collaborations` (se cerró en `20261025090000_phase1_security_payments.sql`), pero ese invariante ya se rompió una vez en este mismo proyecto — así que se añadió además un **trigger `before update`** (`prevent_collaboration_terms_update`) que bloquea cualquier cambio a estas 4 columnas venga de donde venga, incluido `service_role` saltándose RLS por completo. Las tres RPCs legítimas (`accept_collaboration_request`/`decline_collaboration_request`/`mark_collaboration_completed`) nunca tocan estas columnas, así que el trigger no las afecta.
- **Semántica de valores explícita, sin inferencias**: `revisions_included = null` es "sin límite definido", distinto de `0` ("cero revisiones incluidas"); `usage_rights`/`scope_notes` ausentes se muestran como "no especificado", nunca se infiere ningún permiso.
- **Formulario de contacto** (`creator/discover.vue`, `partner/discover.vue`): sección colapsable "Condiciones (opcional)" — no se exige rellenarla.
- **`app/components/collab/CollaborationTermsCard.vue`** (nuevo, compartido): bloque de solo lectura en el detalle de la solicitud (`creator/requests.vue`, `partner/requests.vue`). Incluye un contador de "solicitudes de cambios registradas en esta colaboración" (cuenta real sobre `post_revision_notes` de todas las publicaciones de esa colaboración) — deliberadamente **no** es un "cumplido/incumplido": nunca se presenta como fracción ni se bloquea ninguna acción al superar el número orientativo.

### Verificado de verdad contra Supabase real

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- Migración aplicada por el usuario; confirmada por API: las 4 columnas existen, el `check (revisions_included >= 0)` rechaza `-1` en un insert real, y **un intento de `PATCH` directo contra la fila con `service_role`** (sin RLS de por medio) fue bloqueado por el trigger con su mensaje explícito — no solo "no hay policy", el trigger es real.
- **`tests/integration/collaboration-terms.spec.ts`** (nuevo, 8 tests, todos en verde contra el proyecto real): valores exactos leídos por ambas partes autorizadas (incluido `revisions_included = 0` sin confundirse con `null`); una colaboración "antigua" sin condiciones lee `null`/`false` sin error; un perfil ajeno no puede leer ninguna de las dos; **intento de modificación directa por el partner autenticado** (los 4 campos) confirmado sin efecto comparando contra el valor real en la base después; **el mismo intento con `service_role`** confirmado bloqueado por el trigger; una actualización legítima de `status` vía RPC confirmada que no toca las condiciones; el contador de solicitudes de cambios cuenta notas reales y da `0` en una colaboración sin ninguna. Todo sobre colaboraciones/posts de prueba aislados, limpiados en `afterAll` y confirmado sin rastro por API al terminar.
- De paso se corrigió un bug preexistente (no relacionado con este incremento) en `tests/integration/saved-profiles.spec.ts`: el test de "guardar un perfil" nunca pasaba `owner_profile_id` en el insert, así que la RLS lo rechazaba siempre — ahora el test completo (40/40 con el resto de la suite de integración) pasa en verde.
- SSR real con sesión de las dos cuentas demo sobre `/creator/requests` y `/partner/requests`: ambas responden `200` sin errores con los composables/tipos nuevos ya compilados.

### Sin verificar

- La interacción real en navegador: abrir "Condiciones (opcional)" en el formulario de contacto, rellenarla, y ver el bloque `CollaborationTermsCard` pintado de verdad en el detalle — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (27) — Revisiones con comentarios reales (primer corte de Fase C / "FEEDMA Studio")

Siguiente fase del roadmap tras Fase B. En vez de abordar todo "FEEDMA Studio" de golpe (el propio roadmap pide no construir un gestor de proyectos complejo), se auditó el código real y se encontró el hueco más concreto y demostrable: **"Pedir cambios" en una publicación no capturaba ningún motivo** — `request_post_changes()` solo movía el estado, sin texto ni historial; el creador se encontraba su publicación devuelta sin ninguna pista de qué cambiar.

### Qué se construyó

- **`supabase/migrations/20261025140000_post_revision_notes.sql`**: tabla `post_revision_notes` (una por publicación, no por colaboración — es sobre un entregable concreto, mismo criterio que `labels`/`checklist_items`), RLS de solo lectura para las dos partes implicadas, sin policy de insert para el cliente. `request_post_changes()`/`approve_post()` redefinidas con un parámetro `p_comment` — **obligatorio** en la primera (rechaza vacío de verdad, no es decorativo), opcional en la segunda. Importante: se **borraron explícitamente** las versiones de 1 argumento (`drop function if exists ... (uuid)`) antes de crear las de 2 — `create or replace` con una firma distinta crea una sobrecarga nueva, no sustituye la vieja; dejar la de 1 argumento viva habría permitido seguir pidiendo cambios sin comentario, saltándose la exigencia entera.
- **Atomicidad real**: el cambio de estado es un único `update ... where status = 'ready_for_review' returning id` — si dos llamadas concurrentes apuntan al mismo post, la segunda no encuentra fila que actualizar y se rechaza con un mensaje claro, nunca ejecuta dos veces.
- **`app/composables/usePostRevisions.ts`** (nuevo) + `usePartnerPosts.ts` actualizado para pasar el comentario.
- **UI partner** (`app/pages/partner/index.vue`): "Pedir cambios" ya no actúa al primer clic (el servidor exige el comentario) — abre la hoja de detalle con un formulario real; "Aprobar" sigue siendo un clic, con un comentario opcional colapsado. De paso se quitó código muerto (`approveNext`/`firstPendingId`, sobrante del rediseño del Home).
- **UI creador** (`app/pages/creator/post/[id].vue`): aviso destacado con la solicitud de cambios vigente (solo mientras el post sigue en `in_production` — desaparece solo al reenviar a revisión, sin borrar la nota) + historial completo cronológico (autor, fecha, tipo, comentario).

### Verificado de verdad contra Supabase real (no solo en local)

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- Migración aplicada por el usuario, confirmada por API (`200` en vez de `404` al consultar la tabla nueva).
- **`tests/integration/post-revisions.spec.ts`** (nuevo, 8 tests) ejecutado de verdad contra el proyecto real y **los 8 en verde**: un perfil ajeno no puede leer el historial (ni las dos partes implicadas pueden verlo el ajeno); el propio creador no puede aprobar/devolver su publicación; comentario vacío rechazado; camino feliz real (nota + cambio de estado); segunda llamada sobre un post ya resuelto rechazada; insert directo sobre `post_revision_notes` bloqueado por RLS; **y una prueba de concurrencia real** (`approve_post`/`request_post_changes` disparadas a la vez con `Promise.all` sobre el mismo post) — confirmado que solo una de las dos tiene éxito y que estado + historial quedan coherentes entre sí, nunca un estado intermedio. Todo sobre publicaciones de prueba aisladas creadas y borradas por el propio test (confirmado después por API que no quedó ningún post de prueba suelto) — nunca sobre datos de demo ya existentes.

### Sin verificar

- La interacción real en navegador (abrir la hoja, escribir el comentario, ver el aviso destacado en el creador) — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (26) — Limpieza de cuentas de prueba + nuevo seed con fotos reales

Petición directa del usuario: borrar las cuentas de prueba creadas por `seed-discover-demo.mjs` (sin tocar `creator@feedma.test`/`partner@feedma.test`) y sustituirlas por un seed más rico, con fotos de verdad en fichas y paquetes.

### Borrado (`scripts/cleanup-discover-demo.mjs`, nuevo)

- Antes de borrar nada, se auditaron las cascadas FK reales de cada tabla implicada contra las migraciones — se encontró un desajuste de esquema ya existente: `collaborations.creator_id` es `NOT NULL` pero su FK sigue en `ON DELETE SET NULL` (nunca se corrigió al quitar el rol de manager). Borrar un creador con colaboraciones directamente habría hecho fallar el borrado entero. El script borra primero las colaboraciones de estas cuentas y después los usuarios (vía `auth.admin.deleteUser`, nunca un DELETE a mano sobre `auth.users`) — el resto (profiles, creators/partners, social_accounts, packages, discovery_searches…) cascada limpio, comprobado tabla por tabla antes de ejecutar nada.
- **Ejecutado de verdad contra el proyecto real**: 18 cuentas borradas (las 9 creadores + 9 partners de `seed-discover-demo.mjs`), 6 colaboraciones y sus búsquedas de `discovery_searches` asociadas. Verificado después por API: `creators`/`partners` solo contienen ya `Nora Blake`, `Alma Beauty Co.` y la cuenta real del propio usuario (`Alejandro Suárez Durán` — no tocada, no estaba en ninguna lista de borrado).

### Nuevo seed (`scripts/seed-discover-demo.mjs`, reescrito en el mismo archivo — mismo propósito, no tenía sentido mantener dos scripts que crean las mismas 18 cuentas)

- Mismos 9 creadores + 9 partners de antes (nombres, categorías, rangos — ya estaban bien pensados), pero ahora cada ficha lleva una foto de portada real y cada una trae además **un paquete publicado** (nuevo — antes no existía ningún paquete de demo), también con su propia foto.
- Las fotos son las 5 de `public/img/` que ya usa el proyecto (licencia ya resuelta, ya en el repo) — se suben de verdad al bucket `post-media`, con la misma ruta que usaría una subida real desde la app (`uploadCoverPhoto`/`uploadPackageCover`), rotando entre las 5. Decisión tomada con el usuario: nada de Unsplash ni URLs externas sueltas para esto.
- Idempotente, mismo criterio que el resto de seeds del proyecto.
- **Ejecutado de verdad contra el proyecto real**: 9+9 cuentas recreadas, cada una con foto (`cover_url` real en Supabase Storage, comprobado con `curl` que las imágenes responden `200 image/jpeg` del tamaño real) y un paquete con su propia foto (comprobado igual). Confirmado por SSR con sesión real que `/partner/discover` ya pinta fotos reales (13 `<img>` con `src` de `post-media`) en vez de los degradados de antes.

### Verificado / sin verificar

- `npm test` (30/30) sigue verde tras los cambios.
- Borrado y seed **ejecutados de verdad**, no solo escritos — con comprobación por API después de cada paso, no solo confiando en el log del script.
- **Sin probar en navegador real**: cómo se ven las fotos en las tarjetas de verdad (tamaño, recorte, carga) — solo confirmado que la URL responde con una imagen válida, no el renderizado visual real.

## 2026-10-23 (25) — Rediseño de Descubrir + diagnóstico de relevancia (`DESIGN.md`)

Petición explícita con un documento detallado (`DESIGN.md`) pidiendo auditar primero cómo funcionan de verdad los Destacados y la búsqueda sin texto antes de tocar nada visual. Se entró en modo de planificación y se auditó `server/api/discover/search.post.ts` línea a línea antes de escribir código.

### Diagnóstico (lo que había de verdad, no lo que parecía)

- Los Destacados y la búsqueda sin texto **ya usaban datos 100% reales** (nunca contenido de demo) — pero sin ningún filtro de categorías, `heuristicScore()` daba **50 a todos por igual** (sin personalización real posible sin IA/filtros) y la consulta a `creators`/`partners` **no tenía ningún `.order()`** — el orden dependía de lo que Postgres devolviera, sin garantía de ser el mismo entre dos peticiones idénticas. El cliente ya ocultaba el badge de puntuación en ese caso (`scoreMeaningful`), pero el título "Destacados para ti" se mantenía fijo aunque no hubiera nada personalizado detrás.
- Cero paginación — se pintaban todos los resultados filtrados de golpe.
- `useDiscover().search()` no protegía contra una respuesta vieja pisando una más nueva (sin guarda de petición obsoleta).
- El layout ya usaba `<AppShell full-width>`, pero el contenido se autolimitaba por dentro (`max-w-[1100px]`/`max-w-[760px]`) — eso era justo el hueco vacío a la derecha en pantallas anchas.

### Qué se arregló

- **`server/api/discover/search.post.ts`**: se añadió `created_at` al `select` y `.order('created_at', { ascending: false })` a las dos consultas de candidatos. Como `Array.prototype.sort` es estable, con las puntuaciones empatadas (sin filtro) el orden de la base de datos es justo el que se conserva al pintar — estable y explicable ("más recientes primero") en vez de arbitrario. **Verificado de verdad**: dos peticiones idénticas al endpoint real (con sesión de la cuenta demo creadora) devuelven ahora exactamente el mismo orden de ids, confirmado con un `diff` byte a byte de las dos respuestas.
- **`useDiscover.ts`**: contador de petición en el cierre del composable — cualquier fase (filtros o IA) que resuelva cuando ya no es la búsqueda más reciente se descarta sin tocar `results`/`loading`/`aiSummary`.
- **Título neutral**: `FeaturedDeck.vue` ahora usa el `scoreMeaningful` que ya calculaban las páginas — "Destacados para ti" solo con criterio real (filtro de categorías o IA), si no "Perfiles para explorar".
- **Layout**: quitados los `max-w` internos que capaban el ancho; `DiscoveryCard.vue` pasa de fila horizontal a tarjeta vertical compacta (portada + nombre/categorías/bio/datos clave + marcador + CTA), ahora en cuadrícula `1→2→3→4` columnas según ancho. `FeaturedDeck` aprovecha una cuarta columna en pantallas muy anchas (antes topaba en 3 siempre).
- **Revelación progresiva**: 12 tarjetas al principio, "Cargar más" revela 12 más del array ya recibido — sin petición nueva (el backend no tiene paginación real; construir una habría sido ampliar alcance, se documenta como pendiente).
- **Filtros activos**: fila de chips quitables individualmente (categorías + rango de presupuesto) + "Limpiar filtros", visible aunque el panel esté colapsado — quitar un chip relanza la búsqueda al momento.
- **Guardados**: el enlace ya existente ahora lleva el contador real (`useSavedProfiles`, sin consulta nueva).

### Qué se conservó sin tocar

El motor de búsqueda, el modo IA completo (con su resiliencia sin API key), el flujo de "Proponer"/"Contactar" (abrir perfil vs. proponer siguen siendo acciones distintas, con sus estados de carga/éxito/error reales), `useSavedProfiles`/`/favorites`, y `SideRail`/`TopBar`/`BottomTabBar`/`AppShell`.

### Qué queda fuera, documentado

- Paginación real con cursor en el servidor — necesitaría parámetros nuevos en el endpoint (y probablemente un índice) para ser barata de verdad; no se improvisa aquí.
- Un criterio de relevancia más sofisticado que "categorías + fecha estable" (p. ej. puntuar por plenitud de ficha) — se descarta a propósito por acercarse a un "sistema de ranking" que el propio encargo pide evitar sin necesidad clara.

### Verificado / sin verificar

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- **SSR real con sesión de las dos cuentas demo**: `/creator/discover` y `/partner/discover` responden 200 sin errores; título neutral correcto en ambas (sin filtro activo); 10 y 11 tarjetas reales respectivamente con nombres reales distintos; "Cargar más" correctamente ausente (menos de 12 resultados); fila de "Limpiar filtros" correctamente ausente sin filtros activos; el badge de "Guardados" refleja el conteo real (4 en la cuenta creadora, 0 en la de partner — dato real de pruebas anteriores del usuario, no mío).
- **Sin probar en navegador real**: clics (abrir perfil vs. guardar vs. proponer sin interferirse entre sí), quitar un chip de filtro en vivo, la hoja de "Proponer", y el responsive real en tablet/móvil — no hay herramienta de navegador disponible en esta sesión.
- Nada se ha subido a GitHub todavía.

## 2026-10-23 (24) — Rediseño del Home (`creator/index.vue` + `partner/index.vue`)

Petición explícita del usuario, con una imagen de referencia (dashboard de smart-home) y un encargo detallado: trasladar la sensación de producto premium y bien organizado sin copiar literalmente la referencia ni inventar datos. Se entró en modo de planificación, se auditó qué ya existía (`SideRail.vue`/`TopBar.vue` ya cubrían navegación lateral y cabecera — no se tocaron) y se presentó un plan (qué se conserva/reorganiza/muestra) antes de escribir código, tal como pedía el propio encargo.

### Qué se construyó

- **`app/components/home/HomeHeroCard.vue`** (nuevo, presentacional): panel destacado — imagen real o degradado por semilla (mismo lenguaje que `ProfileHeaderCard`/`FeaturedDeck`) + scrim + eyebrow/título en blanco + un único CTA. Acepta `ctaTo` (ruta real) o, si se omite, emite `cta-click` para acciones que abren una hoja inferior en vez de navegar (el panel de revisión del partner).
- **`creator/index.vue`**: 4 `StatTile` (colaboraciones activas, solicitudes pendientes, entregas próximas, objetivo semanal) + grid asimétrica `1fr/22rem` — columna ancha: hero (prioridad real: fuera de plazo > solicitud sin responder > próxima entrega > CTA a Descubrir) + panel de marcas sugeridas (`useDiscover` modo filtros, sin IA, 3 resultados, sin bloquear el render); columna angosta: "Necesita tu atención" (solicitudes + entregas + mensajes sin leer, hasta 4 filas), redes conectadas, consejos (ficha incompleta/paquete/conectar red, consolidados en una tarjeta). `WeekBoard` sale del home (quedaba casi duplicado con `/creator/timeline`, que ya es la vista completa) — se conservan el objetivo semanal como única métrica y el `Fab`/`PostComposerSheet`.
- **`partner/index.vue`**: mismo patrón de stats/grid. El hero añade un escalón de prioridad que no estaba en el plan original pero es correcto con los datos reales: publicación por revisar > solicitud de un creador sin responder (`initiatedBy === 'creator'`, nunca una propuesta propia esperando respuesta) > sin colaboración activa > próxima entrega > invitación a descubrir. **`WeekBoard` y `PostDetailSheet` se conservan intactos** (aprobar/pedir cambios) — a diferencia del creador, `/partner` es la ÚNICA pantalla donde existe esa acción, quitarla habría sido una regresión real, no una reorganización.
- Panel de descubrimiento en ambas páginas: `useDiscover().search('filters', '', {...})` lanzado SIN `await` en el `Promise.all` principal — no bloquea el primer pintado, mismo patrón de "fase 2 progresiva" que ya usa `useDiscover` para el enriquecido con IA. Reutiliza el endpoint existente de Descubrir tal cual (sin tocar servidor); se renderizan solo los 3 primeros resultados del array que ya devuelve.

### Qué queda fuera a propósito (nada inventado)

- Cero ingresos, conversión, seguidores con tendencia ni "recomendado por IA" — el modo filtros no usa LLM.
- Cada bloque (actividad, descubrimiento, consejos, redes) se omite entero con `v-if` si no tiene contenido real — nunca un `EmptyState` decorativo ocupando espacio en el dashboard.
- Limitación detectada y documentada, no arreglada de paso (fuera de alcance tocar servidor): el endpoint `/api/discover/search` no tiene forma barata de pedir "solo 3" — siempre trae hasta 200 candidatos server-side aunque solo se pinten 3. Aceptable por ahora (reutiliza lo existente), pero sería un buen candidato a un parámetro `limit` en una sesión futura si el panel de descubrimiento del home se usa de verdad.

### Verificado / sin verificar

- `npx vue-tsc --noEmit`, `npm test -- --run` (30/30) y `npm run build`: limpios.
- **SSR real contra el servidor de desarrollo con sesión real de las dos cuentas demo**: `/creator` y `/partner` responden 200, sin ningún error en el HTML. Se confirmó con los datos reales de cada cuenta que el hero elige la rama correcta (el creador demo cayó en la rama "sin nada pendiente → Descubrir"; el partner demo cayó en "todo al día → Descubrir más creadores", y sus `StatTile` de "Por revisar" mostraron el dato real) — en ningún caso se pintó más de un hero a la vez. Se extrajeron y revisaron todos los enlaces internos renderizados: todos apuntan a rutas reales ya existentes.
- **No se ha podido confirmar por este medio que el panel de descubrimiento rellene sus 3 tarjetas con enlaces (`/profile/[role]/[id]`) correctos en el navegador real** — al no bloquear el render (a propósito, por rendimiento), la petición no llegó a resolverse dentro de la ventana de SSR en ninguno de los 3 intentos, así que solo se vio el esqueleto de carga. La lógica está verificada por código (mismo campo `DiscoveryResult.id` que ya se confirmó correcto en sesiones anteriores de esta misma conversación), pero el relleno real en pantalla no se ha visto.
- **Sin probar en navegador real**: clics, hidratación sin warnings de consola, y el responsive de verdad en tablet/móvil (el reflow a una columna por prioridad está escrito pero no se ha visto renderizado) — no hay herramienta de navegador disponible en esta sesión.
- Nada se ha subido a GitHub todavía — pendiente de confirmación del usuario, como en los incrementos anteriores de esta sesión.

## 2026-10-23 (23) — Comparar candidatos guardados + primera acción útil en los dos `home` (Fase B del roadmap)

Dos incrementos pequeños seguidos, sin tocar servidor ni migraciones nuevas en ninguno de los dos.

### Comparar candidatos (sección 6 del roadmap)

- `app/pages/favorites.vue`: modo "Comparar" — selecciona 2-3 guardados con checkboxes y pulsa "Comparar" para ver una sección con sus fichas lado a lado. Reutiliza `ProfileHeaderCard` en modo `compact` (el mismo componente del perfil público, cero markup nuevo) + reputación (`useRatings`) + rango de tarifa/presupuesto + enlace a "Ver perfil completo". Los datos completos (`usePublicProfile().loadProfile`) solo se piden al pulsar Comparar, nunca para los guardados que no se van a comparar.
- Sin tests unitarios nuevos (sin lógica pura que valga la pena aislar, todo es UI + composables ya probados en otro sitio).
- **Verificado**: `npm test` (25/25), `vue-tsc` limpio, `npm run build` limpio, y SSR real con 2 favoritos reales guardados vía API (sesión del partner demo) — la lista renderiza ambos y el botón "Comparar" aparece, sin errores. **Sin probar la interacción de clic real** (seleccionar → comparar → ver la sección) — necesita navegador de verdad, sin herramienta disponible en esta sesión.

### Primera acción útil en el home (sección 12 del roadmap)

Antes, un creador o partner con la ficha pública vacía (sin bio/categorías/rango económico) no tenía ningún aviso de ello en su `home` — nada le decía que, sin rellenarla, es invisible en Descubrir. Tampoco había ningún aviso para publicar el primer paquete.

- **`app/utils/ficha.ts`** (nuevo): `isFichaIncomplete()` — pura, con test unitario (`tests/unit/ficha.spec.ts`, 5 casos).
- **`creator/index.vue`**: aviso (mismo estilo que los de "fuera de plazo"/"solicitud nueva" ya existentes) — ficha incompleta → "Completa tu ficha pública"; si la ficha ya está completa pero no hay ningún paquete publicado → "Publica tu primer paquete". Nunca los dos a la vez.
- **`partner/index.vue`**: mismo aviso de ficha incompleta (sin el de paquetes — un partner ya tiene su propio aviso de "descubre un creador" cuando no hay colaboración activa).
- **Verificado contra datos reales**: las dos cuentas demo (`creator@feedma.test`/`partner@feedma.test`) tienen la ficha incompleta de verdad (sin rango de tarifa/presupuesto rellenado) — comprobado con `service_role` antes de probar, y confirmado que el aviso aparece en el HTML real de los dos `home` vía SSR con sesión real, sin errores. `npm test` (30/30), `vue-tsc` limpio, `npm run build` limpio.
- **Sin aplicar/pendiente**: nada — este incremento no toca la base de datos, solo lee columnas que ya existían.

### Nota de proceso

A petición explícita del usuario, este incremento **no se ha subido a `main`** (ni este ni el de comparar candidatos) — se queda en el árbol de trabajo local hasta que lo pida.

## 2026-10-23 (22) — Favoritos: guardar un candidato desde Descubrir (Fase B del roadmap)

Siguiente incremento tras las valoraciones: el roadmap señala "guardado de favoritos y listas de selección" en dos secciones (6 y 16) — ahora mismo, salir de Descubrir sin contactar significaba perder el candidato para siempre, sin forma de recordarlo ni de volver a él sin repetir la búsqueda.

### Qué se construyó

- **`supabase/migrations/20261025130000_saved_profiles.sql`** (nueva, sin aplicar todavía): tabla `saved_profiles` — `target_creator_id`/`target_partner_id` (exactamente uno de los dos, FK real a `creators`/`partners` para que un perfil borrado se lleve el favorito con él), propiedad pura del que guarda (sin validación cruzada de negocio, a diferencia de `collaboration_ratings`). RLS de solo-lo-propio (select/insert/delete), sin ninguna función RPC — mismo criterio de sencillez que `labels`. Índices únicos **parciales** (no un `unique` normal, que con columnas nulas no evitaría duplicados) para que no se pueda guardar dos veces el mismo perfil.
- **`app/composables/useSavedProfiles.ts`** (nuevo): `savedCreatorIds`/`savedPartnerIds` como `Set` en caché para que marcar/desmarcar el icono sea instantáneo; `toggleSave`/`isSaved`/`listSaved` (esta última resuelve los datos de ficha para `/favorites`, con lookup en lote a `creators`/`partners`, nunca por fila). Registrado en `resetAccountCaches()`.
- **`DiscoveryCard.vue`/`FeaturedDeck.vue`**: icono de marcador (relleno si ya está guardado) junto al botón de contacto / sobre la portada — en `FeaturedDeck` con `stopPropagation` para no disparar también la navegación al perfil.
- **`app/pages/favorites.vue`** (nueva, fuera de `/creator`/`/partner` a propósito, mismo criterio que `/inbox`: una sola pantalla para los 2 roles): lista de guardados con botón de quitar y estado vacío con instrucciones. Enlazada desde `/creator/discover` y `/partner/discover` (junto al botón de Filtros) — no se añadió a `roleNav`/`BottomTabBar` a propósito: la barra inferior del creador ya va apretada en móvil con 6 iconos (ver entrada de "Descubrir bidireccional" más abajo).
- **Tests**: `tests/integration/saved-profiles.spec.ts` — a diferencia de las valoraciones, aquí sí se prueba el camino feliz completo (guardar, duplicado rechazado, invisible para quien no es el dueño, spoof de `owner_profile_id` rechazado, quitar) porque guardar/quitar es reversible por diseño, no deja contaminación permanente. Sin tests unitarios nuevos: no hay lógica pura que valga la pena aislar aquí (a diferencia de `ratings.ts`), todo es acceso a datos ya cubierto por el test de integración.

### Verificado / sin verificar

- `npm test`: 25/25 verdes (sin cambios respecto a antes, no hay unitarios nuevos en este incremento).
- `npx vue-tsc --noEmit`: limpio. `npm run build`: completo sin errores.
- **Probado contra el servidor de desarrollo real con sesión real** (mismo mecanismo de cookie SSR a mano que en la entrada anterior, sin herramienta de navegador disponible en esta sesión): `/favorites`, `/creator/discover`, `/partner/discover` responden `200`, sin ningún "does not exist" ni error 500 filtrado al HTML aunque la migración todavía no estaba aplicada (el composable degrada con un `console.error` en vez de romper la página) — confirma que desplegar el código antes de aplicar la migración no rompe nada, aunque los favoritos no funcionen todavía hasta aplicarla. El enlace "Guardados" y el estado vacío de `/favorites` aparecen en el HTML real.
- **Sin aplicar la migración al proyecto real** y **sin probar el camino feliz en navegador con interacción de verdad** (guardar desde una card, verlo aparecer en `/favorites`, quitarlo) — pendiente de que alguien del equipo la aplique y lo recorra a mano, igual que con las valoraciones.

## 2026-10-23 (21) — Auditoría contra `FEEDMA_PRODUCT_ROADMAP.md` + MVP de valoraciones y reputación

Sesión pedida para contrastar el roadmap de producto (`FEEDMA_PRODUCT_ROADMAP.md`, nuevo en el repo) con el estado real del código, priorizar lo que falta y construir la primera mejora de alto impacto. Dos cosas antes de empezar, para que quede constancia:

### Nota: el commit `9928bd2` ("Mejoras de seguridad, test, prueba de negociación de paquetes, animación.") no tenía entrada aquí

Ese commit (de una sesión anterior, no documentada en este changelog) ya estaba en el repo al empezar esta auditoría — se verificó con `git log`/`git show`, no se tocó nada de él. Resumen rápido de lo que contiene, para que quede localizable: cierra el hallazgo más grave encontrado (una oferta de chat aceptada nunca creaba una `collaboration` cobrable — `respond_offer` ahora sí la crea), retira el `update` directo sobre `collaborations.budget_cents`/`status` en favor de `accept_collaboration_request`/`decline_collaboration_request`/`mark_collaboration_completed` (RPCs `security definer` que validan el importe contra una negociación real), añade idempotencia real a Stripe (`idempotencyKey` en el Checkout, `.is('paid_at', null)` en el webhook), mueve el saldo de créditos a una RPC de servidor (`my_credit_balance`), y añade objetivo semanal configurable + etiquetas/checklist/límite WIP en el tablero. Trae también la primera batería de tests (`tests/unit/*`, `tests/integration/*`, 19 unitarios, todos verdes) y `PROJECT_OVERVIEW.md`. Esas migraciones (`20261024090000_board_labels_checklist_wip.sql`, `20261025090000_phase1_security_payments.sql`, `20261025100000_phase3_weekly_target.sql`, `20261025110000_phase5_credit_balance_rpc.sql`) **se han aplicado ya al proyecto real de Supabase** (Mario, vía SQL Editor, más adelante en esta misma sesión) — ver la sección "Verificado / sin verificar" más abajo para cómo se comprobó. No se pudo aplicar directamente desde este entorno: la red de esta máquina bloquea tanto el registro de npm (no se pudo instalar `pg` para `scripts/apply-pending-migrations.mjs`) como el puerto 5432 de conexión directa a Postgres — solo el tráfico HTTPS al propio proyecto de Supabase está permitido.

### Diagnóstico frente al roadmap

Ya resuelto o en buen estado: seguridad/integridad de pagos (Fase A), rate-limit de login de admin (documentado como limitado a un solo proceso, no resuelto del todo), tablero con etiquetas/checklist/WIP, objetivo semanal real. Sin empezar todavía: reputación/confianza (Fase B, hasta esta sesión), FEEDMA Studio (brief/entregables/revisiones por colaboración, Fase C), favoritos/comparación de perfiles, campañas abiertas, repetir colaboración, analítica de activación/retención, paginación del listado de usuarios de admin (deliberadamente aplazada, documentado en el propio endpoint como aceptable para un equipo pequeño).

Prioridad elegida para el primer incremento: **reputación vinculada a colaboraciones completadas** — es lo más desbloqueado justo ahora (`mark_collaboration_completed`, de la sesión anterior, es la primera señal fiable de "esto se completó de verdad" sobre la que anclar una valoración sin arriesgarse a reseñas sin colaboración real detrás) y es la pieza que el propio roadmap señala como base de confianza antes de construir nada más grande (FEEDMA Studio, campañas).

### Qué se construyó — valoraciones mutuas (MVP, sección 4 del roadmap)

- **`supabase/migrations/20261025120000_collaboration_ratings.sql`** (nueva, ya aplicada al proyecto real): tabla `collaboration_ratings` (una valoración por persona y colaboración — `unique (collaboration_id, rater_profile_id)` —, 1-5 estrellas, comentario opcional hasta 500 caracteres, **inmutable**: sin policy de update/delete para el cliente, mitigación simple contra reseñas manipuladas sin construir todavía un sistema de moderación completo). Lectura abierta a cualquier autenticado (mismo criterio que los directorios públicos de `creators`/`partners`) — es la base de la reputación visible en el perfil público. Dos funciones `security definer`:
  - `submit_collaboration_rating(p_collaboration_id, p_stars, p_comment)`: resuelve ella misma quién es el rater/ratee a partir de `auth.uid()` y de la colaboración real (nunca un `profile_id` que mande el cliente); rechaza una colaboración no completada, a quien no es parte de ella, una puntuación fuera de 1-5, y una segunda valoración sobre la misma colaboración.
  - `profile_rating_summary(p_profile_id)`: media + recuento, siempre los datos crudos — la decisión de "¿hay bastantes valoraciones para mostrar un número?" se queda en el cliente (`app/utils/ratings.ts`, `MIN_RATINGS_TO_SHOW = 3`), no en la base de datos.
- **`app/composables/useRatings.ts`** (nuevo, mismo patrón `useState` que el resto): `ensureMyRatingsLoaded`/`submitRating` (cachea, por id de colaboración, la valoración que YO ya envié) y `fetchSummary(profileId)` (siempre fresco, sin caché — mismo criterio que `usePublicProfile.ts`). Registrado en `resetAccountCaches()`.
- **`app/components/collab/RatingStars.vue`** (nuevo): estrellas 1-5, interactivas o de solo lectura, accesibles por teclado (`role="radiogroup"`, `aria-pressed`).
- **`app/components/collab/RatingPrompt.vue`** (nuevo): el widget completo — si ya valoraste esa colaboración, muestra tu valoración; si no, el formulario (estrellas + comentario opcional) con `submit_collaboration_rating` por debajo.
- **Puntos de entrada**: en `creator/requests.vue` y `partner/profile.vue`, justo donde antes solo vivía el botón "Marcar como completada" — en cuanto una colaboración pasa a `completed`, aparece `RatingPrompt` en su lugar.
- **`app/pages/profile/[role]/[id].vue`**: bloque de reputación bajo la cabecera del perfil (estrellas + texto, usando `formatRatingSummary`) — solo se muestra si hay al menos 1 valoración, y solo pinta una media numérica a partir de 3 (por debajo, un texto honesto en vez de un número poco fiable).
- **Tests nuevos**: `tests/unit/ratings.spec.ts` (4 tests, la lógica de "¿hay bastantes valoraciones para mostrar media?" y el formato de texto) y `tests/integration/ratings.spec.ts` (contra Supabase real, se salta sin credenciales) — cubre los rechazos (`insert` directo bloqueado, colaboración inexistente, puntuación fuera de rango, `profile_rating_summary` siempre devuelve datos) pero **a propósito no prueba el camino feliz de verdad**: escribiría una fila real e inmutable sobre las cuentas de demo compartidas sin forma de deshacerlo al terminar el test (sin policy de delete), y rompería en la segunda ejecución por la `unique`. Ver el propio comentario de cabecera del test.

### Qué queda fuera a propósito de este incremento

- Sin flujo de reportar una valoración abusiva ni de resolución de conflictos — el roadmap pide evaluarlo, no construirlo ya; la mitigación de esta primera versión es solo "una por colaboración real, inmutable".
- Sin lista de comentarios recientes en el perfil público, solo el agregado (media + recuento) — si hace falta mostrar los comentarios de verdad, es una ampliación pequeña sobre lo ya construido (la tabla y la policy de lectura ya lo permiten).
- El resto del roadmap (FEEDMA Studio, favoritos, campañas abiertas, repetir colaboración, analítica de producto) sigue sin empezar — ver diagnóstico arriba.

### Verificado / sin verificar

- `npm test`: 25/25 verdes (los 19 de antes + los 6 nuevos de `ratings.spec.ts`).
- `npx vue-tsc --noEmit`: limpio.
- `npm run build`: build de producción completo sin errores (incluye los chunks nuevos `RatingStars`/`RatingPrompt`/`useRatings`).
- **Las 5 migraciones pendientes (`board_labels_checklist_wip`, `phase1_security_payments`, `phase3_weekly_target`, `phase5_credit_balance_rpc`, `collaboration_ratings`) ya se han aplicado al proyecto real de Supabase** (Mario, vía SQL Editor). Comprobado contra la base real con `service_role` tras aplicarlas: las tablas/columnas nuevas responden `200` (`collaboration_ratings`, `labels`, `checklist_items`, `creators.weekly_post_target`/`board_wip_limits`, `collaborations.offer_id`) y las RPCs nuevas existen y validan de verdad (`accept_collaboration_request`/`mark_collaboration_completed`/`respond_offer`/`submit_collaboration_rating` devuelven su error de negocio esperado con un id inventado, no un error de "función inexistente"; `my_credit_balance`/`profile_rating_summary` devuelven datos). Servidor de desarrollo levantado y rutas afectadas comprobadas sin error 500 (`/`, `/login`, `/admin/login` → 200; `/creator/timeline`, `/creator/requests`, `/partner/profile`, `/inbox`, `/profile/creator/[id]`, `/profile/partner/[id]` → 302 sin sesión, como se espera).
- **Sigue sin probarse en navegador con una sesión real**: completar una colaboración de verdad y valorar desde los dos lados, comprobar que la segunda valoración sobre la misma colaboración se rechaza, y que el bloque de reputación aparece en `/profile/[role]/[id]` a partir de 3 valoraciones reales. No se ha hecho desde esta sesión porque no hay herramienta de navegador disponible aquí — pendiente de que alguien del equipo lo recorra a mano (ver guion en la conversación/PR).
- Aviso operativo: al levantar `npm run dev` en esta sesión, Nuxt detectó un servidor ya corriendo en el puerto 3000 y lo sustituyó — si alguien del equipo lo tenía abierto para su propia prueba, tendrá que volver a arrancarlo.

---

## 2026-10-21 (20) — "Descubrir" bidireccional (creador <-> partner) + buscador con IA + analíticas de admin

Decisión tomada en `docs/10-ROADMAP-FUTURO.md` (sección 0, "decisión pendiente para la próxima sesión"): entre mejorar el descubrimiento y meter los packs recurrentes, se eligió descubrimiento. Hasta ahora `partner/discover.vue` era un `select *` plano sin filtros, y **no existía ningún "descubrir" para el creador** — solo el partner podía iniciar una colaboración.

### Base de datos (`supabase/migrations/20261021150000_discovery_bidireccional.sql`) — **sin aplicar todavía al proyecto real, ver abajo**

- `creators`/`partners` ganan los mismos campos de ficha en los dos lados: `bio`, `categories` (`text[]`, taxonomía fija nueva en `app/utils/categories.ts` — 18 nichos, la misma lista para ambos para que el cruce tenga sentido), rango económico (`min_rate_cents`/`max_rate_cents` en creators, `min_budget_cents`/`max_budget_cents` en partners) y `looking_for` (texto libre). Backfill de `categories` a partir de `niche`/`industry` para no partir de cero.
- `partners` pasa a ser **directorio público de solo lectura**, igual que ya era `creators` (se retira `partners_select_own`, cubierta por la nueva policy) — sin esto un creador no puede listar partners.
- `collaborations` gana `initiated_by` (`'creator'|'partner'`): ahora un creador puede proponer una colaboración a un partner, no solo al revés. Se generaliza `collaborations_insert_by_partner` → `collaborations_insert_by_initiator`, y `notify_collaboration_created()` avisa a quien NO inició, sea quien sea.
- Tabla nueva `discovery_searches`: cada búsqueda (filtros o IA) deja un registro. A diferencia de `reports`, aquí ni siquiera hay policy de insert para el cliente — solo escribe `server/api/discover/search.post.ts` con la `service_role` (mismo criterio que `metrics`/`ml_predictions`: sin política no hay permiso). El admin la lee vía `service_role` igual que el resto.

### Backend

- `server/api/discover/search.post.ts` (nuevo): motor único para las dos direcciones — mira de qué tabla (`creators`/`partners`) es dueño quien llama para decidir sola qué buscar, nunca se fía de un `role` mandado por el cliente. Modo `filters` (solapamiento de categorías + rango de presupuesto) siempre funciona sin IA; modo `ai` además manda los candidatos + la búsqueda en lenguaje natural al mismo LLM gratuito de OpenRouter que ya usa `/api/ml/predict`, pidiendo puntuación + motivo de 1 frase por candidato — si no hay clave o falla, cae en el orden por filtros (mismo patrón de resiliencia que `predict.post.ts`). Cada llamada deja su fila en `discovery_searches`.
- `server/api/admin/discovery-analytics.get.ts` (nuevo): agrega `discovery_searches` de las últimas 8 semanas — volumen por semana, filtros vs. IA, creador vs. partner, búsquedas sin ningún resultado, categorías más pedidas, y las últimas 20 búsquedas en texto libre para leerlas a mano.

### Frontend

- `app/pages/partner/discover.vue` rediseñada: toggle Filtros/IA, chips de categoría, rango de presupuesto, textarea de búsqueda en modo IA, y el motivo de la IA mostrado en cada resultado.
- `app/pages/creator/discover.vue` (nuevo, y añadido a la navegación del creador): lo mismo pero para que un creador encuentre partners y les proponga una colaboración directamente (antes no existía ningún camino para esto).
- `app/composables/useMyCreator.ts`/`useMyPartner.ts`: ganan los campos nuevos + `updateFicha()`. `app/pages/creator/profile.vue`/`partner/profile.vue` ganan una sección "Tu ficha pública" para rellenarlos (bio, categorías, rango, qué busco) — sin esto los campos nuevos no se podrían rellenar nunca desde la UI.
- `NegotiationPanel.vue` ya no asume que la propuesta inicial es siempre del partner — nuevo prop `initiatedBy`, usado tanto para "a quién le toca responder" si no hay contraofertas todavía como para la etiqueta "Propuesta inicial (…)". `useMyCollaborations`/`useCollabRequests` exponen `initiatedBy`; los textos de `creator/requests.vue`/`partner/requests.vue` se suavizaron (ya no dicen "colaboraciones que te han propuesto partners", ahora es neutral en dirección).
- Panel de admin (`/admin`, pestaña Analíticas): nueva sección "Descubrir — qué pide la gente" con los datos de arriba.

### Pendiente / importante para la próxima sesión

- **La migración NO se ha aplicado al proyecto real de Supabase en esta sesión** — aplicar bases de datos compartidas sin confirmación explícita no es algo que deba hacerse solo. Aplicarla con `npx supabase db push` (o pegando el SQL en el SQL Editor del dashboard) antes de probar nada de esto en el navegador.
- Sin verificar en navegador real (no hubo uno disponible en esta sesión): el flujo completo recomendado es — rellenar la ficha pública de un creador y de un partner de prueba, buscar desde los dos "Descubrir" (filtros e IA), proponer una colaboración desde `/creator/discover`, comprobar que llega al partner en `/partner/requests` con `NegotiationPanel` mostrando bien quién propuso primero, y revisar la pestaña Analíticas del admin tras un par de búsquedas.
- La barra de navegación inferior del creador pasa de 5 a 6 iconos (se añadió "Descubrir") — en pantallas de móvil muy estrechas puede ir algo apretada; revisar a mano si hace falta recortar o reordenar.
- Quedó fuera a propósito, para no mezclar dos decisiones grandes en la misma sesión: los "packs mensuales"/recurrentes (sección 0 del roadmap) y la política de cuándo se paga (🔴 en `docs/10-ROADMAP-FUTURO.md`) — siguen pendientes, y la segunda sigue siendo más urgente que casi todo lo demás.

---

## 2026-10-21 (19) — Tablero estilo Trello, negociación por contraoferta, panel de admin, y primer paso de métricas reales

Sesión larga con el usuario (Mario), con varias piezas grandes. La mayoría ya está commiteada en `2608a50 "Subida archivos content"` (sin detalle en este changelog hasta ahora); lo de Instagram/Métricas de esta misma entrada sigue sin commitear al cerrar la sesión.

### Tablero de contenido (`creator/timeline.vue`) — de lista por fecha a Kanban de verdad

- `app/components/timeline/PhaseBoard.vue` (nuevo): columnas por fase (Idea → En producción → Para revisar → Programado → Publicado), arrastrables con `vuedraggable` (nueva dependencia — SortableJS por debajo, con soporte táctil real). Auto-scroll al arrastrar cerca del borde. Cada card tiene además un `<select>` de fase como atajo sin arrastrar.
- Responsive: en móvil las fases se apilan verticalmente (antes scroll horizontal, incómodo); en desktop, grid a ancho completo (`AppShell` ganó un prop `full-width` para esta página, el resto sigue con el `max-w` de siempre).
- `app/components/timeline/BoardCard.vue` (nuevo): card simplificada para el tablero — foto (o degradado si no hay), título, icono de red, y el selector de fase como botón grande de color. Sustituye a `DeliverableCard` solo aquí (esa sigue usándose en `creator/index.vue`/`partner/index.vue`).
- **Fotos de portada reales**: bucket de Storage `post-media` (público, una carpeta por creador vía RLS) — `supabase/migrations/20261021130000_post_media_bucket.sql`. `app/components/timeline/CoverUploader.vue` (nuevo) sube la foto desde la página de edición del post; `posts.media_url` (ya existía en el esquema, sin usar) ahora se lee/escribe de verdad.
- Pendiente: añadir la foto también al crear el post desde cero (`PostComposerSheet`), ahora mismo solo se puede añadir editando un post ya creado.

### Solicitudes → negociación por contraoferta + reportes

- `supabase/migrations/20261021140000_collaboration_offers_and_reports.sql` (nueva): tabla `collaboration_offers` (historial append-only de ofertas, con quién la hizo) y tabla `reports` (solo insert desde el cliente — sin policy de select, a propósito, se revisan a mano).
- `app/components/collab/NegotiationPanel.vue` (nuevo, compartido entre creador y partner): historial de ofertas, calcula a quién le toca responder, botones Aceptar/Rechazar (con confirmación)/Contraoferta, y un enlace "Reportar esta solicitud" con motivo + detalle.
- `app/pages/partner/requests.vue` (nueva): el partner **no tenía ninguna pantalla** para ver ni responder a una contraoferta del creador — ahora tiene su propia bandeja (Pendientes/Historial, como la del creador), añadida a su navegación.
- `app/pages/creator/requests.vue` rediseñada: pestañas Pendientes/Historial (`SegmentedTabs`), avatar del partner, tiempo relativo, y el detalle (hoja inferior) ahora usa `NegotiationPanel` en vez de un simple Aceptar/Rechazar.
- Al aceptar una oferta, `collaborations.budget_cents` se sincroniza con el importe acordado — importante porque el cobro de Stripe lee esa columna directamente.
- Pendiente: nada aplicado/probado todavía queda por aplicar aquí — la migración y el flujo completo ya se probaron en el proyecto real durante la sesión.

### Panel de administración (`/admin`) — nuevo, completo

- Autenticación propia, **sin cuenta de Supabase de por medio a propósito**: contraseña única en `ADMIN_PASSWORD` (comparación en tiempo constante) + cookie de sesión sellada (`useSession` de h3) con `ADMIN_SESSION_SECRET`. Ambas ya generadas y puestas en el `.env` de este equipo durante la sesión.
- `/admin/login` + `/admin` (4 pestañas): **Usuarios** (listar, bloquear/desbloquear con el baneo nativo de Supabase Auth, dar Pro manual con meses + créditos de golpe — `stripe_subscription_id: null` los distingue de un Pro pagado de verdad), **Actividad** (feed cronológico montado leyendo tablas existentes, sin tabla de eventos propia), **Analíticas** (gráficas de barras semana/mes: registros, colaboraciones nuevas, ingresos, Pro pagado vs. regalado — `app/components/charts/BarChart.vue` nuevo, no existía ninguno de barras), **Reportes** (lee la tabla `reports` de arriba).
- `nuxt.config.ts`: `/admin`, `/admin/*` añadidos al `exclude` de `@nuxtjs/supabase` (si no, el módulo los mandaba a `/login` antes de que nuestra propia comprobación de contraseña entrara en juego).
- Pendiente de verdad: nada — probado en vivo contra el proyecto real (login, listar, bloquear/desbloquear, dar Pro, ver actividad/analíticas), con las pruebas deshechas al terminar para no dejar las cuentas demo tocadas.
- Importante para desplegar: `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` tienen que estar también en las variables de entorno del hosting en producción, o `/admin` da un 500 en vez de dejar pasar a cualquiera (no es un fallo de seguridad, es el comportamiento querido).

### Tendencias — aparcada

- `creator/trends.vue` se movió a `app/_disabled/creator/trends.vue` (fuera de `app/pages`, así Nuxt no la registra como ruta) — decisión del usuario: la IA de `/api/ml/trends` no aportaba ideas lo bastante buenas todavía. Código intacto, con una nota arriba de cómo reactivarla. Quitados sus 2 enlaces (`utils/nav.ts`, acceso rápido de `creator/index.vue`).
- Antes de aparcarla se le habían añadido mejoras (botón "Buscar más ideas" que salta la caché de 24h, filtro por plataforma, "usar esta idea" → abre el composer con título/hashtags/red ya rellenados, descartar) — se quedan en el código aparcado, no se perdieron.
- De paso, `PostComposerSheet.vue` ganó un campo de hashtags (antes no se podían poner hashtags al crear un post a mano) y un prop `prefill` reutilizable para cualquier futura pantalla que quiera abrir el composer con datos ya puestos.

### Métricas — primer paso real (seguidores de Instagram)

- Decisión de producto importante, aclarada con el usuario tras confusión inicial: **crear la app en Meta/developers.facebook.com es trabajo del equipo, una sola vez — nunca de cada creador.** Para un creador final, "Conectar" siempre ha sido (y sigue siendo) un simple botón → login de Instagram → autorizar. Lo que de verdad hace falta una sola vez por parte del equipo es: app de Meta creada + (más adelante, para abrir la puerta a desconocidos) App Review/verificación de empresa — para probarlo con cuentas propias/de amigos, con modo Desarrollo + "tester" ya sobra, sin ninguna revisión.
- También decisión de producto: **no se va a construir publicar contenido desde la app** — el tablero de FEEDMA es seguimiento interno, nunca ha subido nada a redes vía API y no es el plan. Queda documentado para que no se intente sin querer más adelante.
- `server/api/auth/instagram/start.get.ts`: scope ahora `instagram_business_basic,instagram_business_manage_insights` (antes solo el básico) — es lo que de verdad trae seguidores.
- `server/api/auth/instagram/callback.get.ts`: guarda `followers_count` real al conectar (mismo `/me`, un campo más, sin llamada aparte).
- `server/api/social/instagram-sync.post.ts` (nuevo) + botón ↻ en `SocialAccountRow.vue`/`creator/socials.vue`: refresco manual de seguidores — no hay cron todavía.
- `creator/metrics.vue` reescrita: seguidores reales (totales y por red, `PlatformBreakdown` reutilizado con seguidores en vez de vistas) en lugar de `mock-data.ts`; aviso honesto de que alcance/interacciones/evolución semanal siguen sin conectar (eso es la API de Insights de verdad, aparte de solo seguidores).
- **Bloqueado al cerrar la sesión**: el usuario cambió su Instagram personal a cuenta Profesional (hecho), pero Facebook no le dejó crear la cuenta para developers.facebook.com en ese momento — sin eso no se puede crear la app de Meta ni rellenar `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`/`INSTAGRAM_REDIRECT_URI`. Ver el aviso "📍 Dónde lo dejamos" al principio de `docs/9-INSTAGRAM-OAUTH-SETUP.md` para los pasos exactos de cómo retomar.
- Sin commitear al cerrar: `README.md`, `docs/9-INSTAGRAM-OAUTH-SETUP.md`, `app/pages/creator/{metrics,socials,index}.vue`, `app/composables/useMySocialAccounts.ts`, `app/components/social/SocialAccountRow.vue`, `server/api/auth/instagram/{start,callback}.get.ts`, `server/api/social/instagram-sync.post.ts` (nuevo), `app/utils/nav.ts`, el movimiento de `trends.vue`.

### Verificado / sin verificar (de toda la sesión)

- `npx vue-tsc --noEmit` limpio en cada paso.
- Probado en vivo contra el proyecto real: tablero (drag & drop, fotos), seed de datos de demo (colaboraciones en varias fases + contraoferta de ejemplo), panel de admin completo, negociación por contraoferta.
- **Sin probar en vivo todavía**: el flujo de Instagram con la app de Meta de verdad (bloqueado, ver arriba) y, por tanto, `creator/metrics.vue` con datos que no sean "0 conectadas".

## 2026-10-21 (18) — Se elimina el rol Manager; Influencer → "Creador de contenido", Cliente → "Partner" (renombrado completo)

Decisión de producto del usuario: un manager, en la práctica, sería un partner más (contrata/organiza trabajo) — categorizarlo como un tercer rol aparte no tenía sentido. Se centralizan las relaciones en **creator ↔ partner**, y de paso se renombran los otros dos roles. A petición explícita, el renombrado es **completo y destructivo**: no solo etiquetas de UI, también tablas, columnas, funciones, políticas RLS, rutas y tipos — y se borra de verdad lo que queda sin uso (no se deja en desuso). Posible porque el proyecto sigue sin desplegarse (sin usuarios reales en producción todavía).

### Base de datos

- **`supabase/migrations/20261021120000_remove_manager_rename_creator_partner.sql`** (nueva, sin aplicar todavía — depende de que las migraciones anteriores ya estén aplicadas, en orden): la migración más grande hasta ahora.
  - Borra la cuenta demo de manager y su fila de `profiles` (`delete from auth.users ...`), la tabla `managers` entera, y `roster_requests` (con sus triggers y funciones — quedaba huérfana sin manager al que unirse).
  - Quita `manager_id` de `collaborations`/`subscriptions`/`influencers`; `collaborations.creator_id` pasa a ser `not null` (ya no hay manager que lo asigne más tarde — se borran de demo las filas que se quedarían sin dueño).
  - Renombra tablas: `influencers` → `creators`, `brand_clients` → `partners`. Renombra columnas: `influencer_id` → `creator_id`, `brand_client_id` → `partner_id`, en todas las tablas que los tenían.
  - `profiles.role`: el check pasa de `('manager','influencer','client')` a `('creator','partner')`; las filas existentes se actualizan (`influencer`→`creator`, `client`→`partner`).
  - Redefine bajo los nombres nuevos: `current_creator_id()`, `current_partner_id()`, `has_active_collaboration_with()`, todas las políticas RLS, `handle_new_user()` (sin rama de manager), `grant_welcome_credits()` (trigger ahora en `creators`), `approve_post`/`request_post_changes` (comprueban `partner_id`), y los triggers de notificaciones de colaboración (`notify_collaboration_created`/`updated`, ya sin la rama "manager asigna más tarde").
  - `subscriptions.plan_id`: fuera `'agency'` (era el plan de manager).
- Las migraciones `20261020180000_real_signup.sql` y `20261021110000_notifications.sql` (ninguna de las dos confirmada aplicada todavía) se dejaron **tal cual** a propósito: en el momento en que corren dentro de la secuencia, las tablas viejas (`influencers`/`managers`/`brand_clients`) todavía existen — son perfectamente válidas para ese punto del historial, y la migración de arriba las redefine al final con los nombres nuevos. Aplicar todas las migraciones pendientes seguidas, en orden, en una sola sesión.

### Frontend

- **Tipos** (`~/types`): `Role = 'creator' | 'partner'` (sin `'manager'`/`'client'`, sin traducción DB↔frontend — antes `useMyRole` traducía `'influencer'` de la base de datos a `'creator'` del frontend; ahora son el mismo valor en los dos sitios). `Influencer` → `Creator` (sin `managerId`), `BrandClient` → `Partner`, `Manager` eliminado. `Post.influencerId` → `creatorId`.
- **Composables**: `useMyInfluencer` → `useMyCreator`, `useMyBrandClient` → `useMyPartner`; `useMyManager`, `useMyRoster`, `useRosterRequests` **eliminados** (con el manager desaparece el roster y sus solicitudes). `useClientPosts` → `usePartnerPosts`. `useCollabRequests` simplificado (ya no hay rama "aceptar y asignar a alguien del roster" — el partner contacta directo al creador, sin intermediario). `useMyCollaborations`, `useMyPosts`, `useMyBilling`, `useMyCredits`, `useMySocialAccounts`, `useAccountCache` actualizados a los nombres de columna/tabla nuevos.
- **Páginas**: `app/pages/manager/` **eliminado entero** (7 archivos — resumen, roster, solicitudes, solicitudes de plantilla, tablero, métricas, perfil). `app/pages/client/` → `app/pages/partner/` (discover ya no tiene sección "Agencias"). `app/pages/creator/discover.vue` **eliminado** (pedir unirse a un roster ya no tiene sentido sin managers). `creator/profile.vue` pierde la fila "Agencia".
- **Componentes**: `app/components/influencers/InfluencerRow.vue` eliminado (solo lo usaba el manager). `PostDetailSheet`/`WeekBoard`/`DeliverableCard`: prop `influencer` → `creator`, tipo `Influencer` → `Creator`.
- **Navegación** (`utils/nav.ts`): `roleMeta`/`roleNav` solo `creator`/`partner`, con las etiquetas pedidas ("Creador de contenido", "Partner"). `role-guard.global.ts` simplificado a 2 secciones.
- **Landing**: `LandingRoles.vue` (3 tarjetas → 2), `LandingFilmstrip.vue` (quita el frame de manager), `LandingHero.vue`/`LandingCta.vue`/`LandingPipeline.vue` (texto actualizado).

### Servidor

- `server/utils/account-identity.ts`: `resolvePayerIdentity` simplificado — solo creadores tienen Connect/suscripción (antes resolvía manager O influencer).
- `server/utils/stripe-plans.ts`: fuera el plan `'agency'`, fuera el campo `for: 'influencer'|'manager'` (ya no hace falta, solo hay un tipo de cuenta que paga).
- `server/api/stripe/{create-checkout-session,connect/account-link,pay-collaboration}.post.ts`, `webhook.post.ts`, `ml/{predict,trends}.*.ts`, `auth/instagram/{start,callback}.get.ts`, `utils/oauth-state.ts`: `influencer_id`/`influencers`/`manager_id`/`managers` → `creator_id`/`creators` (sin rama de manager en ningún sitio).

### Otros

- `scripts/seed-demo-users.mjs`: ahora crea 2 cuentas (`creator@feedma.test`, `partner@feedma.test`), no 3. **Las cuentas demo ya existentes en el proyecto real** (`influencer@feedma.test`, `client@feedma.test`) siguen funcionando con sus emails de siempre — la migración les actualiza el `role`, pero no cambia su email; solo una base de datos nueva (o re-seedeada desde cero) tendría los emails `creator@`/`partner@`.
- `docs/2-DATABASE-SCHEMA.md` reescrito; `README.md`, `6-SUPABASE-SETUP.md`, `7-STRIPE-SETUP.md`, `8-AI-SUGGESTIONS-SETUP.md`, `9-INSTAGRAM-OAUTH-SETUP.md`, `1-ARCHITECTURE.md` actualizados. `5-FRONTEND-WORK-SPLIT.md` (describe el reparto de la Fase 1 con 3 roles) se dejó con un aviso arriba en vez de reescribirlo entero — es un documento histórico de una fase ya cerrada.

### Verificado / sin verificar

- `npx vue-tsc --noEmit` limpio (todo el proyecto) tras el renombrado completo.
- `npx nuxi prepare` corrido para regenerar los auto-imports de Nuxt con los composables nuevos/renombrados.
- Servidor de pruebas sano: `/`, `/login`, `/onboarding` → 200; `/inbox`, `/creator`, `/creator/requests`, `/creator/profile`, `/partner`, `/partner/discover`, `/partner/profile`, `/manager` → 302 (sin sesión, como cualquier ruta protegida — `/manager` ya no existe como página, pero el middleware de sesión redirige antes de que eso se note).
- **Falta aplicar la migración** en Supabase (después de las pendientes anteriores, en orden) y **probar en navegador real**: iniciar sesión con las cuentas existentes (ahora con rol `creator`/`partner`), confirmar que el registro de una cuenta nueva sigue funcionando, y repetir el flujo de colaboración completo (contactar → aceptar → post vinculado → aprobar → pagar) ya sin manager de por medio.

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
