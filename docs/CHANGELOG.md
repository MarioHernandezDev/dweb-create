# Changelog de sesiones de desarrollo

Registro de qué se hizo, por qué, y qué queda pendiente de verificar — pensado para que el otro miembro del equipo pueda retomar sin tener que adivinar el estado real del proyecto. Se añaden entradas nuevas arriba.

---

## 2026-10-29 (Alex-27) — [Alex] A-R17a: el dashboard de YouTube usa todo el ancho

### Qué se cambió

- **Página de cada red (`/creator/metrics/<red>`) a ancho completo:** se activa `full-width` de `AppShell` (opción que ya existía y usan Tablero, Descubrir y Chat) **solo en esa página**. Ninguna otra página cambia de ancho; el índice de Métricas conserva su tope (comprobado).
- **Se retiran los topes `md:max-w-4xl` (896 px)** de los once bloques del dashboard de YouTube (cabecera, avisos, selector de periodo, totales, métricas del periodo, evolución, observaciones, vídeos y esqueletos). El tope no venía de un contenedor compartido sino de cada componente.
- **Rejilla que aprovecha el espacio, por anchos:**
  - Tarjetas del periodo: 2 columnas en móvil, 4 desde tablet y **8 en pantallas muy anchas (≥ 1536 px)**.
  - Vídeos: 1 columna en móvil, 2 en tablet, 3 en escritorio y **4 en pantallas muy anchas**.
  - Gráfica y observaciones: **lado a lado solo en pantallas muy anchas** (gráfica 8/12, observaciones 4/12); en escritorio normal y tablet van apiladas, con la gráfica a todo el ancho. La gráfica pasa de 260 a 320 px de alto.
- **Un cambio descartado tras medirlo:** había puesto las observaciones al lado de la gráfica ya desde 1280 px, pero dejaba la gráfica en 575 px, **más estrecha que antes**; se movió el umbral a ≥ 1536 px (allí la gráfica mide 1002 px).

### Verificado de verdad

- `npx vue-tsc --noEmit` limpio; suite unitaria 423/423 (no hay lógica nueva, solo clases y composición); `npm run build` completado en copia temporal.
- **Navegador real (Chrome por CDP) a 390, 768, 1280 y 1920 px, 25 comprobaciones OK** con medidas reales, no solo a ojo: sin desbordamiento horizontal en ninguno; a 1920 px la cabecera ocupa 1600 de 1664 px disponibles, la gráfica 1002 px, 8 tarjetas del periodo en una fila y 4 columnas de vídeos; a 1280 px, 4 tarjetas y 3 columnas de vídeos; a 768 px, 2 columnas de vídeos y gráfica y observaciones apiladas; a 390 px, 1 columna; ningún texto ni miniatura se sale de su tarjeta; el índice de Métricas sigue en 1100 px. Capturas revisadas.
- **Dos fallos reales de diseño que encontré midiendo y corregí en la misma fase:** (1) las 4 columnas de vídeos no se aplicaban a 1920 px (la variante de ancho que usé no se generaba): ahora 3 → 4 con `2xl`; (2) lo del umbral de la gráfica descrito arriba.

### Cómo se probó (importante)

Datos **FICTICIOS** interceptados en mi script de navegador (cuentas demo sin canal); filas de prueba borradas al terminar. No se ha visto con tu canal real ni en un monitor físico: los anchos se simulan con el emulador de dispositivo de Chrome.

### Conocido y pendiente (no se oculta)

- A 1920 px la tarjeta de la gráfica queda más baja que la columna de observaciones y deja un hueco debajo; se afina en **A-R17c** (alto de la gráfica y columna lateral).
- A 768 px el título de la barra superior ("YouTube") se corta por el buscador. Es un efecto de `TopBar`, componente compartido de todas las páginas: **no se ha tocado**; se valorará aparte para no alterar otras pantallas.
- Aún no hay jerarquía nueva (héroe, barra de periodo fija, mini-tendencias, rejilla de vídeos con filtros fijos): son las fases A-R17b–f.

---

## 2026-10-29 (Alex-26) — [Alex] Se elimina la página Redes y se propone A-R17 (Métricas a ancho completo)

### Qué se cambió

- **Página `/creator/socials` eliminada** por redundante, como se pidió. **Antes de borrarla se comprobó qué hacía:** era el único sitio para **conectar, desconectar (con revocación en Google) y sincronizar** una red, y los callbacks de OAuth redirigían allí. Para no perder esas funciones:
  - La lógica se movió **sin cambios de comportamiento** al composable `useSocialAccountActions` (confirmación de desconexión, avisos honestos sobre si la revocación se confirmó, "Desconectar igualmente" si no se pudo confirmar, reconexión solo cuando el servidor lo dice).
  - **Métricas (`/creator/metrics`) tiene ahora la sección "Conexiones"** con las seis redes, sus botones y todos los avisos (vuelta de OAuth correcta o con error, desconexión, sincronización).
  - "Redes" desaparece del menú lateral; los enlaces de Hoy, Perfil, el panel de YouTube, la tarjeta de red y las pantallas vacías apuntan a `/creator/metrics#conexiones`.
  - Los callbacks de YouTube e Instagram redirigen ahora a `/creator/metrics?…`; el enlace antiguo `/creator/socials` se conserva como **redirección a Métricas** (marcadores).
- **Propuesta A-R17** (`docs/PROPUESTA_A-R17_METRICAS_FULL_WIDTH.md`), **solo auditoría y diseño, sin implementar**: qué existe ya de lo pedido (casi todo lo funcional lo cubre A-R16), qué limita el ancho (opción `fullWidth` de `AppShell` sin usar y `max-w-4xl` en cada bloque; no son contenedores compartidos), distribución de 12 columnas para escritorio/tablet/móvil, mejoras de usabilidad, qué funcionalidades son viables y cuáles dependen de datos reales o de esquema (impresiones/CTR por confirmar; histórico y métricas por publicación ligados a A-R8a/A-R7/A-R8b), fases A-R17a–f y su sitio en el pipeline (anotado en `PIPELINE_IMPLEMENTACION_FEEDMA_ALEX.md`).

### Verificado de verdad

- `npx vue-tsc --noEmit` limpio; **suite unitaria 423/423**.
- **Navegador real (Chrome por CDP), 11 comprobaciones OK** con las filas de prueba (token falso) de siempre: el menú ya no tiene "Redes" y conserva "Métricas"; ningún enlace de la página apunta a `/creator/socials`; el enlace antiguo redirige a Métricas; la sección "Conexiones" lista las 6 redes ("2 de 6 conectadas") con las no disponibles como "Próximamente"; sincronizar con un acceso inválido deja la fila de YouTube en "Reconectar" (estado guardado, no queda mudo); desconectar abre la confirmación que explica la revocación y **cancelar no desconecta nada**; la vuelta de OAuth muestra "Cuenta de YouTube conectada." o el motivo del error; móvil sin desbordes. Capturas revisadas a ojo. El único error de consola es el 401 esperado de la sincronización con token falso.

### Sin verificar

- **No he probado conectar ni desconectar una cuenta REAL** (el flujo de OAuth completo con tu cuenta): el código de la lógica es el mismo que había, pero la vuelta real desde Google/Instagram a la nueva URL (`/creator/metrics?…`) la ves tú en tu próxima conexión.
- Si tienes la URL de retorno de Meta/Google registrada con `/creator/socials`: no hace falta cambiarla (los redirect URI de OAuth apuntan a `/api/auth/.../callback`, no a la página); solo cambia a dónde te devuelve FEEDMA después.
- `CONTEXT.md` (auditoría histórica del 2026-10-2x) sigue nombrando la página Redes porque es un registro de lo que había entonces.
- A-R17 es una propuesta: **no se ha cambiado el ancho ni el diseño de Métricas todavía.**

---

## 2026-10-29 (Alex-25) — [Alex] A-R16f: animaciones discretas del dashboard de YouTube

### Qué se cambió

- **Contadores animados** en las tarjetas con un recuento (suscriptores, visualizaciones, vídeos, media por vídeo; en el periodo: visualizaciones, tiempo de visualización, me gusta, comentarios y compartidos). Medias, porcentajes, duraciones y netos se muestran de golpe. Al cambiar de periodo las tarjetas cuentan hasta el valor nuevo.
- **Entrada escalonada** de los bloques (cabecera, totales, periodo, evolución, observaciones y vídeos): aparición con ligero desplazamiento, con un retraso máximo de 300 ms.
- **La línea de la gráfica se dibuja** al cambiar de métrica o de periodo (y el área se desvanece); la línea del periodo anterior no se anima.
- Pasar el ratón por tarjetas y vídeos ya elevaba la tarjeta (de fases anteriores).
- **Sin dependencias nuevas:** el contador usa `gsap`, que ya estaba en el proyecto (nuevo composable `useCountUp`); la entrada y la línea son CSS en `main.css`.

### Reglas que se han respetado

- **La animación nunca es la fuente del dato.** El texto final de cada tarjeta es SIEMPRE el valor real ya formateado: en servidor, con "menos movimiento", o si algo falla en la animación se ve directamente. `aria-label` de la tarjeta ya lleva el valor final, así que lectores de pantalla no leen números intermedios.
- **`prefers-reduced-motion`:** los contadores se saltan y las entradas y la línea se reducen a ~0 ms (regla global ya existente).
- Un dato ausente (`null`) no tiene contador (no se anima un "—" ni se convierte en 0); un 0 real sí cuenta y acaba en "0".

### Verificado de verdad

- Unitarios nuevos (`youtube-count.spec.ts`, 5): el formato del contador reproduce exactamente `value` en todas las tarjetas, nada se anima si falta el dato, el 0 real sí. **Suite completa 423/423**; `npx vue-tsc --noEmit` limpio; `npm run build` completado en copia temporal.
- **Navegador real (Chrome por CDP), 10 comprobaciones OK:** con "menos movimiento" las entradas duran ~0 ms y sirven de referencia; sin reducción la entrada se anima y el contador pasa por valores intermedios (1,9 mil → 6,7 mil → 8,4 mil → 12,4 mil); **al terminar, todas las tarjetas muestran exactamente los mismos valores que sin animación**; ningún bloque queda a medio aparecer; al cambiar a 7 días el valor pasa por 11 valores intermedios y acaba en el exacto anunciado por la tarjeta (2577); la línea se dibuja al cambiar de métrica y acaba completa; móvil sin desbordes. **Regresión:** repetidas las baterías de rendimiento por vídeo (22/22) y de detalle y observaciones (22/22) con las animaciones activas, sin fallos.

### Cómo se probó (importante)

Datos **FICTICIOS** interceptados en mi script de navegador (cuentas demo sin canal); filas de prueba borradas al terminar. **No he visto las animaciones a ojo en movimiento**: comprobé por código que existen, pasan por valores intermedios y terminan en el valor real, y revisé capturas del estado final; la sensación (duración, ritmo) la juzgas tú en tu navegador. Si te resultan lentas o excesivas se ajusta con dos números (0,8 s del contador, 0,45 s de la entrada).

### Sin verificar

- Lectura de pantalla real y dispositivos táctiles reales; rendimiento en móviles lentos.
- Con muchas tarjetas animando a la vez no se ha medido el coste en equipos modestos (son 9-13 contadores de 0,8 s).

---

## 2026-10-29 (Alex-24) — [Alex] A-R16d.3 y A-R16g: detalle de un vídeo y observaciones con criterio visible

### Qué se cambió

- **Detalle de un vídeo (requisito 5.4).** Cada tarjeta de la lista tiene "Ver detalle", que abre una hoja modal accesible (la existente `BottomSheet`: foco dentro, Escape cierra y el foco vuelve al botón). Muestra: miniatura y enlace a YouTube, **TOTAL desde la publicación** (Data API) frente a **lo ocurrido en el periodo elegido** (Analytics API), siete tarjetas del periodo con variación (vs. periodo anterior), gráfica de visualizaciones por día y la sección "Frente a lo habitual del canal". Un fallo muestra el mensaje con Reintentar (o Reconectar) **dentro de la hoja**, con el total del vídeo ya visible. Cambiar de periodo con la hoja abierta pide ese periodo; con caché por vídeo y periodo.
- **Endpoint nuevo `GET /api/social/youtube-video-detail?id=&days=`** (Analytics con `filters=video==ID`: totales, periodo anterior y serie diaria). **Seguridad:** el id se valida (forma de id de YouTube) y **se comprueba que el vídeo pertenece al canal del usuario ANTES de llamar a Analytics** (la Data API devuelve cualquier vídeo público, y Analytics sobre un vídeo ajeno devolvería 403 y marcaría por error la cuenta como "sin permiso"). "No existe" y "no es tuyo" dan el mismo 404, para no confirmar vídeos ajenos. No guarda nada ni añade dependencias.
- **Vídeo publicado dentro del periodo:** aviso visible ("las cifras cubren solo desde su publicación") y **sin comparación** con el periodo anterior ni con las visualizaciones de los demás vídeos (no sería justa).
- **"Frente a lo habitual del canal", con el CRITERIO escrito en cada fila** (`youtube-insights.ts`): % medio visto y duración media del vídeo frente a la media del canal en el mismo periodo, y visualizaciones frente a la **mediana** de los vídeos con actividad en el periodo. "Similar" = dentro de ±10 %. La fila de visualizaciones solo existe con **al menos 5 vídeos con actividad, informe no recortado y vídeo presente todo el periodo**; si falta cualquier dato, la fila no se genera (no se compara con 0).
- **Observaciones del canal (A-R16g)**, nueva sección entre la evolución y los vídeos, con reglas fijas y **criterio visible bajo cada una**: vídeo más visto del periodo, qué parte de las visualizaciones concentra, cambio de visualizaciones frente al periodo anterior (solo con porcentaje válido), mejor día (los días sin dato no cuentan como cero) y vídeos publicados en el periodo (solo cuando ya están cargados todos los del rango). **Sin IA, sin causas ("porque…") y sin consejos.** Sin datos: lo dice, no inventa.
- Los números de las observaciones usan separador de miles también en 4 cifras ("8.549 → 10.686"): `Intl` en es-ES no lo pone por defecto y quedaba incoherente.

### Verificado de verdad

- Unitarios nuevos (`youtube-insights.spec.ts`, 22): reglas de cada observación, veredictos y márgenes, mediana, mínimo de vídeos, informe recortado, vídeo parcial y datos ausentes. **Suite completa 418/418**; `npx vue-tsc --noEmit` limpio.
- **Navegador real (Chrome por CDP), 22 comprobaciones OK** (con capturas revisadas en escritorio y móvil 390 px): observaciones con criterio y sin causas ni consejos; detalle con título, TOTAL frente a PERIODO, 7 tarjetas, comparaciones con su criterio y veredicto correcto ("por encima" en % visto, "por debajo" en duración), gráfica, sin desbordes; cambio a 7 días con la hoja abierta (nueva llamada `v1:7`); Escape cierra y **el foco vuelve al botón**; vídeo parcial (aviso, sin variaciones, 2 filas en vez de 3); fallo con Reintentar dentro de la hoja; cargando; móvil.

### Cómo se probó (importante)

Las cuentas demo no tienen canal. **Todos los datos son FICTICIOS** (títulos con "(ficticio)"), interceptados en mi script de navegador; no entran en el producto. La fila de cuenta con token falso que uso para que la página muestre el panel se borra al terminar (0 restos). **No se ha visto el detalle ni las observaciones con el canal real de Alex.**

### Errores míos durante la verificación (ninguno en el producto)

1. La primera comprobación de foco falló porque mi script abría el detalle con `click()` sin enfocar el botón: en el navegador real el foco sí vuelve (comprobado al corregir el script).
2. Mi interceptor genérico respondía con las estadísticas del canal también a la ruta nueva del detalle (doble respuesta); corregido en el script. Una expectativa mía suponía separador de miles en "1000" (comportamiento de `Intl`); de ahí el retoque de formato de arriba.
3. Algún error de escapado al generar el script (el shell expandía `\n`); sin consecuencia en el producto.

### Sin verificar

- **Con el canal real:** que Analytics acepte `filters=video==ID` con estas métricas (se pidió **sin `subscribersLost`** por no estar confirmado en informes de un solo vídeo; por eso no hay "suscriptores netos" en el detalle). Si Google rechaza alguna otra métrica, el detalle fallará con el mensaje y Reintentar, sin afectar al resto.
- La **mediana de "lo habitual"** solo cubre vídeos con actividad en el periodo (no los que no tuvieron vistas) y un canal con pocos vídeos no tendrá esa fila. "Lo habitual" es un criterio de FEEDMA, no una cifra de YouTube.
- Cuota: el detalle son 5 llamadas por apertura (canal, vídeo y 3 informes), solo bajo demanda y con caché; sin medir.
- Lectura de pantalla y táctil real: no probados.
- **A-R16e (histórico propio con snapshots) no se hace:** exige una tabla nueva en Supabase (propuesta M3) y tu aprobación/coordinación con Mario antes de cualquier migración.

---

## 2026-10-29 (Alex-23) — [Alex] A-R16d.2: rendimiento de cada vídeo dentro del periodo

### Qué se cambió

- **Endpoint nuevo `GET /api/social/youtube-video-performance?days=7|28|90|365`:** qué hizo cada vídeo DENTRO del periodo (visualizaciones, tiempo de visualización, me gusta y comentarios), en vivo desde la YouTube Analytics API con `dimensions=video` ordenado por visualizaciones y tope de 200 vídeos. Mismo rango de fechas que `youtube-analytics`, así que las cifras por vídeo cuadran con los totales del periodo. No guarda nada en la base de datos ni añade dependencias. Mismo patrón de seguridad que el resto (solo datos propios, tokens solo en servidor, sin llamar a Google si la cuenta ya consta como caducada o revocada, errores clasificados).
- **Reglas de datos (lógica pura en `server/utils/youtube-video-performance.ts`):** columnas leídas por nombre; métrica que no llega = `null` (nunca 0); ids que no tienen forma de id de YouTube o repetidos se descartan; `truncated` si el informe llega al tope de 200 (puede faltar algún vídeo con actividad).
- **Total acumulado frente a periodo (requisito 5.3):** cada tarjeta de vídeo muestra ahora dos bloques rotulados, **TOTAL** (acumulado desde la publicación, Data API) y **ÚLTIMOS N DÍAS** (Analytics API, el periodo elegido arriba). Una nota sobre la lista explica la diferencia con el rango de fechas real.
- **Sin inventar ceros:** un vídeo que Google no devuelve en el informe NO se pinta con 0. Cada caso dice lo suyo, con motivo al pasar el ratón: "sin cifras en el periodo" (sin actividad registrada, o publicado hace muy poco), "fuera de los 200 más vistos" (informe recortado, con aviso sobre la lista) y "cifras no disponibles ahora" (la petición falló o aún no ha llegado; es distinto de "sin actividad"). Una métrica concreta que falta dentro de una fila es "—"; un 0 real sigue siendo 0.
- **Nuevo orden "Más vistos en el periodo"** (el antiguo pasa a "Más vistos (total)"). Los vídeos sin cifras del periodo van al final, no como 0.
- **Comportamiento:** al cambiar el selector de periodo se piden las cifras de ese periodo (caché en memoria por periodo y cancelación de la petición anterior, igual que las analíticas); "Actualizar" las recarga. **Un fallo de esta petición no esconde la lista:** los totales de cada vídeo siguen visibles y aparece un aviso en línea con Reintentar. Con la cuenta caducada/revocada no se llama a este endpoint.

### Verificado de verdad

- Unitarios nuevos (`youtube-video-performance.spec.ts`, 14): lectura por nombre de columna, ausente = null / 0 real = 0, ids inválidos o repetidos, tope de 200, estados `unknown` / `data` / `none` / `unlisted` y orden por vistas del periodo (independiente del orden por total, sin datos al final, 0 real por delante de "sin dato"). **Suite completa 396/396**; `npx vue-tsc --noEmit` limpio.
- **Navegador real (Chrome por CDP), 22 comprobaciones OK** y capturas revisadas a ojo (escritorio, 7 días, recortado, fallo, cargando y móvil 390 px): cifras correctas con unidades, "—" para métricas ausentes y 0 reales, tarjetas sin fila con su motivo, orden por periodo, cambio a 7 días (nueva llamada y cifras distintas) y vuelta a 28 con caché (sin llamada extra), informe recortado, fallo con totales conservados y Reintentar, estado de carga, móvil sin desbordes, y con el token falso real **cero llamadas** a este endpoint.

### Cómo se probó (importante)

