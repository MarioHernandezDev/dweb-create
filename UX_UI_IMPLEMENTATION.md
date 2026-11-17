# CIBERAN — Implementación de las mejoras UX/UI

> Fecha: 2026-11-17 · Base: `main` (commit `f73ed86`) · Rama de trabajo: `feat/ux-audit`, en el worktree `C:\Users\mexpl\Documents\dweb-create-ux`.
> **Nada está commiteado ni subido**: son cambios sin confirmar en ese worktree. Tu carpeta `dweb-create` (rama `feat/pronto`) no se ha tocado.
> Hoja de ruta: `UX_UI_AUDIT.md` (hallazgos UX-01 a UX-21).

## 0. Cómo se ha trabajado

- La auditoría se hizo sobre `main`; `feat/pronto` tiene el mismo código de aplicación salvo un commit (cabecera del perfil) y la página «Pronto». Para no mezclar ni sobrescribir nada, el trabajo está en un **worktree aparte** creado desde `main` en una rama nueva. Para llevarlo a otra rama habrá que hacer commit y fusionar o aplicar un `cherry-pick`.
- **Sin migraciones y sin cambios de datos compartidos** (ver apartado 7). No se ha cambiado ninguna regla de negocio, permiso ni política RLS.
- Verificación: `npm run typecheck`, `npm test` y navegador a 1440×900, 1280×800, 768×1024 y 390×844.

## 1. Estado de los 21 hallazgos

| ID | Estado | Qué se hizo / por qué no |
|---|---|---|
| UX-01 Detalle de colaboración a 768 px | **Solucionado** | La columna lateral pasa a modo `auto`: se pliega sola entre 48 y 72 rem. El recorrido (stepper) mide su propio ancho (container query) y baja a etiquetas de dos líneas; el título a dos líneas como máximo. Verificado a 768 px. |
| UX-02 «Abrir Studio» | **Solucionado** | El botón se llama «Crear publicación» y abre el formulario con la colaboración ya elegida. Además se corrigió un fallo previo: el formulario solo aplicaba la colaboración al cerrarse, así que salía «Contenido propio» la primera vez. |
| UX-03 Acciones duplicadas | **Solucionado** | «Responder» y «Marcar como completada» del siguiente paso ya no se repiten cuando la acción está justo debajo (se indica «Lo haces justo debajo»). El vacío de Entregables no repite el botón. |
| UX-04 Acciones de cierre | **Solucionado** | «Marcar como completada» solo aparece con trabajo hecho y sin entregables exigibles por resolver; si no, se explica qué falta. Cancelar y dar por incumplida van plegadas en «Más acciones». «Reportar» pasa a acción discreta con icono. Decisión en el apartado 5. |
| UX-05 Nombre de la colaboración | **Parcialmente solucionado** | El nombre sale del paquete, de una primera frase corta o de «Colaboración con {persona}»; el brief se resume debajo. **Pendiente**: un campo «Nombre de la campaña» exige una migración (no aplicada). |
| UX-06 Cabecera del listado | **Solucionado** | La tarjeta «Colaboraciones activas · En curso» solo sale con colaboraciones en marcha y fuera de «Solicitudes»; el filtro por marca/creador pasa a la barra de herramientas. |
| UX-07 Etiquetas de solicitud | **Solucionado** | Chips «Te toca» / «En espera» y «Abrir →». No se repite «Pendiente de respuesta». Además se corrigió el turno tras una contraoferta (ver apartado 4). No hay botón «Responder» dentro de la tarjeta: la tarjeta es un único control a propósito. |
| UX-08 Textos cortados en cabeceras | **Solucionado** | Subtítulo hasta dos líneas; la barra lateral plegada libera ancho. Los títulos largos siguen con puntos suspensivos (una línea) a propósito. |
| UX-09 Navegación duplicada | **Solucionado** | Chat y Bandeja solo en la barra superior (con contador). «Cerrar sesión» del perfil solo en móvil. |
| UX-10 Nomenclatura | **Solucionado** | Ver apartado 3. |
| UX-11 Métricas con «Pronto» | **No implementado (decisión de producto)** | El proyecto decidió mostrarlas como «próximamente» (`CLAUDE.md`, commit `f73ed86`). Ocultarlas no mejora algo comprobable y contradice esa decisión. |
| UX-12 Dos modales al entrar | **Solucionado** | El aviso de lanzamiento es una tarjeta en la esquina, sin velo. El recorrido **vuelve a abrirse solo** en cuentas nuevas, pero ahora ilumina el menú real de la aplicación (ver «Segunda ronda»), se salta en cualquier paso y se completa con los «Primeros pasos» de Inicio. |
| UX-13 Filtros de Descubrir | **Solucionado** | Categorías: 10 visibles + «Ver todas»; red, tipo, respuesta y verificadas bajo «Más filtros» (abierto si hay alguno activo). El panel entero cabe sin scroll a 1280×800. Móvil: Filtros y Guardados a todo el ancho; «Guardar búsqueda» deja de parecer una acción principal. |
| UX-14 Tarjetas poco informativas | **Solucionado (salvo «por qué encaja»)** | Tarjeta baja para fichas vacías, línea de importe siempre visible y, nuevo, «N paquetes · desde X €» en cada tarjeta. «Por qué encaja» exige datos reales y queda como oportunidad. |
| UX-15 Botón flotante | **Solucionado** | Solo en móvil. En escritorio/tablet, «Nueva publicación» está en la cabecera de Inicio. |
| UX-16 Estado vacío de Publicaciones | **Solucionado** | Texto más corto y botón «Crear mi primera publicación»; «tarjeta» en lugar de «card». |
| UX-17 Perfil propio | **Parcialmente solucionado** | Mejora indirecta (más ancho con la barra plegada). No se ha rediseñado la pestaña Resumen ni verificado de nuevo a 1024 px. |
| UX-18 Imagen por defecto de publicación | **Pendiente** | No se tocó `CoverArt`. Anotado como siguiente paso. |
| UX-19 Accesibilidad básica | **Parcialmente solucionado** | Un solo `h1` en las pantallas de inicio, enlaces «Ver todo» con 44 px, `main` en la portada. Quedan por revisar el resto de enlaces de texto de 21 px. |
| UX-20 Detalle en móvil | **Solucionado** | El recorrido es una sola fila compacta; «Siguiente paso» queda a la vista. Verificado a 390 px. |
| UX-21 Botones de cuentas de prueba | **Solucionado** | Se han eliminado del inicio de sesión (ya no funcionaban). |

