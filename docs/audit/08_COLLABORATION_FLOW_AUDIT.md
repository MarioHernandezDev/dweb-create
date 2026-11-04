# Flujo de colaboraciones — auditoría y propuesta de evolución

> Encargo: [`propuesta-postvideo.md`](../../propuesta-postvideo.md) · Fecha: 2026-11-04.
> **Fuentes:**
> - Código en `main` + cambios de la auditoría.
> - Catálogo vivo (funciones, políticas, restricciones y permisos) en el Supabase local, que es idéntico a las migraciones (verificado el 03/11 contra la base compartida).
> - Los cinco recorridos completos en el navegador del 03/11 (ensayo y cuatro tomas, [03_FUNCTIONAL_QA.md](03_FUNCTIONAL_QA.md)).
>
> **Fuera del alcance:** pagos y Stripe (endpoints `server/api/stripe/*`, `paid_at`, `stripe_*`, comisiones). Se citan solo como punto de integración.

## 1. Resumen ejecutivo

El recorrido funciona de punta a punta y sus piezas críticas viven en el servidor (RPC SECURITY DEFINER con transiciones atómicas en la revisión). Pero la colaboración es hoy **una tarjeta con precio y estado más un brief congelado**, no un espacio de trabajo:

- **Hay dos formas de nacer y producen acuerdos distintos.**
  - Desde Descubrir, la solicitud lleva brief y condiciones (objetivo, público, tono, alcance, revisiones, exclusividad y derechos).
  - Desde una oferta aceptada en el chat, la colaboración nace **sin brief ni condiciones**. Un trigger las congela para siempre, así que no se pueden completar nunca.
  - Lo que se compró (entregables del paquete) no se guarda en la colaboración.
- **No hay entregables.** Las publicaciones vinculadas hacen de entregables implícitos, pero nada dice cuántas se deben ni de qué tipo. Completar la colaboración no comprueba nada.
- **La aprobación de la marca no obliga:**
  - El creador puede pasar sus publicaciones a «Programado» o «Publicado» sin `approve_post` (la RLS lo permite y la app solo avisa).
  - Puede cambiar la pieza después de aprobada sin que la aprobación caduque.
  - Enviar a revisión no avisa a la marca.
- **No hay cronología.** El «Registro» es un apunte manual y la negociación del chat no aparece en la colaboración.
- **El detalle es una hoja modal sin dirección propia.** Los avisos y «Ver colaboración» llevan a la lista, no a la colaboración, y no hay acceso al chat.

Lo que está bien y hay que conservar:
- RPC `approve_post` y `request_post_changes` (atómicas, con comentario obligatorio para pedir cambios y nota histórica en `post_revision_notes`).
- Negociación por chat con `respond_offer` idempotente (`unique (offer_id)`).
- Permisos por columna en `collaborations`.
- Valoraciones solo para participantes, una por persona (restricción única).

## 2. Mapa del recorrido actual