Las cuentas demo no tienen canal. **Todos los datos de vídeos y de rendimiento son FICTICIOS** (títulos con "(ficticio)"), interceptados en mi script de navegador; no entran en el producto. Las filas de cuenta con token falso que creé para que la página mostrara el panel se borraron al terminar (0 restos).

### Errores míos durante la verificación (ninguno en el producto salvo el primero)

1. **Defecto de producto que encontré yo al revisar la captura del fallo y corregí en la misma fase:** con la petición caída, cada tarjeta decía "sin cifras en el periodo", que sugiere "sin actividad" cuando en realidad no se sabía. Ahora dice "cifras no disponibles ahora" y hay una comprobación nueva para ello.
2. Mi script empezó sin cuenta conectada la primera vez (la limpieza de la fase anterior había borrado la fila de prueba) y, en la repetición, mi último paso (token falso real) deja la fila como revocada a propósito; el script de siembra se niega a pisar filas ajenas, así que hubo que limpiar y volver a sembrar. Dos veces la página mostró "Red no conectada" y todos los resultados salían en rojo por eso, no por el producto.
3. Una expectativa mía mal escrita (`slice(0, 12)` incluye el espacio final de "Cómo montar "): la app ordenaba bien. Es la misma errata de 12 caracteres de la fase anterior.

### Sin verificar

- **Con el canal real de Alex:** que Analytics acepte `dimensions=video` con estas métricas y el orden por visualizaciones, y qué devuelve de verdad (si algún canal devuelve filas sin me gusta, etc.). Alex puede abrir `/api/social/youtube-video-performance?days=28` con la sesión iniciada para ver el JSON.
- El **tope de 200 vídeos** es el máximo de la API; en canales con más vídeos activos en el periodo habrá vídeos "fuera de los 200 más vistos" (se avisa).
- Los datos de Analytics tardan 1-2 días: un vídeo recién subido aparece como "sin cifras" hasta entonces (el motivo lo dice).
- **Vista de detalle de un vídeo** (requisito 5.4) y comparación con el periodo anterior por vídeo: **no hechas**. Tampoco las observaciones con criterio visible ni las animaciones (fase f). Lectura de pantalla y táctil real: no probados.
- Cuota de la API: este endpoint añade 1 llamada de Analytics por periodo visto (más 1 por renovar el token), sin medir.

---

## 2026-10-29 (Alex-22) — [Alex] A-R16d: lista de vídeos con búsqueda, orden, filtro y paginación

### Qué se cambió

- **Endpoint nuevo `GET /api/social/youtube-videos[?pageToken=…]`:** vídeos subidos del canal **de 24 en 24** (antes solo 8), con `nextPageToken` y el total. El `pageToken` que llega del navegador se valida (solo caracteres de un token real, máximo 200) antes de usarlo en la URL de Google. Mismo patrón de seguridad que el resto: solo datos del propio usuario, tokens solo en servidor, sin llamar a Google si la cuenta ya consta como caducada/revocada, errores clasificados y guardados.
- **Corrige el fallo "ausente = 0":** hasta ahora `Number(likeCount ?? 0)` convertía en 0 un me gusta oculto o un comentario desactivado (la API omite el campo). Ahora son `null` y se muestran como "—" con su motivo ("El canal oculta los me gusta de este vídeo" / "Los comentarios están desactivados en este vídeo"). Los ceros reales siguen siendo 0. Una duración inexistente ya no sale como 0:00 (es `null` y no se pinta la insignia).
- **Panel de vídeos** (`YoutubeVideosPanel`): miniatura, duración, fecha relativa, visualizaciones, me gusta, comentarios e **interacción** = (me gusta + comentarios) ÷ visualizaciones (cálculo de FEEDMA, rotulado como tal; no se calcula si falta cualquiera de los datos). **Búsqueda** por título sin distinguir tildes ni mayúsculas, **orden** (más recientes / más vistos / mayor interacción) y **filtro por fecha de publicación** (30 / 90 días / último año). Los vídeos sin el dato por el que se ordena van **al final**, no se tratan como 0. El contador es honesto ("Mostrando 6 de los 6 vídeos cargados (8 en total)") porque búsqueda y orden solo ven los vídeos cargados. Botón "Cargar más vídeos".
- Estados: cargando (skeletons), sin vídeos, filtros sin resultado (con "Quitar filtros"), reconectar, fallo pasajero con Reintentar y **fallo al cargar más** (aviso en línea; los ya cargados se conservan y Reintentar pide solo esa página).
- **Servidor:** `youtube-channel-stats` ya no pide los vídeos (**dos llamadas menos por visita**); se retiran `recentVideos`, `fetchRecentUploadIds` y la sección antigua de la página. `Actualizar` recarga también los vídeos. Sin dependencias nuevas.

### Verificado de verdad

- Unitarios nuevos: `youtube-videos.spec.ts` (49: recuentos ausentes = null, duraciones ISO 8601 incluido "P1DT2H", mapeo, orden, validación del token de página) y `youtube-videos-view.spec.ts` (33: búsqueda sin tildes, filtros de fecha, orden estable con nulos al final, interacción, textos). **Suite completa 382/382**, `npx vue-tsc --noEmit` limpio, `npm run build` completado (en copia temporal con git worktree; copia eliminada y `node_modules` intacto).
- **Navegador real (Chrome por CDP), 31 comprobaciones OK** y capturas revisadas a ojo: 6 vídeos con enlaces a YouTube (pestaña nueva, `noopener`); me gusta ocultos y comentarios desactivados = "—"; ceros reales = 0; sin ninguna estadística = todo "—"; insignia de duración solo cuando se conoce; título larguísimo sin desbordar; búsqueda ("CAMARA" encuentra "cámara"), vacío con "Quitar filtros"; los tres órdenes; filtros de fecha; **paginación con un vídeo duplicado en la segunda página (no se duplica)**; fallo al cargar más conservando los vídeos y Reintentar; canal sin vídeos; error de reconectar y fallo pasajero con recuperación; skeletons; Actualizar recarga vídeos y analíticas; móvil (390 px) sin desbordes; estado real con token falso: **cero llamadas** a la API de vídeos.

### Cómo se probó (importante)

Las cuentas demo no tienen canal. **Todos los datos de vídeos son FICTICIOS** (títulos con "(ficticio)"), interceptados en mi script de navegador; no entran en el producto. **No se ha visto esta lista con los vídeos reales de Alex ni con miniaturas reales** (en las pruebas no hay miniatura: se ve el marcador).

### Errores míos durante la verificación (ninguno en el producto)

1. Mi patrón de interceptación `*youtube-videos*` coincidía también con el archivo `utils/youtube-videos-view.ts`: el script devolvía JSON de prueba en lugar del módulo y la página no cargaba ("Failed to fetch dynamically imported module"). Tardé varios intentos en verlo porque primero sospeché de la página y del servidor; la causa se encontró leyendo la consola completa del navegador (no solo `console.error`). Patrones restringidos a `/api/social/…`.
2. Un nombre repetido (`page`) rompía el script antes de arrancar; una clave de búsqueda de 11 caracteres en lugar de 12; una expectativa de orden mal calculada (la app acertó: el "Vlog antiguo" tiene 5,83 % de interacción frente al 5,56 % de "Cómo montar"); mensajes ficticios distintos de los del servidor real; y un espacio no separable que `Intl` pone entre "3" y "mil".
3. Un reintento por "página no pintada" en la primera carga tras iniciar sesión (sin errores en consola: compilación inicial del servidor de desarrollo); no se repitió en las otras 14 navegaciones.

### Sin verificar

- **Con el canal real de Alex:** que Google acepte la consulta paginada, las miniaturas reales, los recuentos y qué canales ocultan realmente me gusta o comentarios. Alex puede abrir `/api/social/youtube-videos` con la sesión iniciada para ver el JSON.
- La **búsqueda es sobre los vídeos cargados**, no sobre todo el canal: con muchos vídeos hay que cargar más para encontrar uno antiguo (el panel lo dice).
- Cuota de la API (lista + detalle de 24 vídeos = 2 llamadas por página, más 1 por token de acceso y 1 del canal): sin medir. Lectura de pantalla y táctil real: no probados.
- **Rendimiento por vídeo en un periodo y vista de detalle** (requisito 5.3 y 5.4: diferenciar acumulado y rendimiento reciente de cada vídeo): **no hechos**; necesitan Analytics por vídeo y es la siguiente subfase si se aprueba. Tampoco el resumen/"observaciones" ni las animaciones (fase f).
- Notificaciones de login en la cuenta demo por mis sesiones de prueba (unas 20 en total); sin limpiar.

---

## 2026-10-29 (Alex-21) — [Alex] A-R16c.2: selector de periodo, métricas del periodo con variación y gráfica con comparación

### Qué se cambió

- **Selector de periodo** (`YoutubePeriodBar`): 7 / 28 / 90 / 365 días y casilla "Comparar con el periodo anterior". Un periodo solo se puede elegir si el canal existía durante todo él (los demás salen deshabilitados **con el motivo**); la comparación se desactiva si el periodo anterior no es completo.
- **Ocho métricas del periodo** con su variación (`YoutubeKpiCard` ampliada): visualizaciones, tiempo de visualización, suscriptores netos, duración media, % medio visto, me gusta, comentarios y compartidos. Cada una dice su origen ("Dato de YouTube"). El porcentaje solo aparece si el servidor lo da; si no, se enseña la diferencia absoluta y se rotula "(sin %)". La variación del % medio visto se da en puntos porcentuales.
- **Gráfica nueva** (`YoutubeEvolutionChart`, SVG propio): eje Y con valores, periodo anterior en discontinuo alineado día a día, **huecos reales donde YouTube no da dato** (la línea y el área se cortan; la leyenda dice "N días sin dato… no se rellenan con ceros"), tooltip con fecha y valor de los dos periodos, teclado (←/→/Esc) con región `aria-live`, y **se dibuja al ancho real del contenedor** (no se encoge un lienzo fijo). Pestañas Vistas / Suscriptores / Tiempo (`YoutubeEvolutionPanel`).
- `useYoutubeAnalytics` (composable): caché por periodo en memoria (volver a un periodo ya visto **no llama a Google**), cancela la petición anterior al cambiar (una respuesta lenta no pisa a la nueva), y si el periodo pedido no es válido para el canal pasa solo al mayor que sí lo es.
- `YoutubeDashboard` reescrito: orquesta todo; un fallo de las analíticas **no esconde los totales del canal**; sin permiso -> aviso + Reconectar; fallo pasajero -> "no hace falta reconectar" + Reintentar; canal demasiado reciente -> mensaje propio; no se piden analíticas si la cuenta ya consta como caducada/revocada.
- **Servidor:** `youtube-channel-stats` ya no pide la evolución a Google (la da `youtube-analytics`): **una llamada menos por visita**; se retiran `evolution`/`evolutionIssue` y la función antigua `fetchYoutubeAnalytics`. **Se retira la "proyección a 30 días"** de la pantalla antigua (era una extrapolación de FEEDMA presentada como dato; si se quiere volver a ofrecer irá rotulada como estimación).
- Sin dependencias nuevas (`@vueuse/core` ya estaba).

### Verificado de verdad

- Unitarios: `youtube-period-view.spec.ts` (42 tests: formatos, tarjetas, variación, series con huecos y alineación del periodo anterior, rangos). **Suite completa 300/300**, `npx vue-tsc --noEmit` limpio, `npm run build` completado (en copia temporal con git worktree, sin tumbar el servidor de Alex; copia eliminada y `node_modules` intacto).
- **Los tests encontraron dos fallos míos:** la diferencia absoluta salía con **doble signo** ("++0:25"), corregido; una fecha de creación inválida lanzaba una excepción (entrada anterior).
- **Navegador real (Chrome por CDP), 29 comprobaciones OK** más capturas revisadas a ojo: 4 periodos y selección; 12 tarjetas (4 del canal + 8 del periodo) con variación; llamada única por periodo y **volver a uno ya visto sin nueva llamada**; casilla de comparar apagada (desaparecen variaciones y línea discontinua sin pedir datos); periodos no disponibles deshabilitados con su motivo y comparación desactivada; huecos; datos nulos ("—" con motivo, nunca 0); **tooltip con el ratón y con el teclado**; carrera (pedir 90 y enseguida 7 aunque la de 90 llegue tarde: se queda en 7); canal joven (cae a 7); analíticas sin permiso y con fallo pasajero (con Reintentar que recupera); skeletons de carga; y el estado real con token falso (reconectar y **cero** llamadas a analíticas).
- **Defectos reales encontrados al mirar las capturas en móvil y corregidos:** la gráfica se dibujaba diminuta (un lienzo de 720 px encogido: ejes ilegibles) y las pestañas se partían en dos líneas. Ahora la escala medida es 1 y las pestañas miden 32 px de alto.

### Cómo se probó (importante)

Las cuentas demo no tienen canal de YouTube. **Todos los casos de datos usan respuestas FICTICIAS** que intercepta mi script de navegador (el canal se llama "Canal de prueba (datos ficticios)"); no entran en el producto. Solo el último caso (token falso) usa respuestas reales de Google. **Este dashboard no se ha visto con el canal real de Alex.**

### Errores míos durante la verificación (sin consecuencias en el producto)

Mi selector `svg[role=img]` también coincidía con los iconos (7 falsos fallos), la prueba de carga miraba demasiado tarde, y el ratón se movía a coordenadas fuera de la pantalla porque la gráfica queda por debajo de la parte visible. Todos corregidos en el script, no en el producto.

### Sin verificar

- **Con el canal real**: ni los nombres de métricas que acepta Google combinados en un informe, ni los valores, ni la cobertura de días, ni que `publishedAt` decida bien los periodos disponibles. Lo comprueba Alex en `/creator/metrics/youtube` (y puede abrir `/api/social/youtube-analytics?days=28` para ver el JSON).
- Táctil real (el tooltip responde al puntero; no se ha probado con un dedo), Safari/Firefox, tablet y lector de pantalla (hay `aria-label`, `title` y región `aria-live`, pero no se ha probado con uno).
- **La gráfica queda por debajo de las 12 tarjetas** (hay que desplazarse para verla). Es el orden aprobado, pero conviene valorarlo con datos reales.
- Los vídeos siguen siendo la sección antigua (con likes/comentarios ausentes mostrados como 0: es la parte de A-R16d). Animaciones: fase f.
- Cuota de la API con más llamadas por visita (ahora 5 a Google en la primera carga con comparación): sin medir.
- Notificaciones de login en la cuenta demo por mis sesiones de prueba (unas 10 en este bloque); sin limpiar.

---

## 2026-10-29 (Alex-20) — [Alex] A-R16c.1: cabecera del canal, estados y totales del dashboard de YouTube

### Qué se cambió (estructura aprobada por Alex en la entrada anterior)

- **Componentes nuevos** (`app/components/youtube/`): `YoutubeDashboard` (orquesta, presentacional), `YoutubeChannelHeader`, `YoutubeStateBanner`, `YoutubeKpiCard`; y `ui/SkeletonBlock` (no existía ningún skeleton). Lógica pura en `app/utils/youtube-kpi.ts`.
- **Cabecera:** avatar, nombre, estado de la conexión (Conectada / Conectada · analíticas no disponibles / Necesita reconexión / Error), "actualizado hace…" (solo si hay una sincronización correcta registrada: no se inventa una hora), "miembro desde", "Ver en YouTube" (enlace al canal, pestaña nueva con `noopener`), "Gestionar conexión" y botón Actualizar. El estado sale de lo que guarda el servidor, no de que exista una fila.
- **Banner de estado** con su acción: reconectar (caducado/revocado/sin permiso), fallo pasajero ("no hace falta reconectar"), analíticas sin permiso y analíticas con fallo temporal (los totales del canal se siguen viendo).
- **Totales del canal:** Suscriptores como tarjeta protagonista, más visualizaciones totales, vídeos publicados y media de vistas por vídeo. **Cada tarjeta indica su origen** ("Dato de YouTube" o "Cálculo de FEEDMA"), para no presentar un cálculo nuestro como cifra oficial. Suscriptores ocultos por el canal y media sin vídeos se muestran como "—" **con su motivo, nunca como 0**.
- **Carga:** skeletons con la forma exacta de lo que llega (sin saltos de maquetación); al recargar con datos ya cargados se conserva el contenido.
- `GET /api/social/youtube-channel-stats` devuelve ahora `channelId` (para el enlace).
- **Sin regresión:** la evolución de 28 días y los vídeos recientes que ya existían se conservan tal cual, dentro del hueco (slot) del dashboard, hasta que las fases siguientes los sustituyan. Sin dependencias nuevas.

### Verificado de verdad

- `youtube-kpi.spec.ts` (9 tests, reglas de "no mostrar 0 cuando no se sabe"). Suite completa **258/258**, `npx vue-tsc --noEmit` limpio, `npm run build` completado (en una copia temporal con git worktree, para no tumbar el servidor de desarrollo; la copia se eliminó y `node_modules` quedó intacto).
- **Navegador real (Chrome por CDP), 17 comprobaciones OK** y capturas revisadas a ojo:
  - carga con skeletons y paso al contenido; cabecera, enlaces y atributos del enlace externo;
  - 4 tarjetas con su origen (3 de YouTube y 1 cálculo de FEEDMA); sin banner con datos normales;
  - lo que ya existía sigue ahí; sin desbordamiento horizontal a 1280 y a 390 px;
  - analíticas sin permiso (banner + Reconectar + totales visibles) y con fallo temporal (dice que no hace falta reconectar);
  - suscriptores ocultos y canal sin vídeos ("—" con motivo);
  - **estado real con token falso** (respuesta real de Google): "Hay que reconectar YouTube" y, al volver, sale del estado guardado **sin llamar a Google**.
- Defectos de diseño encontrados al mirar las capturas y corregidos: "TOTAL DEL CANAL" se repetía 5 veces y los valores de las tarjetas no quedaban alineados (se sustituyó por la línea de origen, igual en todas).

### Cómo se probó (importante)

Las cuentas demo no tienen canal de YouTube. Los casos de **maquetación** (normal, ocultos, analíticas) usan **respuestas FICTICIAS** interceptadas en mi script de navegador (el canal se llama "Canal de prueba (datos ficticios)"); no entran en el producto. **No se ha visto este dashboard con el canal real de Alex.** Solo el caso de reconectar usa respuestas reales (de Google, con un token falso).

### Errores míos durante la verificación (sin consecuencias en el producto)

- Mi primera revisión visual no valía: el recorrido de bienvenida de Mario (llegó con la integración) se abre en un navegador de pruebas nuevo y tapaba la pantalla; el script ahora lo salta con su botón "Saltar" (solo afecta al almacenamiento local de mi navegador temporal).
- Lancé el script dos veces seguidas y la segunda tanda sobrescribió las capturas con el estado "revocado" de la cuenta de prueba; las 17 comprobaciones válidas eran las de la primera y las capturas se repitieron limpiamente.

### Sin verificar

- **Con el canal real**: cabecera, totales, "actualizado hace…" y el enlace al canal. Lo puede comprobar Alex en `/creator/metrics/youtube`.
- Táctil real, Safari/Firefox y tablet; lector de pantalla (hay `aria-label` y `title` por tarjeta, pero no se ha probado con uno).
- Comportamiento del botón Actualizar con datos reales (recarga las estadísticas y el estado de la cuenta; probado solo su flujo de error).
- Pendiente de las fases siguientes: selector de periodo y comparación (c.2), vídeos (d), animaciones (f) y observaciones.
- El recorrido de bienvenida de Mario se mostró en cada navegador de pruebas nuevo; es esperable (se recuerda en `localStorage`), pero no he comprobado qué pasa para un usuario real que lo cierra y vuelve.
- Notificaciones de login en la cuenta demo por mis sesiones de prueba (unas 6 en este bloque); sin limpiar.

---

## 2026-10-29 (Alex-19) — [Alex] A-R16: propuesta de estructura del dashboard de YouTube

Solo documentación: `docs/PROPUESTA_A-R16_ESTRUCTURA_DASHBOARD.md`. Alex confirmó que el JSON de `GET /api/social/youtube-analytics` llega bien con su canal real (primera comprobación con datos reales de A-R16b).

La propuesta reutiliza lo existente (gráficos SVG propios con tooltip, `SegmentedTabs`, `StatTile`, `gsap` y su manejo de `prefers-reduced-motion`), **sin dependencias nuevas**; define 8 componentes nuevos en `app/components/youtube/`, 2 composables, el orden de los bloques en escritorio y móvil, los estados de interfaz y 4 fases con su forma de validación. Además propone quitar la evolución de 28 días de `youtube-channel-stats` (la da ya `youtube-analytics`) para no llamar dos veces a la API.

