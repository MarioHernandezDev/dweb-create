# CIBERAN — Fase 0: auditoría y propuesta artística y técnica

> 2026-11-04 · Encargo: [`diseño-nuevo.md`](../../diseño-nuevo.md) · Punto de partida: [`docs/audit/09_DESIGN_REPORT.md`](../audit/09_DESIGN_REPORT.md).
> **Estado:** propuesta. No se ha modificado código de la app en esta fase.
> **Versión visual:** lienzo privado con el sistema, el inicio de escritorio y el del móvil: https://claude.ai/artifact/CMy3yfWPDDgMDWByoRGSZ6

## 0. Qué se ha inspeccionado (y cómo)

| Fuente | Qué se hizo | Resultado |
|---|---|---|
| Informe de diseño (09) | Lectura completa | Base de la deuda: sin escala tipográfica, sin campo de formulario común, páginas duplicadas, navegación dispersa |
| `main.css`, `nuxt.config.ts`, Tailwind/PostCSS | Lectura y prueba de compilación | Tailwind 4.3.3 con `@tailwindcss/vite`; **no hay `postcss.config` ni `tailwind.config`** (todo en CSS). **CSS Nesting comprobado:** una regla anidada (`&:hover`, `& .card__title`, `&.card--featured`, `@media` dentro de la regla) compilada con el mismo motor de la app (Lightning CSS vía `@tailwindcss/node`) sale aplanada correctamente → se puede usar nesting sin depender del soporte del navegador |
| Componentes | Lectura de `components/ui` (17), `layout` (5) y recuentos sobre `app/**/*.vue` | Ver §1.3 |
| **Pantallas reales** | App actual compilada (`nuxt build`) contra el **Supabase local** con los datos ficticios de la demo; `scripts/demo-video/ux-capture.mjs` a **390, 768 y 1 440 px**, 14 páginas, más axe | 42 capturas + informe axe (carpeta de trabajo, no versionada). 1 024 px queda para la verificación de la Fase 6 |
| Referencia Dribbble (Passion.io) | **No se ha podido ver la imagen**: Dribbble bloquea las peticiones automáticas y no he intentado esquivar ese bloqueo. He usado la información pública de la marca de Passion.io | Ver §2.1. **Si me pegas capturas del shot, ajusto la propuesta a lo que se ve en él** |
| Estilos en JavaScript | Búsqueda de `:style`, `style=`, `element.style`, GSAP y mapas de color en TS | Ver §1.4 |

## 1. Diagnóstico de lo que se ve hoy

### 1.1 Impresión general (capturas)
- **Parece un panel SaaS correcto pero genérico:** violeta estándar, barra lateral índigo, tarjetas crema con borde fino repetidas en todas las pantallas. La «ficha de rodaje» (borde izquierdo negro grueso en las cifras) es el único rasgo propio y se lee como pesado, no como marca.
- **Mucho espacio sin intención:** en «Hoy» la columna derecha queda medio vacía; en Métricas, 4 de las 6 filas de «Conexiones» son redes que no se pueden conectar («Próximamente»).
- **Ilustraciones de relleno:** las portadas de publicaciones y perfiles sin foto son el mismo arco degradado en distintos tonos; en Descubrir dominan la pantalla.
- **La marca no aguanta el nombre nuevo:** la fuente Snasm dibuja la «a» y la «n» como minúsculas, y el logotipo se lee «CIBERan». El símbolo sigue siendo una «F».

### 1.2 Fallos concretos encontrados en las capturas
| # | Dónde | Qué pasa |
|---|---|---|
| V-01 | Portada pública | En la captura de página completa, **secciones enteras salen vacías** (fases, roles, llamada final): el contenido empieza con opacidad 0 y solo aparece cuando GSAP lo anima al hacer scroll. Sin JavaScript, para buscadores o si el scroll no dispara, no se ve. Además el contenido real (las 5 fases) no se lee de un vistazo |
| V-02 | Escritorio, páginas largas | La barra lateral oscura termina a la altura de la ventana; por debajo queda fondo blanco (visible en Descubrir y Métricas) |
| V-03 | Métricas | El aviso dice que alcance e interacciones «todavía no están conectados», cuando ya existe el código de métricas por publicación (desfasado) |
| V-04 | Login | Logotipo dos veces (cabecera y panel), y la cabecera solo tiene «Integraciones» centrado: composición descompensada |
| V-05 | Perfil del creador, 390 px | Desborda 39 px (U-01, sigue abierto) |
| — | axe | Siguen abiertos U-04 (contraste, 33 nodos en 10 páginas), U-05 a U-08 |