| # | Paso | Dónde (UI) | Cómo (servidor) | Resultado |
|---|---|---|---|---|
| 1 | Descubrir al creador y ver sus paquetes | `/partner/discover` → `/profile/creator/:id` | `discover/search`, `packages` (lectura) | ✅ |
| 2 | Abrir o reutilizar el chat | «Iniciar chat» | `get_or_create_conversation` (respeta `chat_privacy`) | ✅ |
| 3 | Oferta sobre un paquete | `ChatOfferSheet` | `create_offer` (precio libre más mensaje; guarda `package_title`) | ✅ |
| 4a | Rechazo y nueva oferta (chat) | `OfferCard` | `respond_offer(false)` y `create_offer` | ✅ (la «contraoferta» es texto libre más otra oferta) |
| 4b | Solicitud y contraoferta (Descubrir) | `*/discover.vue` → `NegotiationPanel` | `insert collaborations` (12 columnas) + `collaboration_offers` + `accept_collaboration_request` | ✅ |
| 5 | Colaboración creada | — | `respond_offer(true)` inserta `accepted` · `accept_collaboration_request` pasa a `accepted` | ✅ / ⚠️ brief vacío en 4a |
| 6 | Acceso desde las dos partes | `/creator/requests` y `/partner/requests` → hoja de detalle | `collaborations_select_own` | ⚠️ sin dirección propia |
| 7 | Crear y vincular una publicación | Studio → «Nueva publicación» → «Colaboración» | `posts_insert_self` (solo exige que la colaboración sea del creador) | ⚠️ |
| 8 | Producción y envío a revisión | Ficha de la publicación → «Mover a…» | `update posts` directo | ⚠️ sin aviso a la marca |
| 9 | Pedir cambios | Inicio de la marca o pestaña Calendario | `request_post_changes` (atómica, comentario obligatorio, nota y aviso) | ✅ |
| 10 | Reenvío y aprobación | Ficha → «Mover a "Para revisar"» · `approve_post` | Update directo · RPC atómica | ⚠️ reenvío sin aviso |
| 11 | Finalización | «Marcar como completada» (cualquiera de las dos partes) | `mark_collaboration_completed` (`accepted\|in_progress → completed`) | ⚠️ sin condición sobre los entregables |
| 12 | Valoraciones mutuas | `RatingPrompt` | `submit_collaboration_rating` (completada, participante, una vez) | ⚠️ la nota se revela al instante |

## 3. Arquitectura existente

| Capa | Piezas |
|---|---|
| Páginas | `app/pages/{creator,partner}/requests.vue` (lista con 3 pestañas y hoja de detalle; la del partner abre por `?collaboration=`, la del creador no) · `app/pages/creator/post/[id].vue` · `app/pages/{creator,partner}/index.vue` (calendario `WeekBoard`) · `app/pages/chat/[id].vue` |
| Componentes | `collab/NegotiationPanel`, `CollaborationTermsCard`, `CollaborationLogCard`, `CollaborationReport` (solo el partner), `RatingPrompt`, `RatingStars` · `timeline/PostReviewActions`, `WeekBoard`, `PostComposerSheet`, `PhaseBoard` · `chat/OfferCard`, `ChatOfferSheet` |
| Composables | `useMyCollaborations` (partner) · `useCollabRequests` (creador) · `useCollaborationOffers` · `useCollaborationLog` · `usePostRevisions` · `useRatings` · `useMyPosts` / `usePartnerPosts` · `usePostActions` · `useChat` |
| Tablas | `collaborations` (estado `requested\|accepted\|in_progress\|completed\|declined`, `brief`, `budget_cents`, 7 columnas de condiciones, `offer_id` único, `initiated_by`) · `collaboration_offers` (contraofertas de la solicitud) · `offers` (ofertas del chat) · `posts` (`collaboration_id`, estado `idea…published`) · `post_revision_notes` (`changes_requested\|approved`) · `collaboration_log_entries` (manual: `incident\|agreed_change`) · `collaboration_ratings` (`unique (collaboration_id, rater_profile_id)`) · `notifications` |
| RPC | `create_offer`, `respond_offer`, `accept_collaboration_request`, `decline_collaboration_request`, `mark_collaboration_completed`, `approve_post`, `request_post_changes`, `submit_collaboration_rating`, `profile_rating_summary`, `get_or_create_conversation` |
| Triggers | `prevent_collaboration_terms_update` (condiciones inmutables) · `notify_collaboration_created`, `_updated`, `_offer_created`, `_log_entry_created` · `set_post_published_at` · `delete_pending_offers_of_package` |
| RLS (vigente) | `collaborations`: SELECT para participantes; INSERT por quien inicia; **sin UPDATE ni DELETE**. `posts`: el creador lee y escribe las suyas y **puede actualizar cualquier columna, también el estado**; la marca lee las vinculadas. `post_revision_notes` y `offers`: solo lectura para participantes (se escriben por RPC). `collaboration_ratings`: **lectura pública** (`true`) |
| Tests | Integración: `collaboration-terms` (9), `collaborations-rls` (8), `post-revisions` (8), `ratings` (6), `offers` (4), `posts-collaboration-rls` (6), `collaboration-log` (9), `notification-links` (5), `collaboration-counters` (2). Unitarios: `collaboration-report`, `chat-view`, `ratings`, `partner-review-skip`. **Sin E2E** (el guion de la demo hace de ensayo manual) |

