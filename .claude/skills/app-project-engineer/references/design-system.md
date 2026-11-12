# Sistema de diseño «Señal»

Fuente completa: `docs/design/01_DESIGN_SYSTEM.md`. Aquí solo lo que se necesita para no romper la coherencia. Lee ese documento (secciones 3, 4b o 4c) solo si necesitas un token, componente o patrón que no aparece aquí.

## Principios

- Papel y tinta: fondo hueso cálido, texto en tinta casi negra, **modo claro único** (sin toggle de tema).
- El **voltio (lima)** marca lo activo y la acción principal de una pantalla; nunca un estado ni texto sobre fondo claro.
- Un canal por significado (si el tinte y el texto ya dicen el estado, no añadas punto ni icono). Si quitar un elemento no pierde información, sobra.
- Borde, no sombra, para separar tarjetas en reposo. Dos familias tipográficas y nada más.
- **No hacer:** cursivas serif, etiquetas en mayúsculas espaciadas, degradados, iconos-tópico (chispa/cohete/varita), puntos de «no leído» sin número. El único gráfico de marca es el motivo de ondas (`WaveMotif`), solo en portada, cabecera de marca y tarjeta destacada.

## Tipografía y tokens

- Hanken Grotesk (lectura) y Bricolage Grotesque (títulos, cifras, logotipo) vía `@nuxt/fonts`.
- Tokens en `app/assets/css/tokens.css` (`--font-*`, `--text-*`, `--color-tinta-*`, `--color-hueso-*`, `--color-voltio-*`, `--color-lila-*`, `--color-coral-400`, `--color-cobalto-600`, `--color-mantequilla`, `--color-menta`, `--color-cielo`, radios, espaciado). 16 px lectura; 14 px solo metadatos/listas densas.
- Los **alias de transición** de `tokens.css` (`--color-primary-500`, `--color-ink`, …) no se usan en código nuevo. Busca el token real en `tokens.css` antes de usar un valor.

## Dónde vive cada cosa

```
app/assets/css/main.css        índice (único CSS que carga Nuxt; importar aquí cualquier archivo nuevo)
tokens.css · base.css · motion.css · utilities.css
components/*.css               un archivo por componente (button, card, field, chip, tabs, pill, avatar, data-list, empty, post-card…)
patterns/*.css                 patrones de pantalla (shell, home, collab, collab-hub, collab-detail, discover, insights, landing, proposal, public-profile, settings, lists)
app/components/ui/             BaseButton, IconButton, BaseField/BaseInput/BaseSelect/BaseTextarea, BaseCard, PanelCard, SectionTitle, PageHeader, Chip, SegmentedTabs, DataList, EmptyState, SkeletonBlock, StatusPill, PhaseChip, CollabStatus, BaseAvatar, BottomSheet, ToastHost, ConfirmDialogHost, SmartImage/CoverImage…
app/components/layout/         AppShell, AuthShell, PublicShell, SideRail, TopBar, BottomTabBar
app/components/charts/         BarChart, MiniSparkline, PhaseStack, StatTile, WeekColumns
```
Antes de crear un componente visual: `ls app/components/ui` y busca uno que sirva.

## Convenciones CSS (obligatorias en código nuevo)

- Identidad en CSS (tokens/clases de componente); **maquetación en Tailwind** (`flex`, `grid`, `gap`, márgenes, responsive).
- **BEM** (`.card`, `.card__header`, `.card--featured`); estados con `is-*` o `data-*`/`aria-*`. Anidación nativa de un nivel con `&`; **`&-sufijo` (Sass) no funciona**.
- Capas: `@layer base`, `components`, `utilities`.
- Valores calculados desde Vue → variables CSS (`--progress`…), no propiedades visuales en `:style`.
- **Prohibido:** hex sueltos en `.vue`, tamaños de letra arbitrarios (`text-[0.8125rem]`), `!important`, estilos desde JS (`el.style…`).
- Accesibilidad: imágenes con `alt`, botones de icono con `aria-label`, foco visible, `BottomSheet` atrapa el foco.
- Responsive: se valida a **390 px** y escritorio. Chrome probado; Safari/Firefox sin probar (desconocido).

## Comprobar

`node scripts/design/check-contrast.mjs` (31 combinaciones del sistema; no mide las añadidas después). Capturas a 390/768/1024/1440 px con `scripts/demo-video/ux-capture.mjs` (requiere la app de demo y Supabase local: no es rutina).
