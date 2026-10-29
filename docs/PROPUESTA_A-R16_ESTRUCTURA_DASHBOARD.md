# Propuesta A-R16: estructura del dashboard de YouTube

> Estado: **PROPUESTA para revisar, nada construido.** El requisito (`REQUISITO_A-R16_DASHBOARD_YOUTUBE.md` §13) pide presentar primero la estructura y los componentes. Hasta tu visto bueno no se escribe interfaz.
> Fecha: 2026-10-29. Base ya hecha: el endpoint `GET /api/social/youtube-analytics` (A-R16b), probado por Alex con su canal.

## 1. Principios de diseño

- **Sin dependencias nuevas.** Se reutiliza lo que ya hay: gráficos SVG propios, `SegmentedTabs`, `StatTile`, `EmptyState`, `BaseCard`, `gsap` (ya instalado) y el manejo de `prefers-reduced-motion` (`useGsap.ts`, `main.css`).
- **Nada inventado.** Un dato que Google no da se muestra como "—" con su motivo, nunca como 0; los días sin dato son un hueco en la gráfica; sin porcentaje si el periodo anterior es incompleto.
- **Acumulado frente a periodo, siempre rotulado.** Cada tarjeta lleva una etiqueta "Total del canal" o "Últimos N días".
- **Estados diseñados, no improvisados.** Carga, reconexión, error pasajero, datos parciales, sin datos, sin vídeos.
- **Mismo flujo de reconexión** que ya existe (sin un segundo OAuth).

## 2. Qué existe y qué cambia

| Pieza actual | Qué pasa |
|---|---|
| `app/pages/creator/metrics/[platform].vue` (293 líneas, mezcla todas las redes) | Para YouTube delega en un componente nuevo `YoutubeDashboard`; el resto de redes no cambia |
| `EvolutionLineChart.vue` (tiene tooltip al pasar el ratón o tocar, sin ejes ni leyenda) | Se **amplía de forma aditiva**: eje Y con valores, segunda serie del periodo anterior (línea discontinua), huecos donde no hay dato, transición al cambiar de periodo |
| `StatTile.vue` | Se reutiliza para las métricas secundarias; las principales usan una tarjeta nueva más grande |
| `SegmentedTabs.vue` | Selector de periodo y de métrica del gráfico, tal cual |
| `youtube-channel-stats.get.ts` | Pasa a devolver solo cabecera, acumulados y vídeos. **Se le quita la evolución de 28 días** (la da ahora `youtube-analytics`) para no llamar dos veces a la API. Se le añade el id del canal (para el enlace "Ver en YouTube") |
| No existe ningún skeleton en la app | Se crea `ui/SkeletonBlock.vue` |

## 3. Componentes nuevos (`app/components/youtube/`)

| Componente | Función |
|---|---|
| `YoutubeDashboard.vue` | Orquesta las dos fuentes de datos y los estados; es lo único que la página conoce |
| `YoutubeChannelHeader.vue` | Avatar, nombre, **estado de la conexión**, "actualizado hace…" (`last_synced_at`), botón Actualizar, "Ver en YouTube" y "Gestionar conexión" |
| `YoutubeStateBanner.vue` | Los estados: reconectar, fallo pasajero ("no hace falta reconectar"), datos parciales, analíticas no disponibles |
| `YoutubePeriodBar.vue` | 7 / 28 / 90 / 365 días (los no disponibles deshabilitados, con el motivo) y conmutador "Comparar con el periodo anterior" |
| `YoutubeKpiCard.vue` + `YoutubeKpiGrid.vue` | Tarjetas con jerarquía: una **protagonista** y las demás secundarias, icono, etiqueta, valor, variación y tooltip "qué es esto" |
| `YoutubeEvolutionPanel.vue` | Pestañas de métrica (Visualizaciones / Suscriptores netos / Tiempo visto) y la gráfica ampliada |
| `YoutubeVideosPanel.vue` | Lista con miniatura, duración, fecha, vistas, me gusta, comentarios; búsqueda, orden y enlace al vídeo |
| `YoutubeInsights.vue` | Observaciones con **criterio visible** (fase posterior) |

Composables nuevos: `useYoutubeAnalytics` (pide cada periodo, lo guarda en memoria para no repetir llamadas al cambiar de pestaña y cancela la petición anterior) y `useCountUp` (contador animado con `gsap`, que se salta la animación si hay "menos movimiento").

## 4. Estructura de la pantalla

