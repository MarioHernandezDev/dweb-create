# Fase 2 — Entregables como datos y reglas de estado · propuesta técnica

> **Estado: IMPLEMENTADA en local; migraciones PREPARADAS y NO aplicadas en la base compartida.** Decisiones D1–D7 aprobadas tal como se recomendaban (2026-11-05). Este documento es la propuesta original; **§13 recoge en qué se ha desviado la implementación y por qué.**
> Parte de `CIBERAN_COMPETITIVE_AUDIT.md` (F2) y de `docs/audit/08_COLLABORATION_FLOW_AUDIT.md` (C-02, C-06, C-07, C-13).
> Fuera de alcance: pagos/Stripe y conexión de redes sociales.

## 0. Qué existe hoy (verificado en el código y en el esquema)

| Pieza | Estado real |
|---|---|
| Lo contratado | `collaborations.package_title/description/deliverables` (**text[]**, texto libre, p. ej. «1 reel de 30-45 s», «3 stories»), copiado por `respond_offer` en el momento de **aceptar**, leyendo el paquete **vivo**. Congelado después (trigger `prevent_collaboration_terms_update`). |
| Colaboraciones nacidas de Descubrir | **No tienen paquete ni entregables**: solo `brief` y condiciones. |
| Publicaciones | `posts.collaboration_id` (nullable, `on delete set null`). Sin identidad de «entregable». El creador puede actualizar **cualquier columna** de sus posts (RLS `posts_update_self`), incluido pasar a `scheduled`/`published` sin aprobación. |
| Contenido del post | `title, caption, content_type, platform, media_url, metadata.hashtags` (en `metadata` solo hay hashtags). Sin versión. |
| Revisión | `post_revision_notes (kind approved/changes_requested, comment)`, RPC `approve_post`/`request_post_changes` (atómicas, `where status='ready_for_review'`). La nota **no** dice a qué versión del contenido se refiere. |
| Cierre | `mark_collaboration_completed` (accepted/in_progress → completed, cualquiera de las partes) **sin condiciones**. |
| Cronología | `collaboration_events` (Fase 1), alimentada por triggers. |
| Datos compartidos (solo lectura, solo recuentos) | 16 colaboraciones (6 aceptadas, 2 en curso, 2 completadas, 3 rechazadas, 3 pendientes); **0 con paquete, 0 de oferta, 0 posts vinculados**. Las 2 completadas no tienen ninguna publicación. El riesgo de la migración de datos en la base compartida es mínimo; el diseño cubre igualmente el caso general. |

Consecuencia: «lo contratado» solo existe como texto de paquete en las colaboraciones nacidas de una oferta del chat; el resto de colaboraciones no tiene nada estructurado que migrar.

## 1. Instantánea de entregables (lo contratado, y que no cambie)

**Problema detectado:** `respond_offer` copia `packages.deliverables` **al aceptar**. Si el dueño edita el paquete entre que se envió la oferta y se aceptó, lo contratado no es lo que la oferta mostraba.

**Propuesta**
1. `offers` gana `package_description text` y `package_deliverables text[]` (instantánea **al crear la oferta**, en `create_offer`, igual que ya se guarda `package_title`).
2. `respond_offer` pasa a copiar **de la oferta**, no del paquete vivo. Para ofertas pendientes anteriores a la migración (sin instantánea) se mantiene el comportamiento actual (paquete vivo en el momento de aceptar): es lo único que existe; no se inventa historia.
3. Al aceptar, **en la misma transacción**, se crean las filas de `collaboration_deliverables` (§2) a partir de `package_deliverables`: **un entregable por elemento del array, con el texto literal como título**. No se interpreta ni se parte («3 stories» es **un** entregable: no se adivina cantidad, tipo ni plataforma).
4. `collaborations.package_*` se mantiene como instantánea de auditoría (ya inmutable); la tabla de entregables es la copia de trabajo con identidad. Los títulos de los entregables **no se pueden editar** (sin permisos de escritura para el cliente).
5. Idempotencia: `respond_offer` ya usa `on conflict (offer_id) do nothing`; las filas de entregables solo se insertan cuando la colaboración se crea de verdad (si el `insert` no devuelve id, no se crean).

