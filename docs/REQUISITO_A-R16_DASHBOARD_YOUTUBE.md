# Requisito A-R16: dashboard de analítica de YouTube

> Estado: **requisito incorporado al plan; NO implementado.** Este documento hace la auditoría de lo que existe, el catálogo de métricas viables, el encaje en el pipeline y las dependencias. No se ha cambiado código, esquema ni permisos. El diseño de la estructura de pantalla (componentes concretos) se propondrá **antes de la fase de interfaz**, como pide el requisito.
> Fecha: 2026-10-28. Requisito de producto original: el texto "FEEDMA — Mejora del dashboard de métricas de YouTube" recibido de Alex (no se duplica aquí).

## 1. Decisión de encaje

- **Nuevo ID: A-R16** (Redes, prioridad 5, complejidad alta). No interrumpe el trabajo en curso.
- **Se sitúa después de A-R2 y A-R3** (estado y desconexión de cuentas: el dashboard necesita saber si la cuenta está operativa, caducada o revocada y llevar a "Reconectar") **y de A-R1 en YouTube** (hasta verificar el flujo con un canal real no hay datos reales con los que validar nada).
- **Va en paralelo a A-R8a**, no detrás de A-R8b: ver el hallazgo de §3.
- No toca flujos de colaboraciones, pagos ni aceptación. No toca otras redes.

| Subtarea | Contenido | Depende de | Cambia esquema |
|---|---|---|---|
| **A-R16a** | Auditoría y catálogo de métricas (este documento) | — | No |
| **A-R16b** | Datos en vivo por periodo: endpoint ampliado, sin guardar nada nuevo | A-R1 (YouTube), A-R2 | No |
| **A-R16c** | Dashboard principal: cabecera, tarjetas, gráfica con periodos, comparación, estados | A-R16b | No |
| **A-R16d** | Vídeos: búsqueda, orden, rendimiento por periodo, detalle individual | A-R16b | No |
| **A-R16e** | Histórico propio de acumulados (snapshots) | A-R8a aprobada | Sí (ya incluido en la propuesta de esquema) |
| **A-R16f** | Animaciones y pulido | A-R16c/d | No |

## 2. Qué existe hoy frente al requisito

Código leído: `server/api/social/youtube-channel-stats.get.ts`, `server/utils/youtube.ts`, `app/pages/creator/metrics/[platform].vue` (293 líneas), `app/components/charts/*`.

| Requisito | Hoy |
|---|---|
| Avatar, nombre, fecha de alta | Sí |
| Suscriptores, vistas totales, nº de vídeos, media de vistas por vídeo | Sí (Data API v3) |
| Evolución | Solo **28 días fijos**: vistas y neto de suscriptores (Analytics API), con mejor día y una **proyección a 30 días** calculada con los últimos 7 |
| Selector de periodos, comparación con el periodo anterior | No |
| Vídeos recientes | Los **8 últimos**, con vistas, likes, comentarios y duración; sin búsqueda, orden ni filtros; sin detalle |
| Gráficas | Componentes propios en SVG (`EvolutionLineChart`, `NetChangeBarChart`, `BarChart`, `MiniSparkline`…). **No hay librería de gráficas**, y no hace falta añadir ninguna |
| Banner, enlace al canal, última sincronización, estados de conexión | No |
| Reconexión | Mensaje genérico ("reconecta en Redes"); `evolution = null` si falta el permiso de analítica |

### Hallazgos de la auditoría (relevantes para el requisito)

1. **El dato desconocido se convierte en cero.** `likeCount` y `commentCount` salen de `Number(v.statistics?.likeCount ?? 0)`: si el creador oculta los likes o desactiva los comentarios, la API omite el campo y hoy se muestra **0**. Choca con el principio de "no confundir ausencia con cero".
2. **Cada visita llama a Google en vivo** (cuatro o cinco llamadas encadenadas, sin caché) y además **escribe** en `social_accounts` (token y seguidores).
3. **La proyección a 30 días** es una extrapolación simple, no una cifra de YouTube. Debe etiquetarse siempre como estimación de FEEDMA, o retirarse.
4. **La ausencia de histórico se detecta por un `catch` genérico:** cualquier fallo (red, cuota, permiso) acaba como "reconecta". No distingue permiso ausente de error temporal. Lo resuelve A-R2 (estados explícitos).
5. El endpoint solo devuelve datos del usuario autenticado y ningún token llega al navegador: la privacidad actual es correcta y debe conservarse.