## 4. Matriz de auditoría

| Área | Estado | Evidencia |
|---|---|---|
| Ofertas y contraofertas en el chat | **Correcto** | `create_offer`/`respond_offer`; probado 5 veces en el navegador; `offers.spec` |
| Solicitud y contraoferta desde Descubrir | **Correcto** | `collaboration_offers` + `accept_collaboration_request` valida el importe contra las propuestas reales; `collaborations-rls.spec` |
| Colaboración única por oferta aceptada | **Correcto** | `unique (offer_id)` y `on conflict do nothing` |
| Brief y condiciones (desde Descubrir) | **Correcto** | 7 columnas, inmutables (trigger); `collaboration-terms.spec` |
| Brief y condiciones (desde una oferta del chat) | **Ausente** | `respond_offer` inserta solo estado, precio, `brief = 'Oferta aceptada por chat: …'` y `offer_id`; el trigger impide completarlas después |
| Qué se compró (entregables del paquete) | **Ausente** | Solo `offers.package_title`; los entregables viven en `packages.deliverables`, que se puede editar o borrar |
| Precio acordado | **Parcial** | `budget_cents` es correcto, pero `NegotiationPanel` lo rotula «Propuesta inicial»; tras `accept_collaboration_request` se sobrescribe y **se pierde la propuesta original** |
| Entregables | **Ausente** | No hay modelo; publicaciones vinculadas sin número ni tipo acordado |
| Vincular publicaciones | **Parcial** | Se puede vincular a cualquier colaboración propia, **también rechazadas, pendientes o completadas** (`posts_insert_self`/`posts_update_self`) |
| Envío a revisión | **Parcial** | Update directo del creador; **sin aviso a la marca**, ni en el primer envío ni en el reenvío |
| Pedir cambios y aprobar | **Correcto** | RPC atómicas (`where status = 'ready_for_review'`), comentario obligatorio, nota y aviso al creador; `post-revisions.spec` |
| Aprobación como requisito | **Parcial** | El creador puede pasar a Programado o Publicado sin aprobación (Q6: «solo avisar») |
| Aprobación ligada a la versión | **Ausente** | Tras `approve_post`, el creador puede cambiar la imagen o el texto y la publicación sigue aprobada |
| Finalización operativa | **Parcial** | Cualquier parte completa sin condición; no mira las publicaciones |
| Concurrencia en las transiciones | **Parcial** | Revisión: atómica. `accept_collaboration_request`/`decline_…` y `mark_collaboration_completed`: leen y luego actualizan sin volver a comprobar el estado (aceptar y rechazar a la vez puede pisarse) |
| Cronología | **Ausente** | No hay eventos; `collaboration_log_entries` es manual; las transiciones no guardan su momento (solo `updated_at`) |
| Historial de revisiones | **Correcto** | `post_revision_notes` sin sobrescritura, visible en la ficha («Historial de revisión») |
| Avisos | **Parcial** | Ver §5: falta el aviso de envío y reenvío a revisión; aviso engañoso al aceptar una oferta (F-02); los enlaces van a la lista |
| Enlace directo a la colaboración | **Parcial** | El partner admite `?collaboration=` (solo se usa al volver de Stripe); el creador no; `OfferCard` y los avisos llevan a la lista |
| Acceso al chat desde la colaboración | **Ausente** | — |
| Calendario | **Parcial** | Basado en `posts.due_date` (marca: Inicio y pestaña Calendario); la colaboración no tiene fechas propias |
| Valoraciones: elegibilidad, una vez y sin duplicados | **Correcto** | RPC más `unique`; `ratings.spec` |
| Valoraciones: independencia | **Ausente** | El aviso a la otra parte dice «5 / 5 estrellas» y la tabla es de lectura pública: se puede conocer la nota antes de dar la propia |
| Estados vacíos y errores | **Parcial** | Textos de condiciones vacías pensados para antes de aceptar («antes de decidir») |
| Pruebas E2E | **No verificado** | No hay E2E en el repositorio |