**Limitación explícita:** el paquete es texto libre. Si se quisiera «tipo/plataforma/cantidad» por entregable habría que estructurar `PackageFormSheet` (Fase 2b, **decisión D4**); no se hace sin acuerdo.

## 2. Identidad y asignación

**Tabla nueva `collaboration_deliverables`** (la única tabla nueva de la fase)

```
id               uuid pk
collaboration_id uuid not null → collaborations(id) on delete cascade
position         smallint not null            -- orden en el paquete (0..n-1)
title            text not null                 -- instantánea literal
origin           text not null check in ('package','defined')   -- de la oferta, o definido por la marca (D1)
post_id          uuid null → posts(id) on delete set null
resolution       text null check in ('waived','accepted_without_approval')
resolution_by    uuid null → profiles(id)
resolution_reason text null
resolution_version int null                    -- versión del post aceptada sin aprobación
resolved_at      timestamptz null
created_at       timestamptz default now()
unique (collaboration_id, position)
unique (post_id) where post_id is not null     -- un post ocupa como mucho un hueco
check (resolution is null or (resolution_by is not null and resolved_at is not null and char_length(btrim(resolution_reason)) between 10 and 500))
```

- **Un entregable = un hueco; un hueco = como mucho un post; un post = como mucho un hueco** (índice único parcial; lo hace cumplir la base de datos, no la interfaz).
- **Consistencia entre tablas** (trigger `BEFORE INSERT/UPDATE` en la tabla): el post asignado debe pertenecer a la **misma colaboración** y al **creador** de esa colaboración. Un trigger en `posts` desasigna el hueco si el post cambia de colaboración o se queda sin ella, y reabre el hueco si el post se borra (`on delete set null` + evento).
- **Sin escritura directa del cliente** (`revoke insert, update, delete`); solo RPC:
  - `assign_deliverable(p_deliverable_id, p_post_id)` — **solo el creador** de la colaboración. Valida: colaboración `accepted|in_progress`; hueco sin resolver y libre; post suyo, y o bien sin colaboración (se vincula en la misma operación) o ya de **esta** colaboración; el post no ocupa otro hueco. Bloqueo `select … for update` del hueco y luego del post (**orden fijo** para evitar interbloqueos). Idempotente: asignar de nuevo el mismo post devuelve el estado actual sin error.
  - `unassign_deliverable(p_deliverable_id)` — solo el creador, y **solo si el post aún no está en revisión ni aprobado** (`idea|in_production`). No se puede soltar contenido ya revisado.
- Sin asignación automática «por conveniencia» (riesgo de asignar a una pieza equivocada): la interfaz **preselecciona** el único hueco libre, pero el creador confirma.
- Borrar un post: si está `ready_for_review`, `scheduled` o `published` y la colaboración está activa, **se bloquea** (D6); si no, el hueco se reabre con evento `deliverable_unassigned`.

**Colaboraciones sin paquete (Descubrir y antiguas)** — ver **D1**. Recomendación: **«modo libre»** (como hoy: sin huecos, el progreso cuenta las publicaciones vinculadas) más la posibilidad de que **la marca defina los entregables una sola vez** (`define_deliverables(p_collaboration_id, p_titles text[])`, mismo patrón «rellenar una vez» que `complete_collaboration_brief`), con aviso y evento para el creador y **confirmación del creador** antes de que sean exigibles al cerrar (para que la marca no pueda añadir obligaciones unilateralmente tras aceptar).

## 3. Aprobaciones por versión

**Versión del contenido** (no hash: más simple, mostrable «v2» y sin colisiones al revertir una edición)
- `posts.content_version int not null default 1`.
- **Campos que cuentan** («materiales»): `title, caption, content_type, platform, media_url, metadata->hashtags`.
- **Campos que no**: `due_date`, etiquetas, checklist, estado, enlace externo, puntuación ML, `published_at`.
- Trigger `BEFORE UPDATE` en `posts`: si algún campo material cambia (`is distinct from`), `content_version := old + 1`.