```
┌─ Cabecera del canal ───────────────────────────────────────────────┐
│ [avatar] Nombre   ● Conectada · actualizado hace 3 h   [Actualizar] │
│          Ver en YouTube · Gestionar conexión                        │
└─────────────────────────────────────────────────────────────────────┘
[ Banner de estado, solo si hace falta: reconectar / fallo pasajero ]

Periodo: [ 7 ][ 28 ][ 90 ][ 365 ]      ☐ Comparar con el periodo anterior

TOTAL DEL CANAL
┌─────────────────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ SUSCRIPTORES (grande)   │ │ Visualiz.│ │ Vídeos   │ │ Media por│
│ 12,4 mil                │ │ totales  │ │ publicad.│ │ vídeo    │
└─────────────────────────┘ └──────────┘ └──────────┘ └──────────┘

ÚLTIMOS 28 DÍAS            (cada tarjeta con ▲▼ vs. periodo anterior si es válido)
┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐
│Visualiz.││Tiempo   ││Suscript.││Duración ││% medio  ││Me gusta,│
│         ││visto    ││netos    ││media    ││visto    ││comentar.│
└─────────┘└─────────┘└─────────┘└─────────┘└─────────┘└─────────┘

EVOLUCIÓN   [ Visualizaciones | Suscriptores netos | Tiempo visto ]
┌─────────────────────────────────────────────────────────────────┐
│  gráfica ancha: eje Y, línea del periodo + línea discontinua del │
│  anterior, tooltip con la fecha y los dos valores, leyenda       │
└─────────────────────────────────────────────────────────────────┘

VÍDEOS   [buscar…] [orden ▾] [publicados: todo ▾]
 lista / cuadrícula con miniatura, duración, fecha, métricas

OBSERVACIONES (con criterio visible)                  (fase posterior)
```

En móvil (390 px) todo se apila: la tarjeta protagonista a ancho completo, las demás en 2 columnas, los selectores con scroll horizontal y la gráfica a ancho completo con la lista de vídeos debajo.

## 5. Estados (los que se diseñan expresamente)

| Estado | Qué se ve |
|---|---|
| **Cargando** | Skeletons con la forma exacta de cada bloque (sin saltos de maquetación); al cambiar de periodo solo se renueva lo que depende de él |
| **Reconectar** (caducado, revocado, faltan permisos) | Banner con el motivo y el botón Reconectar; los totales del canal desaparecen o quedan atenuados según el caso |
| **Fallo pasajero** | "No hace falta reconectar, inténtalo en unos minutos" + Reintentar |
| **Datos parciales** | Las tarjetas que no se pudieron obtener muestran "—" con tooltip del motivo; el resto se ve normal |
| **Sin histórico suficiente** | Periodos deshabilitados con el motivo ("el canal tiene menos de N días"); comparación oculta |
| **Sin vídeos** | Estado vacío propio |
| **Canal con suscriptores ocultos** | "Oculto por el canal", no 0 |

## 6. Animaciones (discretas y útiles)

Entrada escalonada de los bloques al cargar, contadores animados en las tarjetas principales, transición de la línea al cambiar de periodo y de métrica, y elevación sutil al pasar el ratón en tarjetas y vídeos. Todo respeta `prefers-reduced-motion` (los contadores y entradas se saltan) y no retrasa que los datos estén visibles.

## 7. Fases y cómo se valida cada una

| Fase | Contenido | Cómo se comprueba |
|---|---|---|
| **A-R16c.1** | `SkeletonBlock`, cabecera del canal, banner de estados, tarjetas de totales del canal, y se mueve la página a `YoutubeDashboard` | Estados con tokens falsos (reconectar) en navegador; **tus datos reales** los ves tú |
| **A-R16c.2** | Selector de periodo, tarjetas del periodo con variación, gráfica ampliada con comparación | Tests unitarios de formato y reglas; renderizado en navegador con **datos de prueba claramente marcados** (ver abajo); tu canal real lo ves tú |
| **A-R16d** | Vídeos: búsqueda, orden, filtro, rendimiento por periodo y detalle | Igual |
| **A-R16f** | Contadores, entradas y pulido responsive | Navegador a 390 px y escritorio |

**Aviso sobre cómo pruebo yo:** las cuentas demo no tienen canal de YouTube, así que no puedo ver datos reales. Para revisar el diseño, mi script de navegador **interceptará la respuesta del endpoint con datos fabricados de prueba**. Eso es un arnés de pruebas mío, no entra en el producto, y lo dejaré anotado. **Lo que veas con tu canal real es lo que cuenta**; yo no puedo afirmar que algo funciona con datos reales sin que lo veas tú.

## 8. Lo que queda fuera de esta propuesta

- **Impresiones y CTR** de miniaturas: no figuran en la documentación consultada.
- **Banner del canal**: sin confirmar que se pueda leer con el permiso actual. La cabecera funciona bien sin él; si se confirma, se añade.
- **Histórico propio de acumulados** (suscriptores totales por día pasado): depende de la tabla de la migración M3. Hasta entonces la gráfica de suscriptores muestra el **neto** (ganados menos perdidos), que Google sí da por fecha.
- **Vista del partner, informes de colaboración e IA**: otras tareas (A-R15, FEEDMA Studio).

## 9. Qué necesito de ti

Una sola decisión: **¿apruebas esta estructura** (componentes, orden de bloques, estados y fases)? Si quieres cambiar algo, dime qué: por ejemplo qué tarjeta es la protagonista (propongo **Suscriptores**), si prefieres los vídeos antes que la gráfica, o si algo sobra.
