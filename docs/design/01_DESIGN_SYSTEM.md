# CIBERAN · Sistema de diseño «Señal»

> Guía para que cualquier pantalla nueva respete la identidad sin decidir de nuevo colores, tamaños o radios.
> Estado: **Fase 1 (fundamentos) implementada.** Los componentes (Fase 2), el shell (Fase 3) y las pantallas (Fase 4) se irán documentando aquí.
> Propuesta y razonamiento: [00_PROPUESTA_FASE0.md](00_PROPUESTA_FASE0.md). Lienzo visual: https://claude.ai/artifact/CMy3yfWPDDgMDWByoRGSZ6

## 1. Filosofía

- **Papel y tinta.** Fondo hueso cálido, texto y bloques fuertes en tinta casi negra. La interfaz se lee como un estudio editorial, no como un panel genérico.
- **Una firma, un significado.** El voltio (lima) marca lo activo y la acción principal de una pantalla. Nunca es un estado ni se usa como texto sobre fondo claro.
- **Cada elemento tiene una función.** Si quitarlo no hace perder información ni orientación, sobra. Un solo canal por significado: si el tinte y el texto ya dicen el estado, no se añade un punto ni un icono.
- **Lectura cómoda.** 16 px es el tamaño de lectura; 14 px solo para metadatos y listas densas.

### Lo que no se hace
- Cursivas serif u otras familias «de acento». Dos familias y ya.
- Etiquetas en mayúsculas espaciadas sobre cada bloque.
- Degradados o formas orgánicas sueltas. El único gráfico de marca es el **motivo de ondas** (los arcos del símbolo, trazo fino, baja opacidad) y solo en portada, cabecera de marca y tarjeta destacada.
- Iconos-tópico (chispa para la IA, cohete, varita).
- Puntos de «no leído» sin número.
- Sombras para separar tarjetas en reposo: se usa borde.

## 2. Dónde está cada cosa

```
app/assets/css/
  main.css            índice: importa todo en orden (único CSS que carga Nuxt)
  tokens.css          tokens (+ alias de transición de los nombres antiguos)
  base.css            elementos HTML: fondo, texto, foco, selección
  motion.css          transiciones de Vue, animaciones, movimiento reducido
  utilities.css       utilidades propias (.nx-scroll, .is-scroll-locked)
  components/         un archivo por componente: brand-mark, button, field, chip,
                      tabs, card (+panel, section-title, page-header, stat), pill
                      (fase y estado de colaboración), avatar, data-list, empty
                      (+skeleton), waves, platform, loading, prose, cover-art,
                      post-card (+columna del tablero)
  patterns/           patrones de pantalla: shell (barra lateral, superior, inferior),
                      landing (portada, integraciones, acceso/alta, pantalla de marca), home
app/components/brand/   BrandMark.vue (logotipo), WaveMotif.vue (motivo de ondas)
app/components/ui/      BaseButton, IconButton, BaseField/BaseInput/BaseTextarea/BaseSelect,
                        Chip, SegmentedTabs, BaseCard, PanelCard, SectionTitle, PageHeader,
                        DataList, PhaseChip, CollabStatus, StatusPill (adaptador), BaseAvatar,
                        EmptyState, SkeletonBlock, CoverArt, LoadingOverlay
app/components/layout/  AppShell, SideRail, TopBar, BottomTabBar, AuthShell
public/img/newlogo.jpeg   logotipo original (luz sobre negro): fuente de todo lo demás
public/img/brand/       mark-*.png (símbolo con transparencia), icon-*.png, apple-touch-icon.png
public/favicon.ico
scripts/design/build-brand-assets.mjs   regenera todo lo anterior desde newlogo.jpeg
scripts/design/check-contrast.mjs       contraste de las combinaciones del sistema
```

## 3. Tokens

### 3.1 Color