**Vincular la aprobación a la versión**
- `post_revision_notes` gana `content_version int` (la versión sobre la que se aprobó o se pidieron cambios).
- `approve_post(p_post, p_comment, p_content_version)` y `request_post_changes(p_post, p_comment, p_content_version)`: la interfaz envía la versión que el partner **estaba viendo**. Si no coincide con la actual → error «La pieza ha cambiado mientras la revisabas», sin aprobar nada (control optimista de concurrencia: aprobar lo que se vio, no lo que hay ahora).
- Reordenación en `approve_post`: **primero** inserta la nota (con la versión) y **después** actualiza el estado, de modo que la regla de guarda (§6) pueda exigir «existe aprobación vigente» de forma uniforme, sin variables de sesión ni excepciones para la RPC.

**Invalidar solo cuando importa**
- Aprobación **vigente** = existe una nota `approved` con `content_version = posts.content_version` y **ningún** `changes_requested` posterior para esa versión.
- Si cambia un campo material de un post `scheduled` de una colaboración activa → el trigger lo devuelve a `in_production`, registra el evento `approval_invalidated` y el creador debe volver a enviarlo a revisión. (Decisión **D2**: `in_production` en vez de `ready_for_review` automático para no molestar a la marca por un cambio que el creador aún puede estar terminando.)
- Cambios **no** materiales (fecha límite, etiquetas, checklist…) **no** tocan nada.
- Post `ready_for_review` con edición material: sube la versión y **sigue en revisión**; la marca verá un aviso «versión actualizada» y su botón Aprobar enviará la versión nueva (o fallará si quedó vieja).
- Post ya `published`: el contenido está fuera; una edición material sube la versión, **no** cambia el estado y deja el evento `edited_after_publish` (no se puede «des-publicar»; se informa, no se castiga) — **D5**.

## 4. Excepciones (renunciar / aceptar sin aprobación)

Solo **la marca** (partner de la colaboración), vía RPC, con **motivo obligatorio** (10–500 caracteres) y constancia automática en la cronología:

- `resolve_deliverable(p_deliverable_id, 'waived', p_reason)` — **renuncia**: el hueco deja de contar. Permitido con o sin post asignado.
- `resolve_deliverable(p_deliverable_id, 'accepted_without_approval', p_reason)` — **acepta tal cual**: requiere post asignado. Se guarda `resolution_version` = versión actual del post: **si el creador edita después algo material, la excepción caduca** (misma lógica que la aprobación; no es un cheque en blanco). Con esa excepción el post puede pasar a `scheduled`/`published` sin nota de aprobación.
- `reopen_deliverable(p_deliverable_id)` — la marca deshace la excepción mientras la colaboración no esté completada (evento `deliverable_reopened`).
- Quedan registrados `resolution_by`, `resolved_at`, `resolution_reason`, y el evento (con autor y motivo) en la cronología que ven las dos partes. El creador **no** puede crear excepciones.
- Idempotencia: repetir la misma resolución no hace nada; cambiar de una a otra exige `reopen` explícito (queda rastro).

## 5. Colaboraciones anteriores (sin inventar)

Principio: **solo se crea lo que se puede derivar de un dato guardado**.

| Caso | Qué se hace |
|---|---|
| Nacida de oferta con `package_deliverables` no vacío | Se crean los huecos (`origin='package'`, texto literal, orden del array). Los posts **no** se asignan automáticamente (no hay forma fiable de saber cuál cumple cuál); aparecen como «publicaciones sin asignar» y el creador los asigna. |
| Sin `package_deliverables` (Descubrir, antiguas, completadas, rechazadas) | **Cero huecos**: modo libre. Nada cambia en su comportamiento ni en su cierre. |
| Colaboraciones `completed`/`declined` | Solo lectura; no se crean huecos nuevos ni se exige nada. |
| Aprobaciones antiguas (`post_revision_notes` sin versión) | Se rellenan con `content_version = 1` y los posts parten de `1`: supuesto declarado («lo aprobado es lo que hay»). Sin historial de ediciones no hay mejor dato; se marca en la migración y en el CHANGELOG. |
| Posts `scheduled`/`published` vinculados sin nota de aprobación | **No se tocan** (la regla de guarda actúa en transiciones nuevas, no con carácter retroactivo). En la base compartida hay 0. |
| Colaboraciones en curso con huecos nuevos | Para el cierre cuentan solo los huecos existentes; si una en curso tiene huecos creados por el relleno, el cierre los exige (es lo contratado). |

