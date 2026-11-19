# CIBERAN — Auditoría de UX/UI y experiencia de producto

> Fecha: 2026-11-17 · Código auditado: rama `main` (commit `f73ed86`), no `feat/pronto`.
> Método: uso real de la app en el navegador (escritorio 1440×900, tablet 768×1024 y móvil 390×844), con una cuenta de creador y otra de partner creadas para la auditoría, más lectura del código solo donde hacía falta una prueba.
> Esta auditoría no ha modificado ningún archivo del proyecto. Este documento es el único archivo escrito.

## 0. Cómo leer este documento

- **[V] Verificado**: lo he visto en pantalla o en el código y cito la evidencia.
- **[S] Sugerencia**: criterio de producto/diseño, no un fallo. Está marcada para que decidas tú.
- **[N] No concluyente**: lo vi, pero no puedo atribuirlo a la app (por ejemplo, latencia del servidor de desarrollo).
- Los datos de las cuentas de prueba están casi vacíos (sin fotos, sin biografía, 1 colaboración, 1 publicación). Eso afecta a lo que puedo decir de las pantallas «llenas»; está detallado en el apartado 6.

## 1. Problemas detectados

### Colaboraciones (la zona más importante)

**UX-01 · Colaboraciones · [V] · Prioridad alta · Complejidad media**
- Problema: en tablet (768 px) la barra lateral aparece completa (unos 270 px) y deja el contenido con menos de 500 px. En el detalle de una colaboración el título ocupa 5 líneas, los textos del stepper («En producción», «Revisión de marca») se solapan con los círculos, las pestañas quedan cortadas («Actividad» no se ve) y el título de la cabecera se queda en «Colab…».
- Por qué perjudica: la pantalla clave del producto se rompe justo en iPad y en portátiles con ventana estrecha.
- Propuesta: usar la barra lateral replegada (solo iconos) entre 768 y ~1100 px, o subir el punto de corte; que el stepper pase a vertical por debajo de ~640 px de contenido y que las pestañas hagan scroll.
- Evidencia: `/creator/collaborations/:id` a 768×1024; `app/assets/css/patterns/shell.css` (`@media (width >= 48rem)` activa el raíl completo); `app/components/collab/CollabStepper.vue`.

**UX-02 · Colaboraciones → Publicaciones · [V] · Prioridad alta · Complejidad pequeña-media**
- Problema: el botón «Abrir Studio» del paso siguiente (y el de la pestaña Entregables) lleva a `/creator/timeline`, que se llama «Publicaciones». No abre el formulario de nueva publicación ni preselecciona la colaboración: el formulario sale con «Contenido propio» por defecto. La palabra «Studio» no aparece en ningún otro sitio de la navegación.
- Por qué perjudica: el paso que el producto presenta como «lo siguiente que debes hacer» no lo hace: obliga a buscar el botón +, a elegir la colaboración a mano y, si el creador se equivoca, la publicación queda como contenido propio sin que la marca la vea.
- Propuesta: el botón abre directamente el formulario con la colaboración preseleccionada (parámetro de ruta) y se llama igual que el destino («Crear publicación»).
- Evidencia: `app/components/collab/CollabWorkspace.vue:399` (`to="/creator/timeline"`), `app/components/timeline/PostComposerSheet.vue`, comprobado en el navegador.

**UX-03 · Detalle de colaboración · [V] · Prioridad media · Complejidad pequeña**
- Problema: acciones duplicadas. En una solicitud pendiente, «Responder» (tarjeta oscura) y «Rechazar / Aceptar · 300 € / Hacer contraoferta» (tarjeta inferior) hacen lo mismo. En la pestaña Entregables vacía se repite «Abrir Studio», que ya está arriba.
- Por qué perjudica: dos caminos al mismo sitio hacen dudar de si hay diferencias. Además la tarjeta «Siguiente paso» pierde su papel de guía única.
- Propuesta: un único punto de decisión por estado. «Responder» puede abrir/desplazar a la tarjeta de respuesta o sustituirla; en el vacío de Entregables, solo texto sin botón repetido.
- Evidencia: `CollabNextStep.vue`, `CollabWorkspace.vue`; capturas del detalle como creador (pendiente y aceptada).