| Token | Valor | Uso |
|---|---|---|
| `--color-tinta-950` | `#121019` | Texto principal, bloques oscuros, botón primario |
| `--color-tinta-800` / `-700` | `#2a2633` / `#3a3544` | Hover del primario; texto sobre tintes |
| `--color-tinta-500` | `#57515f` | Texto secundario |
| `--color-tinta-400` | `#66606f` | Metadatos (≥ 4,5:1 incluso sobre hueso-200) |
| `--color-hueso-100` | `#f5f1ea` | Fondo de la app |
| `--color-hueso-50` | `#fbf9f5` | Tarjetas, paneles, campos |
| `--color-hueso-200` | `#ece6db` | Superficies hundidas: pistas de pestañas, rellenos suaves |
| `--color-voltio-400` | `#c6f24e` | **Firma**: indicador activo, botón de marca (texto tinta) |
| `--color-voltio-200` | `#e6fab0` | Selección de texto, resaltados |
| `--color-coral-400` | `#ff6b4a` | Energía en portada. Sin significado |
| `--color-lila-600` / `-200` | `#5b40e0` / `#e5ddff` | **Solo predicción** |
| `--color-cobalto-600` | `#2e47d6` | Enlaces, anillo de foco, series de datos |
| Tintes | mantequilla `#ffe28a`, menta `#bdebd5`, cielo `#c9ddff`, rosa `#ffd3de` | Fondos de bloques; texto siempre tinta |

**Nombres semánticos** (usar estos en componentes): `--surface-app`, `--surface-raised`, `--surface-sunken`, `--surface-inverse`, `--line`, `--line-strong`, `--text-strong`, `--text-muted`, `--text-faint`, `--text-on-inverse`, `--text-on-inverse-muted`, `--focus-ring`, `--link`.

### 3.2 Estados

**Fases de una publicación:** chip rectangular (radio 8) con el tinte y texto tinta. El color fuerte solo en la cabecera de columna del tablero y en gráficas.

| Fase | Fuerte | Tinte |
|---|---|---|
| Idea | `--color-phase-idea` `#6e6878` | `--color-phase-idea-tint` |
| En producción | `--color-phase-production` `#9a6500` | `…-production-tint` (mantequilla) |
| Para revisar | `--color-phase-review` `#b8186a` | `…-review-tint` (rosa) |
| Programado | `--color-phase-scheduled` `#2e47d6` | `…-scheduled-tint` (cielo) |
| Publicado | `--color-phase-published` `#137a52` | `…-published-tint` (menta) |
| Fuera de plazo / error | `--color-danger` `#b41f33` | `--color-danger-tint` (texto rojo, es una alerta) |

**Estado de una colaboración:** píldora con contorno, sin relleno ni icono; solo «Rechazada» en rojo. La forma la distingue de una fase.

**Predicción:** lila, como cifra y barra.

### 3.3 Tipografía

| Familia | Token | Uso |
|---|---|---|
| Bricolage Grotesque (500–800) | `--font-display` (clase `font-display`) | Títulos y cifras; interletrado −0,02 em |
| Bricolage Grotesque 800 | `--font-brand` (clase `wordmark`) | Solo logotipo |
| Hanken Grotesk (400–700) | `--font-sans` | Todo el texto |

Escala (genera las clases `text-micro`, `text-sm`, `text-base`, `text-lg`, `text-title`, `text-headline`, `text-display`, `text-hero`, con su interlineado):

| Clase | Tamaño | Uso |
|---|---|---|
| `text-micro` | 12 px | Contadores, notas legales |
| `text-sm` | 14 px | Metadatos, listas densas, etiquetas (peso 600) |
| `text-base` | 16 px | Lectura |
| `text-lg` | 18 px | Entradillas, títulos de tarjeta |
| `text-title` | 22 px | Títulos de panel |
| `text-headline` | 26 → 34 px | Título de página |
| `text-display` | 36 → 56 px | Cifras héroe, cabeceras de sección |
| `text-hero` | 56 → 120 px | Portada |

### 3.4 Espaciado, radios, sombras, movimiento

- **Espaciado:** paso de 4 px de Tailwind. Ritmo: `--gap-tight` 8, `--gap` 16, `--gap-loose` 24, `--section` 48/64, `--card-padding` 20/24.
- **Controles:** `--control-sm` 36, `--control-md` 44 (mínimo táctil), `--control-lg` 52, `--field-height` 48.
- **Radios:** `xs` 8 (chips de fase), `sm` 12 (campos), `md` 20 (tarjetas), `lg` 28 (paneles, hojas), `xl` 40 (héroe), `pill` (botones, pestañas, píldoras). La **esquina de señal** (una esquina a 10 px) solo en la tarjeta destacada.
- **Sombras:** `--shadow-1` reposo sutil, `--shadow-2` hover, `--shadow-3` capas flotantes (hojas, menús).
- **Movimiento:** `--dur-fast` 120 ms, `--dur` 200 ms, `--dur-slow` 320 ms, `--dur-sheet` 420 ms; curvas `--ease-out`, `--ease-in-out`, `--ease-spring-out` (rebote leve, solo microinteracciones). Solo `transform` y `opacity`. Con `prefers-reduced-motion` todo pasa a 1 ms y termina en el estado final.