## 5. Problemas confirmados

| ID | Problema | Evidencia | Consecuencia |
|---|---|---|---|
| C-01 | Las colaboraciones de una oferta del chat nacen sin brief ni condiciones y no se pueden completar | `respond_offer` más `prevent_collaboration_terms_update`; visto en la demo («No se especificó el objetivo…») | Acuerdos de 1.050 € sin objetivo, público, alcance ni derechos de uso; terreno para disputas |
| C-02 | No se guarda qué se compró | `offers.package_title` sí, entregables no; `packages` se puede editar | Si el creador cambia el paquete, nadie sabe qué incluía el trato |
| C-03 | «Propuesta inicial (partner): 1.050 €» tras aceptar | `NegotiationPanel` usa `budget_cents`, que ya es el acordado | Texto falso; la propuesta original de Descubrir se pierde al aceptar |
| C-04 | La marca no se entera de que tiene algo que revisar | Sin trigger ni RPC al pasar a `ready_for_review` | Revisiones que esperan sin que nadie lo sepa (en la demo, la marca solo lo ve si entra en Inicio) |
| C-05 | Aviso «Nueva solicitud de colaboración» al aceptar una oferta (F-02) | `notify_collaboration_created` no distingue `offer_id` | Confunde al creador, que acaba de aceptar |
| C-06 | Aprobación sin efecto real ni ligada a la versión | `posts_update_self` permite cualquier estado y contenido | La marca aprueba una versión y se publica otra |
| C-07 | Publicaciones vinculables a colaboraciones cerradas o no aceptadas | `posts_insert_self` solo mira la propiedad | Entregables «de» colaboraciones rechazadas o completadas |
| C-08 | Completar sin comprobar el trabajo | `mark_collaboration_completed` | «Completada» con entregables en producción |
| C-09 | Carreras en aceptar, rechazar y completar | Lectura y actualización sin `where status = …` | Dos usuarios pueden ver resultados contradictorios |
| C-10 | No hay cronología; la negociación del chat no aparece en la colaboración | No hay tabla de eventos | Hay que reconstruir lo ocurrido leyendo el chat |
| C-11 | Los enlaces no llevan a la colaboración concreta | Enlaces `'/partner/requests'` en los triggers; `OfferCard` usa `?tab=active` | Un clic más y buscar en la lista |
| C-12 | La valoración se revela antes de valorar | Texto del aviso en `submit_collaboration_rating`; `collaboration_ratings_select_all` | Valoraciones de represalia o condicionadas |
| C-13 | Privacidad del chat: una colaboración aceptada desde Descubrir no cuenta como «oferta aceptada» | `has_accepted_offer_between` solo mira `offers` | La marca con una colaboración en curso no puede escribir a un creador con chat restringido |

## 6. Oportunidades de mejora (no son defectos)

- El detalle como página de trabajo de ancho completo, en lugar de una hoja modal con pestañas.
- Una sección de «pendientes de acción» (revisar, corregir, completar el brief, fecha próxima).
- Fechas propias de la colaboración (inicio y fecha límite final), además de las de cada publicación.
- Categorías de valoración (comunicación, plazos, calidad).
- Crear la publicación desde la propia colaboración, ya vinculada.

## 7. Experiencia objetivo

**Marca (NOVA STUDIO):**
1. Acepta o recibe la aceptación y llega a **la colaboración**, no a una lista.
2. Ve el acuerdo vigente: precio acordado, paquete y qué incluía, brief y condiciones, y lo que falta por completar.
3. Ve el progreso: entregables con su estado y fecha, y qué le toca a ella («2 entregas esperan tu revisión»).
4. Revisa allí mismo; cada decisión queda en la cronología.
5. Cuando todo está aprobado, completa y valora; la valoración del otro se revela cuando las dos partes han valorado.