Verificación previa a aplicar: consulta de solo lectura que cuente huecos esperados por colaboración y los compare con `array_length(package_deliverables,1)`; prueba del relleno sobre una copia de los datos locales.

## 6. Seguridad y consistencia

**RLS**
- `collaboration_deliverables`: `select` solo para las dos partes (mismo patrón que `collaboration_events`); **sin** políticas de escritura y con `revoke insert, update, delete` a `authenticated` y `anon`.
- `posts`: se mantiene `posts_update_self`; la nueva garantía no se basa en RLS (no puede comparar versiones) sino en **triggers** (se ejecutan también con `service_role`).

**RPC (todas `SECURITY DEFINER`, `search_path = public`, `revoke … from public, anon`, `grant … to authenticated`)**
`assign_deliverable`, `unassign_deliverable`, `resolve_deliverable`, `reopen_deliverable`, `define_deliverables` (D1), `confirm_deliverables` (D1); redefinidas: `respond_offer`, `create_offer`, `approve_post`, `request_post_changes`, `mark_collaboration_completed`. Cada una comprueba el rol con `current_creator_id()`/`current_partner_id()` y que la colaboración sea de quien llama.

**Guarda de estado en `posts`** (`BEFORE UPDATE OF status`): un post de una colaboración `accepted|in_progress` **no puede pasar a `scheduled` ni `published`** si no hay aprobación **vigente** para su versión actual **o** una excepción `accepted_without_approval` con esa misma versión. Aplica también al «modo libre» (cumple el objetivo C-06). No afecta a posts sin colaboración.

**Regla de cierre** (`mark_collaboration_completed`): si la colaboración tiene huecos, cada uno debe estar **resuelto** = aprobado vigente (o publicado con aprobación vigente) · aceptado sin aprobación vigente · renunciado. Si no:
- el **creador** no puede cerrar (error con el recuento de pendientes);
- la **marca** puede cerrar, pero solo tras resolver cada pendiente con renuncia o aceptación (que dejan motivo): así el cierre con huecos abiertos **siempre** deja constancia. (**D3**)
- sin huecos (modo libre): comportamiento actual.

**Concurrencia e idempotencia**
- Control optimista por versión en aprobar/pedir cambios (§3).
- `select … for update` en el hueco y luego en el post, en ese orden, en todas las RPC.
- Índices únicos como última barrera (`post_id`, `(collaboration_id, position)`, `offer_id`).
- Re-ejecución segura de todas las RPC y de las migraciones (`if not exists`, `on conflict do nothing`, `where not exists`).
- Todo cambio de estado + evento en la **misma transacción** (los eventos los siguen escribiendo los triggers/RPC con `collab_event_add`).

## 7. Integración con lo existente (sin sistemas paralelos)

- **Revisión/aprobación**: se sigue usando `post_revision_notes` y las RPC `approve_post`/`request_post_changes` (solo se añade la versión). No hay tabla de «aprobaciones de entregables».
- **El estado de un entregable no se duplica**: se **deriva** (vista `security_invoker` `collaboration_deliverable_status`) del hueco, del post, de su versión y de la última nota. La interfaz deja de adivinar (hoy lo hace `deliverableState` en el cliente con eventos) y lee el estado real.
- **Cronología**: se amplía el `check` de `collaboration_events.kind` con `deliverables_defined`, `deliverable_assigned`, `deliverable_unassigned`, `approval_invalidated`, `deliverable_waived`, `deliverable_accepted_without_approval`, `deliverable_reopened`, `edited_after_publish`. Mismos triggers/`collab_event_add`.
- **Página de colaboración**: el panel «Entregables» pasa de listar posts a listar **huecos** (con su post, estado y versión); sigue usando `CollabPostPreview` y `PostReviewActions`.
- **«Qué me toca» / «Siguiente paso»**: `collaborationWork` lee el estado desde la vista (tareas nuevas: asignar publicación, resolver entregable, volver a enviar tras aprobación invalidada) en vez de inferirlo.
- `NegotiationPanel`, pago, valoración y cronología no cambian.