## 2. Qué cambia en cada fase

**Fase 1 — Estructura y responsive.** Barra lateral con tres estados (`auto`, `open`, `collapsed`) resueltos por CSS con variables, sin parpadeo; cookie nueva `ciberan-rail`. Subtítulo de cabecera a dos líneas. Chat/Bandeja sin duplicar. Botón flotante solo en móvil.

**Fase 2 — Colaboraciones.** Cabecera nueva (nombre, estado, con quién, resumen del brief). Recorrido responsive. «Siguiente paso» indica quién tiene la pelota («te toca a ti» / «le toca a …»). Jerarquía de acciones: Aceptar (principal) → Hacer contraoferta (secundaria) → Rechazar (discreta) → «Más acciones» (cancelar, incumplimiento). Listado: filtro en la barra de herramientas y chips de turno.

**Fase 3 — Publicaciones.** Apertura contextual desde la colaboración, vacío con botón de crear, filtro «Todas las publicaciones» (antes «Todos los proyectos»).

**Fase 4 — Descubrir.** Filtros por importancia, tarjetas comparables.

**Fase 5 — Primer acceso y nomenclatura.** Componente nuevo `FirstSteps.vue` (se marca solo con datos reales de la cuenta y se puede ocultar).

**Fase 6 — Sistema visual.** Escala tipográfica: los tamaños sueltos `text-[1.375rem]` y `text-[1.0625rem]` pasan a los tokens `text-title` y `text-lg`. Disabled: todos los botones usan el mismo 40 % de opacidad; la diferencia que se veía venía de la variante (brand/primary/outline), así que «Guardar búsqueda» pasa a `outline`.

## 3. Nomenclatura aplicada

| Antes | Ahora | Motivo |
|---|---|---|
| Hoy (creador) / Inicio (partner) | **Inicio** en los dos roles | Esa pantalla no es solo «hoy» y el partner ya la llamaba Inicio. |
| Abrir Studio | **Crear publicación** | «Studio» no existía como sección; el destino es «Publicaciones». |
| Todos los proyectos | **Todas las publicaciones** | El filtro lista publicaciones por colaboración. |
| «card» | **tarjeta** | Castellano. |
| Colaboración / Solicitud | Sin cambios | «Solicitud» = pendiente de aceptar; «Colaboración» = aceptada. |

## 4. Hallazgos nuevos encontrados al probar