**Creador (AREZZ):**
1. Ve lo que tiene que entregar y cuándo.
2. Crea cada pieza desde el entregable (ya vinculada) y la produce en Studio como hoy.
3. La envía a revisión; la marca recibe el aviso.
4. Si le piden cambios, el aviso le lleva al comentario.
5. Cuando se aprueba, la publica; editar después de aprobar exige nueva revisión.

## 8. Modelo funcional propuesto

### 8.1 Acuerdo (fuente de verdad: `collaborations`)
- **Precio acordado:** `budget_cents`, como hoy. Se muestra como «Precio acordado» desde `accepted`. La propuesta inicial de Descubrir se conserva como el primer evento de la cronología (8.4).
- **Qué se compró:** columnas nuevas de **instantánea del paquete** (`package_title`, `package_deliverables text[]`, `package_description`), copiadas en `respond_offer`. Así el acuerdo no depende del paquete vivo. No se duplica nada: el paquete es la oferta comercial y la instantánea es lo pactado.
- **Brief y condiciones:** las 7 columnas actuales. **Regla «rellenar una vez»:** tras aceptar, un campo vacío se puede completar (lo hace la marca; ver D-1), pero **nunca se sobrescribe un valor ya fijado**. El trigger actual pasa de «nada cambia» a «solo de NULL a valor». Cada relleno genera un evento. Cambiar algo ya fijado sigue siendo una **adenda**: el «cambio acordado» de `collaboration_log_entries` que ya existe, como constancia sin efecto automático.
- **Procedencia visible en la UI:** «del paquete», «de la oferta» y «brief añadido el …».

### 8.2 Entregables (sin un gestor paralelo)
- **Lo acordado:** los entregables de la instantánea del paquete, o las condiciones de alcance si viene de Descubrir.
- **Lo producido:** las publicaciones vinculadas, en Studio, como hoy. Cada publicación vinculada es un entregable con su estado real.
- **Recomendación (D-2):** en esta etapa **no crear tabla de entregables**. Progreso = publicaciones vinculadas por estado, frente a los entregables acordados como lista de referencia (texto). Una tabla `collaboration_deliverables` solo compensa si se quiere marcar «este reel cubre el entregable 2 de 5»; se puede añadir después sin romper nada.

### 8.3 Estados y transiciones

**Colaboración** (sin estados nuevos):

| Transición | Quién | Condición | Aviso |
|---|---|---|---|
| `requested → accepted` | La parte que no propuso | Importe de una propuesta real | Al partner |
| `requested → declined` | Cualquiera | — | Al partner |
| `accepted\|in_progress → completed` | Ver D-3 | **Propuesta:** ninguna publicación vinculada en `idea`, `in_production` o `ready_for_review`; si las hay, el cierre exige confirmación explícita y deja un evento con el motivo | A la otra parte |

`in_progress` lo pone el pago (fuera del alcance) y se respeta.

**Publicación de colaboración:**

| Transición | Quién | Cómo | Aviso |
|---|---|---|---|
| `… → ready_for_review` | Creador | Update directo, como hoy, más **trigger de aviso** | A la marca: «Entrega para revisar» o «Nueva versión para revisar» |
| `ready_for_review → in_production` | Marca | `request_post_changes` (como hoy) | Al creador |
| `ready_for_review → scheduled` | Marca | `approve_post` (como hoy) | Al creador |
| `scheduled → published` | Creador | Update directo | — |
| Cambiar la imagen o el texto de una aprobada | Creador | Ver D-5 | — |
| Saltar la aprobación | Creador | Ver D-4 | — |

**Concurrencia:** las RPC de aceptar, rechazar y completar pasan a `update … where status = <esperado> returning`. Si no devuelve fila, error «ya no está pendiente». Es el mismo patrón que `approve_post`.