## 4. Marca

- **Símbolo:** la manta raya dentro de un círculo abierto, en blanco y voltio. Fuente única: `public/img/newlogo.jpeg` (luz sobre negro). `node scripts/design/build-brand-assets.mjs` convierte la luminosidad en transparencia y genera `img/brand/mark-{192,512,1024}.png`, los iconos de instalación (192, 512, maskable, Apple), el favicon (`favicon.ico` 16/32/48) y `icon-16/32.png`. Si cambia el logotipo, se sustituye ese archivo y se vuelve a ejecutar el script.
- **El símbolo es claro: necesita fondo oscuro.** Sobre fondo claro se pierden las partes blancas, así que va siempre dentro de una ficha de tinta.
- **Wordmark:** «ciberan» en minúsculas, Bricolage Grotesque 800, como texto (no forma parte del archivo del logotipo).
- **Componente:** `<BrandMark />` con `tone="light"` (fondo oscuro: sin ficha) o `tone="ink"` (fondo claro: el símbolo sobre ficha de tinta de ese alto), `:size` (alto del símbolo en px), `:wordmark="false"` para solo el símbolo, y `label=""` cuando acompaña a un texto que ya dice «CIBERAN».
- **Titular con la marca como texto** (h1 de la portada): clase `wordmark`.
- **Motivo de ondas:** `<WaveMotif />`. Anillos abiertos concéntricos que salen del círculo del símbolo, en trazo fino y baja opacidad (≤ 0.22), con el color del contenedor. Es el único gráfico de marca: portada, bloque destacado, llamada final, acceso, pantallas de error y portadas generadas (`CoverArt`).
- **Sin hormigas** (ni en la portada, ni en las pantallas de carga ni en el pie): la identidad anterior queda retirada.

## 4b. Componentes

Todos mantienen las props que ya usaban las pantallas, salvo que se indique.

