# Propuesta A-R21 — Flujo de publicaciones, biblioteca y tableros (lado creador)

Estado: **auditoría y propuesta. No se ha implementado nada, ni migraciones ni cambios de RLS.** Fecha: 2026-10-30. Autor: [Alex].
Verificación: **lectura de código y SQL** (no se ha ejecutado ninguna prueba nueva para este documento).

---

## Fase A — Auditoría

### A.1 Mapa del flujo actual (hechos comprobados en el código)

**Crear.** Un único punto de escritura: `useMyPosts.createPost` (`app/composables/useMyPosts.ts`) hace `insert(...).select(POST_SELECT).single()` y **espera la fila confirmada** antes de devolverla; estado inicial siempre `idea`, fecha de entrega por defecto hoy + 3 días (editable en el formulario), `collaboration_id` opcional. Se inicia desde `PostComposerSheet.vue`, abierto por el botón flotante (`Fab`) en **Hoy** (`/creator`) y en **Tablero** (`/creator/timeline`); el tercer uso (`app/_disabled/creator/trends.vue`) está desactivado.
El compositor tiene dos caminos y ninguno navega:
- **Predecir éxito:** crea el post (si no existía), llama a `/api/ml/predict` (gasta 1 crédito) y pasa a una pantalla de resultado con «Editar» y «Programar».
- **Guardar sin predecir:** crea el post y **cierra la hoja** sin ningún mensaje.
- «Programar» (tras predecir) **solo cierra la hoja** (el comentario del código lo confirma: «aquí solo se cierra»; no cambia el estado a `scheduled`, a pesar del nombre).
- Si se vuelve a «Editar» tras predecir, se actualiza el mismo post (no se duplica).
El creador acaba en el tablero o en Hoy, **sin ver la publicación creada ni saber dónde está** (aparece en la columna «Idea», entre las demás cards).

**Dónde vive el dato.** Tabla `posts`: `creator_id`, `collaboration_id` (opcional, `on delete set null`), `status` (`idea`, `in_production`, `ready_for_review`, `scheduled`, `published`, `overdue`), `due_date`, `published_at`, `media_url`, `metadata.hashtags`, `created_at`, `updated_at`. Relacionadas: `post_labels` (+`labels`, del creador), `checklist_items`, `ml_predictions`, `post_revision_notes` (comentarios del partner), `post_external_links` y `metrics` (A-R7/A-R8). **No existe ninguna tabla de tableros ni de proyectos.**

**Cómo se accede a una publicación (las tres superficies).**
1. **Tablero** (`PhaseBoard.vue`, fases `idea → in_production → ready_for_review → scheduled → published`; `overdue` no es columna, se deriva con `isPostOverdue`): al pulsar una card se abre **`PostEditSheet`**, un panel lateral de edición rápida. **Ningún elemento del panel ni de la card enlaza a `/creator/post/[id]`.**
2. **Página de detalle `/creator/post/[id]`:** solo se llega desde «Hoy» (tarjeta de siguiente paso, atrasadas, próximas), desde «Ver publicación» en el detalle de una colaboración (`/creator/requests`) y desde las notificaciones de aprobación o petición de cambios del partner. **Desde el tablero no se puede llegar.**
3. **Colaboración** (`/creator/requests`): lista de entregas de esa colaboración con enlace al detalle.

Las dos superficies de edición (panel y página) comparten estado y acciones mediante `usePostEditorPanel`, pero se diferencian: el panel cambia de fase con un selector libre; la página, con un botón secuencial («Mover a …»). La página usa `AppShell` **sin** `full-width` (máx. 1100 px).

**Editar / eliminar / estado.** `updatePost` y `deletePost` hacen update/delete directo con la sesión del creador (RLS `posts_*_self`). Eliminar pide confirmación (`useConfirm`, «Se borrará permanentemente…») y también existe borrado múltiple en el tablero. Mover de fase avisa (no bloquea) si se salta la revisión del partner en una colaboración activa (`movingSkipsPartnerReview`), tanto al arrastrar como en la página. El partner solo cambia estado mediante `approve_post` / `request_post_changes` (RPC que comprueban que el post es de su colaboración y está en `ready_for_review`).