**UX-04 · Detalle de colaboración · [V] · Prioridad media · Complejidad pequeña**
- Problema: en estado «Aceptada», sin ninguna publicación, el botón «Marcar como completada» está visible a la misma altura visual que el flujo principal, y «Proponer cancelar de común acuerdo» y «Dar por terminada por incumplimiento» van como enlaces pequeños bajo él. «Reportar esta solicitud» queda como una etiqueta suelta sin estilo de acción. (No pulsé «Marcar como completada»; no sé si el sistema lo permite sin entregables.)
- Por qué perjudica: acciones destructivas o de cierre al mismo nivel que las normales invitan al clic accidental y diluyen la jerarquía.
- Propuesta: mostrar «Completar» solo cuando haya entregables aprobados; agrupar cancelar, incumplimiento y reportar en un menú «Más acciones».
- Evidencia: `CollabWorkspace.vue`, `CollabCancelPanel.vue`; captura del detalle tras aceptar.

**UX-05 · Colaboraciones · [V] · Prioridad media · Complejidad media**
- Problema: la colaboración no tiene nombre. El título de la página, del breadcrumb y del listado es el texto de la propuesta cortado con «…» («Campana de prueba para auditoria UX: un reel de lanzamiento…», 3 líneas en móvil). El formulario de propuesta no tiene campo de título.
- Por qué perjudica: con varias colaboraciones con la misma marca no se distinguen; el título largo empuja hacia abajo lo importante.
- Propuesta: campo opcional «Nombre de la campaña» en la propuesta (con valor por defecto «Colaboración con {marca}») y el texto original como descripción.
- Evidencia: `InviteDialog.vue`, `CollabHeader.vue`; detalle en escritorio y móvil.

**UX-06 · Listado de colaboraciones · [V] · Prioridad media · Complejidad pequeña**
- Problema: la tarjeta «Colaboraciones activas · EN CURSO» sigue visible al cambiar a la pestaña «Solicitudes», donde lo que se ve es lo contrario (solicitudes pendientes). Además repite el título de la página y contiene el filtro «Todas las marcas».
- Por qué perjudica: etiqueta que contradice el contenido y un filtro escondido dentro de lo que parece un título.
- Propuesta: título dinámico según pestaña (o quitar la tarjeta) y sacar el filtro a la barra de herramientas junto a Buscar y Ordenar.
- Evidencia: `CollabHub.vue`; `/partner/requests?vista=solicitudes`.

**UX-07 · Solicitudes · [V] · Prioridad media · Complejidad pequeña**
- Problema: la etiqueta «Pendiente de respuesta» es idéntica para quien tiene que responder y para quien espera. La diferencia (la línea «Responde a la solicitud de…» / «Esperando la respuesta de…») es un texto pequeño al pie. La tarjeta del creador no muestra ninguna acción.
- Por qué perjudica: no se ve «qué me toca» sin leer; y obliga a entrar al detalle para actuar.
- Propuesta: etiqueta según el rol («Te toca responder» con acento / «Esperando a {nombre}» neutra) y un botón «Responder» en la propia tarjeta.
- Evidencia: `CollabCard.vue`, `CollabStatus.vue`; solicitud vista como partner y como creador.

### Navegación y estructura

**UX-08 · Barra superior / cabeceras · [V] · Prioridad media · Complejidad pequeña**
- Problema: el subtítulo de página (`truncate`) se corta al estrecharse el ancho («Encuentra marcas interesadas en tu conte…», «Cómo van tus colaboraciones dentro de CIB…») y los títulos se cortan («Métricas de red…», «Colab…»). A 1440 px los subtítulos sí caben.
- Por qué perjudica: el texto que explica cada pantalla se pierde justo en portátiles y tablets.
- Propuesta: dejar que el subtítulo ocupe 2 líneas, o moverlo bajo el título fuera de la barra; acortar los textos más largos.
- Evidencia: `app/components/layout/TopBar.vue:47`; capturas de Descubrir, Resultados y Métricas a 1024 px.