### 8.4 Cronología
- Tabla nueva **`collaboration_events`**, de solo añadir:
  - Campos: `collaboration_id`, `actor_profile_id` (nullable, para eventos del sistema), `kind`, `post_id` (nullable), `detail jsonb` mínimo (importe, título, comentario) y `created_at`.
  - Sin UPDATE ni DELETE para nadie.
  - SELECT para los participantes.
  - Escritura solo desde triggers y RPC (SECURITY DEFINER).
- **Eventos desde la migración en adelante:** colaboración creada, aceptada, rechazada o completada; brief completado; publicación vinculada; enviada a revisión; cambios pedidos; aprobada; publicada; valoración enviada (sin la nota).
- **Historia anterior, sin inventar:** la vista añade, con su fecha real, lo que ya está guardado con marca de tiempo propia (ofertas del chat y sus respuestas, contraofertas, notas de revisión, apuntes del registro y valoraciones). Lo que no tiene fecha propia, como los cambios de estado antiguos, no se reconstruye.

### 8.5 Valoraciones
**Propuesta D-7:**
- La valoración del otro no se ve hasta que hayas enviado la tuya o pasen 14 días desde que se completó.
- El aviso deja de llevar la nota.
- El resumen público solo cuenta las reveladas.
- Categorías opcionales (comunicación, plazos y calidad), solo si se aprueban; la nota general sigue siendo la única obligatoria.

## 9. Plan de implementación

El orden va por dependencias y riesgo. **La fase 1 no necesita decisiones de producto** y se empieza ya. Las demás dependen de §12.

### Fase 1 — Defectos sin decisión de producto (C-03, C-04, C-05, C-11 y la parte sin decisión de C-09)
- **Objetivo:** que el flujo actual diga la verdad, avise y lleve a la colaboración correcta.
- **Alcance:**
  1. Textos: «Precio acordado» tras aceptar; condiciones vacías con texto según el estado.
  2. Trigger de aviso a la marca al enviar o reenviar a revisión, idempotente por transición.
  3. No avisar «nueva solicitud» de colaboraciones nacidas de una oferta.
  4. Enlace directo `?collaboration=<id>` en las dos páginas (más `&post=<id>` para abrir la revisión), desde `OfferCard` y desde los avisos nuevos.
  5. Botón «Abrir chat» en el detalle.
  6. Aceptar y rechazar atómicos (`where status = 'requested'`).
- **Archivos:** `collab/NegotiationPanel.vue`, `collab/CollaborationTermsCard.vue`, `chat/OfferCard.vue`, `pages/{creator,partner}/requests.vue`, `useMyCollaborations`, `useCollabRequests`; migración nueva.
- **Base de datos:** trigger `notify_post_review_requested` en `posts`; redefinir `notify_collaboration_created`, `accept_collaboration_request` y `decline_collaboration_request`, conservando cuerpo, `search_path` y permisos.
- **Tests:** integración (aviso al enviar y reenviar; sin aviso en un update al mismo estado ni en publicaciones sin colaboración; sin `collaboration_requested` al aceptar una oferta; aceptar dos veces → la segunda falla); navegador en el entorno local.
- **Riesgos:** redefinir funciones SECURITY DEFINER (mitigado con la definición viva y las pruebas). Avisos de más (mitigado: solo en transición).
- **Aceptación:** la marca recibe «Entrega para revisar» con un enlace que abre esa colaboración y esa publicación; tras aceptar, se lee «Precio acordado».
- **Fuera:** brief, entregables, bloqueo de la aprobación y cronología.