**Mensajes de éxito y error.** **No existe ningún sistema de toasts o avisos efímeros** (solo `useConfirm` para diálogos y mensajes en línea). Consecuencias reales: guardar cambios no muestra confirmación (el botón se desactiva al quedar sin cambios); crear, borrar y mover no dicen nada; un fallo de `save()`/`remove()` no tiene `catch` y no se muestra (la promesa rechazada se pierde); el tablero, si falla un movimiento, recarga en silencio (solo `console.error`). **No hay aviso de cambios sin guardar** ni en el panel ni en la página (sí existe `useUnsavedChangesGuard`, usado solo en los perfiles).

**Personales vs. colaboración.** Una publicación personal tiene `collaboration_id = null`; la vinculada lo tiene (solo se ofrecen colaboraciones `accepted`/`in_progress` en el compositor). La diferencia visible hoy es solo un texto de ayuda en la página («Es contenido propio: solo tú la ves» vs. «todavía no la ve el partner»). **La card del tablero no indica a qué colaboración pertenece**; el único filtro por proyecto es el desplegable de colaboraciones de la barra del tablero.

**Funcionalidades que ya existen y no deben duplicarse:** filtros del tablero (búsqueda por título, red, colaboración), límite de trabajo en curso por columna (WIP), etiquetas, checklist, selección y borrado múltiple, predicción de éxito con créditos, historial de revisión del partner, portada, vínculo con contenido externo y métricas (A-R7/A-R8), objetivo semanal en Hoy.

### A.2 Problemas detectados

| Tipo | Problema |
|---|---|
| **Navegación** | Al crear no se llega a ninguna parte; no hay forma de abrir la página de detalle desde el tablero; «Programar» y «Guardar sin predecir» solo cierran; en la página de detalle no hay enlace de vuelta con contexto (tablero, colaboración). |
| **Funcional** | «Programar» no programa nada (no cambia estado). Guardar, borrar y mover fallan en silencio o sin confirmación. Sin aviso de cambios sin guardar. `published_at` existe pero **nadie lo escribe** al pasar a «Publicado». Con >300 publicaciones, la carga (`limit(300)`, orden ascendente por fecha) deja fuera **las de fecha más lejana** y no hay paginación. |
| **Organización de datos** | La card no muestra su proyecto/colaboración. No hay vista de lista: para buscar por estado o fecha hay que recorrer columnas. El tipo `Post` no expone `created_at`/`updated_at` aunque la consulta (`select *`) ya los trae, así que no se puede ordenar por creación ni modificación. |
| **Visual** | Dos editores con layouts distintos y capacidades repartidas; la página, estrecha (1100 px) en un diseño por lo demás a ancho completo; el panel no enlaza a la página. |
| **Conectado a medias** | La página de detalle ya reúne checklist, etiquetas, predicción, notas de revisión, portada y vínculo con contenido externo, pero está casi escondida; el panel del tablero repite lo esencial. |

### A.3 Seguridad e integridad (documentado, **no corregido**)
- **Vinculación a colaboraciones sin comprobación en servidor.** Las políticas `posts_insert_self` y `posts_update_self` solo exigen `creator_id = current_creator_id()`; no hay `with check` que verifique que `collaboration_id` sea una colaboración **del propio creador**. El navegador solo ofrece las suyas, pero por la API directa un creador podría poner el uuid de una colaboración ajena (el partner de esa colaboración vería entonces la publicación por `posts_select_scoped`). Requiere conocer el uuid (no enumerable por RLS), por lo que el riesgo es bajo, pero es una barrera que hoy solo está en la interfaz. Corrección = migración de RLS (aprobación explícita).
- **Transiciones de estado libres.** El creador puede poner cualquier estado, incluido saltarse la revisión del partner (hoy solo hay una advertencia en el cliente). Es una **decisión de producto** ya conocida (Q6 del pipeline, A-P2); no se cambia aquí.

---

## Fase B — Propuesta funcional (respuestas a las 10 preguntas)