| Componente | Variantes y notas |
|---|---|
| `BaseButton` | **Hover:** una capa se rellena de izquierda a derecha con los colores invertidos y el texto cambia a juego (`brand` voltio/tinta → tinta/voltio; `primary` tinta → voltio; `secondary` y `outline` → tinta; `destructive` → rojo; `ghost` solo un relleno suave). Cada variante solo define `--btn-bg`, `--btn-fg`, `--btn-fill`, `--btn-fg-hover`. `primary` (tinta) · `brand` (voltio; una por pantalla) · `secondary` · `outline` · `ghost` · `destructive` (`danger` es alias) · `inverse` y `outline-inverse` (sobre tinta). `sm` 36 · `md` 44 · `lg` 52 px. `loading` (spinner, `aria-busy`, bloquea), `block`, `iconOnly` |
| `IconButton` | `label` obligatorio (nombre accesible). `ghost`/`secondary`/`outline`/`primary`/`inverse`, `sm`/`md` |
| `BaseField` + `BaseInput`/`BaseTextarea`/`BaseSelect` | El campo pone etiqueta, ayuda, error (`role="alert"`) y éxito con la misma jerarquía y entrega `id`, `aria-describedby` e `invalid` al control: `<BaseField label="…" v-slot="f"><BaseInput v-bind="f" v-model="x" /></BaseField>`. Controles de 48 px, radio 12, foco cobalto, `icon`, `suffix`, `autosize` en el textarea. **Los campos sueltos de las pantallas usan las clases `.input`, `.textarea`, `.select`** (mismo aspecto sin envolverlos) |
| `Chip` | Etiqueta, o filtro seleccionable si recibe `selected` (usa `aria-pressed`). `tint`, `outline`, `size="sm"` |
| `SegmentedTabs` | Indicador con CSS (`--tab-count`, `--tab-index`); opciones del mismo ancho; flechas del teclado |
| `BaseCard` | `tone="overlay"` (hundida), `radius`, `padding` como antes; `variant="featured"` (tinta + esquina de señal), `tint` (voltio, mantequilla, menta, cielo, rosa), `interactive` |
| `PanelCard`, `SectionTitle`, `PageHeader`, `DataList` | Contenedor con título y acción · título de sección · cabecera de página · pares etiqueta/valor con `<dl>` (vacío = «—», nunca 0) |
| `PhaseChip` / `CollabStatus` | **Dos sistemas separados.** Fase de publicación: chip rectangular con tinte, texto tinta. Estado de colaboración: píldora con contorno, sin relleno (solo «Rechazada» en rojo). El color lo decide el CSS por `data-status`; el TS solo da la clave. `StatusPill` queda como adaptador de `PhaseChip` |
| `BaseAvatar` | Foto o iniciales; el matiz va en `--hue`. Tamaños `sm`/`md`/`lg`/`xl` |
| `StatTile` | Cifra con `tint` y `large`; sin borde lateral |
| `AnimatedMark` | Símbolo animado (pantalla de carga y portada): barrido circular que lo revela, entrada con escala, destello que recorre solo la silueta, flotación y, con `rings`, ondas. Todo CSS (máscara cónica con `@property --reveal`); con movimiento reducido se ve quieto |
| `WeekColumns`, `PhaseStack` | Gráficas de resumen sin librerías. Columnas con las entregas de los próximos 7 días (pendientes y publicadas; «hoy» en voltio) y barra apilada del reparto por fase. Las alturas llegan como variables CSS (`--pending`, `--done`, `--max`, `--pct`); son imágenes accesibles con el detalle en su `aria-label`. Datos en `utils/home-charts.ts` (puro, con tests) |
| `CoverArt` | Portada sin foto: tinte de la paleta + anillos, estable a partir de `seed` |
| `SmartImage` | **Toda foto de contenido (portadas, avatares) va por aquí.** Las de la app (Storage público y `/img/`) se piden a `/api/img` en webp, al tamaño exacto y con `srcset` 1x/2x; `loading="lazy"` salvo `priority`; `width`/`height` reservan la caja; debajo va `CoverArt` o las iniciales, así que nunca hay un hueco en blanco. Lo que no es de la app (blob:/data:) se pinta tal cual |
| `EmptyState`, `SkeletonBlock` | El esqueleto recibe sus medidas como variables (`--sk-w`, `--sk-h`, `--sk-r`) |

## 4b-bis. Imágenes: cómo se mantienen rápidas

- **Nunca un `<img>` con la URL original** de una foto subida: pesa de cientos de KB a varios MB. Usar `SmartImage` (o `NuxtImg` para las fotos estáticas de la landing).
- **`/api/img`** (`server/api/img.get.ts`, lógica pura y testeada en `server/utils/image-proxy.ts`): redimensiona con `sharp`, sirve webp y guarda el resultado en memoria (300 entradas) y en disco (`.data/img-cache`); las peticiones simultáneas de la misma imagen comparten una descarga. **Lista cerrada de orígenes** (Storage público de la app y `/img/`): cualquier otra URL da 400. Cabeceras `immutable` de un año (la URL lleva `?v=` y cambia al subir otra foto).
- **Fotos locales:** `node scripts/design/optimize-photos.mjs` reduce `public/img/pexels-*.jpg` (1,1–2,9 MB → 59–165 KB).
- **Medido** (Descubrir del creador, 10 tarjetas): originales 19 MB → ~95 KB; primera visita de la historia ~4,9 s (descarga las originales), cualquier visitante posterior ~1 s.
- `/_ipx/**` (landing) lleva cabeceras de caché largas; **no** se le puede poner `cache` de Nitro (deja las respuestas colgadas).

## 4c. Patrones de pantalla