### 1.3 Componentes y patrones (recuentos en `app/**/*.vue`)
- 99 campos de formulario sin componente; la misma cadena de clases copiada 64 veces.
- 108 `<button>` crudos frente a 119 `BaseButton`; 46 `BaseCard` frente a secciones-tarjeta montadas a mano.
- 10 tamaños de letra arbitrarios (13 px es el habitual) y 6 tamaños de título.
- Páginas duplicadas por rol: Descubrir (66 % de líneas iguales), Perfil (54 %), Colaboraciones (52 %), Inicio (29 %).

### 1.4 Presentación metida en JavaScript
| Tipo | Dónde | Propuesta |
|---|---|---|
| **Color de estado decidido en TS** (`statusMeta.color`, `collaborationStatusMeta.color`, 32 mapas de color) y pintado con `:style="{ color/background }"` (~55 de los 94 `:style`) | `utils/status.ts`, tablero, píldoras, gráficas, plataformas | El TS solo da la **clave** (`data-status="ready_for_review"`, `data-platform="youtube"`); el color lo decide el CSS |
| **Mismo color para conceptos distintos** | `status.ts`: «Pendiente de respuesta» usa el color de «Para revisar», «Aceptada» el de «Programado», «En curso» el de «En producción», «Completada» el de «Publicado» | Dos sistemas visuales separados (ver §3.3) |
| Portadas generadas (`hsl(${hue}…)` + rayas) en estilo inline | `DiscoveryCard`, `FeaturedDeck`, `HomeHeroCard`, tablero | Variable CSS `--hue` y la textura en una clase |
| Degradados inline (`style="background: linear-gradient…"`) | `FeaturedDeck`, `HomeHeroCard`, `InstallHero` | Clases de patrón (`.scrim`, `.hero-wash`) |
| `document.body.style.overflow` / `documentElement.style.overflow` | `BottomSheet`, `LandingNav` | Clase en `<html>` (`.is-scroll-locked`) |
| Autoaltura del textarea con `t.style.height` | `ChatComposer` | `field-sizing: content` en CSS donde exista, con la medición actual como respaldo, escrita en una variable CSS |
| Animaciones de aparición con `gsap.set(opacity: 0)` | `useScrollReveal`, landing | Aparición en CSS (`[data-reveal]` + `IntersectionObserver` que solo cambia un atributo); el contenido es visible si no hay JS. GSAP solo para el scroll «scrub» de la portada, que ya es dependencia |
| Retrasos y anchos dinámicos legítimos (`--i`, `width: x%`) | Gráficas, barras, escalonado | Se mantienen como **variables CSS** (`--progress`, `--i`), no como propiedades visuales |

## 2. Dirección artística