**1. Flujo completo.** *Capturar → aterrizar → gestionar.* Crear sigue siendo una captura rápida (hoja flotante, sin cambios de campos); al confirmarlo el servidor, **aviso «Publicación creada» y redirección a `/creator/post/[id]`**; desde ahí se edita, se predice, se etiqueta, se mueve de fase o se vincula con su contenido real. La **lista** y el **tablero** son dos vistas del mismo conjunto de datos para encontrarla y organizarla.

**2. Dónde aterrizar.** **Siempre en `/creator/post/[id]`**, tras confirmar el insert (es síncrono: `createPost` espera la fila y devuelve el id; no hay creación asíncrona). Casos concretos: «Guardar sin predecir» → toast + redirección. «Predecir éxito» → el usuario está mirando el resultado a propósito, así que **no se le arranca de ahí**: el botón «Programar» se renombra a **«Abrir publicación»** (lleva a la página; no pretende programar) y, si cierra la hoja con la X, un aviso con acción «Abrir». Si falla el insert, no hay redirección y el mensaje aparece en la hoja (ya existe), más un aviso. El contexto (colaboración) viaja con el post, no con la ruta; para el botón «Volver» se usa `?desde=tablero|lista|colaboracion`.

**3. Función de la lista.** Es el **punto central de búsqueda y gestión** («biblioteca»): una fila por publicación con miniatura, título, estado, fecha de entrega y de última modificación, proyecto (colaboración o «Contenido propio»), etiquetas y acceso al detalle; acciones por fila: abrir, mover de fase, borrar (con confirmación); búsqueda por título, filtro por estado, red y proyecto, orden por fecha de entrega / creación / modificación; crear desde allí con el mismo botón. Filtro de «sin asignar» **no se ofrece**: no existe ese concepto (una publicación personal no está «sin asignar», es contenido propio); solo «Contenido propio».

**4. Lista y tablero.** Son **dos vistas de una misma página** (la ruta existente `/creator/timeline`, renombrada «Publicaciones» en el menú y en el título), con un selector **Tablero · Lista** y el estado en la URL (`?vista=lista`). Comparten la misma fuente (`useMyPosts`) y la misma barra de filtros (se extrae de `PhaseBoard.vue`), así que **no se duplica nada**: una publicación movida de fase sigue en la lista. No se crea ruta nueva: ya existe una pantalla que puede cumplir la función (lo que pedía el encargo). El botón «Ir al tablero» de la lista conserva el contexto: abre el tablero con el filtro del proyecto activo (`?colaboracion=<id>`); desde una fila, «Ver en el tablero» usa el proyecto de esa publicación.

**5. Tableros por proyectos.** **Sí tiene sentido, pero el «proyecto» ya existe: es la colaboración.** `posts.collaboration_id` ya relaciona cada publicación con su colaboración (con partner, brief, presupuesto y estado) y el tablero ya permite filtrar por ella. Recomendación:
- Mantener **un único tablero general** (con todas las publicaciones, nada desaparece al filtrar) y tratar los proyectos como **filtro y etiqueta visual**, no como tableros separados: una publicación vive en una sola fase y en un solo proyecto, por lo que no hay duplicados ni «publicaciones que desaparecen» al mover.
- **Indicador de proyecto en la card** (chip con el nombre del partner o «Propio») y agrupación opcional «por proyecto».
- Contenido personal: «Contenido propio». Si el creador quiere agrupaciones propias (campañas, series), ya dispone de **etiquetas** (`labels`/`post_labels`), que cumplen ese papel **sin esquema nuevo**.
- **No** se propone una tabla `projects` ahora: duplicaría `collaborations` y exigiría decidir qué pasa al archivar, qué proyecto tiene una colaboración, etc. Si más adelante hace falta agrupar contenido propio por campaña, será una decisión de producto aparte con su propuesta de esquema.
- Archivar: una colaboración terminada (`completed`/`declined`) deja de ofrecerse en el compositor; sus publicaciones siguen visibles (la lista filtra por «todas» o por proyecto). `collaboration_id` es `set null` si se borra la colaboración: las publicaciones pasarían a «Contenido propio», nunca se pierden.
- Indicadores por proyecto: nº de entregas por fase, atrasadas, pendientes de revisión (cálculo local sobre lo ya cargado).

