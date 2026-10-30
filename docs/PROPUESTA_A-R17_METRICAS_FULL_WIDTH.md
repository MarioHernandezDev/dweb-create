# Propuesta A-R17: Métricas a ancho completo (rediseño y usabilidad)

Fecha: 2026-10-29 · Autor: [Alex] · Estado: **fases A-R17a–f implementadas (2026-10-30)** · Cambia esquema: **no**

Fases hechas: a (ancho completo), b (jerarquía y barra de periodo fija), c (gráfica alta y mini-tendencias), d (rejilla y filtros de vídeos), e (índice de Métricas, adelantada), f (táctil y pulido). Detalle y verificación en `docs/CHANGELOG.md` (Alex-27, 28 y 29). Siguen fuera, por depender de datos reales o de esquema: impresiones/CTR y otros informes, histórico propio (A-R16e) y métricas por publicación (A-R7/A-R8b).

Pedido: aprovechar todo el ancho, rediseño visual integral, mejor usabilidad, más funcionalidades útiles y animaciones, sin inventar datos y sin interrumpir las tareas de seguridad y arquitectura del pipeline.

## 1. Auditoría de la ventana actual

Código revisado: `app/pages/creator/metrics/index.vue`, `[platform].vue`, `app/components/youtube/*` (12 componentes), `useYoutubeAnalytics`, `useYoutubeVideos`, `useYoutubeVideoPerformance`, `useYoutubeVideoDetail`, `useSocialAccountActions` y los endpoints `server/api/social/youtube-*`.

### Qué hay ya (A-R16, todo con datos reales y en vivo)

| Pedido del texto | Estado |
|---|---|
| Evolución de visualizaciones y suscriptores | Hecho (gráfica con pestañas Vistas / Suscriptores / Tiempo) |
| Periodos 7, 28, 90 y 365 días + comparación con el periodo anterior | Hecho (solo se ofrece un periodo si el canal ya existía entero; sin % si el anterior es incompleto o 0) |
| Visualizaciones recientes frente a acumuladas | Hecho (Total del canal / Últimos N días; en cada vídeo, TOTAL frente a periodo) |
| Tiempo de visualización, duración media, % visto, me gusta, comentarios, compartidos | Hecho |
| Vídeos con mejor rendimiento | Hecho (orden "Más vistos en el periodo", observación del vídeo más visto) |
| Búsqueda, filtros y ordenación de vídeos | Hecho (búsqueda sin tildes, orden, filtro por fecha, paginación) |
| Detalle de un vídeo | Hecho (con comparación frente a lo habitual del canal y su criterio visible) |
| Indicadores de tendencia | Parcial: observaciones con criterio visible; falta un indicador de tendencia a simple vista |
| Última sincronización y estado de las analíticas | Hecho (cabecera del canal y banner de estados) |
| Animaciones | Hecho (A-R16f; respetan `prefers-reduced-motion`) |

### Problemas reales que quedan (los de este rediseño)

1. **Ancho:** `AppShell` limita el contenido a 1100 px salvo que se le pase `fullWidth`, y además cada bloque de YouTube se corta a `md:max-w-4xl` (896 px). En un monitor de 1440–1920 px queda más de la mitad vacía y la gráfica, que es lo que más necesita ancho, queda estrecha. La restricción es **propia de la página y de estos componentes**: `fullWidth` ya existe como opción de `AppShell`, así que no hace falta tocar otras páginas.
2. **Composición monótona:** todo es una columna de bloques de ancho similar (cabecera → tarjetas → gráfica → observaciones → vídeos). Las observaciones, que son lo que ayuda a interpretar, están debajo de la gráfica sin relación visual con ella.
3. **Vídeos:** lista de 2 columnas con mucho texto repetido ("TOTAL" y "ÚLTIMOS 28 DÍAS" en cada tarjeta); en ancho completo caben 3–4 columnas y una barra de filtros fija.
4. **Índice de Métricas** (`/creator/metrics`): solo muestra seguidores por red; es el sitio de las conexiones desde que se eliminó Redes, pero sigue siendo una cuadrícula pequeña sin jerarquía.
5. **Tendencia a simple vista:** hay cifras y deltas, pero no un indicador compacto (p. ej. mini-gráficas por tarjeta) que permita ver la dirección sin abrir la gráfica grande.
6. **Móvil y tablet:** el móvil (390 px) está verificado; la tablet (768–1024 px) no se ha revisado a propósito y es donde el cambio de 4 a 2 columnas puede dar saltos.