### 2.1 Lo que se toma de la referencia (y lo que no)
Información pública de la marca Passion.io: rojo de marca (#e32d55) con negro como secundario, un degradado rojo → naranja → menta («Passion Energy»), tintes de apoyo (amarillo cálido, azul, verde, rosa) y tipografías Visuelt Pro (títulos) y Basis Grotesque (texto). Lo que traduzco de ese lenguaje de brandbook:
- **Un color de firma con mucha energía sobre una base casi negra y cálida**, no un acento suave sobre gris.
- **Tintes pastel como superficies**, no como texto, para romper la monotonía de «todo blanco».
- **Títulos grandes y geométricos** con jerarquía editorial; texto de lectura sobrio.
- **Composición por bloques de color** (bandas, bento) en lugar de filas de tarjetas iguales.

Lo que **no** copio: el rojo, el degradado de tres colores ni sus fuentes. CIBERAN necesita su propio color de firma.

### 2.2 Concepto: «Señal»
CIBERAN = *ciber* + la idea de **emitir**: el creador emite, la marca recibe, las métricas son la señal que vuelve. El lenguaje visual es el de un **estudio editorial en directo**:
- **Papel cálido** (fondo hueso) como mesa de trabajo; **tinta** casi negra para el texto y los bloques fuertes.
- **Un acento «voltio»** (lima eléctrica) que significa siempre lo mismo: *lo vivo, lo tuyo, lo siguiente*. Nunca un estado.
- **Formas de onda y píldora:** botones y chips en píldora; tarjetas con radios grandes y una **«esquina de señal»** (una esquina con radio pequeño) como rasgo de marca en los bloques destacados.
- **Números grandes** como protagonistas (seguidores, entregas, presupuesto), en la misma fuente de títulos.

### 2.3 Paleta propuesta

**Base**
| Token | Valor | Uso |
|---|---|---|
| `tinta-950` | `#121019` | Texto principal, bloques oscuros (barra lateral, bandas de portada, tarjeta destacada), botón primario |
| `tinta-700` | `#3A3544` | Texto sobre tintes |
| `tinta-500` | `#625C6C` | Texto secundario (5,7:1 sobre hueso-100; 5,2:1 sobre hueso-200) |
| `tinta-400` | `#716A7A` | Metadatos sobre hueso-50/100 (4,9 y 4,6:1). **No sobre hueso-200** (4,2:1): ahí se usa tinta-500 |
| `hueso-100` | `#F5F1EA` | Fondo de la app |
| `hueso-50` | `#FBF9F5` | Superficies elevadas (tarjetas, paneles, campos) |
| `hueso-200` | `#ECE6DB` | Superficies hundidas (pistas de tabs, filas alternas) |
| `linea` | `rgb(18 16 25 / 10 %)` y `/ 18 %` | Bordes |

**Firma y apoyos**
| Token | Valor | Uso |
|---|---|---|
| `voltio-400` | `#C6F24E` | **Color de firma.** Botón de marca (con texto tinta, ≈ 15:1), indicador activo de navegación, marcas de «tuyo/ahora», símbolo del logotipo. **Nunca como texto sobre claro ni como estado** |
| `voltio-200` | `#E6FAB0` | Tinte de selección y resaltado |
| `coral-400` | `#FF6B4A` | Secundario de energía: ilustración, avisos de novedad, números destacados en la portada. Sin significado de estado |
| `lila-600` / `lila-200` | `#5B40E0` / `#E5DDFF` | **Motor de predicción e IA**, en exclusiva (antes era el magenta que también significaba «en revisión»). 5,7:1 sobre hueso |
| `cobalto-600` | `#2E47D6` | Enlaces, **anillo de foco**, series de datos (6,2:1 sobre hueso) |
| Tintes | mantequilla `#FFE28A`, menta `#BDEBD5`, cielo `#C9DDFF`, rosa `#FFD3DE` | Fondos de bloques y portadas generadas; texto siempre tinta |

**Sin degradados.** El único recurso gráfico de marca es el **motivo de ondas**: los dos arcos del símbolo, en trazo fino y baja opacidad, solo en la portada, la cabecera de marca y la tarjeta destacada. Sale del logotipo, así que tiene una razón de estar.

### 2.4 Alternativa considerada
**Coral como color de firma** (más cálido, más «creador»). Lo descarto como principal porque el error y el estado «fuera de plazo» son rojos: un CTA coral junto a un error rojo se confunde, y estaría demasiado cerca del rojo de Passion.io. Lo mantengo como secundario decorativo.

## 3. Sistema de diseño

### 3.1 Tipografía
| Papel | Fuente | Por qué |
|---|---|---|
| **Display** (títulos, cifras, logotipo) | **Bricolage Grotesque** (Google Fonts, variable, 500–800) | Grotesca con carácter, compacta en tamaños grandes; da personalidad sin ser ancha como Snasm. Sustituye a Sora y a Snasm |
| **Texto** | **Hanken Grotesk** (se mantiene) | Ya está cargada y es muy legible; cambiarla no aporta y cuesta |

**Escala** (base 16 px; texto de lectura habitual 16 px, denso 14 px; **nada de 13 px como norma**):
| Token | Tamaño | Interlineado | Uso |
|---|---|---|---|
| `--text-micro` | 12 px | 1.4 | Solo contadores y notas legales. **No hay etiquetas en mayúsculas espaciadas**: las etiquetas son texto de 14–15 px en peso 600 |
| `--text-sm` | 14 px | 1.5 | Metadatos, listas densas, tablas |
| `--text-base` | 16 px | 1.55 | Lectura |
| `--text-lg` | 18 px | 1.5 | Entradillas, títulos de tarjeta |
| `--text-title` | 22 px | 1.3 | Títulos de panel |
| `--text-headline` | clamp(26 → 34 px) | 1.15 | Título de página |
| `--text-display` | clamp(36 → 56 px) | 1.05 | Cifras héroe, cabeceras de sección |
| `--text-hero` | clamp(56 → 120 px) | 0.95 | Portada |

### 3.2 Espaciado, radios, sombras, movimiento
- **Espaciado:** paso de 4 px, que ya es el de Tailwind (`--spacing: 0.25rem`). Tokens de ritmo: `--gap-tight 8`, `--gap 16`, `--gap-loose 24`, `--section 48` (escritorio 64). Padding de tarjeta 20/24 px.
- **Radios con jerarquía:** `--radius-xs 8` (chips pequeños), `--radius-sm 12` (campos), `--radius-md 20` (tarjetas), `--radius-lg 28` (paneles, hojas), `--radius-xl 40` (bloques héroe), `--radius-pill` (botones, pestañas, píldoras). **Esquina de señal:** `--radius-signal: 28px 28px 28px 8px` solo en bloques destacados.
- **Sombras:** tres niveles con tinte tinta (`--shadow-1` reposo, `--shadow-2` hover, `--shadow-3` capas flotantes). Las tarjetas en reposo usan borde, no sombra.
- **Movimiento:** `--dur-fast 120ms` (micro), `--dur 200ms` (estados), `--dur-slow 320ms` (entradas), `--dur-sheet 420ms`; curvas `--ease-out` (0.22, 1, 0.36, 1), `--ease-spring` (0.34, 1.56, 0.64, 1, solo en microinteracciones pequeñas). Solo `transform` y `opacity` en animaciones; `prefers-reduced-motion` las reduce a fundidos de 1 ms.

### 3.3 Estados (dos sistemas que no se mezclan)
**Fases de una publicación** (el eje del tablero): chip rectangular (radio 8) relleno con el tinte y **texto tinta**; sin punto de color, porque el tinte ya identifica la fase y el texto la nombra. El color fuerte de cada fase se usa solo donde aporta: la cabecera de la columna del tablero y las gráficas. Contrastes medidos: color fuerte ≥ 3:1 sobre su tinte y ≥ 4,4:1 sobre hueso; texto tinta ≥ 13,7:1 sobre cualquier tinte. «Fuera de plazo» es la única con texto rojo, porque es una alerta.
| Fase | Color fuerte (columna, gráficas) | Tinte (fondo del chip) |
|---|---|---|
| Idea | piedra `#6E6878` | hueso-200 `#ECE6DB` |
| En producción | ámbar `#9A6500` | mantequilla `#FFE28A` |
| Para revisar | fucsia `#B8186A` | rosa `#FFD3DE` |
| Programado | cobalto `#2E47D6` | cielo `#C9DDFF` |
| Publicado | verde `#137A52` | menta `#BDEBD5` |
| Fuera de plazo / error | rojo `#B41F33` | `#FBDDE0` |

Los colores claros de la paleta (ámbar `#C98A00`, verde `#1F9D6B`…) **no sirven como texto ni como elemento gráfico pequeño**: medidos, quedan entre 2,4 y 3,1:1.

**Estado de una colaboración:** píldora con contorno, sin relleno y sin icono; solo «Rechazada» usa rojo. La forma (píldora frente a chip rectangular) basta para no confundirla con una fase.

**Predicción / IA:** siempre lila, como cifra y barra. Sin icono de chispa ni degradado.

### 3.4 Botones
- **Tamaños:** `sm` 36 px, `md` 44 px (por defecto y mínimo táctil en el móvil), `lg` 52 px. Píldora, peso 600, icono a 18/20 px.
- **Variantes:** `primary` (tinta sobre hueso; texto hueso), `brand` (voltio con texto tinta, solo para la acción estrella de una pantalla), `secondary` (hueso-200), `outline` (borde línea fuerte), `ghost`, `destructive` (rojo).
- **Estados:** hover (oscurece un paso y sube 1 px), active (baja y escala 0,98), **focus-visible** (anillo cobalto de 2 px con 2 px de separación, en todos los elementos interactivos), disabled (40 % y sin puntero), loading (spinner en el sitio del icono, ancho fijo, `aria-busy`).
- **`IconButton`:** cuadrado o redondo de 36/44 px con `aria-label` obligatorio por prop.

### 3.5 Formularios
- **`BaseField`** envuelve cualquier control: etiqueta (14 px, 600), control, ayuda (14 px, tinta-500), error (14 px, rojo, icono, `aria-describedby`), éxito y contador opcional. La jerarquía es siempre la misma.
- **Controles:** `BaseInput` (texto, email, número, búsqueda; iconos delante y detrás), `BaseTextarea`, `BaseSelect` (select nativo estilizado, accesible). 48 px de alto, radio 12, fondo hueso-50, borde línea; foco con borde tinta y anillo cobalto; error con borde rojo; readonly con fondo hundido y sin borde.
- **Textarea:** padding 14/16 px, mínimo 4 líneas (≈ 120 px), redimensionado solo vertical, autoaltura opcional (`autosize`) con `field-sizing: content` y respaldo; contador si hay `maxlength`.

### 3.6 Tarjetas y paneles (cada una con su razón)
| Patrón | Cuándo | Rasgo visual |
|---|---|---|
| `card--info` | Información de lectura | Papel, borde, radio md |
| `card--stat` | Cifras | Etiqueta micro + cifra en display; variantes con tinte (no todas iguales en un grupo) |
| `card--featured` | Lo más importante de la pantalla | Tinta, motivo de ondas, esquina de señal; una por pantalla como máximo |
| `card--profile` | Personas y marcas | Portada + avatar que monta encima, datos en `DataList` |
| `card--collab` | Colaboraciones | Cabecera con las dos partes, píldora de estado de colaboración, precio en cifra |
| `card--post` | Publicaciones | Franja con el color de la fase, plataforma, fecha |
| `card--interactive` | Modificador de cualquiera clicable | Hover: sube 2 px, sombra 2; foco visible; sin controles anidados (U-05) |
| `activity` | Avisos y cronologías | Fila con icono, texto y hora; sin caja por fila |
| `panel` | Contenedor con título | `panel__header` (título + acción), `panel__content`, `panel__footer` |

### 3.7 Composición por pantalla (dirección, se concreta al migrar)
- **Inicio (los dos roles):** cabecera editorial (saludo en display + una frase de estado), **bento** con tamaños distintos (destacada grande, cifras pequeñas con tintes, actividad como lista sin cajas), sugerencias como carrusel de perfiles.
- **Publicaciones/tablero:** columnas sobre hueso-200 con la cabecera de fase coloreada; tarjetas de publicación compactas; la portada generada pasa a un patrón de marca (onda/señal) en vez del arco.
- **Descubrir:** buscador protagonista arriba; destacados en un carrusel de tarjetas de perfil grandes; el resto en rejilla con más aire; un solo componente de vista compartido entre roles.
- **Colaboraciones:** lista agrupada por estado; **detalle como página propia** (decisión D-8 ya aprobada), con cabecera de dos partes, acuerdo, entregas, cronología y pago.
- **Métricas:** cifra héroe en display, reparto por red como barra de marca, «Conexiones» solo con las redes disponibles (las «Próximamente» en una línea).
- **Portada pública:** hero tipográfico enorme, banda de tinta con el motivo de ondas, las 5 fases visibles sin depender de la animación, bloques de color por rol.
- **Barra lateral:** tinta, logotipo nuevo, indicador activo en voltio, altura completa (arregla V-02). **Móvil:** barra inferior flotante en píldora tinta con el activo en voltio.

### 3.8 Logotipo
- **Símbolo:** una «C» abierta formada por **dos arcos de onda** (emisión) con un punto voltio en el hueco: se lee como C, como señal y como «en directo». Funciona a 16 px (favicon) porque son dos trazos gruesos y un punto.
- **Wordmark:** «ciberan» en minúsculas con Bricolage Grotesque 700 y tracking cerrado, convertido a trazo (SVG), en versiones tinta (fondo claro) y hueso (fondo oscuro).
- **Piezas:** SVG del símbolo y del wordmark, `favicon.svg` + `favicon.ico`, icono de instalación 512 px (símbolo sobre tinta), pantalla de carga con el símbolo animado (los arcos se dibujan).
- Lo dibujo yo en SVG en la Fase 1. Es una propuesta: si contratáis un diseñador para el logotipo, el sistema funciona igual cambiando los SVG.

### 3.9 Criterios de acabado (qué no se hace)
Revisión tras la primera versión del lienzo, para que la interfaz no parezca generada:
- **Cada elemento tiene una función.** Si quitarlo no hace perder información ni orientación, sobra.
- **Un solo canal por significado.** Si el estado ya lo dicen el tinte y el texto, no se añade un punto de color; si lo dice el texto, no se añade un icono.
- **Dos familias tipográficas, sin acentos decorativos.** Nada de cursivas serif para «dar personalidad» a una palabra.
- **Sin etiquetas en mayúsculas espaciadas** sobre cada bloque: etiquetas en texto normal de 14–15 px, peso 600.
- **Sin degradados ni formas orgánicas sueltas.** El único gráfico de marca es el motivo de ondas, que sale del logotipo.
- **Sin iconos-tópico** (chispa para la IA, varita, cohete). La IA se reconoce por su color y su texto.
- **Indicadores con dato o sin indicador:** un aviso de no leído muestra el número; si no hay número que dar, no se pinta un punto.
- **Iconos en contenedor solo si el contenedor agrupa o es pulsable;** en listas de actividad, en un cuadro neutro y siempre del mismo tamaño.
- **Copia sin eslóganes:** los títulos de sección dicen qué hay («Color», «Tarjetas»), no frases de presentación.

## 4. Arquitectura CSS

### 4.1 Reparto de responsabilidades
- **CSS (identidad):** colores, tipografía, radios, sombras, estados, animaciones y variantes de componentes, con clases BEM.
- **Tailwind (maquetación):** se sigue usando para `flex`, `grid`, `gap`, márgenes y responsive de cada página. **No** para colores, tamaños de letra ni radios: esos solo vía tokens o clases de componente.
- **Vue (comportamiento):** estados (`data-state`, `aria-*`, clases modificadoras), datos y valores calculados como variables CSS (`--progress`, `--hue`).

### 4.2 Organización de archivos
`main.css` sigue siendo la **única entrada** y el índice del sistema. Importa, en este orden, archivos parciales pequeños (un solo archivo de 2 000+ líneas sería difícil de recorrer):

```
app/assets/css/
  main.css            ← índice: @import en orden y @layer
  01-fonts.css
  02-tokens.css       ← color, superficies, tipografía, espaciado, radios, sombras, movimiento (@theme)
  03-base.css         ← html/body, encabezados, enlaces, foco, selección
  04-components/      ← button, icon-button, field, chip, tabs, card, panel, pill, avatar, data-list, empty, skeleton, sheet, toast
  05-patterns/        ← shell, sidebar, tabbar, page-header, bento, board, kanban-column, hero, cover-art
  06-states.css       ← is-scroll-locked, data-reveal, data-status, data-platform
  07-utilities.css    ← sr-only, scroll, tabular-nums
  08-motion.css       ← keyframes y prefers-reduced-motion
```

- Capas `@layer base, components, patterns, utilities`, para que una utilidad de Tailwind gane a un componente sin `!important`.
- **BEM:** `.card`, `.card__header`, `.card--featured`; estados con `is-*` (clase) o `data-state` (atributo). Anidación con `&` para los estados y elementos de un bloque, a un solo nivel de profundidad.
- Prohibido en revisión: hex sueltos en `.vue`, tamaños de letra arbitrarios (`text-[0.8125rem]`), `!important` y selectores globales de etiqueta fuera de `03-base.css`.

### 4.3 Migración sin romper
- **Fase 1** añade los tokens nuevos y **redefine los nombres antiguos** (`--color-primary-500`, `--color-ink`…) apuntando a los nuevos. Las 27 páginas cambian de aspecto a la vez sin tocar su código y nada se rompe; después cada página migra a las clases nuevas y al final se borran los alias.
- Riesgo asumido: entre la Fase 1 y la 4 la app mezclará componentes nuevos y pantallas a medio migrar. Se mitiga migrando por áreas completas.

## 5. Componentes

| Componente | Acción |
|---|---|
| `BaseButton` | Rehacer: variantes `primary/brand/secondary/outline/ghost/destructive`, tamaños, `loading`, `iconOnly` prohibido (para eso `IconButton`) |
| `IconButton` | **Nuevo** |
| `BaseField`, `BaseInput`, `BaseTextarea`, `BaseSelect` | **Nuevos** |
| `Chip` | **Nuevo** (filtro, etiqueta, seleccionable) |
| `SegmentedTabs` | Rehacer con indicador deslizante en CSS |
| `BaseCard` | Rehacer con variantes (§3.6) |
| `PanelCard` | **Nuevo** (`panel`) |
| `SectionTitle` | **Nuevo** (título, descripción opcional, acción) |
| `PageHeader` | **Nuevo**: título de página + subtítulo + acciones (hoy lo hace `TopBar` mezclado con la navegación) |
| `StatusPill` | Dividir en `PhaseChip` (publicación) y `CollabStatus` (colaboración) |
| `BaseAvatar` | Unificar foto e iniciales (U-11) |
| `DataList` | **Nuevo** (`dl` correcto, arregla U-07) |
| `EmptyState`, `SkeletonBlock`, `BottomSheet`, `ToastHost`, `ConfirmDialogHost`, `LoadingOverlay` | Reestilizar |
| `CoverArt` | **Nuevo**: portada generada con el patrón de marca (sustituye los estilos inline de 4 componentes) |
| `BrandMark` | **Nuevo**: símbolo y wordmark SVG |

## 6. Orden de migración de páginas (Fase 4)

1. **Acceso:** login, alta, confirmación (pocas pantallas, prueban formularios y marca).
2. **Inicio** de los dos roles (bento, cifras, actividad).
3. **Publicaciones:** tablero, lista, ficha de publicación y composer.
4. **Colaboraciones:** lista y **detalle como página** (se coordina con la Fase 5 del flujo de colaboraciones).
5. **Descubrir + perfil público + guardados**, con una vista compartida entre roles.
6. **Chat y bandeja.**
7. **Métricas** (resumen y panel de YouTube).
8. **Perfiles privados** (los dos roles).
9. **Portada pública**, instalación y páginas legales.
10. **Admin**: solo tokens y componentes; sin rediseño de composición.

Cada área se cierra con capturas a 390, 768, 1 024 y 1 440 px, axe y los tests (unitarios, typecheck, build).

## 7. Riesgos y límites
- **Sin ver la referencia:** la dirección se apoya en la marca pública de Passion.io, no en el shot concreto.
- **Logotipo hecho por mí:** sirve para lanzar y es coherente con el sistema, pero no sustituye a un diseñador de identidad si queréis una marca registrable.
- **Contrastes:** los valores de este documento ya están medidos (fórmula WCAG). En la Fase 1 se repite la medición sobre los tokens definitivos y con axe en las pantallas.
- **Rendimiento:** una fuente nueva de Google (Bricolage, variable); se quitan Sora y Snasm. Menos peso que ahora.
- **Funcionalidad:** el rediseño no toca Supabase, RPC, endpoints, Stripe ni rutas. Lo único estructural es el detalle de colaboración como página, ya aprobado en D-8.