**6. Papel de `/creator/post/[id]`.** **La superficie principal de gestión de una publicación**; el panel del tablero pasa a ser una vista rápida («peek») con botón **«Abrir página completa»**. La página: cabecera (título editable, `StatusPill`, **chip de proyecto** que enlaza con la colaboración, fecha, siguiente paso sugerido, botón «Volver»), columna principal (caption, fecha, portada, vínculo con contenido externo y métricas) y columna lateral (fase y siguiente acción, etiquetas, checklist, predicción, historial de revisión), a ancho completo y con dos columnas en escritorio. **«Historial de cambios»:** el único historial real hoy es el de notas de revisión del partner; un registro de cambios de campos no existe y requeriría una tabla (se difiere). Mover entre «tableros» no aplica: se cambia la **fase** (las transiciones y avisos actuales no cambian) y el **proyecto** (la colaboración) con un selector restringido a las colaboraciones propias, **solo si se aprueba** la comprobación en servidor (ver C.2); mientras tanto, el proyecto se fija al crear.

**7. Notificaciones y dónde.** Se necesita un sistema de **avisos efímeros** reutilizable (`useToast` + un `ToastHost` montado en `AppShell`, junto a `ConfirmDialogHost`; sin dependencias nuevas, `role=status`, se cierra solo, respeta `prefers-reduced-motion`). Eventos: crear (éxito con acción «Abrir»; error), guardar cambios (éxito; error con motivo), borrar (confirmación previa ya existente → aviso «Publicación borrada»; error), cambio de fase (éxito; si es un salto no permitido o fallido, motivo), mover de proyecto, borrado múltiple (nº borradas / fallidas). **Reglas:** nunca se muestra un éxito antes de la respuesta del servidor; una acción = un aviso; los mensajes en línea ya existentes (errores de formulario) se mantienen para lo que el usuario debe corregir. Más: **aviso de cambios sin guardar** al salir de la página o cerrar el panel (reutilizando `useUnsavedChangesGuard`).

**8. Sin tocar la base de datos.** Redirección tras crear y renombrar «Programar»; sistema de avisos; aviso de cambios sin guardar; enlace del panel a la página y «Volver» con contexto; página de detalle a ancho completo; vista **Lista** con búsqueda, filtros (estado, red, proyecto) y orden por entrega/creación/modificación (solo exponer `created_at`/`updated_at` en el tipo `Post`); chip de proyecto en la card; indicadores por proyecto; selector Tablero · Lista; botón «Ir al tablero» con contexto; paginación/«cargar más» por cursor de fecha en cliente.

**9. Qué requiere migración o afecta a otras partes.**
- **Recomendable (seguridad):** `with check` en `posts_insert_self`/`posts_update_self` para que `collaboration_id` solo pueda ser `null` o una colaboración en la que el creador es parte (y, si se quiere, `accepted/in_progress`). Es RLS: aprobación explícita y coordinación con Mario.
- **Opcional:** mantener `published_at` con un trigger al pasar a `published` (hoy sin escribir; ayudaría a ordenar la lista y a métricas). También se puede hacer en cliente sin migración, pero el trigger es más fiable.
- **Diferido:** registro de cambios por campo (tabla nueva), entidad `projects` para contenido propio, y cualquier bloqueo de transiciones de estado (A-P2/Q6).
- **Afecta a otras partes:** `AppShell` (host de avisos, compartido), `nav.ts` (nombre del ítem «Tablero»), las notificaciones del partner (`/creator/post/<id>`, no cambian), el detalle de la colaboración (enlace «Ver publicación», no cambia) y A-R7/A-R8 (la página ya aloja el vínculo y las métricas).