**Sin verificar:** nada está construido. Queda pendiente la aprobación de Alex. Las cuentas demo no tienen canal: el diseño se revisará con respuestas fabricadas y claramente marcadas en el script de navegador (fuera del producto); lo que cuenta es lo que Alex vea con su canal real.

---

## 2026-10-29 (Alex-18) — [Alex] A-R16b: informe de YouTube por periodos (backend, en vivo) y primera cuenta real de Instagram

### Observación: Instagram ya está conectado de verdad

Lectura de solo lectura de la BD: existe una fila de Instagram **verificada (con token) y `connected`**, handle `aalex.06_`, conectada el 2026-10-29 a las 08:32, **con `external_account_id` guardado**. Es la primera conexión real con Meta y confirma, con una cuenta real, que el callback guarda el id de la cuenta (A-R2b). Esto es lo único que he comprobado: **no la he visto en navegador ni he probado su sincronización** (botón "Actualizar", seguidores, renovación de token). El total de filas de `social_accounts` pasa de 16 a 17 por esa fila (no es residuo de pruebas: las mías se borran por handle y quedan 0).

### Qué se cambió (sin interfaz todavía)

- `GET /api/social/youtube-analytics?days=7|28|90|365` (`server/api/social/youtube-analytics.get.ts`, nuevo): totales del periodo, totales del periodo anterior equivalente, comparación y serie día a día, **en vivo** desde la YouTube Analytics API. **No guarda nada nuevo ni toca el esquema.**
- `server/utils/youtube-period.ts` (nuevo, lógica pura): rangos de fechas (el periodo termina hace 2 días por la latencia de Analytics), qué periodos se pueden ofrecer según la edad del canal, lectura de la respuesta de Google **por nombre de columna** y comparación.
- `server/utils/youtube.ts`: `fetchYoutubeAnalyticsReport` genérico.
- Reglas de "no inventar datos": un dato que Google no da es `null` (nunca 0); los días sin fila no se rellenan; un periodo solo se ofrece si el canal ya existía durante todo él (si no, 422 `period_unavailable` con los periodos disponibles); sin porcentaje de variación si el periodo anterior es incompleto o vale 0.
- Si la cuenta ya consta como caducada/revocada/sin permiso responde `reconnect_required` **sin llamar a Google**. Los errores se clasifican y se guardan como en el resto de endpoints de redes. Solo devuelve datos del propio usuario; los tokens no salen del servidor.
- Métricas pedidas (todas del informe "Basic user activity" de Analytics, permiso `yt-analytics.readonly` que ya se pide): vistas, minutos vistos, duración media, % medio visto, me gusta, comentarios, compartidos, suscriptores ganados y perdidos.

### Verificado de verdad

- `youtube-period.spec.ts` (41 tests): rangos (incluido cambio de mes y de año), periodos según edad del canal, totales por nombre de columna, serie sin rellenar huecos, y comparaciones (sin porcentaje con periodo incompleto, con anterior 0 ni con valores desconocidos). El test encontró un fallo real: una fecha de creación inválida lanzaba una excepción (corregido). Suite completa **249/249**, `npx vue-tsc --noEmit` limpio.
- **Contra el servidor y con respuestas reales de Google** (cuenta demo con token falso, filas creadas y borradas): sin sesión -> 401; `days=5/30/0/abc` -> 400; token falso -> 401 `reconnect_required` (`google_invalid_grant`) y la cuenta queda `revoked` en la BD; la segunda llamada responde `reconnect_required` desde el estado guardado (`stored_revoked`) sin llamar a Google; ninguna respuesta contiene el token.
- Primer intento de la prueba fallido por mi script (el servidor recién arrancado no había compilado el login): repetido con espera suficiente.

### Sin verificar

- **Nada de esto se ha ejecutado con un canal real**: el éxito, los nombres de métricas aceptados por Google (podría rechazar alguna combinación), el `publishedAt` del canal, la cobertura de días y los totales no se han visto con datos. Las cuentas demo no tienen canal. **Lo puede probar Alex** abriendo, con la sesión iniciada, `http://localhost:3000/api/social/youtube-analytics?days=28` en el navegador.
- Cuota de la API y latencia real de los datos (la documentación consultada no da cifras).
- Sin interfaz: la estructura del dashboard se propondrá a Alex **antes** de construirla (requisito A-R16).
- `npm run build` no ejecutado en esta entrada (el último, sobre la rama de integración, se completó antes de este cambio).
- Mi servidor de desarrollo se arrancó y se paró para estas pruebas; el de Alex no estaba en marcha.

---

## 2026-10-29 (Alex-17) — [Alex] Rama de integración: trabajo de Alex + trabajo de Mario

### Qué se hizo

Por petición expresa de Alex se mezcló en una **rama nueva, `feature/integracion-alex-mario`**, la rama de Mario (`origin/feature/onboarding`, último commit `eeb515c`) con el trabajo de redes y publicaciones de Alex (`feature/redes-r13-token-crypto`). **No se tocó la rama de Mario ni `main`**, y no se abrió ningún PR. Hasta ahora el plan decía lo contrario ("no fusionar las ramas entre sí"); esta integración es una decisión explícita de Alex y queda registrada aquí.

- Conflictos: **solo en documentación** (`CHANGELOG.md`, `TRABAJO_ALEX.md`, `TRABAJO_MARIO.md`). El código se mezcló sin conflictos, incluido `nuxt.config.ts`.
  - `CHANGELOG.md`: se conservan las dos series de entradas (las de Alex arriba, luego las de Mario 55–58).
  - `TRABAJO_ALEX.md`: versión de Alex (con el registro de migraciones). Mario no la había modificado respecto al original.
  - `TRABAJO_MARIO.md`: versión de Mario. Alex no la había modificado.
- Efecto buscado: el `connect()` antiguo de Mario (insert desde el navegador, que A-R11 hace fallar) queda sustituido por el de A-R10.

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio sobre el resultado de la mezcla.
- `npm test -- --run`: **208/208** (15 archivos; tests de Alex y de Mario juntos).
- `npm run build`: **completado**, ejecutado en una copia temporal (git worktree) para no tumbar el servidor de desarrollo de Alex; la copia se eliminó y `node_modules` quedó intacto.
- Sin marcadores de conflicto en el repositorio.

### Sin verificar

- **No se ha probado la aplicación mezclada en navegador**: ni el recorrido de bienvenida de Mario con las pantallas de Redes de Alex, ni el límite de uso de Mario con los endpoints de Alex. Solo compilación, tipos, tests unitarios y build.
- Tests de integración (Supabase real) no ejecutados sobre la rama mezclada.
- El CI de GitHub Actions de Mario (`.github/workflows/ci.yml`) llega con esta mezcla pero **no se ha ejecutado en GitHub** en esta rama.
- `enforceRateLimit` de Mario existe ya en la rama; el endpoint `sync-all` de Alex sigue usando `checkRateLimit` (sin cambios).
- Las migraciones de Alex (A-R11 y M1) ya están aplicadas en el Supabase compartido: la rama de Mario debe tener claro que ahora `social_accounts` no admite escritura desde el navegador.

---

## 2026-10-28 (Alex-16) — [Alex] Instagram: Meta exige HTTPS en la redirect URI; APP_URL para volver a la app tras el túnel

### Hallazgo (primera prueba real con Meta)

Alex creó la app de Meta (caso de uso "API de Instagram") y al guardar `http://localhost:3000/api/auth/instagram/callback` en "Configura el inicio de sesión de empresa de Instagram" Meta respondió **"Error al guardar los URI de redireccionamiento"**; al intentar conectar, "Invalid redirect_uri". Conclusión: **Meta no acepta `http://localhost`**; hace falta una URL HTTPS (túnel). La documentación consultada no dice nada sobre `http://localhost`, así que es un hallazgo empírico. `docs/9-INSTAGRAM-OAUTH-SETUP.md` sugiere ese caso como alternativa ("si el dashboard obliga a HTTPS…") pero lo presenta como excepción: debe pasar a ser el camino por defecto (A-R14).

### Qué se cambió

- `server/utils/app-url.ts` (nuevo): `appRedirectUrl(appUrl, path)`. Con un túnel el callback llega por el dominio del túnel; con una ruta relativa el navegador se quedaría allí, donde **no existe la sesión** (cookies de localhost). Con `APP_URL` definida, los callbacks de Instagram y YouTube devuelven al usuario a la app real. Solo sale de la configuración del servidor (nunca de la petición); un valor no válido o con otro protocolo se ignora.
- `nuxt.config.ts` y `.env.example`: se añade `appUrl` / `APP_URL` (**sin valor**, opcional). Sin ella el comportamiento es exactamente el de antes (YouTube no cambia).

### Verificado de verdad

- `app-url.spec.ts` (11 tests): sin `APP_URL`, con `APP_URL`, solo el origen, mensajes de error codificados, valores no válidos (`javascript:`, `ftp:`, `data:`, texto) ignorados. `npx vue-tsc --noEmit` limpio.

### Sin verificar

- **Todo el flujo con un túnel real** (ngrok u otro): no hay túnel ni se ha probado desde esta máquina. Posible problema no comprobado: el servidor de desarrollo podría rechazar la cabecera `Host` del túnel ("Blocked request"); si ocurre habría que permitir ese host en `nuxt.config.ts`.
- El nombre exacto de los menús de Meta usados en la guía es el de la interfaz en español que ve Alex; algunos (invitación de tester en Instagram) no están documentados en lo consultado.
- Suite completa y `npm run build`: no ejecutados en esta entrada (servidor de desarrollo de Alex en marcha).

---

## 2026-10-28 (Alex-15) — [Alex] A-R5: endpoint de sincronización programada (sin scheduler) y renovación del token de Instagram

### Qué se cambió

**No se ha configurado ni activado ningún scheduler** (Q3 sigue pendiente): el endpoint existe pero nadie lo llama.

- `server/api/social/sync-all.post.ts` (nuevo): `POST /api/social/sync-all`, independiente del scheduler.
  - Autenticación: `Authorization: Bearer <SYNC_CRON_SECRET>`, comparación en tiempo constante. **Falla cerrado**: sin secreto configurado responde 503 y no hace nada. Intentos con secreto incorrecto: 401, y a partir de 5 en 10 min por IP, 429.
  - Límite de uso: una ejecución por minuto (en memoria: vale para una sola instancia; no es la defensa principal).
  - Ejecuciones simultáneas: cerrojo por cuenta en la BD (`sync_lock_until`, atómico, caduca solo a los 5 min).
  - Idempotencia: solo cuentas verificadas en `connected`, no sincronizadas hace menos de 1 h ni intentadas hace menos de 15 min; lote de 25, las más antiguas primero, 3 a la vez.
  - Respuesta y log: solo recuentos y códigos (sin ids de cuenta ni datos personales).
- `server/utils/sync-batch.ts` (lógica pura), `sync-lease.ts` (cerrojo), `social-sync.ts` (sincronizar UNA cuenta, **compartida** con los botones manuales: no hay dos sistemas).
- **Renovación del token de Instagram** (parte pendiente de A-R2): al sincronizar se renueva si le quedan 14 días o menos y tiene más de 24 h, con `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` (confirmado en la documentación de Meta: token de 60 días, renovable si tiene más de 24 h y no ha caducado). El token nuevo se guarda ANTES de seguir. Con la fecha de caducidad ya superada no se llama a Meta: se registra como caducado.
- `instagram-sync` y `youtube-sync` ahora usan esa lógica compartida y además llevan tiempo máximo (8 s) en las llamadas a Meta.
- `nuxt.config.ts` y `.env.example`: solo se añaden líneas (`syncCronSecret` / `SYNC_CRON_SECRET`, **sin valor**).

### Verificado de verdad

- Unitarios nuevos: `sync-batch.spec.ts` (36: secreto válido/inválido/ausente y fallo cerrado, límites de fechas, decisión de renovar, resumen sin datos personales, concurrencia máxima). `npx vue-tsc --noEmit` limpio. Suite completa (ver abajo).
- **Integración contra el Supabase real** (`social-sync-lease.spec.ts`, 6/6): la primera ejecución toma el cerrojo y la segunda no; con **8 intentos simultáneos solo uno lo gana**; se puede liberar y volver a tomar; un cerrojo caducado se puede tomar; tomarlo no cambia el estado de la cuenta. Limpieza: 0 filas de prueba, 16 en total.
- **Servidor de Alex, sin secreto configurado:** el endpoint responde 503 a una llamada sin cabecera y a otra con una cabecera inventada (falla cerrado).
- **Refactor de los botones manuales verificado en navegador** (Chrome por CDP, tokens falsos con respuestas reales de Meta y Google, filas borradas después): siguen devolviendo "Acceso caducado o revocado" con Reconectar y guardando `expired`/`revoked` en la BD. 7/7 comprobaciones.
- Comprobado (solo lectura) que el canal real de YouTube de Alex NO entraba en el lote de las pruebas (sincronizado hacía 6 min).

### Sin verificar

- **El endpoint con secreto correcto, de principio a fin** (autorización, lote, estado de las cuentas, liberación del cerrojo, 429 por exceso de llamadas): no se ha ejecutado. Para probarlo hace falta `SYNC_CRON_SECRET` en el `.env` (lo pone Alex) y que el servidor de desarrollo lo recoja. No arranqué un segundo servidor porque comparte carpeta con el de Alex.
- **Renovación real del token de Instagram:** necesita la app de Meta; solo hay tests de la decisión (cuándo renovar), no de la llamada.
- Detalle que Meta no documenta en lo consultado: si las 24 h mínimas cuentan desde la emisión o desde la última renovación (con la ventana de 14 días da igual).
- Sin scheduler, sin reintentos con espera creciente (solo el espaciado de 15 min) y sin alertas: pendientes de Q3.
- `npm run build` NO ejecutado: el servidor de desarrollo de Alex está en marcha y el build lo tumba.
- Límite de uso sin la versión de Mario (`enforceRateLimit`, en su rama): se usa el `checkRateLimit` existente.

---

## 2026-10-28 (Alex-14) — [Alex] A-R3: desconexión completa (revoca el acceso en Google antes de borrar)

### Qué se cambió

Antes, "desconectar" solo borraba la fila desde el navegador: el permiso seguía vivo en Google.
- `server/api/social/disconnect.post.ts` (nuevo): el servidor revoca el token en el proveedor y **después** borra la fila. Si no puede **confirmar** la revocación, no borra y responde `revoke_unconfirmed`; solo desconecta con `force` si el usuario lo decide. Idempotente si ya no hay fila.
- `server/utils/token-revoke.ts` (nuevo): `revokeGoogleToken` -> `revoked` (200) / `already_invalid` (400 `invalid_token`) / `unconfirmed` (red, tiempo agotado u otra respuesta: significa "no lo sabemos", nunca se afirma que se revocó).
- Instagram: **sin revocación**; en la referencia consultada de Meta no consta ningún endpoint para revocar un token de Instagram Login. El servidor lo devuelve como `not_supported` y la interfaz lo explica: el acceso se retira desde los ajustes de la cuenta de Instagram.
- Interfaz (`creator/socials.vue`, `useMySocialAccounts.ts`): el diálogo de confirmación dice qué pasará en cada red; tras desconectar se muestra lo que realmente se sabe ("desconectado y acceso revocado en Google" / "el acceso ya no era válido" / "no se pudo confirmar, quítalo a mano en myaccount.google.com/permissions" / limitación de Instagram). Si no se confirma la revocación, un segundo diálogo ofrece reintentar o "Desconectar igualmente".

### Verificado de verdad

- Tests unitarios nuevos `token-revoke.spec.ts` (12) + caso nuevo en `social-api-error.spec.ts`. Suite completa, `npx vue-tsc --noEmit` limpio (resultados abajo).
- **Navegador real (Chrome por CDP) en el servidor de desarrollo de Alex, con tokens falsos en la cuenta demo (creadas y borradas) y llamada REAL a Google:**
  - el diálogo de YouTube avisa de que se revocará el acceso en Google; el de Instagram, de que FEEDMA no puede retirarlo allí;
  - Google respondió **`400 invalid_token`** a la revocación del token falso (confirma el código de error que la documentación consultada no nombraba) y el aviso fue "YouTube desconectado. El acceso ya no era válido en Google.";
  - Instagram: "Instagram desconectado de FEEDMA. FEEDMA no puede retirar el acceso en Instagram…";
  - las filas desaparecieron de la BD (0 restantes; 16 filas en total, como antes). Sin errores de consola.
- Documentación de Google consultada: `POST https://oauth2.googleapis.com/revoke`, parámetro `token` (access o refresh), 200 si se revoca, 400 con código de error si no; la revocación quita los permisos concedidos al proyecto.

### Sin verificar / pendiente

- **Revocación real con un token válido (200):** necesita un canal real. Prueba manual para Alex: desconectar YouTube en Redes (debe decir "acceso revocado en Google"), comprobar que FEEDMA ya no aparece en myaccount.google.com/permissions y volver a conectar.
- **Rama `unconfirmed`:** solo cubierta por tests unitarios con respuestas simuladas; no se ha provocado un fallo real de Google ni de red en el servidor. El segundo diálogo ("Desconectar igualmente") no se ha visto en navegador.
- **`npm run build` NO ejecutado** en esta entrada: el servidor de desarrollo de Alex estaba en marcha y el build lo tumba (comparten carpeta). Pendiente de lanzarlo con el servidor parado.
- El navegador **aún puede borrar su propia fila** (A-R11 mantuvo el permiso de borrado). Para que la desconexión pase siempre por el servidor habría que retirar ese permiso: es otro cambio de permisos de BD, **sin hacer, necesita aprobación**.
- Sin límite de uso en el endpoint (el `enforceRateLimit` de Mario está en su rama, aún no integrado).
- Coordinación con Mario (M-L2, borrado de cuenta): el borrado de cuenta debe revocar también el acceso; falta acordar si reutiliza esta lógica.
- Notificaciones "Has iniciado sesión" nuevas en la cuenta demo del creador (una por sesión de prueba); sin limpiar.

---

## 2026-10-28 (Alex-13) — [Alex] M1 aplicada y verificada; A-R2b: estado de las cuentas guardado y visible

### M1 aplicada

`supabase/migrations/20261028130000_social_accounts_status_columns.sql` **aplicada por Alex** en el Supabase compartido. Registrada en `docs/TRABAJO_ALEX.md`.
- `npx vitest run --config vitest.integration.config.ts tests/integration/social-accounts-status-columns.spec.ts`: **23/23**. Residuo: 0 filas de prueba; 16 filas en total, como antes.
- Primer intento fallido por mi culpa: vitest ejecutó dos archivos de integración a la vez y mi protección ("si el creador demo ya tiene filas de linkedin/x, abortar sin tocar nada") saltó. `vitest.integration.config.ts` ahora usa `fileParallelism: false`: los archivos de integración comparten Supabase y cuentas demo y se pisaban.

### A-R2b: qué se cambió

- `server/utils/social-account-state.ts` (nuevo): qué se guarda tras cada sincronización. Éxito -> `connected`, errores limpios, `last_synced_at`. Fallo que exige reconectar (caducado, revocado, faltan permisos) -> cambia `status`. Fallo temporal o desconocido -> solo `last_error_code`/`last_error_at`, **sin tocar `status`**. Nunca lanza: si no puede guardar, llega el error original al usuario.
- Callbacks OAuth: guardan `external_account_id` (id de la cuenta de Instagram / del canal de YouTube) y `status = connected`. Si esa cuenta ya está conectada a otro creador (índice único), redirigen con un mensaje claro en vez de un error genérico.
- Sync (`instagram-sync`, `youtube-sync`, `youtube-channel-stats`): guardan éxito o fallo. En `youtube-channel-stats`, si solo falla el permiso de analíticas la cuenta queda marcada para reconectar; un fallo pasajero no.
- Interfaz: `useMySocialAccounts` lee `status`, `is_verified` y `last_synced_at`. **Una fila sin token ya no cuenta como conectada** (los datos de demo de Instagram dejan de aparecer como conectados). La fila muestra "Acceso caducado o revocado · reconecta la cuenta" con botón **Reconectar** y sin botón de actualizar; no se duplica el aviso de arriba. La página de Métricas de YouTube no llama a Google si el estado guardado ya dice que hay que reconectar.

### Verificado de verdad