## 3. Hallazgo clave: el histórico no obliga a guardar nada para empezar

La API de YouTube Analytics ya conserva y devuelve series por fecha: `startDate`/`endDate`, `dimensions=day`, también por vídeo. Por tanto **7, 28, 90 y 365 días y la comparación con el periodo anterior se pueden pedir en vivo**, igual que hoy los 28 días, **sin migración**.

Lo que **sí** exige almacenamiento propio es lo que Google **no** da con histórico:
- Los **acumulados** (suscriptores totales, vistas totales, nº de vídeos) tal como estaban cada día pasado: la Data API solo da el valor actual.
- La lectura del **partner** (A-R15) y el funcionamiento **sin token válido** (cuenta revocada o desconectada).
- Resistencia a cuota y a latencia (hoy cada visita son varias llamadas).

Por eso la dependencia con el esquema se reduce a A-R16e, y A-R16b/c/d no esperan a ninguna migración. El requisito pedía no desarrollar interfaz sobre datos insuficientes: la interfaz de A-R16c/d se apoya en datos que sí existen en vivo.

**Cambio propuesto a la propuesta de esquema** (`PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md`, tabla `social_account_snapshots`): añadir `views_total bigint null` y `videos_count integer null` junto a `followers_count` (que pasa a `null`able, por si el canal oculta sus suscriptores). Así los snapshots guardan los acumulados completos de la cuenta y la tabla no se rediseña después.

## 4. Catálogo de métricas

Contrastado con la documentación oficial de YouTube Analytics (métricas y informes de canal) el 2026-10-28. **Nada probado con un canal real.**

| Métrica | Origen | Permiso | Tipo | ¿Solo canal propio? | ¿Necesita almacenamiento? | Si no está disponible |
|---|---|---|---|---|---|---|
| Suscriptores | Data API `channels.statistics.subscriberCount` | `youtube.readonly` | Acumulada | Canal público, pero aquí el propio | Para su evolución histórica, sí (snapshots) | Puede estar **oculta** (`hiddenSubscriberCount`): mostrar "oculto", no 0 |
| Visualizaciones totales, nº de vídeos | Data API `channels.statistics` | `youtube.readonly` | Acumulada | Ídem | Idem | — |
| Vídeos recientes: título, miniatura, duración, vistas | Data API `videos.list` | `youtube.readonly` | Acumulada | Ídem | No | — |
| Likes y comentarios por vídeo | Data API `videos.statistics` | `youtube.readonly` | Acumulada | Ídem | No | **El campo puede faltar** (likes ocultos, comentarios desactivados): mostrar "—", no 0 |
| Banner del canal | Data API `channels.brandingSettings` | `youtube.readonly` | Dato del canal | Ídem | No | Sin banner: cabecera sin imagen. **Pendiente de confirmar** que el campo se devuelve con el permiso actual |
| Visualizaciones por día | Analytics `views` (`dimensions=day`) | `yt-analytics.readonly` | Temporal | Sí, con la cuenta propietaria | No (la API conserva el histórico) | Sin permiso: reconectar |
| Suscriptores ganados / perdidos | Analytics `subscribersGained`, `subscribersLost` | Ídem | Temporal | Sí | No | Ídem |
| Tiempo de visualización | Analytics `estimatedMinutesWatched` | Ídem | Temporal | Sí | No | Ídem |
| Duración media de visualización | Analytics `averageViewDuration` | Ídem | Temporal | Sí | No | Ídem |
| Porcentaje medio visto | Analytics `averageViewPercentage` | Ídem | Temporal | Sí | No | Ídem |
| Me gusta, comentarios, compartidos en un periodo | Analytics `likes`, `comments`, `shares` | Ídem | Temporal | Sí | No | Ídem |
| Rendimiento por vídeo en un periodo | Analytics por vídeo (`filters=video==ID` o dimensión de vídeo) | Ídem | Temporal | Sí | No | Ídem |
| **Impresiones y CTR de miniaturas** | **No confirmado**: no figuran en la página oficial de métricas consultada (solo aparecen métricas de tarjetas y anotaciones, que son otra función) | — | — | — | — | **Fuera del alcance hasta confirmarlo** con una prueba real o la referencia completa. No se promete |