## 2. Distribución propuesta (escritorio ≥ 1280 px, rejilla de 12 columnas)

```
┌─ Cabecera del canal (ancho completo): avatar · estado · actualizado hace… · Actualizar ─────────────┐
├─ Barra de periodo (sticky al hacer scroll): [7][28][90][365]  ☐ Comparar            ──────────────┤
├───────────────────────────────┬──────────────────────────────────────────────────────────────────┤
│ SUSCRIPTORES (héroe, 4 col)   │  Visualizaciones · Tiempo visto · Neto subs · Duración media     │
│ grande, mini-tendencia        │  % visto · Me gusta · Comentarios · Compartidos  (8 col, 4×2)    │
├───────────────────────────────┴───────────────────────────────┬──────────────────────────────────┤
│ EVOLUCIÓN (8 col): gráfica alta, pestañas, comparación        │ OBSERVACIONES (4 col, columna     │
│                                                                │ lateral con su criterio visible)  │
├────────────────────────────────────────────────────────────────┴──────────────────────────────────┤
│ VÍDEOS: barra de filtros fija · rejilla de 3–4 columnas · detalle en hoja lateral ancha            │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Totales del canal (pie, secundario) · Conexiones                                                    │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Tablet (768–1279 px):** 2 columnas; el héroe ocupa una fila, la gráfica ancho completo y las observaciones debajo de ella.
- **Móvil (< 768 px):** una columna como ahora, con la barra de periodo fija y las tarjetas en 2 columnas.
- Diferencias de tamaño con sentido: un héroe, ocho tarjetas pequeñas, una gráfica grande, una columna lateral de texto y una rejilla de vídeos; no una sucesión de tarjetas iguales.
- Identidad: tokens ya existentes de FEEDMA (`--color-platform-youtube`, `--color-chart-primary`, `font-display`), sin dependencias nuevas.

## 3. Mejoras de usabilidad

- **Barra de periodo fija** (sticky) para cambiar de periodo sin volver arriba al estar en la lista de vídeos; hoy el selector queda lejos de los vídeos.
- **Mini-tendencia** (sparkline) en las tarjetas con serie diaria (visualizaciones, tiempo, suscriptores netos), reutilizando los datos que ya llegan. Sin serie = no se dibuja.
- **Observaciones junto a la gráfica** para que se lean con ella.
- **Vídeos:** rejilla más densa, barra de filtros fija, tarjeta con menos texto repetido (encabezados una sola vez en la barra).
- **Táctil:** objetivos ≥ 44 px, filtros en una hoja inferior en móvil, y el tooltip de la gráfica con toque (hoy es sobre todo ratón/teclado).
- **Retirar redundancias:** el bloque "Total del canal" pasa a un papel secundario (el héroe de suscriptores lo sustituye arriba); "Gestionar conexión" y el aviso de estado se unifican.
- **Estados:** se mantienen los diseñados (cargando, reconectar, fallo pasajero, analíticas no disponibles, canal reciente, datos ocultos), adaptados a la nueva rejilla.

## 4. Funcionalidades: qué es viable

| Funcionalidad | Viabilidad | Depende de |
|---|---|---|
| Indicador de tendencia por tarjeta (sparkline) | **Viable ya** (datos existentes) | nada |
| Observaciones junto a la gráfica | **Viable ya** | nada |
| Hoja de detalle más grande / panel lateral | **Viable ya** (la hoja ancha ya existe) | nada |
| **Impresiones y CTR de miniaturas** | **No confirmado** (ver `REQUISITO_A-R16` §4): no se promete. Se confirmará con una consulta real a tu canal antes de diseñar nada | prueba con el canal real |
| Otros informes de YouTube Analytics (origen del tráfico, dispositivos, países, retención) | **Por auditar**: el permiso `yt-analytics.readonly` ya cubre los informes de canal, pero cada informe se verifica con tu canal real antes de ofrecerlo | prueba con el canal real |
| **Histórico propio de acumulados** (suscriptores/visualizaciones totales por día, resistencia a cuota y a cuenta revocada) | Necesita almacenamiento propio: tabla `social_account_snapshots` (M3) | **A-R8a / A-R16e: migración que requiere tu aprobación y coordinar con Mario** |
| Métricas de **publicación** (vincular entrega ↔ vídeo, A-R7) | Necesita `post_external_links` (M2) | A-R7 / A-R8b, migración aprobada |
| Instagram con la misma profundidad | Necesita insights de Meta | A-R6 (permiso `instagram_business_manage_insights` por verificar) |

Regla de siempre: **ningún dato, histórico ni porcentaje inventado**. Si falta, estado vacío informativo con una acción útil (reconectar, esperar 1–2 días, etc.).

## 5. Fases (cada una pequeña y validada antes de seguir)

| Fase | Contenido | Esquema | Cómo se valida |
|---|---|---|---|
| **A-R17a** | `fullWidth` en las páginas de Métricas, retirar los `max-w-*` de los bloques de YouTube y rejilla base de 12 columnas con los bloques actuales | No | Navegador a 390, 768, 1280 y 1920 px; sin desbordes; capturas |
| **A-R17b** | Héroe de suscriptores + tarjetas del periodo en rejilla 4×2; barra de periodo fija | No | Unitarios de lo que cambie; navegador |
| **A-R17c** | Gráfica ancha + columna lateral de observaciones; mini-tendencias en tarjetas | No | Unitarios (sparklines con huecos, sin serie = nada); navegador |
| **A-R17d** | Rejilla de vídeos de 3–4 columnas con barra de filtros fija; detalle con panel más grande | No | Navegador a todos los anchos |
| **A-R17e** | Índice de Métricas como centro de redes (resumen + conexiones + acceso a cada red) coherente con el nuevo estilo | No | Navegador con filas de prueba |
| **A-R17f** | Pulido táctil (objetivos, tooltip con toque, filtros en hoja inferior), transiciones al cambiar de periodo, revisión con `prefers-reduced-motion` | No | Navegador móvil/tablet |
| *(posterior)* | Impresiones/CTR y otros informes | No si se confirma; sí si se guarda histórico | **Prueba con el canal real primero** |
| *(posterior)* | Histórico propio de acumulados | **Sí (M3)** | **Tu aprobación + Mario** |

## 6. Dónde entra en el pipeline

- **Es solo presentación** (A-R17a–f no tocan RLS, migraciones, permisos ni sincronización), así que **no compite** con las tareas de seguridad y arquitectura pendientes (A-R4, esquema M2/M3, A-R7/A-R8) y puede hacerse en cualquier momento.
- Va **después de A-R16 (cerrada salvo A-R16e)**: reutiliza sus componentes y composables en lugar de duplicarlos.
- Lo que depende de esquema (histórico, A-R7/A-R8b) queda explícitamente **fuera** de A-R17 y ligado a A-R8a/A-R8b.
- **Aviso de coordinación:** las páginas de Métricas son de Alex. `AppShell` es compartido, pero la opción `fullWidth` ya existe y se activa solo desde estas páginas.

## 7. Qué necesito de ti

Solo una decisión de alcance: **¿apruebas empezar por A-R17a (ancho completo)?** El resto de decisiones de implementación (nombres, tamaños exactos, orden interno de las fases) las tomo yo dentro de este alcance.