- Unitarios nuevos: `social-account-state.spec.ts` (9). Suite completa **140/140**. `npx vue-tsc --noEmit` limpio. `npm run build` completado.
- **Navegador real (Chrome por CDP) con tokens falsos en la cuenta demo, respuestas reales de Meta y Google** (filas creadas y borradas):
  - Antes: Instagram y YouTube aparecen conectadas. Tras pulsar actualizar, ambas pasan a "Acceso caducado o revocado" con botón Reconectar. La BD guarda `youtube: revoked / google_invalid_grant` e `instagram: expired / meta_190`, con la hora del intento y `last_synced_at` vacío.
  - Tras recargar la página el estado se mantiene (sale de la BD).
  - Métricas de YouTube muestra Reconectar con **0 llamadas** a `youtube-channel-stats`.
  - Una fila de Instagram **sin token y con 99999 seguidores** se muestra "No conectada".
- Limpieza comprobada tras cada escenario: 0 filas de prueba; 16 filas en total.

### Sin verificar / pendiente

- Con una cuenta real: ni el éxito real de `external_account_id` (guardado en los callbacks, nunca ejecutados con credenciales reales aquí) ni el 23505 (misma cuenta en dos creadores) se han ejercitado; solo la unicidad en BD está probada (integración M1).
- `last_synced_at` tras un éxito real no se ha visto: no hay cuenta real con la que hacerlo. Requiere el canal de Alex.
- Descubrir (`discover/search.post.ts`, archivo de Mario) sigue sumando seguidores de todas las filas, incluidas las de demo sin token; ahora se puede filtrar por `is_verified`, pero es un cambio en su archivo (coordinar).
- Renovación automática del token de Instagram y migración de filas existentes (`external_account_id` de la cuenta real de YouTube de Alex queda vacío hasta que reconecte): pendientes.
- Corrección sobre la entrada Alex-11: una de sus comprobaciones automáticas ("sin el texto 'es antigua'") era vacua por un fallo de mi script (una expresión regular se comía letras 's'); lo comprobé a ojo en la captura, que muestra el texto correcto. Esta vez las comprobaciones se hicieron sobre el texto tal cual.
- Notificaciones "Has iniciado sesión" nuevas en la cuenta demo del creador (una por sesión de prueba con login, unas 5 en este bloque); sin limpiar.

---

## 2026-10-28 (Alex-12) — [Alex] M1 (A-R2): migración de columnas de estado escrita, pendiente de aplicar

### Qué se cambió

- `supabase/migrations/20261028130000_social_accounts_status_columns.sql` (**nueva, NO aplicada**): solo **añade** a `social_accounts` las columnas `status` (connected / expired / revoked / missing_permissions, por defecto `connected`), `last_error_code`, `last_error_at`, `last_synced_at`, `last_sync_attempt_at`, `sync_lock_until`, `external_account_id` e `is_verified` (generada: hay token). Índice único parcial `(platform, external_account_id)` para que la misma cuenta del proveedor no esté en dos creadores. Rollback en su cabecera.
- Permisos: solo se concede lectura al navegador de `status`, `last_synced_at`, `last_error_code` e `is_verified`. `last_error_at`, `last_sync_attempt_at`, `sync_lock_until` y `external_account_id` **no** (se mantiene la lista blanca de A-R11). No se toca ninguna policy ni se concede insert/update.
- `tests/integration/social-accounts-status-columns.spec.ts` (nuevo, 23 tests): valores por defecto, columna generada, restricción de `status`, unicidad de la cuenta del proveedor, qué columnas puede y no puede leer el dueño, aislamiento (otro creador, partner) y que el navegador no puede escribir el estado.

### Autorización

Alex aprobó la migración M1 ("adelante"). Se escribe, se prueba y **Alex la aplica** en el SQL Editor (esta máquina no puede conectar a la base de datos). No se ha aplicado.

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio.
- La nueva prueba de integración **sin** la variable de activación: 23 saltados, 0 ejecutados (no escribe en la BD).
- Comprobado por lectura (`git grep`) que ningún código actual usa esos nombres de columna y que las escrituras existentes indican sus columnas de forma explícita, así que la migración no rompe nada. La rama de Mario no tiene migraciones nuevas.

### Sin verificar

- **El SQL no se ha ejecutado contra Postgres** (no hay acceso desde aquí): se valida al aplicarla y con las 23 pruebas.
- Tests de integración: ni antes ni después de aplicar.
- Nada de código usa todavía las columnas nuevas: callbacks (guardar `external_account_id`, `status`), sync (`last_synced_at`, errores) y pantallas (estado persistente, `is_verified`) se implementan **después** de aplicar la migración.

---

## 2026-10-28 (Alex-11) — [Alex] A-R2a: errores de token clasificados, "Reconectar" solo cuando hace falta y logs sin secretos

### Qué se cambió

Primera mitad de A-R2 (la que **no necesita cambios en Supabase**). Hasta ahora cualquier fallo de la API de Instagram o YouTube acababa en un mensaje genérico ("si la conexión es antigua, reconecta"), igual para un token revocado que para un corte de red.

- `server/utils/social-errors.ts` (nuevo): `classifyProviderError` distingue **caducado / revocado / faltan permisos / el usuario debe actuar en el proveedor / temporal / desconocido**. Códigos de Meta contrastados con su documentación oficial de errores (190 y subcódigos 458/460/463/467, 459/464, 10 y 200–299, 4/17/32/613, 1/2); Google: `invalid_grant`, motivos de permisos y de cuota. `toSocialHttpError` devuelve al navegador un mensaje seguro y un `data.code` estable (`reconnect_required`, `provider_temporarily_unavailable`…).
- Endpoints `instagram-sync`, `youtube-sync` y `youtube-channel-stats` usan el clasificador. `youtube-channel-stats` añade `evolutionIssue` (`reconnect` / `temporary` / `null`) para no confundir "falta permiso" con "fallo pasajero".
- Interfaz (`creator/socials.vue`, `creator/metrics/[platform].vue`, `app/utils/social-api-error.ts`): el botón **"Reconectar"** aparece solo si el servidor dice que hace falta; un fallo temporal dice "no hace falta reconectar, inténtalo más tarde".
- **Fallo de seguridad corregido:** los `console.error(err)` de los dos endpoints de sync, `youtube-channel-stats` y los dos callbacks de OAuth volcaban el error completo; un `FetchError` incluye la URL con `access_token` y, en Instagram, `client_secret` en la query, que acababan en los logs del servidor. Ahora se registra un resumen saneado (`describeErrorForLog`/`redactSecrets`).

### Verificado de verdad

- Tests unitarios nuevos: `social-errors.spec.ts` (44) y `social-api-error.spec.ts` (13). Suite completa: **131/131**. `npx vue-tsc --noEmit` limpio. `npm run build` completado.
- **Prueba de principio a fin con respuestas reales de los proveedores, sin cuentas reales:** con la cuenta demo del creador y filas con **tokens falsos** (creadas y borradas después), Instagram respondió con su error real 190 y Google con `invalid_grant`:
  - `POST /api/social/instagram-sync` → 401 `reconnect_required` (`expired/meta_190`);
  - `POST /api/social/youtube-sync` → 401 `reconnect_required` (`revoked/google_invalid_grant`);
  - `GET /api/social/youtube-channel-stats` → 401 `reconnect_required`;
  - ningún mensaje contiene el token.
- En navegador real (Chrome por CDP, 1280 px): Redes muestra "El acceso a Instagram ha caducado o se ha revocado. Reconecta la cuenta." con botón **Reconectar**; Métricas de YouTube muestra el aviso y **Reconectar YouTube**, ya sin el texto "si la conexión es antigua". Capturas revisadas.
- De paso: la pantalla de Redes cargó las filas con la migración de A-R11 aplicada (lectura por columnas permitidas).
- Limpieza comprobada: 0 filas de prueba y 16 filas en total, las mismas que antes.

### Sin verificar

- **Estado persistente:** nada de esto se guarda todavía (no hay columnas `status`/`last_error_code`); el aviso aparece al intentar sincronizar o abrir Métricas, no antes. Es la segunda mitad de A-R2, que **depende de aprobar la migración M1** de la propuesta de esquema.
- **Renovación automática del token de Instagram (~60 días):** sin implementar; el diseño está en `PROPUESTA_A-R5_SYNC_ENDPOINT.md` y necesita la app de Meta para probarse.
- Casos reales no ejercitados: faltan permisos de Google (403), cuota agotada, corte de red y errores 459/464 de Meta: solo cubiertos por tests unitarios con errores simulados.
- Subcódigo exacto de Instagram: el token falso devolvió 190 **sin subcódigo** (`meta_190`), clasificado como caducado; no se puede distinguir caducado de revocado en ese caso.
- No se pulsó "Reconectar" (inicia OAuth). Safari/Firefox/táctil: no probados.
- Mi servidor de desarrollo se arrancó y se detuvo durante esta prueba; el que tenía Alex en el puerto 3000 se había caído antes (probablemente tras un `npm run build`, que comparte carpeta con el modo desarrollo).
- 2 notificaciones de login más en la cuenta demo del creador (una por cada sesión de prueba con login); sin limpiar.

---

## 2026-10-28 (Alex-10) — [Alex] A-R11 aplicada y verificada

### Qué se cambió

`supabase/migrations/20261028120000_social_accounts_lockdown.sql` **aplicada por Alex** en el Supabase compartido (SQL Editor), con la aceptación de Mario. Registrada en `docs/TRABAJO_ALEX.md`.

### Verificado de verdad

- `RUN_SOCIAL_ACCOUNTS_RLS=1 npx vitest run --config vitest.integration.config.ts tests/integration/social-accounts-rls.spec.ts`: **16/16 pasan** (antes de la migración, 8 fallaban). Un creador ya no puede leer `access_token_encrypted`, `refresh_token_encrypted` ni `token_expires_at`, ni insertar cuentas, ni cambiar `followers_count` ni el token; el aislamiento entre usuarios, la RPC pública y el borrado propio siguen funcionando.
- Limpieza comprobada: 0 filas de prueba y 16 filas en total, las mismas que antes.

### Sin verificar

- No he ejecutado el resto de la suite de integración ni mirado Redes/Métricas/perfil público en navegador tras la migración. Cubre la lectura con columnas explícitas el test de integración; la comprobación visual con una cuenta que tenga redes reales (la de Alex, con YouTube) queda para Alex.
- Las filas demo sin token siguen existiendo y siguen contando en Descubrir (se resuelve con `is_verified`, propuesta de esquema).
- El `connect()` antiguo de la rama de Mario fallará con "permission denied" hasta que integre `main` con A-R10.

---

## 2026-10-28 (Alex-9) — [Alex] A-P1 (P1-a y P1-b): arrastre real verificado, un fallo real corregido y estado vacío con acción

### Qué se cambió

`app/components/timeline/PhaseBoard.vue` (único archivo de código):
1. **Fallo corregido:** si el guardado de un arrastre fallaba (p. ej. sin red), la card se quitaba de la columna destino y confiaba en `refresh()` para recolocarla; sin red `refresh()` también falla, así que **la card desaparecía del tablero hasta recargar la página** (el servidor no había cambiado). Ahora se devuelve a su columna de origen antes de refrescar.
2. **P1-b:** el estado vacío "Ningún resultado con estos filtros" ahora tiene el botón **"Quitar filtros"** (antes solo decía que quitaras los filtros). Nueva función `clearFilters()`.

### Cómo se verificó

Chrome real en modo sin pantalla manejado por su protocolo de depuración desde un script de Node sin dependencias (fuera del repositorio), contra el servidor de desarrollo, con la cuenta demo `creator@feedma.test`. El arrastre usa los eventos de ratón reales de `vuedraggable` (`force-fallback`). Se creó **una** publicación de prueba ("A-P1 prueba - borrar") con la service role y se **borró al terminar**.

### Verificado de verdad

- **Antes del arreglo:** 10 de 11 comprobaciones OK; fallaba solo la de "sin red": la card desaparecía (confirmado en captura).
- **Tras el arreglo:** 11/11 OK:
  - arrastre real Idea → En producción cambia la card de columna y **persiste tras recargar**;
  - arrastre sin red: la card se queda en su columna y, al recuperar la red y recargar, coincide con el servidor (el estado del servidor no cambió);
  - filtro sin resultados muestra el estado vacío (escritorio);
  - móvil (390 px): 5 columnas, la vacía "Programado" plegada, sin desbordamiento horizontal;
  - móvil: el selector de fase mueve la card a una columna plegada;
  - móvil: arrastrar hacia una columna plegada no pierde ni rompe la card (se queda donde estaba).
- Nuevo botón "Quitar filtros": aparece y, al pulsarlo, vuelven las 4 cards y se vacía el buscador (sin errores de consola).
- `npx vue-tsc --noEmit` limpio; `npm test -- --run` 74/74; `npm run build` completado.
- Limpieza comprobada: 0 publicaciones de prueba restantes; el creador demo conserva sus 3 publicaciones con el mismo estado que antes.

### Sin verificar

- No hay test automatizado del componente (el proyecto no tiene pruebas de componentes Vue): la verificación fue en navegador.
- El aviso de "saltarte la revisión del partner" al arrastrar no se probó (requiere una publicación ligada a una colaboración activa).
- Arrastre con puntero táctil real, Safari/Firefox y tablet: no probados (solo Chromium con ratón, 1280 y 390 px).
- P1-b: del resto de estados vacíos (sin publicaciones, Calendario) solo se revisaron los textos por código; no se ha encontrado nada que corregir sin ver el estado vacío real, que la cuenta demo no tiene.
- P1-c y P1-d (textos de contexto, `aria-label`): no solicitados, sin hacer.

### Efecto sobre datos reales

Cada inicio de sesión de las pruebas generó una notificación "Has iniciado sesión" en la cuenta demo del creador (4 mías: una en la verificación de A-R10 y tres en las de A-P1). Hay 25 en las últimas 3 horas en total; no he borrado ninguna.

---

## 2026-10-28 (Alex-8) — [Alex] Requisito A-R16: dashboard de analítica de YouTube incorporado al plan

### Qué se cambió

Solo documentación; **sin código, esquema ni permisos**:
- `docs/REQUISITO_A-R16_DASHBOARD_YOUTUBE.md` (nuevo): encaje en el pipeline (A-R16a–f), auditoría de lo que existe frente al requisito, catálogo de métricas viables, qué depende de qué y riesgos.
- `docs/PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md`: `social_account_snapshots` guarda ahora también `views_total` y `videos_count` (nulables) y `followers_count` pasa a nulable.
- `PIPELINE_IMPLEMENTACION_FEEDMA_ALEX.md`: nota sobre A-R16 en el anexo.

### Hallazgos (de leer el código y la documentación de YouTube)

- Los periodos de 7, 28, 90 y 365 días y la comparación con el periodo anterior se pueden pedir **en vivo** a la YouTube Analytics API (conserva el histórico por fecha): **no requieren migración**. Solo el histórico de acumulados (suscriptores/vistas totales por día) necesita almacenamiento propio.
- Hoy un `likeCount`/`commentCount` ausente (likes ocultos, comentarios desactivados) se muestra como **0** (`?? 0` en `youtube-channel-stats.get.ts`): contradice el principio del requisito de no tratar lo desconocido como cero. Sin corregir todavía.
- La proyección a 30 días de la pantalla actual es una extrapolación de FEEDMA, no un dato de YouTube; debe etiquetarse como estimación o retirarse.
- Impresiones y CTR de miniaturas **no figuran** en la documentación de métricas consultada: no se prometen.

### Verificado de verdad

- Lectura de `youtube-channel-stats.get.ts`, `youtube.ts`, `metrics/[platform].vue` y `components/charts`; consulta de la documentación oficial de métricas de YouTube Analytics.

### Sin verificar

- Todo el catálogo de métricas con un canal real (la validación necesita el canal de Alex).
- Cuotas de las APIs, latencia de Analytics y si el banner del canal se devuelve con el permiso actual.

---

## 2026-10-28 (Alex-7) — [Alex] A-R11: migración escrita, pruebas de "antes" ejecutadas; pendiente de aplicar

### Qué se cambió

- `supabase/migrations/20261028120000_social_accounts_lockdown.sql` (**nueva, NO aplicada**): quita insert/update de `social_accounts` al navegador, concede lectura solo de `id, creator_id, platform, handle, followers_count, connected_at`, mantiene el borrado propio. Lleva el rollback documentado en su cabecera.
- Rollback corregido en `docs/PROPUESTA_A-R11_SEGURIDAD_SOCIAL_ACCOUNTS.md`: ahora es `grant all` (la versión anterior omitía `REFERENCES`, `TRUNCATE` y `TRIGGER`).

### Autorización y verificación previa

- Autorizada por Alex; Mario ha aceptado la propuesta (según Alex).
- Consulta de solo lectura ejecutada por Alex en el SQL Editor: `anon` y `authenticated` con `SELECT`, `INSERT`, `UPDATE` y `REFERENCES` en las 9 columnas = privilegios por defecto de Supabase, como se suponía.

### Verificado de verdad: el hueco existe (pruebas ANTES de la migración)

`RUN_SOCIAL_ACCOUNTS_RLS=1 npx vitest run --config vitest.integration.config.ts tests/integration/social-accounts-rls.spec.ts` → **8 fallan, 8 pasan**. Con una cuenta demo de creador, contra el Supabase real:
- se pudieron leer `access_token_encrypted`, `refresh_token_encrypted` y `token_expires_at`;
- se pudo insertar una cuenta de Facebook con token falso, y la RPC pública `get_public_social_accounts` la devolvió como verificada;
- se pudo cambiar `followers_count` a 999999 y cambiar el token de una fila.

Los 8 que pasan son los de aislamiento entre usuarios y borrado (comportamiento que no cambia). Limpieza comprobada con consulta de solo lectura: 0 filas de prueba restantes y 16 filas en total, las mismas que antes.

### Sin verificar / pendiente

- **La migración no está aplicada.** No fue posible aplicarla desde esta máquina: la conexión directa a la base de datos no resuelve desde aquí. Debe aplicarla Alex en el SQL Editor (mismo camino que las anteriores).
- Las pruebas de "después" (deben pasar las 16) y la comprobación en navegador de Redes, Métricas y perfil público, tras aplicarla.
- Registro en "Registro de migraciones" de `TRABAJO_ALEX.md`: pendiente hasta confirmar que se aplicó.

### Incidente de seguridad (sin impacto externo conocido)

Un comando mío imprimió la `SUPABASE_DB_URL`, con la contraseña de la base de datos, en la salida de mi sesión. No se ha guardado en ningún archivo, commit ni documento. Recomendado: restablecer la contraseña de la base de datos en Supabase y actualizar `.env`.

---

## 2026-10-28 (Alex-6) — [Alex] A-R10 verificado en navegador (cuenta demo del creador)

### Cómo se verificó

Chrome real en modo sin pantalla, manejado por su protocolo de depuración desde un script de Node **sin instalar dependencias** (el script no está en el repositorio). Una sesión con `creator@feedma.test` contra el servidor de desarrollo en `localhost:3000`, solo lectura. Capturas revisadas a 1280 y 390 px.

### Verificado de verdad

- `/creator/socials`: TikTok, X, Facebook y LinkedIn muestran "Próximamente · todavía no se puede conectar" y una etiqueta "Próximamente", **sin botón de conectar**. YouTube e Instagram muestran "No conectada" y su botón "Conectar". Igual a 1280 y a 390 px, sin desbordamiento horizontal.
- `/creator/metrics/tiktok`: "TikTok: próximamente — Todavía no se puede conectar esta red, así que no hay estadísticas que mostrar".
- `/creator/metrics`: carga sin errores; sin red conectada muestra el estado vacío con el ejemplo ya existente.
- Sin errores de consola en ninguna de las páginas.

### Efecto sobre datos reales

El login generó **1 notificación** "Has iniciado sesión" en la cuenta demo del creador (comprobado con una consulta de solo lectura). No se modificó ni borró nada más. No se ha limpiado: queda a criterio de Alex y Mario junto con las demás.

### Sin verificar

- **Filas antiguas existentes:** el creador demo no tiene filas en `social_accounts`, así que no se vio cómo se muestran las ya existentes. Se intentó con un creador de demo con Instagram (sin token) y TikTok antiguo, pero el login falló (se quedó en `/login`, causa desconocida; no se reintentó para no gastar el límite de autenticación compartido). Por lectura del código: la fila antigua de TikTok se ignora, y la de Instagram sin token **seguirá apareciendo como conectada** (limitación conocida, se resuelve con `is_verified`).
- No se pulsó "Conectar" (iniciaría OAuth; Instagram daría error porque falta la configuración de Meta).
- No se probó en Safari/Firefox ni tablet.
- La imagen de portada de Redes salió en blanco en el modo sin pantalla (probablemente carga diferida o de imagen); no es de este cambio y no se ha investigado.
- A-P1 (arrastre real y estados vacíos) sigue sin verificar en navegador.