**UX-09 · Navegación · [V] · Prioridad baja-media · Complejidad pequeña**
- Problema: Chat y Bandeja de entrada aparecen dos veces en escritorio: iconos en la barra superior y enlaces en la parte inferior de la barra lateral. «Cerrar sesión» también está dos veces en el perfil (barra lateral y pie de la página).
- Por qué perjudica: ruido y duda sobre si son cosas distintas.
- Propuesta: dejar una sola entrada para cada cosa (los iconos de la barra superior, con el contador que ya funciona) y «Cerrar sesión» en el menú del avatar.
- Evidencia: `app/utils/nav.ts`, `SideRail.vue`, `TopBar.vue`; capturas de escritorio.

**UX-10 · Nomenclatura · [V] · Prioridad media · Complejidad pequeña**
- Problema: términos distintos para lo mismo: «Hoy» (creador) / «Inicio» (partner) [ya señalado en la auditoría anterior U-10 y sigue igual]; «Publicaciones» / «Studio» / «Entregables»; el filtro del tablero se llama «Todos los proyectos» cuando el resto del producto habla de colaboraciones; «Solicitudes» y «Colaboraciones activas» conviven en la misma vista.
- Por qué perjudica: el usuario nuevo no sabe si «Studio» y «Publicaciones» son lo mismo.
- Propuesta: un glosario único (Publicación, Entregable, Colaboración, Solicitud) y aplicarlo en navegación, botones y filtros.
- Evidencia: `app/utils/nav.ts:35,43`, `PostFilterBar.vue:89`, `CollabWorkspace.vue:397-399`.

**UX-11 · Métricas · [V]/[S] · Prioridad media · Complejidad pequeña**
- Problema [V]: «Métricas» ocupa un lugar en la navegación con la etiqueta «Pronto» y una página completa de promesas (cuatro tarjetas de lo que llegará). Es coherente con que están aplazadas (`CLAUDE.md`), pero un usuario nuevo ve un elemento de menú que no hace nada.
- Sugerencia [S]: ocultar la entrada hasta que exista, o dejar solo el aviso dentro de «Resultados».
- Evidencia: `SideRail.vue:69`, `BottomTabBar.vue:83`, `app/pages/creator/metrics.vue`.

### Primera experiencia

**UX-12 · Primer inicio de sesión · [V] · Prioridad media · Complejidad media**
- Problema: al entrar por primera vez salen dos ventanas modales seguidas: «CIBERAN es gratis durante el lanzamiento» y después un tour de 6 pasos (creador) o 5 (partner). El tour es solo texto: promete «te enseñamos lo esencial» pero no señala nada de la interfaz. En una captura de la transición se vieron las dos ventanas encimadas (puede ser un artefacto del cambio animado).
- Por qué perjudica: dos clics para llegar a la pantalla y un tour que no enseña dónde está nada. Se salta casi siempre.
- Propuesta: fusionar el aviso del lanzamiento gratis en el primer paso del tour (o en un banner descartable) y sustituir el tour por una lista de primeros pasos en «Hoy» que enlace a cada acción.
- Evidencia: `app/components/onboarding/LoginWelcome.vue`, `OnboardingTour.vue`, `app/utils/onboarding-steps.ts`.

**UX-13 · Descubrir · [V] · Prioridad media · Complejidad media**
- Problema: el panel de filtros reparte más de 20 chips de categoría antes de llegar a Presupuesto/Tarifa, con scroll propio dentro de la página. En móvil hay seis filas de controles antes del primer resultado (pestañas Explorar/Con IA, búsqueda, Filtros+Guardados, Ordenar, Guardar búsqueda, Rejilla/Carrusel) y la primera tarjeta queda bajo la barra inferior. «Guardar búsqueda» deshabilitado se ve como un botón verde claro, parecido a una acción principal.
- Por qué perjudica: el listado, que es el objetivo, queda lejos; un botón deshabilitado con aspecto activo confunde.
- Propuesta: grupos de filtros plegables (categorías colapsadas con «Ver más»), chips de filtros activos sobre los resultados, controles de vista y orden en una sola fila, y estado deshabilitado neutro.
- Evidencia: `app/components/discover/DiscoverFilters.vue`, `DiscoverBrowser.vue`, `patterns/discover.css`; capturas a 1440 y 390 px.