**10. Orden de implementación (menos riesgo, menos retrabajo).**
1. **R21a — Avisos** (`useToast`/`ToastHost`) y su uso en guardar/borrar/mover. Base de todo lo demás; sin datos.
2. **R21b — Crear → detalle:** redirección, aviso, «Abrir publicación» en lugar de «Programar», aviso de cambios sin guardar.
3. **R21c — Detalle como centro:** enlace panel→página, «Volver» con contexto, chip de proyecto, ancho completo y dos columnas.
4. **R21d — Lista:** exponer fechas, selector Tablero·Lista, barra de filtros compartida, orden y acciones por fila.
5. **R21e — Proyecto en el tablero:** chip en la card, agrupación opcional, indicadores, botón «Ir al tablero» con contexto, «cargar más».
6. **R21f (backend, con aprobación y Mario):** `with check` de `collaboration_id`; `published_at`. Antes de aplicar: pruebas de integración que fallen y, después, pasen.
7. **R21g (diferido):** selector «Mover de proyecto» (depende de R21f), historial de cambios por campo, entidad de proyectos propios.

## Fase C — Arquitectura

**C.1 Reutilizable:** `useMyPosts`, `usePostEditorPanel` (ya común a panel y página), `PostEditSheet`, `PhaseBoard` (filtros y borrado múltiple a extraer), `BoardCard`, `StatusPill`, `useConfirm`/`ConfirmDialogHost` (patrón para `ToastHost`), `useUnsavedChangesGuard`, `useCollabRequests`, `useLabels`, `PostExternalLinkCard`/`PostMetricsPanel`.
**C.2 Frontend:** R21a–e (todo). **Backend:** R21f únicamente (RLS de `posts` y, opcionalmente, trigger de `published_at`).
**C.3 Riesgos:** (1) cambiar el flujo del compositor toca la ruta principal de creación: se cubre con pruebas de navegador; (2) extraer los filtros del tablero puede regresar el arrastre y el borrado múltiple: se prueba el tablero completo antes y después; (3) el host de avisos va en `AppShell` (compartido con todas las pantallas y con Mario); (4) `limit(300)`: la lista no debe prometer «todas» sin paginar; (5) la RLS de R21f puede romper datos antiguos con colaboraciones ajenas (se comprueba antes con una consulta de lectura).

## Fase D — Planificación e integración

- **Pipeline:** nuevo requisito **A-R21**, tras A-R20 solo en el sentido de numeración; **no depende de él ni lo bloquea**. No interrumpe seguridad ni arquitectura, y no se solapa con A-R7/A-R8 (la página ya aloja sus tarjetas), A-R15 (informe de colaboración, ya hecho) ni A-R18/A-R19 (perfiles).
- **Coordinación:** `AppShell` y los avisos son compartidos; el reparto asigna a Mario notificaciones y seguridad transversal. R21f es RLS de zona compartida.
- **Criterios de aceptación verificables:**
  - R21a: cada acción emite un único aviso, solo tras confirmación del servidor; un fallo simulado muestra error y no éxito.
  - R21b: crear por «Guardar sin predecir» y por «Predecir» termina en `/creator/post/<id>` con la publicación correcta, sin duplicados; con el insert fallido no hay redirección.
  - R21c: desde el tablero se llega a la página y se vuelve al mismo sitio; la página no pierde cambios sin avisar.
  - R21d: la lista muestra el mismo conjunto que el tablero (mismo recuento con los mismos filtros), ordenada correctamente por entrega, creación y modificación.
  - R21e: cada card muestra su proyecto; filtrar por colaboración muestra solo sus publicaciones y «Ir al tablero» conserva el filtro.
  - R21f: un creador no puede enlazar un post a una colaboración ajena (prueba de integración), y los flujos legítimos siguen funcionando.
  - Todas: sin desbordes a 390/768/1280/1920 px, teclado y `prefers-reduced-motion`; regresión del arrastre del tablero y del borrado múltiple.

## Decisiones que requieren tu aprobación (solo estas)
1. **R21f (RLS):** ¿autorizas preparar la migración que obliga a que `collaboration_id` sea `null` o una colaboración propia, coordinada con Mario? Recomendación: sí, después de R21a–e.
2. **Renombrar «Tablero» a «Publicaciones»** en el menú global (toca la navegación compartida). Recomendación: sí (la ruta y el enlace no cambian).
Todo lo demás (redirección, avisos, lista, proyecto = colaboración, sin tabla de proyectos) está dentro del alcance aprobado y se hace en el orden indicado cuando llegue su momento.