---

## 2026-10-28 (Alex-5) — [Alex] A-R9 auditada, A-R11 consolidada con pruebas preparadas y datos por proveedor

### Qué se cambió

- `docs/AUDITORIA_A-R9_PREDICCION.md` (nuevo): la predicción es heurística de forma + nota de un LLM (solo si hay clave y responde); **no usa histórico real** ni lee `metrics`. Sin cambios de comportamiento.
- `docs/PROPUESTA_A-R11_SEGURIDAD_SOCIAL_ACCOUNTS.md` (reescrito, versión 2): problema, solución, SQL definitivo, rollback, consulta de solo lectura con tabla de interpretación, riesgos, procedimiento y aviso para Mario. Nada aplicado.
- `tests/integration/social-accounts-rls.spec.ts` (nuevo, 16 tests): preparado y **no ejecutado contra la BD**. Requiere `RUN_SOCIAL_ACCOUNTS_RLS=1`; solo toca filas propias (handle `a-r11-test`, plataformas linkedin/x) y aborta si el creador demo ya tiene filas de esas plataformas.
- `docs/PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md`: nueva sección 2b, métricas de cuenta frente a métricas de publicación y qué ofrece cada proveedor (contrastado con la documentación oficial de Meta y Google).
- `docs/PROPUESTA_A-P1_ALCANCE_PUBLICACIONES.md`: sección de herramientas de navegador actualizada (no hace falta instalar nada).

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 74/74 (tras el merge de `main`).
- `npx vitest run --config vitest.integration.config.ts tests/integration/social-accounts-rls.spec.ts` **sin** la variable de activación: 16 saltados, 0 ejecutados (comprobado que no escribe en la BD).
- Documentación de Meta (media insights) y de Google (YouTube Analytics, informes de canal) consultada el 2026-10-28.

### Sin verificar / pendiente

- Las pruebas de integración de A-R11 no se han ejecutado, ni antes ni después de la migración; la migración no está escrita en `supabase/migrations/` ni aplicada.
- Los privilegios reales de `social_accounts` siguen sin comprobarse (consulta pendiente de ejecutar por Alex).
- Nada de lo documentado sobre Instagram se ha probado con una cuenta real (bloqueado). YouTube: latencia de datos sin confirmar.
- A-R10 sigue sin verlo en navegador.

---

## 2026-10-28 (Alex-4) — [Alex] Propuestas de diseño (A-R11 ampliada, esquema A-R2/R7/R8, endpoint A-R5, alcance A-P1) y revisión de configuración OAuth

### Qué se cambió

Solo documentación nueva en `docs/`; **ningún código, migración, RLS ni RPC**:
- `PROPUESTA_A-R11_SEGURIDAD_SOCIAL_ACCOUNTS.md`: cierra la falsificación de cuentas "verificadas" y de seguidores, y la lectura de tokens desde el navegador. SQL en borrador dentro del documento (no en `supabase/migrations/`), con rollback y plan de pruebas.
- `PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md`: estado de cuentas, vínculo publicación↔contenido externo y métricas. Propone partir A-R8 (cuenta primero, publicación después de A-R7) porque las métricas por publicación necesitan el vínculo.
- `PROPUESTA_A-R5_SYNC_ENDPOINT.md`: endpoint independiente del scheduler (secreto, límite de uso, cerrojo en BD). No activa nada.
- `PROPUESTA_A-P1_ALCANCE_PUBLICACIONES.md`: alcance reconstruido desde el CHANGELOG y el código.

### Hallazgos nuevos (de leer el código)

- Los callbacks de OAuth descartan el id de la cuenta en el proveedor: sin él, A-R4 no puede localizar la fila cuando Meta desautoriza y no se puede impedir que una misma cuenta de Instagram se conecte a dos creadores.
- `metrics` guarda ceros por defecto: no distingue "0" de "no disponible".
- La rama de Mario conserva el `connect()` antiguo con `insert` desde el navegador; fallaría si se aplica A-R11 antes de que integre `main`.

### Configuración OAuth (Q5), comprobada sin mostrar valores

- Instagram: `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` **vacías/ausentes**; `INSTAGRAM_REDIRECT_URI` definida (localhost:3000). El flujo de Instagram no puede ejecutarse hoy → **bloqueado** (hace falta cuenta de Facebook, app de Meta con el producto Instagram, cuenta profesional de Instagram y rol de tester).
- YouTube: client id, secret y redirect (localhost:3000) **definidos**; `SOCIAL_TOKEN_ENCRYPTION_KEY` definida y decodifica a 32 bytes. **No verificable desde aquí:** que las credenciales sean válidas, que las dos APIs (Data v3 y Analytics) estén habilitadas, el estado de publicación de la app de Google (en modo Prueba solo conectan los usuarios de prueba, y Google puede caducar los refresh tokens en ese modo: confirmar en su documentación) y la pantalla de consentimiento. Requiere acceso a Google Cloud Console y una cuenta con canal de YouTube.
- Una consulta de solo lectura confirmó 0 filas de Instagram con token en la BD compartida.

### Verificado de verdad

- Lectura de código y migraciones en ambas ramas (`git grep`); comprobación de presencia de variables de entorno.
- No se ha ejecutado ninguna prueba nueva (no hay código nuevo). Los privilegios reales de `social_accounts` en Supabase **no se han podido comprobar**; la propuesta A-R11 incluye la consulta de solo lectura para hacerlo.

### Sin verificar

- Todo el SQL de las propuestas: ninguno probado contra Postgres.
- Un detalle de PostgREST/Postgres a confirmar antes de aplicar A-R11: que `delete … where creator_id = …` siga funcionando con permiso de lectura solo por columnas.

---

## 2026-10-28 (Alex-3) — [Alex] A-R10: se retiran las conexiones falsas de TikTok, X, Facebook y LinkedIn

### Qué se cambió

Decisión Q4: esas cuatro redes se muestran como **"Próximamente"** y ya no se pueden "conectar".
- `useMySocialAccounts.ts`: `connect()` ya no inserta desde el navegador una fila sin token para redes sin OAuth; `merge()` ignora cualquier fila antigua de esas redes (no cuenta como conectada).
- `mock-data.ts`: nuevo `isComingSoonPlatform()`; el estado de una cuenta pasa de tres valores (`unverified` desaparece) a `connected`/`disconnected`.
- `SocialAccountRow.vue`, `PlatformStatCard.vue`, `creator/socials.vue`, `creator/metrics/[platform].vue`: etiqueta "Próximamente", sin botón de conectar, sin el diálogo "Conectar igualmente".
- Test nuevo `tests/unit/social-platforms.spec.ts` (7 tests).

### Datos existentes (consulta de solo lectura, sin borrar nada)

Recuento de `social_accounts` en el proyecto compartido (sin leer tokens ni handles): instagram 8 filas (0 con token), youtube 4 (1 con token), tiktok 4 (0 con token), x/facebook/linkedin 0. Todas las filas sin token tienen `followers_count > 0`, lo que apunta a datos de demo/seed. **No se ha borrado ninguna fila**; el criterio de limpieza queda pendiente de decisión.

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 74/74. `npm run build`: completado.

### Sin verificar / pendiente

- **No visto en navegador** (390 px ni escritorio): pasos manuales en `/creator/socials` y `/creator/metrics`: TikTok/X/Facebook/LinkedIn muestran "Próximamente" y ningún botón; Instagram y YouTube siguen igual.
- Las 8 filas de Instagram sin token siguen apareciendo como "conectadas" en la interfaz del creador: la interfaz decide por plataforma, no por token (el navegador no debe leer el token). Se resuelve con la propuesta de A-R11 (necesita un campo seguro de "verificada").
- `discover/search.post.ts` sigue sumando `followers_count` de todas las filas, incluidas las de demo y TikTok. Es de la zona A-R11 y de Mario (M-U1): sin cambios.
- Los insert/update del navegador siguen permitidos por RLS: no se ha tocado Supabase.

---

## 2026-10-28 (Alex-2) — [Alex] A-R13b: tests unitarios de `oauth-state`

### Qué se cambió

Archivo nuevo `tests/unit/oauth-state.spec.ts` (17 tests). Sin cambios en código de producción. Cubre: ida y vuelta del `creatorId`; nonce distinto en cada estado; caducidad con temporizadores simulados (válido a los 10 min − 1 ms, inválido a +1 ms); firma con otra clave, `creatorId` o `exp` manipulados sin refirmar, y firma alterada; formatos inválidos (vacío, sin separador, sin firma, sin payload, basura, payload firmado que no es JSON, `creatorId` no string).

### Hallazgo documentado por un test (no corregido)

El `state` **no es de un solo uso**: el mismo valor sigue verificándose varias veces dentro de la ventana de 10 min. Un test lo deja registrado como limitación conocida. Evitarlo exige un registro de nonces (almacenamiento nuevo), así que queda pendiente de decisión y no se ha tocado código.

### Verificado de verdad

- `npx vitest run tests/unit/oauth-state.spec.ts`: 17/17.
- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 67/67.

### Sin verificar

- Integración de RLS de `social_accounts` (resto de A-R13): espera a la propuesta de A-R11.

---

## 2026-10-28 (Alex-1) — [Alex] A-R13a: tests unitarios de `token-crypto`

### Qué se cambió

Archivo nuevo `tests/unit/token-crypto.spec.ts` (20 tests). No se ha tocado código de producción. Las claves se generan al vuelo en cada ejecución; no hay secretos reales.

Cubre: ida y vuelta (ascii, unicode, 5000 caracteres, cadena vacía); IV aleatorio (dos cifrados del mismo texto difieren y ambos descifran); formato del paquete (iv 12 + tag 16 + texto, base64, sin texto en claro); claves inválidas (vacía, 16 bytes, 33 bytes, no base64) en cifrar y descifrar, sin que el mensaje de error repita la clave; descifrar con otra clave válida; byte alterado en iv, tag y texto cifrado; paquete truncado; entradas vacías, más cortas que iv + tag y que no son un paquete.

### Verificado de verdad

- `npx vitest run tests/unit/token-crypto.spec.ts`: 20/20.
- `npx vue-tsc --noEmit`: limpio.
- `npm test -- --run`: 50/50 (los 30 anteriores + los 20 nuevos).

### Sin verificar

- `npm run build` no se ha ejecutado (solo se añade un archivo de test). Tests de integración: no aplican.
- No se ha hecho un test de mutación (romper a propósito `token-crypto.ts` para ver que los tests fallan); los tests de alteración de iv/tag/texto sí dependen de que GCM valide el tag de verdad.
- Pendiente de A-R13: `oauth-state` y la integración de RLS de `social_accounts` (esta última espera a A-R11).

---

## 2026-10-28 (58) — [Mario] M-N2 ("Visto" en el chat) y M-U1 (Descubrir verificado)

### M-N2 — "Visto" bajo tu último mensaje

- Se deriva de `last_read_at` de la conversación, **sin columnas nuevas ni migración** (opción preferida en Q9). `useChat.ts` expone `otherLastReadAt`; `chat/[id].vue` marca el último mensaje propio leído por la otra persona y `MessageBubble.vue` pinta "✓✓ Visto".
- `chat/[id].vue` refresca ese dato cada 15 s mientras está abierto (no hay Realtime sobre `conversations`; activarlo sería un cambio en Supabase).
- **Limitaciones:** granularidad de conversación, no por mensaje; no hay estado "entregado" separado de "enviado".
- Verificado en navegador (390px) con las dos cuentas demo, solo lectura: sale "Visto" bajo el último mensaje propio ya leído y no sale donde no corresponde; sin errores de página. Sin verificar: el refresco en vivo con dos sesiones a la vez (habría que escribir mensajes de prueba).

### M-U1 — Descubrir

Verificado en navegador (390px, sin desbordes ni errores): `/creator/discover` (10 marcas) y `/partner/discover` (11 creadores) cargan, `POST /api/discover/search` devuelve 200 en los dos sentidos y la búsqueda con IA ("marcas de música o educación, 100 a 300 €") devolvió resultados ordenados con SoundWave Academy primero. La migración de Discovery está aplicada en el proyecto real (el endpoint escribe en `discovery_searches` sin error). Sin verificar: calidad de las explicaciones de la IA y el modo Filtros con combinaciones concretas.

---

## 2026-10-28 (57) — [Mario] M-S1, M-S2, M-S3, M-N1, M-O1: límite de uso, auditoría de admin, roles, avisos agrupados y recorrido de bienvenida

Todo verificado con un navegador real (Chromium de Playwright, instalado fuera del proyecto) contra el servidor de desarrollo y las cuentas demo.

### M-S3 — Acceso cruzado entre roles (sin cambios de código)

Matriz probada con clics reales en `/creator`, `/creator/requests`, `/creator/profile`, `/partner`, `/partner/requests`, `/partner/profile`, `/inbox`, `/chat`, `/favorites`, `/privacidad`, `/admin`:
- **Anónimo:** todas las rutas privadas → `/login`; `/privacidad` pública; `/admin` → `/admin/login`.
- **Creador:** sus rutas abren; `/partner/*` → `/creator`.
- **Partner:** sus rutas abren; `/creator/*` → `/partner`.
- `/admin` no se abre con una cuenta normal (→ `/admin/login`).
Sin fallos. Sin verificar: la protección a nivel de API/RLS (esto solo cubre la navegación).

### M-S1 — Límite de uso

- `server/utils/rate-limit.ts`: nuevo `enforceRateLimit(event, clave, max, ventana)`, que responde 429 con `Retry-After`. 3 tests unitarios nuevos.
- Aplicado a `POST /api/ml/predict` (10/min por usuario, llama al LLM) y `POST /api/discover/search` (20/min por usuario). En `search.post.ts` solo se añadió la línea del límite, la consulta no se tocó.
- **Límite del enfoque (Q3):** el contador vive en memoria de un proceso; con varias instancias o un reinicio no es estricto. Además, el alta de cuentas, las solicitudes y los reportes van **directos de navegador a Supabase**, no por el servidor, así que este límite no los cubre: eso requiere reglas en Supabase o un endpoint intermedio (pendiente).
- Sin verificar: el 429 de `predict`/`search` no se probó contra el endpoint real (requiere sesión + datos); sí está probado por unidad.

### M-S2 — Auditoría del panel de admin

Hallazgos corregidos (verificados en navegador):
1. **Recargar `/admin` o abrirlo por URL directa siempre mandaba al login** (y luego a una pantalla de error): las lecturas se hacían con `$fetch`, que en el render del servidor no reenvía la cookie. Corregido con `useRequestFetch()` en `app/pages/admin/index.vue`. Tras el arreglo: recarga conserva la sesión y las 4 pestañas cargan (Usuarios, Actividad, Analíticas, Reportes).
2. **El límite de login se saltaba falsificando `X-Forwarded-For`**: 10 intentos con cabeceras distintas → todos 401, sin 429. Añadido un tope global (40/10 min) además del de IP. Verificado: tras 40 intentos, 429. Coste asumido: alguien podría bloquear el login de admin unos minutos.
3. `block.post.ts`: sin cuerpo daba un 500; ahora valida `id` (uuid) y `banned` (400).
Comprobado: las 6 rutas GET y las 2 POST de `/api/admin/*` devuelven 401 sin sesión.

**Pendiente / sin corregir (decisión tuya):**
- Los inicios de sesión correctos también cuentan para el límite de 8 por IP (8 entradas en 10 min bastan para bloquearte).
- `grant-pro` (toca la suscripción, zona Stripe): si el creador ya tiene Pro de pago, el upsert pone `stripe_subscription_id` a null y lo desvincula de Stripe; y pulsarlo dos veces suma créditos dos veces. Revisar en M-D2.
- No hay registro de qué hace el admin (bloquear, regalar Pro); la contraseña es única y compartida.
- `users.get` no pagina (1000 máx.). `clientIp` se fía de `X-Forwarded-For`: configurar proxy de confianza según dónde se despliegue (Q3).
- Sin verificar: aspecto del panel a 390px (el límite de login lo impidió; pendiente).

### M-N1 — Avisos agrupados

`groupNotifications` (`app/utils/notifications.ts`) agrupa avisos idénticos (tipo, título, texto y destino) con contador ×N; leídos y no leídos no se mezclan; abrir uno marca todo el grupo. Solo cliente, sin tocar la base de datos. 5 tests unitarios. Visto en el navegador: "Nueva solicitud de colaboración ×17", "Has iniciado sesión ×20".

### M-O1 — Recorrido de bienvenida

- `app/utils/onboarding-steps.ts` (textos por rol, 5 pasos cada uno), `app/composables/useOnboardingTour.ts`, `app/components/onboarding/OnboardingTour.vue`, montado en `AppShell.vue`. Botón "Ver el recorrido de bienvenida" en Perfil → Cuenta de los dos roles.
- Progreso en `localStorage` por usuario (Q1, primera versión): **en otro navegador o dispositivo volvería a salir una vez**; si molesta, pasar a columna en `profiles`.
- Verificado en navegador (390px), creador y partner: sale en la primera entrada; recorre 5 pasos; "Saltar" lo cierra y no vuelve tras recargar ni tras cerrar sesión y volver a entrar; el botón del perfil lo reabre; Escape cierra; sin errores de página.
- Sin verificar: lector de pantalla; probado con las cuentas demo (con `localStorage` limpio), no con cuentas nuevas creadas por `/onboarding`.

### Residuos de prueba

Las pruebas dejaron ~25 avisos "Has iniciado sesión" en las cuentas demo (por eso salen agrupados ×20).

---

## 2026-10-28 (56) — [Mario] M-F2: CI básico con GitHub Actions

### Qué se cambió

- `.github/workflows/ci.yml` (nuevo): en cada PR y push a `main` ejecuta `npm ci`, `vue-tsc --noEmit`, `npm test -- --run` y `npm run build` (Node 24). Los tests de integración quedan **fuera** a propósito (escriben en el Supabase compartido); se lanzan a mano. La build usa valores de relleno de Supabase, sin secretos.

### Verificado de verdad

- Los mismos tres pasos pasan en local; la build también pasa en una copia limpia del commit **sin `.env`** y solo con las tres variables de relleno, que es lo que verá el runner.

### Sin verificar

- **El workflow no se ha ejecutado en GitHub** (aún no hay credenciales para hacer push desde este equipo). Criterio de M-F2 pendiente: que corra en un PR de prueba.

---

## 2026-10-28 (55) — [Mario] M-L1: páginas públicas de privacidad y términos (plantilla por rellenar)

Primera tarea de `docs/TRABAJO_MARIO.md`. Desbloquea A-R4 de Alex (Meta exige una URL pública de privacidad). **El texto es una plantilla**: no se conocen todavía los datos del responsable.

### Qué se cambió

- `app/utils/legal.ts` (nuevo): único sitio con los datos del responsable (titular, NIF, domicilio, email, jurisdicción, plazo de conservación fiscal, comisión, fecha). Todos son `[POR COMPLETAR: …]`; `legalHasPlaceholders` indica si queda alguno.
- `app/components/legal/LegalDocument.vue` y `LegalValue.vue` (nuevos): plantilla de página y marcado en amarillo de cada hueco. Mientras quede algún hueco, la página muestra un aviso de "Borrador pendiente de completar"; desaparece solo al rellenarlos todos.
- `app/pages/privacidad.vue` y `app/pages/terminos.vue` (nuevos): contenido adaptado a lo que hace la app (cuentas, redes conectadas con tokens cifrados, Stripe, Supabase, OpenRouter, derechos RGPD, cookies técnicas).
- `nuxt.config.ts`: `/privacidad` y `/terminos` añadidas a las rutas públicas (`redirectOptions.exclude`).
- Enlaces: pie de la landing (`LandingFooter.vue`) y aviso bajo el botón de `onboarding.vue` (alta de cuenta). Es solo un texto informativo, no una casilla bloqueante.

### Verificado de verdad

- `vue-tsc --noEmit` limpio, 30 tests unitarios pasan, `npm run build` completo.
- Con el servidor de desarrollo, sin sesión: `/privacidad`, `/terminos` y `/onboarding` devuelven 200 (sin redirección a `/login`) y el HTML contiene el aviso de borrador y los huecos marcados.

### Sin verificar

- **No se vio en un navegador real** (no hay navegador en este entorno): falta revisar el aspecto a 390px y escritorio.
- Falta que un gestor/abogado revise el contenido (Q13) y rellenar los datos en `legal.ts`.
- Pendiente de decidir: política de devoluciones/desistimiento y proveedor de alojamiento (marcados en el texto).

---

## 2026-10-24 (54) — Fase 5 de CONTEXT.md (hallazgos #11-21): pulido, accesibilidad y un bug real de verdad grave encontrado al medir en navegador