1. **Turno de la negociación mal indicado** (corregido): tras una contraoferta, las dos partes seguían viendo el mismo «Siguiente paso». Ahora se usa el último evento `counteroffer` (la misma lógica que ya tenía el panel de negociación).
2. **Composer sin colaboración preseleccionada** (corregido, ver UX-02).
3. **Diálogo de solicitud del partner** no tenía «Cerrar»: añadido, junto a «Ver mis solicitudes».
4. **Portada sin `main`** (corregido; era el U-08 de la auditoría anterior).

## 5. Decisiones de producto documentadas

- **«Marcar como completada»** se oculta hasta que haya al menos una publicación vinculada (o un entregable resuelto) y ningún entregable exigible pendiente. Es un criterio de interfaz: el servidor no cambia. Si hubiera colaboraciones que se cierran sin publicaciones dentro de CIBERAN, habría que revisar este criterio.
- **Tour de bienvenida**: ya no se abre solo. El texto del tour sigue disponible desde Perfil.
- **Nombre de campaña**: se queda sin campo propio (requiere migración). Mientras tanto, el título se deriva con reglas claras y cubiertas por tests.

## 6. Pruebas

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | Correcto |
| `npm test` (unitarias) | 42 archivos, 404 pruebas, todas correctas (se añadieron 3: nombre de colaboración, brief y turno de la negociación) |
| `npm run build` | Correcto («Build complete»; solo avisos de Rollup ya existentes) |
| Detalle de colaboración a 768, 1280 y 390 px | Correcto: sin solapes, recorrido en una fila, siguiente paso visible |
| Crear publicación desde la colaboración | Correcto: abre el formulario con la marca elegida |
| Negociación (propuesta del creador → contraoferta del partner) | Correcto; hallazgo 1 del apartado 4 corregido y revisado |
| Descubrir a 1280 y 390 px | Correcto |
| Inicio a 768 px (barra plegada) | Correcto |
| Aviso de lanzamiento tras un login nuevo | Correcto: tarjeta sin bloqueo, sin tour |
| Consola del navegador | Sin errores nuevos en lo recorrido |

Zonas **no** probadas: revisión y aprobación de un entregable con publicación enviada a revisión (requería más datos de prueba), panel de administración (cuenta de administrador), estados de error de red, calendario y lista de publicaciones con datos, y Stripe (apagado). Quedan como pendientes de revisión manual.

## 7. Datos y entorno

- **Sin push, sin commits, sin migraciones, sin cambios de variables de entorno.**
- Datos de prueba que ya existían (2 usuarios, 1 colaboración, 1 publicación) más los de esta fase: **1 solicitud nueva** del creador al partner con una contraoferta de 300 € (sin aceptar). Nada se ha borrado.
- El worktree usa un enlace a `node_modules` de tu carpeta principal y una copia local de `.env` (ignorado por git).

## 8. Siguiente

1. Decidir si se añade el campo «Nombre de la campaña» (migración con ROLLBACK).
2. Unificar la imagen por defecto de publicación (UX-18) y revisar los enlaces de texto pequeños restantes.
3. Probar la revisión de entregables con datos controlados.
4. «Por qué encaja» en las tarjetas de Descubrir cuando haya datos suficientes.

## 9. Segunda ronda (a petición del equipo)