### Fase 2 — Acuerdo (C-01, C-02; decisión D-1)
- **Alcance:** instantánea del paquete en `respond_offer` (y relleno de las colaboraciones antiguas desde `offers.package_id` si el paquete existe); regla «rellenar una vez» en el trigger de condiciones; formulario de brief para la marca en el detalle; procedencia visible.
- **Base de datos:** 3 columnas en `collaborations` (más su concesión de SELECT); nuevo `prevent_collaboration_terms_update`; RPC `complete_collaboration_brief` (comprueba participante y rol, solo campos NULL).
- **Tests:** rellenar un campo vacío ✅; sobrescribir uno fijado ❌; usuario ajeno ❌; colaboración antigua sin paquete → estado vacío.
- **Riesgos:** tocar `respond_offer`, que fija `budget_cents`. Se mantiene igual: solo se añaden columnas al insert. El responsable de pagos debe saberlo.
- **Aceptación:** una colaboración nacida en el chat muestra qué incluía el paquete y la marca puede completar el brief una vez.

### Fase 3 — Cronología (C-10)
- **Alcance:** `collaboration_events` más triggers y RPC que la escriben; componente de cronología con la historia anterior honesta (8.4).
- **Tests:** cada transición deja un evento; ajeno sin acceso; sin UPDATE ni DELETE; sin duplicados por reintento (eventos solo en transición real).
- **Aceptación:** la cronología de la colaboración de la demo cuenta la negociación, la revisión y el cierre sin abrir el chat.

### Fase 4 — Reglas de estado (C-06, C-07, C-08; decisiones D-3, D-4, D-5)
- **Alcance según lo que se decida:** vincular solo a colaboraciones `accepted` o `in_progress`; completar con condición; aprobación obligatoria o caducada al editar.
- **Riesgo:** cambia el comportamiento que conocen los usuarios. Va detrás de la cronología, para que todo quede registrado.

### Fase 5 — Detalle como centro de gestión (decisión D-8)
- **Alcance:** página `/creator/collaborations/[id]` y `/partner/collaborations/[id]` (o la hoja ampliada), con cabecera (otra parte, estado, precio acordado, chat), acuerdo, progreso derivado, entregables, revisión, cronología y pago informativo (sin tocar su lógica). Las listas y los enlaces apuntan a la página.
- **Tests:** E2E de los dos roles y de un usuario ajeno (404); responsive a 390, 768 y 1440 px.

### Fase 6 — Valoraciones (C-12; decisión D-7)
- **Alcance:** revelado mutuo o a los 14 días; aviso sin la nota; categorías si se aprueban.

### Fase 7 — Pulido y regresión
- **Alcance:** el guion de la demo convertido en un E2E contra el Supabase local (`scripts/demo-video/rec-run.mjs` ya hace los 21 pasos); axe; documentación.

## 10. Plan de pruebas por fase

| Fase | Integración (Supabase local) | Navegador o E2E |
|---|---|---|
| 1 | Aviso de revisión (envío, reenvío, idempotencia, sin colaboración); F-02; aceptar y rechazar concurrentes | Precio acordado; enlace del aviso abre la colaboración y la publicación; botón de chat |
| 2 | Rellenar una vez; sobrescribir ❌; ajeno ❌; instantánea al aceptar | Formulario de brief (marca); lectura (creador) |
| 3 | Un evento por transición; RLS; sin UPDATE ni DELETE | Cronología de la demo |
| 4 | Vincular a una colaboración cerrada ❌; completar con pendientes; aprobación | Flujo completo con las reglas |
| 5 | — | E2E de los dos roles, ajeno, responsive |
| 6 | Revelado; aviso sin nota; resumen | Valorar en los dos sentidos |
| 7 | Suite completa | E2E de 21 pasos y axe |

## 11. Riesgos y compatibilidad

- **Colaboraciones existentes:**
  - Sin instantánea → se rellena desde `offers.package_id` cuando el paquete sigue existiendo y, si no, se queda vacía, con un estado vacío honesto.
  - Sin eventos → la cronología muestra solo lo que tiene fecha propia.
  - Las condiciones ya fijadas no se tocan.
- **Seguridad:**
  - Toda función nueva será SECURITY DEFINER con `set search_path = public`, `revoke` a `public` y `anon` y `grant` explícito.
  - Ningún dato de rol o identidad sale del cliente (`current_creator_id()`/`current_partner_id()`).
  - La cronología no guarda notas de valoración ni datos de pago.