Cierra la Fase 5, la última del plan original de `CONTEXT.md`. Cada hallazgo se investigó en el código real antes de tocar nada; varios resultaron ya resueltos de sesiones anteriores, documentado explícitamente abajo en vez de darlos por hechos sin comprobar.

### #11 — Ya resuelto, confirmado al revisar el código

Métricas y Redes ya usan el mismo criterio de tres estados (`socialAccountState`: conectada y verificada / conectada sin verificar / sin conectar) en `PlatformStatCard.vue` y `SocialAccountRow.vue`, con texto explícito ("Conectada sin verificar · todavía sin datos reales"). No hacía falta ningún cambio.

### #12 — Vista previa de ejemplo en Métricas vacío

`creator/metrics/index.vue`: debajo del estado vacío, una sección atenuada (opacidad 50%, sin interacción) con datos de ejemplo marcados como tal ("ASÍ SE VERÍA CON UNA RED CONECTADA (EJEMPLO)") usando los mismos componentes reales (`StatTile`, `PlatformStatCard`).

### #13 — Créditos de predicción explicados

`creator/profile.vue`, pestaña Cuenta: bajo el saldo, una frase con las cifras reales del sistema (`grant_welcome_credits()` en la base de datos, `stripe-plans.ts` en el servidor): "Cada predicción gasta 1 crédito. Recibiste 3 gratis al crear tu cuenta; con FEEDMA Pro (19,99 €/mes) se renuevan 20 más cada mes."

### #14 — Barra de ficha con detalle de lo que falta

`ProfileCompletionBar.vue` gana una prop opcional `items` (misma lista de comprobaciones que ya usaba cada página para calcular el %, solo que ahora con etiqueta); debajo de la barra, cuando no está al 100%: "Te falta: X, Y, Z." Aplicado en `creator/profile.vue` y `partner/profile.vue`.

### #16 — El campo de mensaje del chat estaba tapado de verdad por la barra inferior en móvil

No era solo "poca altura útil": medido con el navegador real (no a ojo), con el `calc(100dvh-7.5rem)` anterior el formulario de enviar mensaje caía en 769-813px de un viewport de 844px, mientras la barra de navegación inferior fija ocupaba 764.5-844px — **el campo de mensaje estaba literalmente debajo de la barra, invisible e inaccesible en cualquier móvil real**, aunque existía en el DOM. Corregido a `calc(100dvh-11.25rem)` (verificado de nuevo: ahora el formulario termina en 753px, 11,5px de margen limpio antes de la barra). En escritorio no hacía falta tocar nada — ahí no hay barra fija y el formulario ya caía dentro del viewport.

### #17 — Validación del precio de oferta

`ChatOfferSheet.vue`: al vaciar "Precio propuesto (€)", en vez de que "Enviar oferta" se quede gris sin explicación, aparece "Indica un precio para poder enviar la oferta." en rojo.

### #18 — Accesibilidad: dos botones de icono sin nombre real

Revisados todos los `<button>` de icono de la app — la mayoría ya tenían `aria-label`. Dos no: el FAB (botón flotante "+" del Tablero/Hoy, `Fab.vue`) y el botón principal de `AvatarUploader.vue` (foto de perfil circular, sin texto visible siquiera al pasar el ratón, a diferencia de `CoverPhotoUploader.vue`/`CoverUploader.vue`, que sí tienen un `<span>` con texto). Los dos dos llevan ahora `aria-label`.

### #19 — Errores de Supabase Auth traducidos

Nuevo `app/utils/auth-errors.ts` (`translateAuthError`), centraliza la traducción de los mensajes más habituales de GoTrue (credenciales inválidas, cuenta ya registrada, email inválido, contraseña corta, límite de intentos, email sin confirmar) — antes `login.vue` solo traducía uno y `onboarding.vue` dejaba pasar cualquier otro en inglés tal cual (p. ej. "Email address ... is invalid"). Los dos formularios usan ahora la misma función.

### #20 — Página de error propia

`app/error.vue` nuevo — antes cualquier ruta sin capturar caía en el 404 por defecto de Nuxt (inglés, estética distinta al resto de la app). Cubre tanto 404 como otros códigos de error, con el wordmark FEEDMA y "Volver al inicio" (`clearError({ redirect: '/' })`). **Nota real sobre su alcance**: una ruta inventada visitada sin sesión iniciada nunca llega a mostrar esta pantalla — el middleware de autenticación redirige antes a `/login` (comportamiento ya existente, no tocado). Donde sí se dispara siempre, verificado de verdad: cualquier `createError({statusCode: 404, ...})` ya existente en el código (publicación/perfil/conversación no encontrada) y cualquier ruta rota dentro del área ya autenticada.

### #21 — Landing: nombre corregido, línea decorativa menos intrusiva, captura real del panel