Notas:
- La Analytics API tiene retraso de procesado de 1–2 días (ya contemplado en el código actual: `endDate` = hace 2 días). La documentación consultada no da cifras de latencia: **sin verificar**.
- Una variación porcentual solo se muestra si el periodo anterior tiene datos completos y el divisor no es 0 (principio del requisito).

## 5. Qué es viable, qué depende de otra cosa y qué queda para después

| Funcionalidad | Estado |
|---|---|
| Periodos 7/28/90/365 y comparación con el periodo anterior | **Viable en vivo** (A-R16b/c). Se habilita cada periodo solo si la API devuelve datos completos |
| Tarjetas con suscriptores, vistas, vídeos, media, vistas 7 y 28 días, neto de suscriptores | **Viable** |
| Tiempo de visualización, duración media, % visto, likes/comentarios/compartidos del periodo | **Viable** (misma API, mismo permiso). Se confirmará nombre y disponibilidad con un canal real |
| Vídeos: búsqueda por título, orden por fecha/vistas/interacción, filtro por fecha de publicación | **Viable**; ampliar de 8 vídeos a un listado paginado (más llamadas a la API) |
| Detalle de un vídeo | **Viable** con Analytics por vídeo; comparar con "lo habitual del canal" exige un criterio definido |
| Distinguir acumulado de rendimiento del periodo por vídeo | **Viable** (Analytics por vídeo en el periodo) |
| Estados "reconectar" / error / operativa / sin analíticas | **Depende de A-R2** (hoy no hay estado persistente) |
| "Última sincronización" real | **Depende de A-R2** (`last_synced_at`); mientras tanto solo se puede decir "datos cargados ahora" |
| Evolución histórica de suscriptores/vistas acumulados anterior a empezar a guardarlos | **No existe** en Google; empieza a acumularse al activar A-R16e |
| Banner, impresiones/CTR | Banner pendiente de confirmar; **impresiones/CTR no confirmados** |
| Resumen interpretativo y vídeos destacados | **Viable con reglas transparentes** sobre datos reales (p. ej. "supera la media de vistas de tus últimos N vídeos"); sin IA ni causalidad |
| Recomendaciones con IA, vista del partner, informes de colaboración | **Fuera** (futuro: A-R15 y FEEDMA Studio) |

## 6. Riesgos y coordinación

- **Verificación real:** las cuentas demo no tienen canal de YouTube. La validación con datos reales solo es posible con el canal de Alex (que ya tiene una fila de YouTube con token). Las pruebas de interfaz con ese canal las hará Alex en su navegador; yo puedo ver estados vacíos y de error.
- **Cuotas:** la Data API tiene una cuota diaria por proyecto y la Analytics API otra; ampliar a más llamadas por visita (vídeos paginados, comparativas) puede consumirla. **Cifras sin verificar**; se medirá y, si hace falta, se añade caché en servidor o se usan snapshots (A-R16e).
- **Permiso de analítica:** las cuentas conectadas antes de añadir `yt-analytics.readonly` no devuelven histórico. La reconexión usa el flujo existente (`/api/auth/youtube/start`), sin crear otro OAuth.
- **Modo "Prueba" de Google:** si la app de Google está en ese modo, los refresh tokens podrían caducar a los 7 días (a confirmar en su documentación): afecta al diseño de A-R2.
- **Sin dependencias nuevas:** las gráficas se hacen extendiendo los componentes SVG existentes (tooltip, ejes, transiciones). Solo se pedirá autorización si se demuestra que no basta.
- **Datos privados:** el dashboard muestra analítica privada del creador. No se expone a partners ni a otros usuarios hasta A-R15, con RLS y decisión explícita.
- **Archivos compartidos:** las páginas de métricas son de Alex. Mario no las toca; el aviso es solo si cambia `app/types/index.ts` o `mock-data.ts` (solo añadir al final del bloque propio).

## 7. Cuándo y cómo se continuará

1. Mientras tanto no se escribe código de este requisito.
2. Al llegar a A-R16b/c: **primero** se presenta la estructura del dashboard (componentes nuevos y modificados, orden de bloques, estados) para tu revisión; después se desarrolla por fases, validando cada una.
3. Antes de A-R16e: la tabla de snapshots (con las dos columnas añadidas aquí) forma parte de la propuesta de esquema que ya requiere tu aprobación.