- **Ancho:** el contenido ocupa **todo el ancho** disponible (sin tope); el relleno sale de `--content-pad`, que un bloque a sangre compensa con márgenes negativos.
- **Menú lateral plegable:** botón en la cabecera de la columna; 256 → 80 px con transición de ancho, textos recortados y desvanecidos, iconos centrados con `title`. El estado se guarda en la cookie `ciberan-rail-collapsed` (`useRailState`), no en localStorage, para que el servidor pinte el estado correcto sin parpadeo.
- **Cabecera de perfil** (`ProfileHero`, `components/profile-hero.css`): el banner toca los bordes superior y laterales del contenedor; el avatar (`--avatar-d`, 6,5 rem en móvil y 9,5 rem en escritorio) se superpone al 50 % sobre el banner.
- **Shell** (`patterns/shell.css`): columna lateral de tinta a **altura completa** (el fondo llega hasta el final de la página; arregla V-02) con la navegación fija dentro; indicador activo de voltio sobre su borde. En móvil, barra superior y **barra inferior flotante en píldora de tinta**: solo la pestaña activa muestra su texto y se pinta de voltio; las demás llevan el texto solo para lectores de pantalla. Los contadores (`.badge`) llevan siempre número.
- **Públicas** (`patterns/landing.css`): portada de tinta con titular grande, símbolo y motivo de ondas; las cinco fases visibles; mosaico («bento») con tamaños distintos; perfiles de uso; llamada final; pie. **Todo el contenido es visible sin JavaScript ni animación**: la entrada de cada bloque (`.reveal`) es un efecto de `animation-timeline: view()` con `fill-mode: forwards`, que si el navegador no lo admite simplemente no ocurre (arregla V-01).
- **Acceso y alta:** `AuthShell` (panel de marca a la izquierda en escritorio; el logotipo aparece una sola vez en cada tamaño; arregla V-04).
- **Inicio** (`patterns/home.css`): cabecera editorial con una frase de estado calculada de datos reales, cifras con tinte, un único bloque destacado y listas de actividad sin una caja por fila.
- **Descubrir** (`patterns/discover.css`, `DiscoverBrowser`): una sola vista para los dos roles (`kind` = lo que se lista). Barra con `Explorar | Con IA`, buscador por nombre (cliente, instantáneo) y `Guardados`; filtros en columna fija a la izquierda (hoja inferior en móvil) que **se aplican solos** a los 0,4 s; «Con IA» sí lleva botón (cuesta una llamada al modelo). Recomendados arriba solo con criterio (categorías o IA); rejilla de 12 en 12 con carga automática (`IntersectionObserver`) y botón de respaldo. Tarjeta (`DiscoveryCard`): un solo enlace extendido sobre el nombre (sin botones dentro de botones), guardar y contactar por encima.
- **Tablero** (`components/post-card.css`): columnas sobre fondo hundido con la cabecera de fase en su color fuerte como barra superior (el título va en tinta: tres de los cinco colores fuertes no llegan a 4,5:1 como texto); la tarjeta dice la fase una vez, con el chip de fase, que además es el selector.

## 5. Convenciones CSS

- **Identidad en CSS, maquetación en Tailwind.** Colores, tipografía, radios, sombras y estados salen de tokens o clases de componente; Tailwind para `flex`, `grid`, `gap`, márgenes y responsive.
- **BEM:** `.card`, `.card__header`, `.card--featured`. Estados con `is-*` o atributos (`data-state`, `aria-*`).
- **Anidación nativa de un nivel con `&`** (`&:hover`, `& .card__title`, `&.card--featured`, `@media` dentro de la regla). `&-sufijo` es Sass y no funciona: Lightning CSS (dentro de Tailwind 4) aplana la anidación al compilar.
- **Capas:** `@layer base` (base.css), `components` (componentes y transiciones), `utilities`. Una utilidad de Tailwind gana a un componente sin `!important`.
- **Valores calculados desde Vue → variables CSS** (`--progress`, `--hue`, `--brand-size`), nunca propiedades visuales en `:style`.
- **Prohibido en código nuevo:** hex sueltos en `.vue`, tamaños de letra arbitrarios (`text-[0.8125rem]`), `!important`, estilos escritos desde JavaScript (`el.style…`), y los **alias de transición** de `tokens.css` (`--color-primary-500`, `--color-ink`…), que desaparecen al terminar la Fase 4.

## 6. Comprobar

- `node scripts/design/check-contrast.mjs`: contraste de las 31 combinaciones del sistema (sale con 1 si alguna falla). No mide las combinaciones añadidas después (títulos sobre `surface-sunken`, etc.): esas se calculan a mano con la misma fórmula WCAG.
- `scripts/demo-video/ux-capture.mjs`: capturas a 390, 768, 1 024 y 1 440 px con axe, contra la app de demo y el Supabase local.