## 8. Experiencia de usuario

**Panel «Entregables» (ambos roles)** — cabecera: *«2 de 3 resueltos»* con barra de progreso (resueltos = aprobados · aceptados sin aprobación · renunciados). Filas:

```
Entregables                                 2 de 3 resueltos  ▓▓▓▓▓▓░░░
─────────────────────────────────────────────────────────────────────────
1 reel de 30-45 s            Reel de lanzamiento  v2     ● Aprobado
                             vence 12 nov                (aprobado en v2)
3 stories                    Stories de temporada v1     ◐ Cambios pedidos
                             atrasada 2 d                 “Más luz en el 1.er plano”
Carrusel de producto         — sin publicación —         ○ Pendiente
```

**Creador**
- Hueco libre → «Asignar publicación» (selector con sus posts de esta colaboración sin asignar, o «Crear publicación para este entregable», que abre el compositor ya vinculado).
- Post en producción → «Enviar a revisión»; con **cambios pedidos** se ve el comentario y la acción «Corregir»; con **aprobación invalidada** se avisa «Cambiaste el contenido: necesita nueva aprobación» y, antes de guardar una edición material de una pieza aprobada, un aviso de confirmación.
- Excepciones se ven como «Aceptado sin aprobación por [marca] — motivo» o «Renunciado — motivo».

**Partner**
- Fila en revisión → «Revisar» (aprobar / pedir cambios con comentario obligatorio) sobre la **versión visible**; si cambió, aviso y recarga.
- Menú de la fila: «Aceptar sin aprobación formal» y «Renunciar a este entregable»: diálogo con **motivo obligatorio** y texto que explica el efecto (y que caduca si el creador cambia algo material); «Reabrir» mientras no esté completada.
- Cerrar colaboración con pendientes: diálogo que lista los huecos abiertos y exige resolverlos (con motivo) primero.

**Estados mostrados** (derivados): Pendiente · En preparación · En revisión · Cambios pedidos · Aprobado · Aceptado sin aprobación · Renunciado, más etiquetas «Publicado», «Atrasado» y «Aprobación invalidada». Fechas: la fecha límite es la del post asignado; un hueco sin post no inventa fecha.

## 9. Archivos y componentes afectados

- **Migraciones (3, a aplicar solo tras tu confirmación)**
  1. `…_deliverables_snapshot_and_model.sql`: columnas de instantánea en `offers` y `create_offer`; tabla `collaboration_deliverables` (+RLS, restricciones, triggers de consistencia); `respond_offer`; relleno desde `collaborations.package_deliverables`; ampliación de `collaboration_events.kind`.
  2. `…_post_versions_and_approval_guard.sql`: `posts.content_version` y trigger; `post_revision_notes.content_version` (+relleno a 1); `approve_post` y `request_post_changes` con versión; guarda de estado; invalidación; borrado protegido (D6).
  3. `…_deliverable_rpcs_and_close_rule.sql`: RPC de asignar/soltar/resolver/reabrir/definir/confirmar; vista de estado; regla de cierre.
- **Frontend**: `CollabWorkspace.vue` (panel Entregables), nuevo `DeliverableList.vue` + `DeliverableResolveDialog.vue`, `PostReviewActions.vue` (versión), `PostComposerSheet.vue` y `PostEditSheet.vue`/`creator/post/[id].vue` (selector de hueco, aviso de edición material), `CollabTimeline.vue` (nuevos eventos), `utils/collaboration-work.ts` y `useMyWork.ts` (tareas nuevas, estado desde la vista), composables `useCollabDeliverables.ts` (nuevo), `usePartnerPosts.ts`/`useMyPosts.ts` (`content_version`), `usePostRevisions.ts`, `useMyCollaborations.ts`/`useCollabRequests.ts` (cierre), `CollabCard.vue` (progreso), estilos en `patterns/collab-detail.css`.
- **No se toca**: pagos, Stripe, OAuth/redes, `NegotiationPanel`, valoraciones, Studio (más allá del selector de hueco).

