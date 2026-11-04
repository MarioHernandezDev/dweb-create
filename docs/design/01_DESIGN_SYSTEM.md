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
  components/         un archivo por componente (brand-mark.css)
app/components/brand/BrandMark.vue   logotipo (símbolo + wordmark)
public/favicon.svg, favicon.ico, img/brand/   favicon, iconos de instalación, SVG del símbolo
scripts/design/check-contrast.mjs    contraste de las combinaciones del sistema
scripts/design/render-brand-icons.mjs  regenera PNG e ICO desde los SVG
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

- **Componente:** `<BrandMark />` con `tone="ink"` (fondo claro) o `tone="light"` (fondo oscuro), `:size` (alto del símbolo en px), `:wordmark="false"` para solo el símbolo, y `label=""` cuando acompaña a un texto que ya dice «CIBERAN».
- **Titular con la marca como texto** (h1 de la portada): clase `wordmark`.
- **Archivos:** `public/favicon.svg` es la fuente del favicon; `scripts/design/render-brand-icons.mjs` regenera `favicon.ico`, los PNG de `img/brand/` y los iconos del manifiesto.

## 5. Convenciones CSS

- **Identidad en CSS, maquetación en Tailwind.** Colores, tipografía, radios, sombras y estados salen de tokens o clases de componente; Tailwind para `flex`, `grid`, `gap`, márgenes y responsive.
- **BEM:** `.card`, `.card__header`, `.card--featured`. Estados con `is-*` o atributos (`data-state`, `aria-*`).
- **Anidación nativa de un nivel con `&`** (`&:hover`, `& .card__title`, `&.card--featured`, `@media` dentro de la regla). `&-sufijo` es Sass y no funciona: Lightning CSS (dentro de Tailwind 4) aplana la anidación al compilar.
- **Capas:** `@layer base` (base.css), `components` (componentes y transiciones), `utilities`. Una utilidad de Tailwind gana a un componente sin `!important`.
- **Valores calculados desde Vue → variables CSS** (`--progress`, `--hue`, `--brand-size`), nunca propiedades visuales en `:style`.
- **Prohibido en código nuevo:** hex sueltos en `.vue`, tamaños de letra arbitrarios (`text-[0.8125rem]`), `!important`, estilos escritos desde JavaScript (`el.style…`), y los **alias de transición** de `tokens.css` (`--color-primary-500`, `--color-ink`…), que desaparecen al terminar la Fase 4.

## 6. Comprobar

- `node scripts/design/check-contrast.mjs`: contraste de las 31 combinaciones del sistema (sale con 1 si alguna falla).
- `scripts/demo-video/ux-capture.mjs`: capturas a 390, 768, 1 024 y 1 440 px con axe, contra la app de demo y el Supabase local.