- "Instalaciones" → "Integraciones" en nav, pie de página y la propia página (`/instalaciones`, la URL no cambia) — el contenido real de esa página es conectar redes sociales, no instalaciones; "Instalaciones" era, literalmente, la palabra equivocada.
- Línea decorativa punteada del hero principal: opacidad de 0.55 a 0.2 (`LandingHero.vue`). La de la página de Integraciones: de 20% a 10% (`InstallHero.vue`).
- El mockup de móvil de "Llévate FEEDMA contigo" mostraba una cuadrícula de iconos genérica, no el producto — ahora muestra una captura real de la pantalla "Hoy" del creador (`public/img/panel-preview.png`, generada contra la cuenta demo y verificada visualmente antes de usarla).

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio.
- Recorrido completo en navegador real (Playwright, instalado y desinstalado al terminar — mismo criterio que entradas anteriores) de los 9 cambios de arriba, con capturas revisadas una a una: landing, Integraciones, 404 (anónimo y logueado), Métricas vacío, ficha de creador y partner con el desglose, créditos, chat en móvil (antes y después del arreglo), y el aviso de precio vacío en la oferta.
- Dos fallos reales encontrados solo por verificar en navegador, ninguno visible en tipos/tests: el campo de chat tapado (#16, arriba) y el wordmark "FEEDMA" de `error.vue` en blanco sobre fondo claro (`--color-ink` es un tono casi blanco, `#fbfaff` — no oscuro; confundido con el panel de marca de `login.vue`, que sí es oscuro pero por un degradado explícito aparte, no por `--color-ink`). Corregido a `text-[var(--color-text)]`.
- Un "error" que no lo era: durante la edición de `InstallGuide.vue`, Vite en caliente (HMR) se quedó con una referencia a un bloque `<style>` ya borrado y lanzaba `CssSyntaxError` en consola — un `npm run build` limpio y un reinicio del servidor de desarrollo confirmaron que no era un fallo real, solo caché de HMR desactualizada.

### Sin verificar

- Accesibilidad real con lector de pantalla — solo se revisó código (presencia de `aria-label`), no una auditoría con Lighthouse/axe ni con un lector de pantalla de verdad.
- El resto de estados de error HTTP de `error.vue` (solo 404 y el genérico "Algo ha ido mal" se han visto renderizados).
- Captura del panel: es una imagen estática de la cuenta demo en un momento dado — no se actualiza sola si cambia el diseño del dashboard.

### Con esto, la Fase 5 de `CONTEXT.md` queda cerrada — el plan original (Fases 0 a 5) está completo

Quedan del roadmap (`docs/CONTEXTO_PROYECTO_FEEDMA.md` §7): probar un pago real (modo test) de los dos flujos de Stripe — pendiente a propósito, pedido explícitamente para después de esta fase — y la Fase 2 de la conversación actual (onboarding guiado), todavía sin empezar a petición expresa del usuario.

---

## 2026-10-24 (53) — Dos decisiones pendientes del roadmap: datos ambiguos borrados (con confirmación) y definición de "activa"/"pendiente" cerrada

Antes de seguir con la Fase 5, se resolvieron dos de los pendientes "críticos" del roadmap (`docs/CONTEXTO_PROYECTO_FEEDMA.md` §7.1), ambos con confirmación explícita del usuario antes de actuar.

### Borrado el grupo ambiguo de colaboraciones de prueba

De las 19 colaboraciones reales que había, se identificaron 6 con un criterio explícito: 4 con el texto autogenerado "Oferta aceptada por chat: Reel de lanzamiento 7505/7823" (residuo confirmado de tests repetidos, mismo patrón que ya se investigó en la entrada 49) y 2 más con presupuesto idéntico (32,00 €) y brief de una sola palabra ("OLA" y otra, una palabra ofensiva) — sin el mismo patrón automático que las otras 4, pero presentadas igual al usuario antes de tocarlas. El usuario confirmó borrar las 6. Verificado antes de borrar: ninguna tenía una publicación real ligada (0 posts afectados). Cascada limpia por esquema (`collaboration_offers`, `reports`, `collaboration_ratings`, `collaboration_log_entries` tienen `on delete cascade` hacia `collaborations`; `posts.collaboration_id` es `on delete set null`, así que cualquier post ligado se habría quedado como "contenido propio" en vez de borrarse — no hizo falta en este caso). Quedan 13 colaboraciones reales.

### Definición de "colaboración activa"/"pendiente" confirmada como decisión de producto

Pregunta abierta 4 de `CONTEXT.md`, ya implementada de hecho (`isActiveCollaborationStatus`/`isUnresolvedCollaborationStatus` en `app/utils/status.ts`) pero nunca confirmada explícitamente. El usuario confirmó que es la definición correcta a largo plazo: **activa** = `accepted` o `in_progress`; **pendiente/sin resolver** = `requested`. No se ha tocado código — queda documentado como decisión cerrada, no heredada.

### Verificado de verdad

Consulta antes y después del borrado (19 → 13 colaboraciones), confirmando los 6 ids exactos borrados y que ninguno tenía publicaciones reales ligadas.

### Sin verificar / pendiente

- No se ha repetido `npm run test:integration` — el borrado fue manual con `service_role`, no toca código ni RLS.
- Sigue pendiente lo más laborioso del roadmap crítico: probar un pago real (en modo test) de los dos flujos de Stripe — aplazado a propósito a petición del usuario, para después de la Fase 5.
- Empieza ahora la Fase 5 de `CONTEXT.md` (hallazgos #11 a #21).

---

## 2026-10-24 (52) — Cierra el plan de publicaciones: columnas del Tablero colapsables en móvil

Última pieza pendiente del plan de la entrada 49: en la entrada 50 se había aparcado a propósito "colapsar columnas vacías en móvil" por miedo a esconder el hueco donde se suelta una card al arrastrar. Revisando el propio código se confirmó que ese miedo no aplica: cada card ya tiene su propio selector de fase (`BoardCard.vue`, pensado desde antes como alternativa al arrastre en móvil) que no necesita que la columna de destino esté visible ni desplegada — así que plegar una columna vacía no quita ninguna forma real de mover algo ahí.

### Añadido

`PhaseBoard.vue`: en móvil, cada columna se pliega sola por defecto si está vacía (icono de flecha junto al límite de WIP, visible solo bajo `lg`). Tocarla pliega/despliega cualquiera a mano — esa preferencia manual manda sobre el valor por defecto hasta que se vuelve a tocar, para no "olvidar" que alguien quiso dejar una columna abierta o cerrada aposta. En escritorio (`lg:` y superior) las 5 columnas se siguen viendo siempre completas, sin cambios.

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio.
- Verificación real en navegador (Playwright, instalado y desinstalado de nuevo al terminar — mismo criterio que la entrada 51): viewport móvil (390px), cuenta demo del creador. Confirmado con capturas: una columna vacía arranca plegada, el tap la despliega/pliega sin errores de consola, y mover una publicación a una columna plegada con el selector de la propia card (sin arrastrar) funciona y la columna de destino pasa a mostrarse abierta con la card dentro. La única publicación real que se tocó para esta prueba (`dads`, cuenta demo) se devolvió a su fase original (`idea`) al terminar el script — sin residuo de datos.

### Sin verificar

- El gesto de arrastre real (puntero/táctil) hacia una columna plegada — por diseño, no es necesario (el selector de fase cubre ese caso), pero no se ha comprobado explícitamente que arrastrar hacia una columna plegada se comporte con gracia (lo esperable es que no haya zona de destino visible ahí, igual que si la columna no existiera).
- Con esto se da por completa la Fase 1 (publicaciones) del plan acordado con el usuario. Sigue pendiente, sin empezar y a propósito, la Fase 2 (onboarding guiado para usuarios nuevos) — el usuario pidió explícitamente no tocarla hasta que esta parte esté estable.

---

## 2026-10-24 (51) — Verificación real en navegador de las entradas 49-50, y un fallo de verdad que ni los tipos ni los tests habían pillado

Hasta esta entrada, ningún cambio de interfaz de la sesión se había visto renderizado de verdad (sin herramienta de navegador disponible). El usuario preguntó cómo darme acceso a un navegador; se le explicó que el navegador integrado de la app de escritorio de Claude y la extensión de Chrome son superficies distintas a esta sesión de Claude Code en VS Code, sin forma de conectarlas desde aquí. Con su visto bueno, se instaló Playwright como dependencia de desarrollo **temporal** (desinstalada al final de esta entrada, `package.json`/`package-lock.json` vuelven a su estado previo), se usaron las cuentas demo del equipo (`creator@feedma.test`/`partner@feedma.test`, nunca la cuenta real del usuario, aunque tenía una publicación atrasada de verdad que se podría haber usado) y se automatizó un recorrido real contra el servidor de desarrollo ya en marcha (no se tocó, ya lo tenía abierto el usuario en su propia terminal).

### Fallo real encontrado: la página completa de editar publicación daba un 500 (`Cannot access 'predictError' before initialization`)

Al navegar a `/creator/post/[id]` de verdad (algo que ni `vue-tsc` ni los tests unitarios ejecutan — ninguno de los dos monta un componente Vue con datos reales), la página reventaba. Causa: en `usePostEditorPanel.ts` (entrada 50), el `watch(..., { immediate: true })` se ejecuta en el mismo instante síncrono en que se llama, y dentro usaba variables (`predictError`, `labelsPickerOpen`, `newLabelName`, `newLabelColor`, `newItemText`) declaradas con `const` **más abajo** en el archivo. En `PostEditSheet.vue` (panel del Tablero) esto no se notaba porque el post empieza siendo `null` y el watch corta en el primer `if` antes de tocar nada; en la página completa el post ya existe desde el principio, así que la llamada inmediata entraba de lleno y reventaba contra una `const` que todavía no se había inicializado (temporal dead zone). **Arreglado** moviendo el `watch` al final del composable, después de declarar todo lo que usa — es el mismo motivo por el que esta clase de fallo es invisible a los tipos: TypeScript no analiza el orden de ejecución en tiempo real de un `watch` inmediato.

### Qué se verificó de verdad, con capturas

Recorrido completo como creador: crear una publicación ligada a una colaboración activa (con la explicación nueva del selector visible), verla "Atrasada 2 días" en el Tablero y en el panel de edición con la frase de "qué hacer ahora", moverla a "Para revisar", intentar saltarse la revisión directo a "Publicado" y ver el diálogo de confirmación real, y abrir la página completa (ya con Etiquetas/Checklist, antes ausentes) — sin el 500, tras el arreglo. Luego como partner: la pestaña Calendario de una colaboración mostrando ahora los botones "Pedir cambios"/"Aprobar" (antes de solo lectura), y la misma tarjeta en Inicio → Tu calendario para comparar. El Tablero en móvil (390px) con la fila de salto rápido por fase, con los recuentos reales.

Las 8 capturas eran legibles salvo dos con parte de la transición de apertura de la hoja a medio camino (doble exposición) en el primer intento — se corrigió añadiendo una espera tras abrir cada hoja/diálogo antes de capturar, y se repitió el recorrido entero una segunda vez con capturas limpias. La publicación de demo (`DOM Claude — borrar`) se borró al final del script en los dos intentos — no queda ningún resto en la base de datos.

### Verificado de verdad

- El recorrido completo de navegador descrito arriba, con capturas revisadas una a una.
- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio. Los tres, después del arreglo del TDZ.
- Playwright desinstalado al terminar; `package.json`/`package-lock.json` sin diferencias respecto a antes de esta entrada.

### Sin verificar

- No se ha repetido `npm run test:integration` en esta entrada — los cambios de código (el `usePostEditorPanel.ts` arreglado) no tocan `server/`, RLS ni RPCs.
- Solo se probó en Chromium (el navegador que usa Playwright por defecto), nunca en Firefox/Safari real, y solo en dos anchos de viewport (1280 y 390 px), no en tablet.
- No se probó arrastrar una card de verdad con el ratón (drag-and-drop) — el cambio de fase se probó con el `<select>` de "Cambiar de fase", que dispara el mismo código (`moveTo`) que el arrastre, pero el camino del arrastre en sí (eventos de `vuedraggable`) no se ejecutó.
- El resto del plan de rediseño de publicaciones (estados vacíos adicionales, columnas colapsables en móvil) sigue sin implementar, como ya se documentó en la entrada 50.

### Nota aparte, sin relación con esta tarea

Al buscar datos de demo para el recorrido, apareció una colaboración real en la base de datos con el brief literal `"nigga"` (id visible en los logs de esta sesión, no repetido aquí). No se tocó — es exactamente el tipo de dato ambiguo que el usuario ya pidió no borrar sin confirmar antes (ver `docs/CONTEXTO_PROYECTO_FEEDMA.md` §4.3) — pero se deja constancia explícita por si se quiere revisar o borrar con un criterio claro.

---

## 2026-10-24 (50) — Rediseño de publicaciones, fase 1b: una sola capacidad de edición + explicar el concepto donde se decide

Segundo bloque del mismo plan de la entrada 49. Aquí: cerrar la brecha de capacidades entre las dos pantallas de editar una publicación, y añadir las explicaciones de contexto que el diagnóstico pedía (sin tocar aún estados vacíos del Tablero más que el principal, ni meterse con el onboarding general — eso sigue fuera de alcance, pedido explícitamente para después).

### Unificadas las dos superficies de edición de una publicación

`PostEditSheet.vue` (panel del Tablero) y `/creator/post/[id].vue` (página completa) duplicaban la misma lógica con capacidades distintas: la página no tenía etiquetas ni checklist, el panel no mostraba el historial de revisión ni el aviso de "te han pedido cambios". Extraída toda esa lógica (campos editables, etiquetas, checklist, predicción, historial de revisión) a un composable nuevo, `usePostEditorPanel` (`app/composables/usePostEditorPanel.ts`), que llaman las dos. Resultado: las dos pantallas tienen ahora exactamente las mismas capacidades — solo difieren en cómo se cambia de fase (selector libre en el panel, botón secuencial "Mover a…" en la página) y en el layout, que de verdad son sitios distintos (edición rápida desde el tablero vs. página dedicada) y no tenía sentido forzarlos a verse idénticos.

### Explicado el concepto de "publicación ligada a una colaboración" donde se decide

- Al crear una publicación (`PostComposerSheet.vue`), el selector de colaboración ahora explica debajo, en una frase, qué implica cada opción: vincularla hace que el partner vea su progreso y pueda aprobarla/pedir cambios; dejarla como "Contenido propio" significa que solo la ve el creador.
- Nueva frase de "qué hacer ahora" (`creatorNextStepHint`/`partnerNextStepHint` en `utils/status.ts`) en las dos superficies de edición del creador y en la vista de detalle del partner (`PostDetailSheet.vue`) — en vez de dejar que el nombre de la fase por sí solo explique qué toca hacer y a quién le toca esperar.
- Cada columna del Tablero tiene ahora un icono "?" con una frase de una línea de qué significa esa fase (`phaseDescription`).
- Estado vacío principal del Tablero reescrito para explicar el concepto de publicación (propia vs. de colaboración) y el recorrido de fases, no solo "crea tu primera publicación".
- En móvil, una fila de accesos rápidos por fase encima del tablero (con el recuento de cada una) para saltar directamente a una columna sin tener que bajar a mano por las 5 apiladas en vertical (hallazgo #15) — no sustituye la mejora de colapsar columnas vacías (pendiente, ver abajo), que se descartó aquí porque colapsar una columna vacía escondería el hueco donde se suelta una card al arrastrar.

### Verificado de verdad

`npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio.

### Sin verificar

- El aspecto real en el navegador — sigue sin haber herramienta de navegador disponible en esta sesión. Nada de esto (ni las frases nuevas, ni el salto de fase en móvil, ni el icono "?") se ha visto renderizado de verdad.
- No se ha ejecutado `npm run test:integration` — cambios puramente de interfaz y de composición de lógica de cliente ya existente, sin tocar `server/`, RLS ni RPCs.
- Queda pendiente del plan original: columnas vacías del Tablero colapsables en móvil (aparcado a propósito, ver arriba) y una revisión general de los demás estados vacíos (filtros sin resultado, "Sin solicitudes pendientes", etc.) si hiciera falta más contexto en ellos.

---

## 2026-10-24 (49) — Rediseño de publicaciones, fase 1a: "fuera de plazo" de verdad + revisión del partner donde hace falta

Primer bloque de la auditoría de usabilidad de "publicaciones" pedida por el usuario (estudio completo del sistema: qué es una publicación, su relación con las colaboraciones, qué puede hacer cada rol — ver el diagnóstico compartido en esta misma conversación, no hay documento aparte). Dos arreglos de comportamiento, antes de la parte de claridad de textos.

### Encontrado y arreglado: "Fuera de plazo" era inalcanzable

`overdue` es un valor válido del enum `post_status` en el esquema y en el tipo `PostStatus`, pero **ningún código lo asigna jamás** — ni `updatePost` ni ninguna RPC. `creator/index.vue` filtraba `post.status === 'overdue'` para decidir si mostraba el aviso "Fuera de plazo" en el panel destacado de Hoy: esa condición nunca era cierta, así que esa tarjeta de alerta no podía aparecer nunca, por muy atrasada que estuviera una publicación. La única señal real era un borde rojo fino alrededor de la card en el Tablero (`PhaseBoard.vue`, calculado por fecha, no por este estado muerto), sin texto, sin aparecer en ningún resumen.

Arreglado con una sola función compartida, `isPostOverdue` (`app/utils/status.ts`): fecha de entrega pasada y no publicada — ni más ni menos que lo que ya calculaba `PhaseBoard.vue` por su cuenta, ahora en un solo sitio. Además:
- Aviso visible de verdad ("Atrasada N días", icono de alerta), no solo un borde: en la card del Tablero, en la card de "Tu calendario"/Calendario de colaboración (`DeliverableCard.vue`, visible también para el partner), y en las dos superficies de edición (`PostEditSheet.vue`, `/creator/post/[id].vue`).
- El panel destacado de Hoy ya puede mostrar "Fuera de plazo" de verdad cuando corresponde.
- Las atrasadas aparecen también en "Necesita tu atención" (hasta 2), no solo si ganan el único hueco del panel destacado.

### Encontrado y arreglado: la revisión del partner solo existía en una pantalla

Aprobar/pedir cambios a una publicación "Para revisar" (las RPCs `approve_post`/`request_post_changes`) solo estaba implementado con botones reales en `/partner` (Inicio → "Tu calendario"). La misma vista dentro del detalle de una colaboración concreta (`/partner/requests` → pestaña Calendario) era de solo lectura — sin ningún botón, ni un enlace para ir a revisar. Un partner con varias colaboraciones que no viera la entrega en la portada de Inicio no tenía ningún otro sitio desde donde actuar.

Extraído el formulario de aprobar/pedir cambios (antes duplicado en parte, con alguna pieza solo en un sitio) a un componente nuevo, `app/components/timeline/PostReviewActions.vue`, usado ahora en los dos sitios: Inicio (dentro de `PostDetailSheet`, simplificando bastante `partner/index.vue`) y la pestaña Calendario de `/partner/requests` (nuevo). Mismas RPCs de siempre, sin tocarlas.

### Encontrado y arreglado de paso: la "aprobación" no era una puerta real

`approve_post`/`request_post_changes` las ejecuta siempre el partner — pero el creador puede mover cualquier publicación a cualquier fase con un `update` normal (arrastrando en el Tablero o con el selector de fase), incluida una ligada a una colaboración activa, saltándose "Para revisar" y la aprobación del partner por completo. No se ha tocado esto a nivel de permisos/RLS (sería un cambio de esquema, fuera de alcance sin confirmarlo antes) — se ha añadido un aviso de confirmación (`movingSkipsPartnerReview` en `utils/status.ts`) que explica lo que se está evitando y pide confirmar, tanto al arrastrar/seleccionar en el Tablero (`PhaseBoard.vue`) como al usar el botón secuencial "Mover a…" de `/creator/post/[id].vue`. No bloquea nada, solo avisa — igual que ya hacían los límites de WIP.

### Verificado de verdad

`npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30.

### Sin verificar

- El aspecto real en el navegador — sigue sin haber herramienta de navegador disponible en esta sesión. Ningún diálogo de confirmación nuevo, ni el aviso de "Atrasada", se ha visto renderizado de verdad.
- No se ha ejecutado `npm run test:integration` — ninguno de estos cambios toca `server/`, RLS ni RPCs; solo lógica de cliente y componentes, reutilizando RPCs ya probadas (`approve_post`/`request_post_changes`).
- Queda por hacer el resto del plan acordado: unificar las dos superficies de edición de una publicación (hoy con capacidades distintas), explicar el concepto de "publicación"/"colaboración" donde se decide, mejorar los estados vacíos del Tablero y las columnas en móvil.

---

## 2026-10-23 (48) — Segunda corrección: pestañas al estilo GIFs/Stickers de WhatsApp, no botones deshabilitados

El usuario corrigió también la entrada 47: no quería que un botón bloqueara al otro (deshabilitado, sin poder pulsarlo hasta quitar filtros) — quería el patrón de pestañas de WhatsApp (GIFs/Stickers): los dos botones siempre se pueden pulsar, pero abrir uno cierra el otro automáticamente, nunca se ven los dos paneles a la vez.

### Arreglado

- Se quita el `:disabled` de los dos botones — "Buscar con IA" y "Filtros" están siempre pulsables.
- `toggleAiMode()`: al activar el modo IA, cierra el panel de filtros si estaba abierto (`filtersOpen = false`). Al desactivarlo, vuelve a `mode = 'filters'` sin tocar nada más.
- `toggleFiltersPanel()` (nueva): al abrir el panel de filtros, fuerza `mode = 'filters'` (oculta el cuadro de IA si estaba abierto). Al cerrarlo, solo lo cierra.
- El botón "Filtros" gana el mismo resaltado morado que ya tenía "Buscar con IA" cuando su panel está abierto — antes no había ninguna pista visual de qué "pestaña" estaba activa salvo el cuadro de texto apareciendo o no.
- Los filtros puestos (categorías/presupuesto) **no se borran** al cambiar de panel — solo se oculta la vista para editarlos, igual que WhatsApp no borra el texto de búsqueda de GIFs al pasar a Stickers. El punto morado del botón "Filtros" sigue avisando de que hay un filtro activo aunque el panel esté cerrado.

### Verificado de verdad

`npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio.

### Sin verificar

El aspecto real en el navegador — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (47) — Corrección del usuario: la exclusividad es entre los dos modos, no durante la búsqueda

El usuario corrigió la entrada anterior (46): no era "deshabilitar los dos botones mientras se busca", sino "solo uno de los dos puede estar habilitado a la vez, antes de buscar siquiera" — IA y Filtros son dos caminos de búsqueda excluyentes, no dos controles que compiten por un mismo instante de carga.

### Arreglado

- "Buscar con IA" ahora se deshabilita con `hasActiveFilters` (si hay algún filtro puesto, hay que quitarlo antes de poder pasar a IA).
- "Filtros" se deshabilita con `mode === 'ai'` (en modo IA no se puede abrir el panel).
- Nueva función `toggleAiMode()`: al entrar en modo IA cierra el panel de filtros si estaba abierto, para no dejarlo visible con su botón ya deshabilitado.
- Se revierte el `:disabled="searching"` de la entrada 46 — ya no hace falta: con la exclusividad de modos, cuando hay una búsqueda de IA en marcha el botón de Filtros ya está deshabilitado (porque `mode === 'ai'`), y cuando hay una búsqueda de filtros en marcha con filtros activos, el de IA ya está deshabilitado (porque `hasActiveFilters`) — el mismo efecto, sin necesitar la condición de "buscando" aparte.

### Verificado de verdad

`npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio.

### Sin verificar

El aspecto real en el navegador — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (46) — Feedback directo del usuario: bloquear el interruptor de IA y el de Filtros mientras se busca

Pedido explícito: mientras se busca con IA, el botón de Filtros debe quedar deshabilitado, y viceversa — no tiene sentido dejar cambiar de modo o abrir el panel de filtros con una búsqueda ya en marcha.

### Arreglado

En las dos páginas de Descubrir, el interruptor "Buscar con IA" y el botón "Filtros" ganan `:disabled="searching"` (el mismo computed de la entrada 44 que ya cubre las dos fases, filtros y IA) — mientras cualquiera de las dos esté en marcha, ninguno de los dos se puede pulsar, con la misma atenuación visual que ya usa `BaseButton` (`opacity-40`, sin eventos de puntero).

### Verificado de verdad

`npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio. Sin `test:integration` (cambio puramente de interfaz, sin tocar `server/` ni composables de datos).

### Sin verificar

El aspecto real en el navegador — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (45) — Feedback directo del usuario: dos botones "Filtros" en Descubrir, y el botón de buscar siempre visible

### Encontrado

En las dos páginas de Descubrir había, uno junto al otro, **dos controles que decían "Filtros"**: la pestaña izquierda del selector de modo (`SegmentedTabs` con las opciones "Filtros"/"Buscar con IA") y, justo al lado, el botón real de los deslizadores que abre el panel de categorías/presupuesto. La pestaña "Filtros" no hacía nada por sí misma más que volver al modo por defecto — toda la acción de filtrar de verdad pasaba por el otro botón.

### Arreglado

- **Un solo "Filtros"**: la pestaña izquierda desaparece. En su lugar, "Buscar con IA" pasa de ser una opción de un `SegmentedTabs` de dos pestañas a un interruptor independiente (mismo sitio, icono de chispa, resaltado en morado claro cuando está activo) — y el botón de los deslizadores, el que de verdad filtra, se queda exactamente igual.
- **El botón de buscar ya no está siempre ahí**: antes se veía permanentemente, aunque no hubiera nada que buscar. Ahora solo aparece si hay al menos un filtro puesto (categoría o presupuesto) o si el modo IA está activo. En modo IA, además, el botón **solo se puede pulsar si se ha escrito algo** en el cuadro de búsqueda (antes se podía pulsar "Buscar con IA" vacío).

### Verificado de verdad

`npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio. No se repitió `npm run test:integration` en esta entrada — el cambio es puramente de interfaz (ningún archivo de `server/`, composable de datos ni migración tocado), y la sesión ya ha chocado una vez con el límite de autenticación de Supabase por repetir la suite muchas veces seguidas (ver entrada 43).

### Sin verificar

El aspecto real en el navegador — no hay herramienta de navegador en esta sesión.

## 2026-10-23 (44) — Feedback directo del usuario: el botón de buscar no se veía ocupado mientras la IA pensaba

Pedido explícito tras probar la Fase 4: el botón de "Buscar con IA" debía verse grisáceo mientras busca, el aviso de "Buscando" debía resaltar más, y el porcentaje de coincidencia también.

### Encontrado

`loading` (en `useDiscover`) solo cubre la fase rápida de filtros (siempre base de datos) — se pone a `false` justo antes de empezar la fase de IA, que usa `aiLoading` aparte. El botón de las dos páginas de Descubrir solo miraba `loading`: durante los 10 segundos reales de espera de la IA (la fase larga, la que importa), el botón volvía a su aspecto normal como si ya hubiera terminado, aunque seguía "pensando" de fondo.

### Arreglado

- **Botón**: nuevo computed `searching = loading || aiLoading` en `creator/discover.vue` y `partner/discover.vue`. Mientras es `true`, el botón cambia de `variant="primary"` (morado) a `variant="secondary"` (fondo neutro, el mismo tono ya usado para botones secundarios en toda la app) — "grisáceo" de verdad, no solo una opacidad más baja sobre el morado, y sin tocar `BaseButton.vue` (que es compartido por decenas de botones que no tenían este problema).
- **Aviso "La IA está analizando…"**: en `FeaturedDeck.vue`, pasa de texto pequeño y apagado (`text-faint`, 0.75rem) a una píldora con fondo lila claro y texto morado de marca, en negrita — se nota de un vistazo, no solo si se busca con atención.
- **Porcentaje de coincidencia**: la píldora de cada tarjeta pasa de un fondo neutro semitransparente a morado de marca sólido, con el número más grande (1rem → 1.375rem) y el "%" más visible (antes casi invisible, al 60% de opacidad).

### Verificado de verdad

`npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio. Sin probar en navegador real (no hay herramienta en esta sesión) — el usuario podrá confirmar el aspecto final la próxima vez que lo abra.

## 2026-10-23 (43) — Fase 4 (#6, #7, #8, #9): la causa real de "la IA no sirve de nada", avisos de solicitud duplicada, unidad de audiencia y fichas vacías

Cierra la Fase 4 de `CONTEXT.md`. La pieza central (#6) resultó ser un bug de verdad, no una percepción — se encontró probando la IA en real contra Supabase y OpenRouter, como autorizó el usuario ("si se gasta la cuota, se puede reiniciar").

### #6 — La causa real: el modelo gastaba todo el presupuesto de tokens "pensando" y nunca llegaba a responder

Probado en real, con los 11 creadores de demo reales y la misma consulta del informe de auditoría ("busco un creador de fitness con contenido técnico, presupuesto 200-500€"): la respuesta de OpenRouter venía con `finish_reason: "length"` y `content: null` — el modelo gratuito actual (`nemotron-3.5-lightning`, un modelo "reasoning") agotaba los 3000 tokens de `max_tokens` enteros en su campo interno `reasoning` ("pensar en voz alta") y nunca escribía el JSON pedido. Sin JSON que parsear, `fetchAiRanking` caía en el orden por filtros — que, sin ningún filtro de categoría activo, da un empate a 50 para todos y conserva el orden de "más reciente primero", exactamente lo que vio la auditoría ("los 9 primeros perfiles quedaron en el mismo orden"). No era un fallo aislado: tardaba entre 30 y 58 segundos en fallar así la mayoría de las veces.

**Arreglado**: `reasoning: { enabled: false }` en la llamada a OpenRouter (`server/api/discover/search.post.ts`). Probado con los mismos 11 candidatos y la misma consulta: de 57,7s a 9,6s, `finish_reason: "stop"`, JSON completo, y el ranking real aplicado — Marcos Peña (calistenia, "contenido técnico, sin humo") pasa a encabezar la búsqueda con 95 puntos y Paula Ibáñez (música) cae al puesto que le corresponde, en vez de quedarse primera por inercia. Se añade también una comprobación explícita de `finish_reason === 'length'` para que, si algún día vuelve a cortarse, quede registrado en el servidor en vez de fallar en silencio. Tope de tiempo bajado de 60s a 30s (ya no hace falta tanto margen).

**El resto de #6, ya resuelto o ya existente**:
- "Botón de cancelar": nuevo. `useDiscover()` gana `cancelAi()` (con `AbortController`, cancela solo la llamada de IA, nunca la de filtros); `FeaturedDeck.vue` muestra "Cancelar" junto al indicador de carga.
- "Recuento de perfiles": nuevo. Las dos páginas de Descubrir muestran ahora "X creadores encontrados"/"X marcas encontradas" (antes el único recuento era un `aria-live` solo para lector de pantalla, que la auditoría leyó del árbol de accesibilidad como si fuera texto visible — no lo era, y se mantiene igual).
- "Motivo en cada tarjeta": ya existía en el código (`r.reason`) — simplemente nunca se rellenaba, por el mismo bug de arriba. Con el fix, llega de verdad.
- "Cachear consultas repetidas": nuevo, en memoria de la pestaña (`useDiscover`), acotado a 20 entradas — repetir exactamente la misma búsqueda de IA ya no vuelve a gastar una llamada real al proveedor.
- "Peticiones duplicadas": revisado pero no tocado — la petición inicial de la página (`await runSearch()` en el `setup`) se ejecuta una vez en el servidor (SSR) y otra en el cliente al hidratar, porque `results`/`loading` de `useDiscover` son `ref` normales, no `useState` (no viajan en el payload). Es una duplicación real, pero del modo "filters" (solo base de datos, sin coste de IA) — se deja documentada aquí, sin arreglar en este incremento, para no tocar más superficie de la necesaria junto al fix de IA.

### #7 — "Contactar" ya avisa de una solicitud pendiente

`openContact`/`send()` insertaban directamente en `collaborations` sin comprobar si ya había una `requested` con esa misma persona. `useCollabRequests` (creador) gana `partnerId` en cada fila (antes solo traía el nombre); `useMyCollaborations` (partner) ya lo tenía. Las dos páginas de Descubrir cargan esa lista en paralelo con la búsqueda y calculan qué ids ya tienen una solicitud sin responder. `DiscoveryCard.vue` y `FeaturedDeck.vue` ganan la prop `isPending`/`pendingIds`: muestran la etiqueta "Pendiente de respuesta" junto al nombre y desactivan el botón de contacto (mismo texto, ya no se puede pulsar) para esas tarjetas en concreto. **Solo en la interfaz** — no se añadió ninguna restricción en la base de datos (`collaborations` sigue permitiendo el insert directo); si se quisiera cerrar también por ahí, sería un cambio de esquema aparte, a confirmar antes.

### #8 — Cifra de audiencia con unidad

`DiscoveryCard.vue` y `FeaturedDeck.vue`: el icono de personas + número compacto ("75 mil") ahora dice "75 mil seguidores" — ya no hay ambigüedad sobre si es audiencia, alcance u otra cosa.

### #9 — Perfiles sin bio ya no se ven en blanco

Cuando no hay biografía (p. ej. "Alejandro Suárez Durán" en la demo), las dos tarjetas muestran "Ficha en construcción" en cursiva en vez de un hueco vacío. Se optó por la opción más simple de las dos que ofrecía `CONTEXT.md` (mostrar el aviso) en vez de excluir perfiles incompletos de Descubrir — así no se penaliza a alguien nuevo que todavía no ha rellenado su ficha.

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio.
- `npm run test:integration`: **62/62**, sin regresiones — las dos tandas intermedias con fallos masivos (visto "Request rate limit reached" en el log) eran el límite de autenticación de Supabase por repetir la suite completa varias veces seguidas en esta misma sesión, no un fallo de código: confirmado reintentando tras un momento, 62/62 otra vez.
- El fix de `reasoning: { enabled: false }` se probó de verdad contra OpenRouter y los 11 creadores reales de la cuenta demo, reproduciendo exactamente la consulta del informe de auditoría — no es una suposición.

### Sin verificar

- El fix de IA no se probó a través del endpoint HTTP completo con sesión real de navegador (no hay herramienta de navegador en esta sesión, y reconstruir a mano la cookie de sesión de `@nuxtjs/supabase` v2 no encajaba en el tiempo disponible) — se verificó replicando exactamente la misma llamada que hace el servidor (mismo modelo, mismo prompt, mismos parámetros, candidatos reales), no el viaje HTTP completo.
- El aspecto real de "Pendiente de respuesta", "Ficha en construcción" y el botón "Cancelar" en el navegador.

### Con esto, la Fase 4 de `CONTEXT.md` queda cerrada

Sigue la Fase 5 (#11 a #21: pulido y accesibilidad) — la última del plan.

## 2026-10-23 (42) — Fase 3 (tipografía): Sora en los títulos, Snasm queda solo para el logo

Cierra la Fase 3. Pregunta abierta 1 de `CONTEXT.md` resuelta con el usuario: Sora para los títulos, y el cambio alcanza solo a lo que ya se trataba como "texto de display" (títulos, no el texto normal/botones/enlaces, que siguen con Hanken Grotesk).

### Lo que había que entender antes de tocar nada

`font-display` (clase de Tailwind generada desde la variable `--font-display`) no se usaba solo en `<h1>`/`<h2>` — son 44 sitios en 31 archivos: títulos de página, pero también precios, números de estadística, títulos de tarjeta, de diálogo, y **el propio wordmark "FEEDMA"** en 6 sitios (hero de la landing, login, footer, nav, SideRail, onboarding). Si se cambiaba solo la variable, el logotipo literal "FEEDMA" también habría cambiado de Snasm a Sora — justo lo contrario de la decisión cerrada del informe ("Snasm solo para el logo").

### Arreglado

- **`nuxt.config.ts`**: añadida la familia `Sora` (google, pesos 400/500/600/700) junto a Hanken Grotesk y Snasm.
- **`main.css`**: nueva variable `--font-brand` (= lo que antes era `--font-display`: Snasm) para el logotipo; `--font-display` pasa a apuntar a Sora. Tailwind v4 genera la clase `font-brand` sola, a partir del nombre de la variable — sin tocar ningún config de JS.
- Los 6 sitios donde "FEEDMA" se renderiza como texto (no la imagen del logo) cambian su clase de `font-display` a `font-brand`, para seguir en Snasm: `LandingHero.vue` (hero), `login.vue` (panel de marca), `LandingFooter.vue`, `LandingNav.vue`, `SideRail.vue`, `onboarding.vue`.
- Los otros 38 usos de `font-display` (títulos de página, precios, estadísticas, diálogos...) no se tocan — heredan Sora automáticamente al cambiar la variable, sin editar esos archivos uno a uno.

### Verificado de verdad, de principio a fin

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run test:integration`: 62/62. `npm run build`: limpio.
- Build de producción real, servido en un puerto aparte (el 3000 ya lo ocupaba un servidor de desarrollo de otra sesión) y comprobado por `curl` sobre el HTML servido de verdad: las 4 variantes de Sora (400/500/600/700) llegan con `@font-face` real y `url()` a un `.woff2` descargado, con sus fuentes de reserva (`size-adjust`/`ascent-override`...) calculadas igual que ya tenía Hanken Grotesk — mismo mecanismo, no uno nuevo sin probar. Confirmado también que `font-brand` se sigue usando en `/login` (el wordmark) y que el `<h1>` de esa misma página sigue en `font-display` (ahora Sora).

### Sin verificar

- El aspecto real — si Sora se ve bien al lado de Snasm en el hero/login, si algún título muy largo se corta en 443–611 px — no hay herramienta de navegador en esta sesión; solo se confirmó que la fuente se carga y se aplica donde debía.

### Con esto, la Fase 3 de `CONTEXT.md` queda cerrada

Sigue la Fase 4 (#6–#9: búsqueda con IA y Descubrir) — depende de la Fase 1 ya cerrada (datos de test fuera de Descubrir).

## 2026-10-23 (41) — Fase 3 (#5): cerrar sesión ya no está enterrado, y "Ajustes"/"Perfil" deja de ser dos nombres para lo mismo

Primera pieza de la Fase 3 — la que no depende de la pregunta abierta 1 (tipografía), así que se adelanta mientras esa se decide con el usuario.

### Lo que encontró la auditoría, confirmado en código

"Cerrar sesión" solo existía al final de la pestaña "Cuenta" de `/creator/profile` y `/partner/profile` — Más → Perfil → pestaña Cuenta → bajar al final. Y la misma ruta (`/${role}/profile`) tenía dos nombres distintos según por dónde se llegara: el avatar de `TopBar.vue` la enlazaba como "Tu perfil" (solo accesible por lector de pantalla, no visible) mientras el menú "Más" la llamaba "Ajustes" (`secondaryNav`, visible).

### Arreglado

- **Cerrar sesión, a un toque desde cualquier pantalla**: añadido al final del menú "Más" (`BottomTabBar.vue`, móvil) y al final del bloque de cuenta de `SideRail.vue` (escritorio) — mismo `useConfirm()` + `useLogout()` que ya usaban las páginas de perfil, sin lógica nueva. Las páginas de Perfil mantienen su propio botón también (no se quita nada, solo se añade un camino más corto).
- **Un solo nombre, "Perfil"**: `secondaryNav()` (`utils/nav.ts`) renombra esa entrada de "Ajustes" a "Perfil" (icono a juego, `ph:user-circle-fill`), y el `aria-label` del avatar de `TopBar.vue` pasa de "Tu perfil" a "Perfil" — mismo texto en los dos sitios que llevan a la misma página. Se eligió "un solo nombre" (la opción más simple de las dos que ofrecía `CONTEXT.md`) porque la pestaña con la que arranca esa página es la ficha pública, no una lista de interruptores — "Perfil" la describe mejor que "Ajustes".

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run test:integration`: 62/62 (sin regresiones — nada de esto toca datos ni RPCs). `npm run build`: limpio.
- Confirmado por `grep` que no queda ningún "Ajustes" suelto en el código de navegación (solo en comentarios que explican el cambio).
- El menú "Más" del partner usa el mismo componente (`BottomTabBar.vue`) que el del creador — no hay dos implementaciones que puedan divergir, así que el acceso nuevo funciona igual en los dos roles sin tener que probarlo por separado.

### Sin verificar

- El aspecto real en el navegador (no hay herramienta de navegador en esta sesión) — en particular, si "en dos toques como máximo" se cumple de verdad al tacto en móvil real (debería: abrir "Más" + pulsar "Cerrar sesión" = 2 toques).

### Pendiente

Tipografía (la otra mitad de la Fase 3) — depende de resolver con el usuario la pregunta abierta 1 de `CONTEXT.md`.

## 2026-10-23 (40) — Fase 2 (#2): la bandeja separa "Importantes" de "Actividad", y el badge deja de contar logins

Última pieza grande de la Fase 2. Al investigar el alcance real, salió algo más grave que "la bandeja está saturada": **`useNotifications` cargaba solo los 30 avisos más recientes en una única lista**, y un aluvión de inicios de sesión (habitual aquí, porque los tests de integración inician sesión de verdad en cada ejecución contra este mismo proyecto — ver entradas 37/38 sobre la decisión del entorno de pruebas) podía ocupar esos 30 huecos enteros. Comprobado contra Supabase real: de los 30 avisos más recientes de la cuenta demo del creador, 9 eran "Has iniciado sesión" intercalados entre solicitudes y ofertas reales — y en una sesión de pruebas más larga, una solicitud real podría quedar completamente fuera de la vista sin que nadie lo notara. Esto no era solo "se ve feo", era "se puede perder un aviso real".

### Arreglado

- **`app/utils/notifications.ts`** (nuevo): `ACTIVITY_NOTIFICATION_TYPES = ['login', 'welcome']` — único sitio que decide qué es "actividad" (ruido de cuenta, no pide ninguna acción) frente a "importante" (solicitudes, ofertas, cambios pedidos, aprobaciones, valoraciones, pagos).
- **`useNotifications.ts`**: en vez de una lista con `limit(30)`, dos consultas en paralelo — `important` (excluye los tipos de actividad, `limit(50)`) y `activity` (solo esos tipos, `limit(20)`). Los importantes ya no pueden quedar enterrados por mucho que crezca el ruido de logins. `unreadCount` (el número que pintan `TopBar`/`SideRail`/`BottomTabBar` en el badge) ahora solo cuenta `important` — un aluvión de inicios de sesión ya no infla el "9+".
- **`inbox.vue`**: pestañas "Importantes"/"Actividad" (`SegmentedTabs`, el mismo componente que ya usan Pendientes/Historial — cero componentes nuevos), Importantes por delante. `markAllRead` sigue marcando las dos listas a la vez (una sola acción, como antes); `markRead` busca en ambas.

### Verificado de verdad

- Confirmado contra Supabase real (`service_role`) que el filtro `not('type','in',...)` funciona exactamente como se espera: de los mismos datos reales, "importantes" devuelve solo los 6 tipos accionables y "actividad" solo login/welcome.
- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run test:integration`: 62/62 (sin regresiones — nada de esto toca RLS/RPC). `npm run build`: limpio.

### Sin verificar

- El aspecto real de las dos pestañas en el navegador (no hay herramienta de navegador en esta sesión) — se intentó una comprobación SSR con cookies reales de sesión y se abandonó por no encajar con el formato de cookie exacto que usa `@nuxtjs/supabase` v2 en este momento; no se insistió más porque no es indispensable (la consulta ya se verificó directamente contra Supabase real, y el resto es plantilla declarativa ya tipada).

### Lo que queda deliberadamente fuera de este incremento

"Agrupar las solicitudes duplicadas" (la otra parte de #2) se deja para otra vez: con los datos ya mucho más limpios tras las entradas 37/38, no está claro cuánto de "muchas 'Nueva solicitud' de Alma Beauty Co." seguía siendo un problema real de agrupación de UI frente a simple volumen de datos de test — hace falta mirarlo con datos ya estables, no mientras cada ejecución de la suite sigue generando avisos nuevos de verdad contra este mismo proyecto.

### Con esto, la Fase 2 de `CONTEXT.md` queda cerrada (#1, #2, #10, N1, N2 — N2 ya desde la entrada 35)

Sigue la Fase 3 (#5: cerrar sesión, tipografía) — depende de la pregunta abierta 1 (fuente concreta), todavía sin resolver con el usuario.

## 2026-10-23 (39) — Fase 2 (#1, #10, N1): fuente única para "activa"/"pendiente" y filtro del Tablero legible

Primera pieza de la Fase 2 que no era un bug de datos sino de código — una vez limpiada la fuga de la entrada (38), que probablemente era la causa real de la mayoría de lo que parecía "incoherencia de contadores".

### #1 — Fuente única de verdad

`creator/index.vue` y `partner/index.vue` reimplementaban cada uno, por separado, el mismo filtro `status === 'accepted' || status === 'in_progress'` para "colaboraciones activas". Texto idéntico, pero nada impedía que uno cambiara sin el otro. Se extraen `isActiveCollaborationStatus(status)` e `isUnresolvedCollaborationStatus(status)` a `app/utils/status.ts` (documentadas ahí, un único sitio), y `useCollabRequests` (creador) y `useMyCollaborations` (partner) exponen ahora `activeCount`/`pendingCount` calculados con esas mismas funciones — las páginas ya no filtran nada por su cuenta.

### N1 — no era un fallo, era un nombre compartido para dos cosas distintas

Confirmado el diagnóstico de la entrada (35): `partner/index.vue` llamaba "Solicitudes pendientes" a un número **direccional** (solo las que de verdad esperan la respuesta del partner — las que propuso el creador), mientras que la pestaña "Pendientes" de `partner/requests.vue` cuenta **todas** las sin resolver, las propusiera quien las propusiera. Ambas correctas, mismo nombre. Se renombra el de Inicio a **"Por responder"** (el único cambio de texto de esta entrada) y se documenta la diferencia en `useMyCollaborations.ts` junto a los dos nuevos exports (`pendingCount` = todas, `awaitingMyResponseCount` = direccional). `partner/requests.vue` deja de reimplementar su `pendingCount` inline y usa el del composable.

### #10 — Filtro del Tablero: de "Alma Beauty Co." repetido a algo que se puede distinguir

Con los datos ya limpios, el creador de demo tiene 10 colaboraciones reales, las 10 con el mismo (único) partner de demo — así que el filtro seguía mostrando el mismo nombre repetido, solo que 10 veces en vez de 23. El roadmap pedía mostrar el título o agrupar por marca; como una `collaboration` no siempre tiene un paquete/título asociado (algunas nacen de "Contactar" en Descubrir, sin oferta), se usa en su lugar lo que sí existe siempre: presupuesto + estado. Cada opción del `<select>` de `PhaseBoard.vue` pasa de `"Alma Beauty Co."` a `"Alma Beauty Co. · 450,00 € · Completada"`.

### Prueba nueva, pedida explícitamente por `CONTEXT.md` ("añadir una prueba que compare los dos paneles con los mismos datos")

`tests/integration/collaboration-counters.spec.ts` (nuevo, 2 tests): crea 6 colaboraciones de prueba reales con las dos direcciones de `initiated_by` y los 5 estados representados, consulta ese mismo conjunto como creador y como partner, y comprueba que `isActiveCollaborationStatus`/`isUnresolvedCollaborationStatus` dan el mismo recuento en los dos lados sobre los mismos datos — y que las dos cuentas direccionales ("por responder" de cada lado) suman exactamente el total sin resolver, sin solape ni hueco.

### Verificado de verdad

- `npx vue-tsc --noEmit`: limpio. `npm test -- --run`: 30/30. `npm run build`: limpio.
- `npm run test:integration`: **62/62** (60 ya existentes + 2 nuevos), sin regresiones. Confirmado por API que el test nuevo no deja ninguna fila (`total collaborations` se queda en 18 antes y después).

### Pendiente

- #2 (bandeja de notificaciones saturada) es la pieza que falta de la Fase 2 — pendiente, es la más grande de las cuatro.
- El grupo ambiguo de colaboraciones de la entrada (38) y las preguntas abiertas 1/4/5 de `CONTEXT.md` siguen sin resolver.

## 2026-10-23 (38) — Tercera fuga, la más grave: `collaborations` tampoco cascadeaba, y es la causa real de los hallazgos #1 y #10

Al investigar el hallazgo #10 ("Todas las colaboraciones" repite "Alma Beauty Co." unas 23 veces) para empezar la Fase 2, apareció la pieza que faltaba para entender también el #1 (contadores incoherentes entre creador y partner): **`collaborations.offer_id` es, igual que `messages.offer_id`, `on delete set null` y no `cascade`**. El comentario que yo mismo escribí en la entrada (35) ("borra el paquete de prueba, cascada sobre offers/collaborations") daba por hecho algo que nunca se comprobó. Resultado real: cada ejecución del test "ciclo completo" dejaba, además de los mensajes ya corregidos, una `collaboration` real y permanente con `status='accepted'` y 111,11 € — invisible porque el propio test seguía en verde (solo comprueba que hay exactamente una collaboration para ESA oferta, no que no sobren de ejecuciones anteriores).

### Alcance real encontrado

Consultado contra Supabase real con `service_role` antes de tocar nada: **38 filas en `collaborations`**, de las cuales **18 con `budget_cents = 11111`** (exactamente el precio fijo del test) y **1 con `budget_cents = 5000`** (de la prueba manual de webhook de la entrada 37) — 19 en total, todas con `offer_id` ya `null` (huérfanas confirmadas, no colaboraciones en uso). Esto es casi con toda seguridad la causa real de "18 colaboraciones activas" en el Hoy del creador y de que el filtro del Tablero liste 23 veces la misma contraparte (#1 y #10 puede que no sean un bug de cómo se cuenta, sino de qué se cuenta).

### Arreglado

- `tests/integration/offers.spec.ts`: captura también el `id` de la `collaboration` creada (ya se leía su `status`/`budget_cents` para la aserción, solo faltaba pedir `id`) y la borra explícitamente con `admin` en el `finally`, antes de que el borrado del paquete la deje huérfana.
- Verificado con 4 ejecuciones limpias seguidas tras el fix (dos sueltas + la suite completa dos veces): el recuento de `budget_cents = 11111` se queda fijo, no vuelve a crecer.

### Limpieza de datos (mismo criterio explícito que las entradas anteriores)

Borradas las 19 filas huérfanas confirmadas (`budget_cents` en `{11111, 5000}`, todas con `offer_id` ya `null`). **Total de `collaborations` en el proyecto: de 38 a 18.**

**No tocadas, por falta de un criterio de "test" tan claro como el anterior** (quedan abiertas en la pregunta 5 de `CONTEXT.md`): un grupo de 6 filas creadas en el mismo segundo (2026-10-23 09:14:22-23, importes 300/350/600/400/700/500 €) que tiene toda la pinta de un script de seed de demo, no de basura; otro grupo de 4 filas del 2026-10-20 17:53:47-48 (900/0/2200/600 €), mismo patrón; dos filas sueltas de 32,00 €, sin origen identificado; las dos colaboraciones ligadas a los paquetes "Reel de lanzamiento 7505/7823" (400/450 €); y **la fila de 567 € (Paula Ibáñez, "requested")**, que coincide exactamente con el valor de referencia que el propio `CONTEXT.md` registró antes de cualquier cambio — se deja intacta a propósito.

### Verificado de verdad

- `npm run test:integration`: 60/60. `npm test -- --run`: 30/30.
- Confirmado por API: 0 filas con `budget_cents` en `{11111, 5000}` tras el borrado; total de `collaborations` = 18.

### Pendiente

- Decidir qué hacer con el grupo ambiguo de arriba (pregunta abierta 5).
- Con los datos ya mucho más limpios, seguir con la Fase 2 (#1 fuente única de contadores, #10 deduplicar el filtro del Tablero por colaboración en vez de listar entradas sueltas, #2 bandeja de notificaciones, N1 renombrar para no confundir).

## 2026-10-23 (37) — Decisión del entorno de pruebas + segunda fuga de mensajes de test encontrada y cerrada

El usuario decide no crear un segundo proyecto de Supabase por ahora: este proyecto sigue sirviendo de entorno de pruebas mientras se avanza, y más adelante se clonará su esquema a uno vacío para datos reales. Esto reabre la Fase 1 (#3) con otra vuelta: antes de seguir con la Fase 2, se revisó el estado real de los datos de test en Supabase.

### Segunda fuga encontrada (mismo bug, la mitad que quedó sin cubrir)

El arreglo de la entrada (35) solo capturaba el mensaje de **sistema** que inserta `respond_offer()`. Pero `create_offer()` inserta OTRO mensaje, el texto de la propia oferta ("oferta de test de integración", `kind='offer'`), también con `offer_id` — y el mismo `on delete set null` lo dejaba huérfano igual. Resultado: cada ejecución del test "ciclo completo" seguía dejando un segundo mensaje permanente en el chat real, sin detectarse porque el test en verde no lo delataba.

- `tests/integration/offers.spec.ts`: captura también el mensaje de `kind='offer'` (vía `admin`, igual que el de sistema) y lo borra en el `finally`.
- Verificado: dos ejecuciones seguidas del test con la cuenta de `oferta de test de integración` quedándose fija en 16 (no 18) — confirma que ya no crece.

### Limpieza de datos (criterio explícito, no un borrado sin filtro)

Revisado contra Supabase real con `service_role`, antes de borrar nada:
- 16 mensajes `body = 'oferta de test de integración'` — todos con `offer_id` ya `null` (huérfanos confirmados por el mismo bug). Borrados.
- 1 mensaje `body = 'test webhook'` (50,00 €, de una prueba manual anterior de `webhook-idempotency.mjs`, no generado por ningún script automático) — mismo patrón, `offer_id` ya `null`. Borrado.
- **No tocados, por falta de criterio claro para calificarlos de "test"**: los paquetes "Reel de lanzamiento 7505" y "7823" (450 €) y sus ofertas/colaboraciones asociadas — no coinciden con ningún patrón de nombre generado por un script conocido del repo; podrían ser datos de prueba manual del propio equipo o contenido de demo real. Quedan pendientes de que el desarrollador confirme si son basura o demo válida (pregunta abierta 5 de `CONTEXT.md`, todavía sin resolver).

### Verificado de verdad

- `npm run test:integration`: 60/60.
- Confirmado por API: 0 filas restantes con esos dos textos exactos tras el borrado.

### Pendiente

- Preguntas abiertas 1 (fuente tipográfica), 4 (definición de "colaboración activa"/"entrega próxima"/"solicitud pendiente") y 5 (qué hacer con "Reel de lanzamiento 7505/7823") de `CONTEXT.md` siguen sin resolver.
- Se sigue sin hacer una copia/exportación de los datos de Supabase antes de limpiar, como pedía la Fase 0 — pendiente de decidir si hace falta ya que el entorno seguirá siendo el mismo por ahora.
- Continúa con la Fase 2 del plan (#2, #1, #10, N1) a partir de aquí.

## 2026-10-23 (36) — Fase 1 (#4): las credenciales demo ya no viajan en el bundle de producción

Siguiente pieza del plan de `CONTEXT.md`, la única de la Fase 1 que no dependía del segundo proyecto de Supabase (pendiente de crear). El hallazgo #4 pedía comprobar "si las credenciales están en el código del cliente" — lo estaban.

### Lo encontrado

`login.vue` ya ocultaba el botón de acceso demo en producción con `v-if="isDev"` (protección ya existente). Pero `demoAccounts`/`demoPassword` se definían sin ninguna condición en el `<script setup>` — confirmado leyendo el bundle real tras `npm run build`: el email (`feedma.test`) y la contraseña (`feedma-demo-2026`) estaban en texto plano en el JS de cliente que se sirve a cualquiera, aunque el botón nunca se renderizara.

### Arreglado

Las asignaciones se movieron dentro de `if (import.meta.dev) { ... }`. Vite sustituye esa expresión por un booleano literal en tiempo de build, y el minificador elimina la rama entera (con sus cadenas) cuando es `false` — no es solo "no se ve", es que ya no existe en el archivo.

### Verificado de verdad

- `npx vue-tsc --noEmit` y `npm test -- --run` (30/30): limpios.
- Build de producción limpio desde cero (`rm -rf .output && npm run build`) y confirmado por `grep` que ni `feedma-demo-2026` ni `feedma.test` aparecen en ningún archivo de `.output/public` ni `.output/server`.
- Sin verificar en vivo en modo desarrollo (el servidor de `npm run dev` no estaba corriendo en este momento) — el comportamiento en dev no cambia de todas formas, ya que `import.meta.dev` sigue siendo `true` ahí.

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
