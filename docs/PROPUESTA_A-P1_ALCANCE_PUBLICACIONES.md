# Propuesta A-P1: alcance pendiente de la segunda vuelta de UX de publicaciones

> Estado: **PROPUESTA, nada implementado.** El README original del backlog ya no existe; este alcance se reconstruye **solo** a partir de lo que dicen el CHANGELOG (entradas 49–52 y 54), el código actual y el anexo de `TRABAJO_ALEX.md`. No he visto la interfaz en un navegador en esta sesión, así que lo que sigue son hipótesis a comprobar, no defectos confirmados.
> Fecha: 2026-10-28.

## 1. Qué consta como hecho (no se rehace)

- "Fuera de plazo" real y frase de "qué hacer ahora" (49). Revisión del partner (aprobar / pedir cambios) en Calendario y detalle, componente `PostReviewActions.vue` (49).
- Una sola capacidad de edición entre panel y página completa; explicación del concepto de publicación donde se decide (50). Corregido un 500 por orden de ejecución en `usePostEditorPanel.ts` (51).
- Columnas vacías del Tablero colapsables en móvil, con selector de fase por card (52).
- Verificado en navegador (Chromium, 390 y 1280 px) en las entradas 51 y 52.

## 2. Qué consta como pendiente o sin verificar

| Origen | Pendiente |
|---|---|
| CHANGELOG 51 y 52 | El **arrastre real** (eventos de `vuedraggable`) nunca se ha probado; solo el selector de fase, que comparte `moveTo` |
| CHANGELOG 52 | Qué ocurre al arrastrar **hacia una columna plegada** en móvil |
| CHANGELOG 50 | "Revisión general de los demás estados vacíos (filtros sin resultado, 'Sin solicitudes pendientes'…)" |
| Anexo `TRABAJO_ALEX.md` | Los textos de contexto no deben repetir lo que ya dice el estado |
| CHANGELOG 49 | `overdue` solo se calcula en cliente; ningún código lo guarda (decisión documentada) |
| `PENDIENTES.md` §5 | Safari/Firefox/tablet/lector de pantalla → **de Mario (M-U3)**, fuera de A-P1 |

## 3. Mejoras concretas propuestas (apruebas cuáles)

| ID | Propuesta | Tipo | Archivos previstos | Criterio de aceptación |
|---|---|---|---|---|
| P1-a | Probar de verdad el arrastre en el Tablero: a columna abierta, a columna plegada (móvil), con límite WIP alcanzado, y que se revierte si falla el guardado | Verificación (cambio solo si falla) | `PhaseBoard.vue` solo si hay fallo | Resultado de cada caso en el CHANGELOG, a 390 px y escritorio |
| P1-b | Auditar los estados vacíos del Tablero y Calendario (`PhaseBoard.vue:251-256`, `WeekBoard.vue:32-40`): sin publicaciones, sin resultados por filtro, colaboración sin entregas; unificar el texto y la acción sugerida | Revisión + ajuste de texto | `PhaseBoard.vue`, `WeekBoard.vue` | Cada estado vacío dice qué falta y ofrece la siguiente acción; sin textos duplicados |
| P1-c | Revisar textos de contexto frente al anexo ("no repetir lo que ya dice el estado") en `BoardCard.vue`, `PostEditSheet.vue`, `PostDetailSheet.vue` | Copia | los tres | Lista de textos revisados y cambiados |
| P1-d | Comprobar que cada control sin texto del Tablero tiene `aria-label` real (selector de fase, plegar columna, WIP) | Accesibilidad básica | `BoardCard.vue`, `PhaseBoard.vue` | Verificado leyendo el DOM renderizado, no el código |

**Mi recomendación:** aprobar **P1-a** (es la única comprobación que falta de verdad) y **P1-b**; dejar **P1-c** y **P1-d** como opcionales. No propongo rediseños nuevos: no he encontrado en CHANGELOG ni en el código un defecto confirmado que los justifique.

## 4. Necesidades y riesgos

- **Herramienta de navegador (revisado 2026-10-28):** no hay herramienta de navegador integrada en esta sesión ni `playwright`/`puppeteer` en `node_modules`. Sí hay Chrome y Edge instalados, Node 22 con `WebSocket` global y un servidor de desarrollo en `localhost:3000`. **No hace falta instalar ninguna dependencia:** se puede manejar Chrome por su protocolo de depuración (CDP) con un script de Node sin paquetes, guardado fuera del repositorio. Si resultara demasiado frágil para el arrastre, la alternativa sería `playwright-core` como dependencia de desarrollo temporal (como en la entrada 51), y solo entonces se pediría autorización.
- **Efecto sobre datos reales:** iniciar sesión con una cuenta demo genera una notificación "Has iniciado sesión" (Mario ya limpió ~25 de ellas). Es un residuo mínimo pero real; las pruebas de solo lectura (A-R10) lo producirían igualmente.
- Las pruebas usarían las cuentas demo y crearían publicaciones de prueba que se borrarían al terminar. Comparten datos con Mario (M-F1 también las usa): avisarle.
- Sin riesgo para Supabase: no se prevén migraciones, RLS ni RPC. `PhaseBoard.vue` sincroniza `board` con `posts` a mano alrededor de `vuedraggable`: cualquier cambio exige probar arrastrando de verdad.

## 5. Qué necesito de ti

- [ ] ¿Qué mejoras apruebas (P1-a … P1-d)?
- [ ] ¿OK a que el login de las pruebas genere esas notificaciones en las cuentas demo?