## 10. Plan de pruebas

**Integración (Supabase local; nunca contra la compartida)**
- Instantánea: crear oferta → editar paquete → aceptar → los huecos reflejan lo ofertado; reintento de `respond_offer` no duplica.
- Identidad: doble asignación del mismo post (secuencial y en paralelo) → una sola gana; post de otro creador o de otra colaboración → error; soltar con post en revisión → error; borrar post aprobado → bloqueado; borrar post libre → hueco reabierto.
- Versiones: aprobar con versión vieja → error; editar campo material tras aprobar → `in_production` + evento; editar `due_date` → sin efecto; editar tras publicar → solo evento; aprobar y pedir cambios en paralelo → una gana.
- Guarda: pasar a `scheduled`/`published` sin aprobación → error; con aprobación vigente → ok; con excepción vigente → ok; con excepción caducada → error; posts sin colaboración → sin cambios.
- Excepciones: creador no puede; motivo corto → error; aceptar sin post → error; idempotencia; `reopen`; eventos con autor y motivo.
- Cierre: creador con pendientes → error; marca con pendientes sin resolver → error; con resoluciones → ok; modo libre → como hoy.
- RLS: un tercero no lee huecos; cliente no puede escribir en la tabla.
- Relleno: sobre datos locales con colaboraciones de oferta, sin paquete, completadas y con posts; recuentos esperados = reales; segunda ejecución → 0 filas nuevas.
- Regresión: `post-revisions`, `offers`, `collaboration-flow-phase1`, `collaboration-agreement-phase2`, `collaboration-events`, `collaborations-rls`, ratings, log.
**Unitarias**: estados derivados y tareas nuevas en `collaboration-work`.
**Navegador (1440/768/390)**: ambos roles, flujo completo y las excepciones; accesibilidad de los diálogos; sin avisos de consola.
**Verificación de esquema**: huella estructural local vs. compartida tras aplicar (como en la Fase 1), solo lectura.

## 11. Decisiones que necesito de ti (con recomendación)

| # | Pregunta | Recomendación |
|---|---|---|
| **D1** | Colaboraciones **sin paquete** (Descubrir, antiguas): ¿modo libre, o la marca define entregables? | Modo libre por defecto + «definir entregables» una vez por la marca **con confirmación del creador** antes de que sean exigibles. |
| **D2** | Edición material de una pieza aprobada: ¿vuelve a `in_production` o directamente a `ready_for_review`? | `in_production` (el creador reenvía cuando esté lista). |
| **D3** | Cierre con entregables pendientes: ¿solo la marca y tras resolverlos con motivo? | Sí. El creador solo cierra si todo está resuelto. |
| **D4** | El paquete es texto libre: ¿estructuro cantidad/tipo/plataforma ahora (Fase 2b) o mantengo «un elemento = un entregable»? | Mantener ahora; estructurar el formulario de paquetes después, como mejora aparte. |
| **D5** | Edición material tras publicar: ¿solo evento (recomendado) o bloquearla? | Solo evento + aviso. |
| **D6** | Borrar posts en revisión/aprobados/publicados de una colaboración activa: ¿bloquear? | Bloquear; el resto reabre el hueco. |
| **D7** | Aprobaciones antiguas sin versión: ¿suponer v1 (lo aprobado = lo actual)? | Sí, declarado en la migración; en la base compartida hoy no hay ninguna. |

## 12. Riesgos y mitigación