| Petición | Qué se hizo | Archivos principales |
|---|---|---|
| Perfil público ilegible en tablet y móvil (foto enorme, nombre en blanco sobre fondo claro) | Por debajo de 64 rem la cabecera (nombre) va **primero**, sobre el fondo oscuro; la foto es un retrato de tamaño fijo. | `patterns/public-profile.css` |
| Quitar «Cuentas de prueba» del acceso y cuadrar el formulario | Bloque, estado y contraseña fija eliminados de `login.vue`; el formulario queda centrado. | `pages/login.vue` |
| Tarjetas de Privacidad mal repartidas (hueco entre «Visibilidad del perfil» y «Tus datos») | Las tarjetas de ajustes pasan a **columnas que se rellenan de arriba abajo** (sin huecos) en todo el perfil, creador y partner. Medido: 24 px entre tarjetas. | `patterns/settings.css` |
| El recorrido inicial no saltó en una cuenta nueva | Era consecuencia de la primera ronda (lo había desactivado). **Reactivado** y rehecho: ilumina el elemento real del menú con un foco, la tarjeta explicativa va a su lado, 6 pasos (creador) / 5 (partner) en orden de uso, último paso hacia el perfil y los paquetes. Se salta con el botón, con Escape o en cualquier paso. Si el elemento no se ve (móvil) el paso sale centrado. Espera a la animación inicial pero no al aviso de lanzamiento. | `components/onboarding/OnboardingTour.vue`, `utils/onboarding-steps.ts`, `data-tour` en `SideRail.vue` y `BottomTabBar.vue` |
| Formulario de nueva publicación soso | Dos columnas, texto de ayuda, **red y formato con logotipo** (chips), «¿Para quién es?» (propio / colaboración), contador de caracteres y vista clara de la acción principal. | `timeline/PostComposerSheet.vue`, `ui/ChoiceChips.vue`, `components/choice.css` |
| ¿Está bien asociar una red social? | Sí, pero ahora se elige a la vista y no en un desplegable. **Limitación:** una publicación solo admite **una** red; lo habitual es publicar la misma pieza en varias. Admitir varias requiere un cambio de datos (migración), no hecho. | — |
| Selector de fecha con la identidad de la web | **Calendario propio** (`DatePicker.vue`): atajos Hoy / Mañana / En 3 días / En una semana, hoy marcado con el voltio, selección en tinta, días pasados desactivados, teclado. Sustituye al selector nativo en el formulario, la ficha y la hoja de edición. | `ui/DatePicker.vue`, `components/choice.css` |
| Formulario dentro de la publicación (imagen demasiado ancha) | La imagen pasa a un panel propio en la columna lateral: **marco vertical 4:5 de 15 rem** con arrastrar y soltar y indicaciones; el contenido ocupa su tarjeta. | `timeline/CoverUploader.vue`, `creator/post/[id].vue`, `timeline/PostEditSheet.vue` |
| Los paquetes pesan poco | Ver apartado siguiente. | — |
| No se puede crear otra cuenta | Causa: con un email **ya registrado** Supabase responde «éxito» sin enviar correo y la pantalla decía «Revisa tu email». Ahora se detecta y se avisa junto al campo de email con enlace a «Acceder». Para probar varios perfiles con Gmail sirve `nombre+creador@gmail.com`. | `pages/onboarding.vue` |

### Paquetes: crearlos fácil y que se vean

- **Crear:** formulario con **plantillas** (1 Reel, Reel + 3 Stories, Reseña en vídeo, Unboxing, Pack mensual; para marcas, Lanzamiento, Campaña, Recurrente), entregables con sugerencias de un clic, precio con «€», **portada elegible desde el principio** (antes solo al editar) y **vista previa** de cómo lo verán los demás. Se abre directamente desde `?tab=packages&nuevo=1`.
- **Entradas nuevas:** panel «Tus paquetes» en Inicio (con «Crear mi primer paquete»), primer paso de «Primeros pasos» y último paso del recorrido apuntan al formulario; el vacío del perfil público también.
- **Visibles para los demás:** en el perfil público los paquetes son la **primera pestaña** («Paquetes (N)») cuando existen, con tarjetas de escaparate (portada, precio destacado, entregables y «Hacer oferta»), y la tarjeta lateral muestra «Paquetes: N · desde X €». En Descubrir, cada tarjeta enseña «N paquetes · desde X €» con **una sola consulta** para todos los resultados visibles.
- **No hecho (necesita cambios de datos o decisión):** destacar un paquete como principal, y ordenar o filtrar Descubrir por precio de paquete.

### Pruebas de la segunda ronda

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | Correcto |
| `npm test` | 42 archivos, 404 pruebas correctas (se actualizó la que comprobaba que el recorrido esperase al aviso) |
| Perfil público a 768 y 390 px | Nombre visible sobre lo oscuro, foto de tamaño fijo, «Paquetes (1)» primera |
| Privacidad del partner a 1280 px | Dos columnas sin huecos (medido) |
| Acceso | Sin el bloque de cuentas de prueba |
| Formulario de publicación a 1280 px | Dos columnas, chips de red y formato, calendario propio funcionando |
| Detalle de publicación | Imagen en panel lateral, formulario completo |
| Crear un paquete con plantilla, precio y publicarlo | Correcto; aparece en el perfil público con precio y «desde» en la tarjeta |
| Recorrido (repetido desde Perfil) | Foco sobre «Inicio» y tarjeta a su lado; «Saltar recorrido» funciona |
| Alta con email ya registrado | Se corrigió según los registros de Supabase; la prueba visual del aviso no se hizo para no crear más cuentas |