- **Pagos:**
  - `respond_offer` y `mark_collaboration_completed` están junto al pago (fijan el precio y cierran). Los cambios propuestos no cambian el precio ni cuándo se cobra, y no tocan `paid_at` ni `stripe_*`.
  - Si D-3 se decide en el sentido de exigir el pago antes de completar, se coordina con el responsable de pagos (F-05, R-10).
- **Reversión:** cada migración lleva su `ROLLBACK` comentado, como las anteriores. Las columnas nuevas son aditivas.

## 12. Decisiones que necesitan tu aprobación

| ID | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| D-1 | Tras aceptar, ¿se puede completar el brief? | (a) congelado como hoy · (b) solo los campos vacíos, una vez, por la marca, con evento · (c) editable con adenda aceptada por las dos partes | **(b)**: resuelve C-01 sin permitir sobrescribir lo pactado; las adendas siguen en el «Registro» |
| D-2 | ¿Tabla de entregables? | (a) no: publicaciones vinculadas frente a la lista del paquete · (b) sí: `collaboration_deliverables` con vínculo a la publicación | **(a) ahora**, (b) si se necesita marcar el cumplimiento entregable a entregable |
| D-3 | ¿Quién completa y con qué condición? | (a) cualquiera, sin condición (hoy) · (b) cualquiera; si hay publicaciones sin aprobar, confirmación explícita y motivo en la cronología · (c) solo la marca · (d) bloqueo total si hay pendientes | **(b)**: no bloquea casos legítimos (alcance reducido) y deja rastro |
| D-4 | ¿La aprobación de la marca es obligatoria para programar o publicar (reabre Q6)? | (a) solo aviso (hoy) · (b) obligatoria en colaboraciones `accepted`/`in_progress` (RLS o trigger) | **(b)**: es lo que el producto promete («la marca revisa antes de publicar») |
| D-5 | ¿Qué pasa al editar una publicación ya aprobada? | (a) nada (hoy) · (b) cambiar la imagen o el texto la devuelve a «En producción» con evento · (c) bloquear la edición | **(b)** |
| D-6 | ¿Una colaboración aceptada desde Descubrir abre el chat restringido? | (a) no (hoy) · (b) sí, igual que una oferta aceptada | **(b)**: es la intención de la opción de privacidad |
| D-7 | Valoraciones | Revelado mutuo o a los 14 días (sí o no) · categorías (ninguna, o comunicación, plazos y calidad) | Revelado mutuo **sí**; categorías **no por ahora**: no hay datos suficientes y alargan el formulario |
| D-8 | ¿Detalle en página propia u hoja ampliada? | (a) página `/{rol}/collaborations/[id]` · (b) hoja ampliada | **(a)**: enlaces directos, ancho completo y un espacio de trabajo real |
| D-9 | ¿Cancelar una colaboración aceptada? | (a) no (hoy) · (b) sí, con motivo | **Fuera de esta etapa**: necesita política de producto y afecta a pagos |

## 13. Estado de la implementación

- **Fase 1:** implementada y probada en el Supabase local (200/200 de integración, 613/613 unitarios). Migración `20261104100000` **pendiente de aplicar en la base compartida**; falta el recorrido en navegador. Detalle: CHANGELOG Alex-57.
- **Decisiones:** Alex aprobó las recomendaciones de D-1 a D-9 (D-9 queda fuera de esta etapa).
- **Fase 1:** migración `20261104100000` aplicada por Alex en la base compartida; recorrido en navegador hecho (Alex-58).
- **Fase 2:** implementada y probada en el Supabase local (207/207 de integración, 613/613 unitarios, navegador 11/11). Migración `20261104110000` **pendiente de aplicar en la base compartida**. Detalle: CHANGELOG Alex-58.
- **Fases 3 a 7:** pendientes (cronología, reglas de estado, página de detalle, valoraciones, regresión).