- **Regla de guarda sobre `posts`**: puede romper flujos manuales del creador (arrastrar a «Programado» sin aprobación). Mitigación: la interfaz ya avisa; ahora se explica el motivo y se ofrece «Enviar a revisión». Probado contra todas las vías de actualización de estado (`usePostActions`, tablero, ficha).
- **Doble fuente de estado**: evitada derivando de la vista; sin columnas de estado duplicadas.
- **Migraciones sobre RLS/datos existentes**: tres migraciones separadas con rollback documentado, aplicadas primero en local con relleno verificado; la base compartida solo con tu confirmación y comprobando antes/después con la huella de esquema.
- **Interbloqueos**: orden de bloqueo único (hueco → post) en todas las RPC.

## 13. Implementación: desviaciones respecto a la propuesta

Aprobadas D1–D7 más cinco precauciones (atomicidad en la base de datos, ninguna vía que se salte las reglas —ni service_role—, historial de excepciones y reaperturas sin sobrescribir, carreras entre edición/aprobación/asignación y permisos sin PUBLIC ni anon). Para cumplirlas la implementación **difiere** de lo propuesto en estos puntos:

1. **Las decisiones viven en una tabla propia, append-only** (`collaboration_deliverable_decisions`), no en columnas del entregable: una reapertura habría sobrescrito `resolution*` y perdido la trazabilidad. El estado vigente es la última fila. Son **dos** tablas nuevas, no una. Un trigger impide `UPDATE`/`DELETE` incluso con service_role (solo se admite poner a NULL el autor al borrar su cuenta, y el borrado en cascada de la colaboración).
2. **La cronología (`collaboration_events`, Fase 1) también pasa a ser inmutable** por trigger (salvo poner a NULL `post_id`/`actor_profile_id` por claves foráneas).
3. **Orden de bloqueo invertido: post → entregable → colaboración** (la propuesta decía hueco → post). Los triggers de `posts` ya tienen el post bloqueado cuando tocan el entregable; con el orden original una asignación y un borrado simultáneos podían interbloquearse. La colaboración se toma `FOR SHARE` (el cierre `FOR UPDATE`) para que asignar/resolver y completar no se pisen.
4. **Notas de revisión protegidas**: trigger de inserción que exige post en revisión, versión vigente y autor = la marca de la colaboración. Sin él, service_role podía fabricar aprobaciones.
5. **La versión no la fija nadie**: `content_version` la calcula un trigger (un `UPDATE` que la fije es ignorado, también con service_role). `published_version` solo se rellena al publicar **dentro de una colaboración activa con aprobación vigente** (así no se puede «blanquear» un post publicado por fuera asignándolo luego a un entregable); en lo ya publicado queda NULL.
6. **Una aceptación sin aprobación caducada también devuelve la pieza a `in_production`** si se edita algo material (el trigger no distingue el origen del visto bueno).
7. **Insertar un post directamente como `scheduled`/`published` en una colaboración activa queda bloqueado** (no puede tener aprobación todavía).
8. **Relleno**: solo colaboraciones `accepted`/`in_progress` con `package_deliverables` (a las completadas/rechazadas/pendientes no se les crean huecos, como decía §5; la primera versión de la sentencia las incluía y se corrigió al verificarla).
9. **Reabrir también exige motivo** (10–500) y las tres decisiones lo guardan.
10. **Interfaz**: «Crear publicación» desde un entregable llega al Studio con `?nueva=1&colaboracion=…&entregable=…` y asigna en el mismo paso; avisos antes de editar título/texto/imagen de una pieza aprobada; el aviso «Vas a saltarte la revisión» (que solo avisaba) se sustituye por «Necesita la aprobación de la marca → ¿Enviarla a revisión?», porque ya no se puede saltar; se retira `movingSkipsPartnerReview`.
11. **Corrección de un fallo previo** descubierto al probar: varios componentes mostraban el texto genérico en vez del mensaje del servidor porque los errores de Supabase no son instancias de `Error` (`utils/error-message.ts`); y `PostReviewActions` perdía el aviso `done` porque cambiar la fase lo desmontaba antes de emitirlo.

Migraciones (a aplicar por este orden y solo tras confirmación): `20261105100000_deliverables_snapshot_and_model.sql`, `20261105110000_post_versions_and_approval_guard.sql`, `20261105120000_deliverable_rpcs_and_close_rule.sql`. Probadas solo en el Supabase local.