**UX-14 · Descubrir (tarjetas) · [V]/[S] · Prioridad media · Complejidad media**
- Problema [V]: con perfiles poco completos (los tres creadores listados lo estaban) la tarjeta es un bloque grande de color con una inicial y el texto «Ficha en construcción», sin categorías, tarifa ni ninguna razón para contactar.
- Sugerencia [S]: diseñar el estado de poca información (tarjeta compacta, o excluir perfiles por debajo de un mínimo) y mostrar siempre al menos categoría y rango de tarifa; es lo que más ayuda a decidir.
- Evidencia: `/partner/discover` y `/creator/discover`.

### Pantallas con otro problema concreto

**UX-15 · Inicio del creador · [V] · Prioridad media · Complejidad pequeña**
- Problema: el botón flotante verde (+) tapa el contenido en escritorio: en «Necesita tu atención» cubre la fila y el título «Reel de lanzamiento (prueba UX…». En la página de Publicaciones sí existe el botón «+ Publicación» arriba, así que el flotante sobra en escritorio.
- Propuesta: en escritorio, mover la acción a la cabecera de «Hoy»; mantener el flotante solo en móvil.
- Evidencia: `app/pages/creator/index.vue:239`, `app/components/ui/Fab.vue`; captura a 1440 px.

**UX-16 · Publicaciones (estado vacío) · [V] · Prioridad media · Complejidad pequeña**
- Problema: el texto vacío dice «Crea la primera con el botón + de abajo», pero en escritorio el botón es «+ Publicación» arriba a la derecha (el flotante solo está en móvil y en «Hoy»). El subtítulo usa «card» («Arrastra una card para cambiarla de fase») en una interfaz en español. El texto es además un párrafo largo.
- Propuesta: texto sin referencia de posición («Pulsa «+ Publicación»»), «tarjeta» en lugar de «card», y dos líneas como máximo.
- Evidencia: `app/components/timeline/PhaseBoard.vue:236`; capturas en escritorio y móvil.

**UX-17 · Perfil propio · [V] · Prioridad baja · Complejidad pequeña**
- Problema: a 1024 px el nombre queda cortado («Auditori…») al lado de los botones «Editar ficha / Ver perfil público». En la pestaña Resumen, dos tarjetas estrechas dejan una gran zona vacía a la derecha.
- Propuesta: nombre en su propia fila y más ancho para la rejilla de Resumen.
- Evidencia: `/creator/profile` a 1024 px.

**UX-18 · Imagen por defecto de publicación · [V] · Prioridad baja · Complejidad pequeña**
- Problema: la misma publicación sin portada se ve con un fondo verde lima en el tablero y con un degradado rojo-naranja con un icono de claqueta en el detalle.
- Propuesta: un único estado «sin portada» con la paleta del sistema, sin degradado.
- Evidencia: tablero y `/creator/post/:id`; `app/components/ui/CoverArt.vue`.

**UX-19 · Accesibilidad básica · [V] · Prioridad baja · Complejidad pequeña**
- Lo bueno: sin imágenes sin `alt`, sin botones sin nombre, un solo `main` (medido en `/creator`).
- Problema: «Ver todo» y «Completar» miden 21 px de alto (por debajo de los 44 px que el propio sistema declara como mínimo táctil) y la home tiene dos `h1` («Hoy» y el saludo).
- Propuesta: ampliar el área táctil de los enlaces de texto y dejar el título de la barra superior como no-`h1`.
- Evidencia: medición en `/creator` a 1440 px.

**UX-20 · Detalle de colaboración en móvil · [V] · Prioridad media · Complejidad pequeña**
- Problema: el stepper pasa a una lista vertical de cuatro filas que ocupa casi media pantalla; la tarjeta «Siguiente paso» queda en el borde inferior y la página muestra «Marcar como completada» como bloque principal antes de que haya trabajo.
- Propuesta: stepper compacto horizontal (solo el paso actual con «2 de 4») y la tarjeta de siguiente paso por encima.
- Evidencia: `/creator/collaborations/:id` a 390×844.

**UX-21 · Modo desarrollo · [V] · Prioridad baja · Complejidad pequeña**
- Problema: los botones «Cuentas de prueba (equipo)» del login solo existen en desarrollo y fallan con «Email o contraseña incorrectos»: la contraseña fija del código no coincide con la de las cuentas sembradas.
- Propuesta: alinear la contraseña del seed con la del botón o quitar los botones.
- Evidencia: `app/pages/login.vue:27-37`. (Solo afecta al equipo.)

### Observados pero no concluyentes

- **[N]** Al pulsar «Contactar» en Descubrir, el modal tardó unos segundos en aparecer (parecía que no pasaba nada), y la apertura del detalle de colaboración muestra una pantalla de carga completa oscura con el logo. Probablemente es latencia del servidor de desarrollo; revisar en la versión desplegada. Si se confirma, convendría un estado de carga inmediato (el botón en «cargando» y esqueletos en lugar de una pantalla completa).
- **[N]** Al enviar una solicitud el modal muestra «Solicitud enviada» pero no se cierra solo ni enlaza a la solicitud creada («Ver solicitud»). Es una mejora menor, no un fallo.

## 2. Oportunidades de mejora

Son sugerencias [S]: no resuelven un problema, elevarían el producto.

- **O-1 · Reputación que un portfolio no puede dar.** El perfil público ya tiene «Valoración / Sin valoraciones». Mostrar señales calculadas por la plataforma —colaboraciones completadas, tiempo medio de respuesta, entregas a tiempo— convertiría el perfil en un historial verificable. Es lo que diferencia a CIBERAN de un portfolio. Requiere datos reales para no quedar vacío.
- **O-2 · «Por qué encaja» en Descubrir.** Sustituir el texto «sin criterio de afinidad todavía» por 1-2 razones concretas en cada tarjeta («Misma categoría: Belleza», «Tarifa dentro de tu presupuesto»).
- **O-3 · «Lo que necesita tu decisión» como cabecera de la home del partner.** Hoy el partner ve un panel de tarjetas de cifras; lo que realmente le toca (contenidos por aprobar, ofertas por contestar) debería ir arriba.
- **O-4 · Línea de tiempo de la negociación.** La pestaña «Actividad» ya existe. Mostrar la secuencia propuesta → contraoferta → aceptada con quién hizo cada paso daría tranquilidad a ambas partes.
- **O-5 · Una sola voz de producto.** Fijar un glosario y una guía de tono (hay textos con «card», «Studio», «proyectos») evitaría derivas a medida que se añadan pantallas.
- **O-6 · Estado «¿Cuánto me falta?» en el perfil.** La barra «Ficha completa al 0%» y la lista «Pendiente de completar» son buenas; convertirlas en una tarea con vista previa del perfil público cambiaría los 0 % por intención.

## 3. Inconsistencias de diseño

| ID | Qué | Evidencia |
|---|---|---|
| D-1 | Cuál es la acción primaria varía: negro en tarjetas («Proponer», «Contactar»), verde voltio en cabeceras («+ Publicación») y verde sobre fondos oscuros («Abrir Studio»). El sistema dice que el voltio marca la acción principal, pero no se aplica igual. | `tokens.css` (cabecera), `button.css`, capturas de Descubrir y Publicaciones |
| D-2 | Tres formas de «deshabilitado»: verde claro («Guardar búsqueda»), gris oscuro («Enviar solicitud», «Guardar publicación») y gris claro («Guardar» del perfil). | Capturas de Descubrir, modales y perfil |
| D-3 | Escala tipográfica: hay unos 30 tamaños escritos a mano (`text-[1.375rem]` ×11, `text-[1.25rem]` ×8, `text-[1.0625rem]` ×6…) cuando existen los tokens `--text-title`, `--text-lg`, etc. | Búsqueda de `text-\[` en `app/**/*.vue` |
| D-4 | Imagen por defecto de publicación distinta según la pantalla (ver UX-18). | Tablero vs detalle |
| D-5 | Cabeceras de página: unas pantallas muestran subtítulo en la barra superior, otras no (Perfil no tiene) y los títulos de páginas de detalle repiten el nombre de la sección («Colaboración», «Publicación») encima de otro título. | Capturas de detalle |
| D-6 | Las páginas de creador y partner son envoltorios casi iguales (≈10-26 líneas) sobre componentes compartidos: bien, pero los textos de cabecera difieren sin motivo claro («Hoy»/«Inicio»). | `app/pages/creator/*.vue` vs `app/pages/partner/*.vue` |

## 4. Aspectos positivos (conviene preservarlos)

1. **El sistema de diseño se respeta.** No hay ningún color hexadecimal escrito a mano en los `.vue`; los radios usan casi siempre `var(--radius-*)`. Esto es poco habitual y es una base sólida.
2. **La tarjeta «Siguiente paso» y el stepper de la colaboración**: la idea de que cada estado diga qué te toca es exactamente la dirección correcta. Solo hay que quitar los duplicados (UX-03).
3. **El tablero de publicaciones**: columnas por fase, resumen semanal, filtros «Atrasadas / Esta semana», selector de fase en la tarjeta. Parece una herramienta profesional de gestión, no una copia de una red social.
4. **El detalle de publicación**: stepper, «Qué toca ahora», checklist y planificación bien jerarquizados.
5. **Estados vacíos con explicación y acción** (Guardados, Bandeja, Resultados, Chat).
6. **Honestidad del producto**: se avisa de que es gratis durante el lanzamiento, de que no gestiona pagos y de que las métricas llegan después.
7. **Confirmación al cerrar sesión**, contadores de notificación que se actualizan, página 404 con la marca.
8. **Móvil bien resuelto en la navegación**: barra inferior con acción activa y menú «Más»; sin desbordes horizontales en lo revisado.
9. **Accesibilidad básica sólida** (UX-19).

## 5. PROPUESTAS PENDIENTES DE APROBACIÓN

Ninguna está implementada. Cada una puede autorizarse por separado. Orden aproximado de impacto.

### PR-01 · «Crear publicación» desde la colaboración, con la colaboración ya elegida
- **Qué cambiaría:** el botón del paso siguiente y el del vacío de Entregables abren el formulario de nueva publicación con la colaboración preseleccionada. El texto pasa a «Crear publicación».
- **Experiencia después:** un clic desde «Crea la primera publicación para {marca}» abre el formulario ya vinculado; al guardar, la publicación aparece en Entregables.
- **Archivos:** `CollabWorkspace.vue`, `CollabNextStep.vue`, `timeline.vue`, `PostComposerSheet.vue` (leer un parámetro de ruta).
- **Beneficio:** arregla UX-02 y evita publicaciones sin vincular por error.
- **Riesgos:** mínimos; hay que definir qué pasa si la colaboración ya no está activa.
- **Visual:** botón lima «Crear publicación» → hoja «Nueva publicación» con el campo Colaboración = «{marca}» y una nota «Se enviará a revisión de {marca} cuando la marques como lista».

### PR-02 · Barra lateral replegada en tablet y stepper adaptable
- **Qué cambiaría:** entre 768 y ~1100 px la barra lateral muestra solo iconos con etiqueta al pasar el ratón; el stepper de colaboración y de publicación pasa a vertical/compacto por debajo de un ancho mínimo; las pestañas hacen scroll horizontal.
- **Experiencia después:** el detalle de colaboración en un iPad se lee sin cortes; el título deja de ocupar 5 líneas.
- **Archivos:** `patterns/shell.css`, `SideRail.vue`, `CollabStepper.vue`, `PostPhaseStepper.vue`, `SegmentedTabs.vue`.
- **Beneficio:** arregla UX-01 y UX-08 en parte.
- **Riesgos:** cambio global de layout; revisar todas las pantallas a 768-1100 px.
- **Visual:** a 768 px, raíl de 72 px a la izquierda y contenido a ancho completo; stepper horizontal con solo el paso actual con texto.

### PR-03 · Nombre de campaña en la solicitud
- **Qué cambiaría:** campo opcional «Nombre de la campaña» en el formulario de propuesta. Si está vacío, «Colaboración con {marca}». El texto largo pasa a descripción.
- **Experiencia después:** el listado, el breadcrumb y la cabecera usan un título corto y distinguible.
- **Archivos:** `InviteDialog.vue`, `ProposalDialog.vue`, `CollabHeader.vue`, `CollabCard.vue` y su esquema de base de datos (migración no destructiva con ROLLBACK).
- **Beneficio:** resuelve UX-05 y mejora el listado.
- **Riesgos:** requiere una columna nueva y migración en la única base compartida; hay que migrar o mostrar un valor por defecto para las existentes.
- **Visual:** cabecera «Lanzamiento Reel Otoño» y debajo la descripción en gris.

### PR-04 · Una acción principal por estado y acciones secundarias agrupadas
- **Qué cambiaría:** quitar el botón duplicado de «Responder» (o de la tarjeta de respuesta); mostrar «Marcar como completada» solo con entregables aprobados; mover cancelar, incumplimiento y reportar a un menú «Más acciones».
- **Experiencia después:** cada estado tiene un solo camino evidente.
- **Archivos:** `CollabWorkspace.vue`, `CollabNextStep.vue`, `CollabCancelPanel.vue`, `CollabSummary.vue`.
- **Beneficio:** resuelve UX-03 y UX-04.
- **Riesgos:** tocar el flujo de cierre de colaboraciones; hay que mantener las pruebas existentes y revisar si hay casos legítimos de completar sin entregables.
- **Visual:** tarjeta oscura con un único botón lima; abajo, un enlace discreto «Más acciones ▾».

### PR-05 · Listado de colaboraciones: título dinámico, etiquetas por rol y acción en la tarjeta
- **Qué cambiaría:** el encabezado cambia con la pestaña; el filtro por marca/creador sale a la barra de herramientas; la etiqueta de estado depende del rol («Te toca responder» / «Esperando a {nombre}»); la tarjeta de solicitud lleva el botón «Responder».
- **Archivos:** `CollabHub.vue`, `CollabCard.vue`, `CollabStatus.vue`, `CollabHubBoard.vue`.
- **Beneficio:** UX-06 y UX-07; reduce clics para el creador.
- **Riesgos:** bajos; revisar el espacio de la tarjeta en el tablero.
- **Visual:** chip lima «Te toca responder» + botón negro «Responder» a la derecha del importe.

### PR-06 · Descubrir: filtros plegables, filtros activos y controles compactos
- **Qué cambiaría:** categorías colapsadas («Ver todas»), chips de filtros activos sobre los resultados, controles de orden y vista en una sola fila, filtros en hoja inferior en móvil, estado deshabilitado neutro en «Guardar búsqueda».
- **Archivos:** `DiscoverFilters.vue`, `DiscoverBrowser.vue`, `patterns/discover.css`, `creator/discover.vue`, `partner/discover.vue`.
- **Beneficio:** UX-13; los resultados quedan más cerca.
- **Riesgos:** Descubrir ya se rediseñó antes (`DESIGN.md`); conviene confirmar que no choca con lo previsto.
- **Visual:** fila de chips «Belleza ×  Tarifa 0-300 € ×  Limpiar» sobre las tarjetas.

### PR-07 · Primer inicio: un solo mensaje y una lista de primeros pasos
- **Qué cambiaría:** el aviso de «gratis durante el lanzamiento» se funde en el primer paso del tour (o pasa a un banner); el tour de texto se sustituye por una lista «Primeros pasos» en «Hoy» (completa tu ficha, descubre, propón…) que va marcándose.
- **Archivos:** `LoginWelcome.vue`, `OnboardingTour.vue`, `onboarding-steps.ts`, `creator/index.vue`, `partner/index.vue`.
- **Beneficio:** UX-12; menos fricción y orientación real.
- **Riesgos:** hay que conservar «No volver a mostrar» y el enlace «Ver el recorrido de bienvenida» del perfil.
- **Visual:** tarjeta «Empieza por aquí · 1 de 4» con casillas.

### PR-08 · Cabecera sin cortes y sin duplicados
- **Qué cambiaría:** el subtítulo de página puede ocupar 2 líneas; Chat y Bandeja con una sola entrada (iconos de la barra superior); «Cerrar sesión» solo en el menú del avatar; botón flotante solo en móvil y «+ Publicación» en la cabecera de «Hoy».
- **Archivos:** `TopBar.vue`, `SideRail.vue`, `nav.ts`, `Fab.vue`, `creator/index.vue`, `creator/profile.vue`.
- **Beneficio:** UX-08, UX-09, UX-15.
- **Riesgos:** quitar entradas de la barra lateral puede afectar a quien ya las usa; los iconos de la barra superior deben tener texto accesible.
- **Visual:** barra lateral solo con las secciones; arriba a la derecha: buscar, chat, bandeja, avatar con menú.

### PR-09 · Glosario único y corrección de textos
- **Qué cambiaría:** unificar «Hoy/Inicio», «Studio/Publicaciones», «Todos los proyectos» → «Todas las colaboraciones», «card» → «tarjeta»; acortar el vacío de Publicaciones sin referencias de posición.
- **Archivos:** `nav.ts`, `PhaseBoard.vue`, `PostFilterBar.vue`, `CollabWorkspace.vue`.
- **Beneficio:** UX-10 y UX-16; coste muy bajo.
- **Riesgos:** pruebas que comprueben textos; cambiar nombres visibles puede requerir actualizar el vídeo de demo.
- **Visual:** solo texto.

### PR-10 · Normalizar escala tipográfica y estados (primario y deshabilitado)
- **Qué cambiaría:** sustituir los `text-[…rem]` sueltos por los tokens; definir en `button.css` una única regla para «acción primaria» (voltio/negro según contexto) y un único estado deshabilitado.
- **Archivos:** `tokens.css`, `button.css`, ~30 usos en `.vue`.
- **Beneficio:** D-1, D-2 y D-3; reduce la deuda de diseño.
- **Riesgos:** cambios sutiles en muchas pantallas; hacer revisión visual y de contraste (existe `scripts/design/check-contrast.mjs`).
- **Visual:** ninguno perceptible salvo coherencia.

### PR-11 · Perfil público como historial verificable (idea [S], decide tú)
- **Qué cambiaría:** añadir al perfil público señales calculadas (colaboraciones completadas, respuesta media, entregas a tiempo) y «por qué encaja» en las tarjetas de Descubrir.
- **Archivos:** `profile/[role]/[id].vue`, `patterns/public-profile.css`, `DiscoverBrowser.vue`, consultas del servidor.
- **Beneficio:** diferenciación respecto a un portfolio (O-1, O-2).
- **Riesgos:** necesita datos reales suficientes; con pocos datos queda vacío. Es una decisión de producto, no una corrección.
- **Visual:** fila de tres cifras bajo el nombre («12 colaboraciones · responde en 4 h · 100 % a tiempo»).

## 6. Qué no he podido inspeccionar y por qué

- **Revisión y aprobación de entregables** (pedir cambios, aprobar, portadas 4:5): requería una publicación vinculada, enviada a revisión y vista por el partner. Solo la he revisado como estructura del código, no en uso.
- **Negociación** (contraoferta, aceptación): solo vi la solicitud inicial y la aceptación directa.
- **Chat con mensajes, ofertas en el chat y archivos**: las cuentas de prueba no tenían conversaciones.
- **Descubrir y perfiles públicos con datos reales**: las cuentas estaban sin completar y solo había tres creadores y dos marcas, todos con «Ficha en construcción»; no puedo juzgar cómo se ven tarjetas y perfiles llenos.
- **Panel del partner con colaboraciones activas, calendario del partner y Resultados con datos.**
- **Estados de error** (fallo de red, rechazo del servidor) y **estados de carga reales**: el servidor de desarrollo añade latencia que falsea la sensación de carga.
- **Descubrir con IA, predicción de rendimiento, pagos y métricas**: apagados o aplazados.
- **Calendario y vista Lista de publicaciones**, **panel de administración**, **correos**, **Google login**.
- **Tablet** solo en el detalle de colaboración; **móvil** en Hoy, Descubrir, Publicaciones, Perfil y el detalle de colaboración.
- **Landing**: solo la parte superior y los encabezados; no recorrí la página completa.

## 7. Datos de prueba creados durante la auditoría

Se crearon en la base compartida de Supabase, con tu permiso:
- 2 usuarios de prueba (creador `creador-audit-ux@ciberan.test` y partner `partner-audit-ux@ciberan.test`), con el correo confirmado a mano.
- 1 solicitud de colaboración aceptada entre ambos (300 €).
- 1 publicación del creador («Reel de lanzamiento (prueba UX)»).

No los he borrado. Se pueden eliminar cuando quieras.
