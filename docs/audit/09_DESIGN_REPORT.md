# Informe del diseño de la web (CIBERAN)

> Fecha: 2026-11-04. Para analizar el diseño actual y decidir cómo reorganizarlo.
> **Cómo se hizo:** lectura del código (`app/assets/css/main.css`, `nuxt.config.ts`, `app/utils/nav.ts`, layouts y páginas) y recuento de patrones con búsquedas sobre `app/**/*.vue`. Los hallazgos visuales y de accesibilidad vienen de [04_UX_AUDIT.md](04_UX_AUDIT.md), que se hizo con capturas a tres tamaños y axe el 2026-11-03. **En esta sesión no he vuelto a abrir las pantallas en el navegador**: lo visual se apoya en esa auditoría y en las capturas de `docs/demo/video/capturas/`. No existe fichero de diseño (Figma u otro): la fuente de verdad del diseño es el CSS.
> Cifras entre paréntesis = apariciones contadas en `app/**/*.vue` (no son páginas ni usuarios).

## 1. Resumen

- **Qué es hoy:** una app de dos roles (Creador y Partner) con modo único claro, acento violeta, tarjetas de bordes muy redondeados y una metáfora de «parte de rodaje» (cada publicación tiene un estado con color propio). Escritorio con barra lateral oscura; móvil con barra inferior.
- **Lo que está bien resuelto:** tokens de color definidos y respetados (solo 5 hex sueltos en todos los componentes), contraste de texto ya corregido una vez, estados vacíos útiles, feedback de acciones, páginas a ancho completo donde hace falta.
- **Lo que pide reorganización:**
  1. **No hay escala tipográfica:** hay ~10 tamaños escritos a mano (`text-[0.8125rem]` se repite 354 veces) y 6 tamaños distintos para los títulos de sección.
  2. **Faltan componentes base:** no hay campo de formulario común (99 `<input/textarea/select>` crudos, con la misma cadena de clases copiada 64 veces) y 108 `<button>` crudos frente a 119 `BaseButton`.
  3. **Dos roles = páginas casi duplicadas:** Descubrir, Colaboraciones, Perfil e Inicio existen dos veces (hasta el 66 % de líneas iguales).
  4. **Navegación con demasiados destinos sueltos:** 9 destinos para el creador y 7 para el partner repartidos en 3 sitios distintos, con Chat y Bandeja duplicados entre barra superior y menús.
  5. **Logotipo y marca por rehacer** tras el cambio a CIBERAN.
- **Lo que no es diseño pero lo condiciona:** el detalle de una colaboración vive en una hoja modal (ver [08](08_COLLABORATION_FLOW_AUDIT.md), decisión D-8: pasar a página propia).

## 2. Sistema visual actual

### 2.1 Color (`main.css`, tokens en `@theme` y `:root`)

| Grupo | Tokens | Uso |
|---|---|---|
| Primario (violeta del logo) | `primary-50/200/400/500/600/900` | Acciones principales, enlaces, selección (`primary-500`: 261 usos) |
| «Señal» (magenta) | `signal-300/500/600` | **Reservado al motor de predicción**; coincide con el estado «en revisión» (`status-review: #c014d6`) |
| Estados de publicación | `status-idea / production / review / scheduled / published / alert` | Gris, ámbar, magenta, índigo, verde, rojo. Es el eje de la metáfora del tablero |
| Superficies | `ink #fbfaff`, `ink-raised #fff`, `ink-overlay #f2eefb`, `paper #fffdf6`, `slate #221c30` | Fondo, paneles, rellenos, «ficha de rodaje» cálida, tinta oscura |
| Texto | `text #1a1625`, `text-muted #6b6478`, `text-faint #6d6782` | `text-faint` casi igual que `muted` a propósito, para cumplir 4,5:1 |
| Líneas | `hairline` 9 %, `hairline-strong` 16 % | Bordes de tarjetas (194 y 57 usos) |
| Plataformas | tiktok, youtube, x, instagram (+ facebook, linkedin fuera de la paleta de datos) | Identidad de red; TikTok/X/Facebook/LinkedIn ya no se pueden conectar |
| Datos | `chart-primary #107a7f` | Serie única de las gráficas |

Observaciones:
- **Dos violetas casi iguales para cosas distintas:** `status-scheduled` (`#4828c0`) es el mismo tono que `primary-600`. Un estado y una acción comparten color.
- **Magenta con dos significados:** «predicción» y «en revisión» comparten `#c014d6`. Se justificó como «señal», pero una pantalla con ambos (la ficha de publicación) puede confundirlos.
- **Modo oscuro:** no existe (`color-scheme: light`); la barra lateral oscura sale de `primary-900`/`ink` invertidos, no de un tema.

### 2.2 Tipografía

| Familia | Dónde | Detalle |
|---|---|---|
| **Sora** (Google, 400–700) | Títulos (`font-display`) | Se cargó para sustituir a Snasm en títulos largos |
| **Hanken Grotesk** | Todo el texto, botones y enlaces | Por defecto |
| **Snasm Light** (local, `.otf`, 300) | Solo el logotipo («CIBERAN», `font-brand`) | Muy ancha; solo existe en peso 300 y su cursiva |

- **Sin escala:** tamaños de texto usados: 0.625, 0.6875, 0.75, **0.8125**, 0.875, **0.9375**, 1.0625, 1.25, 1.375, 1.5 rem, escritos como valores arbitrarios. El más frecuente (0.8125 rem = 13 px, 354 usos) es el tamaño de lectura habitual de la app, **más pequeño que el estándar de 16 px y del 14 px de muchas guías**.
- **Títulos de sección con 6 tamaños** (1.0625, 1.125, 1.25, 1.375, 1.5, 1.875 rem) sin regla visible de cuándo usar cada uno.
- **Mini-título de bloque** (mayúsculas, 11 px, `text-faint`): patrón repetido a mano 35 veces.

### 2.3 Forma, sombra y movimiento

- **Radios con jerarquía:** `xs 10 px` (chips), `sm 14 px` (109 usos, el más común), `md 20 px` (tarjetas), `lg 28 px` (hero y hojas), y `rounded-full` (185). Bien aplicado: casi no hay valores sueltos.
- **Sombra:** una sola (`--shadow-float`) más las de énfasis puntual.
- **Movimiento:** transición de página, mazo de tarjetas, entrada escalonada (`nx-stagger-in`, `yt-reveal`; 33 usos), y GSAP solo en la portada. Hay regla `prefers-reduced-motion` en `main.css`; la auditoría pide comprobarla en la portada.
- **Iconos:** Phosphor (`ph:*`) mediante `@nuxt/icon`, variantes `-fill` en navegación y `-bold` en acciones.

### 2.4 Marca

- **Logotipo:** `public/img/logo-svg.png` es una **«F»** (violeta, teal, magenta y un punto ámbar) que se usa en 6 componentes (barra lateral, barra superior móvil, alta, cabecera y pie de la portada, y el overlay de carga), además de como icono de la pestaña y de la instalación. También `favicon.ico`, `logo-fondoblanco.png` y el manifiesto.
- **Paleta derivada del logo:** los tokens se muestrearon del PNG (comentario de `main.css`). Si el logotipo cambia de colores, la paleta es la que hay que repensar.
- **Con CIBERAN:** hay que decidir si la «F» se sustituye por una «C» manteniendo los colores, o si la identidad cambia. Cualquier cambio de color arrastra tokens, gráficas y el degradado de la portada.

## 3. Estructura de la app

### 3.1 Mapa de pantallas (27 páginas, 5 446 líneas)

| Zona | Páginas | Notas |
|---|---|---|
| Pública | `/` (portada, 7 secciones en `components/landing/`), `/login`, `/onboarding` (alta), `/confirm`, `/privacidad`, `/terminos`, `/instalaciones` | La portada no usa el AppShell |
| Creador (`/creator`) | `index` (Hoy), `timeline` (Publicaciones), `discover`, `requests`, `metrics` + `metrics/[platform]`, `post/[id]`, `profile` | El perfil es la pantalla más larga (567 líneas, con pestañas) |
| Partner (`/partner`) | `index` (Inicio), `discover`, `requests`, `profile` | No tiene Publicaciones ni Métricas: revisa publicaciones desde Colaboraciones |
| Compartidas | `chat` y `chat/[id]`, `inbox`, `favorites`, `profile/[role]/[id]` (perfil público) | Las ve cada rol con su propio menú |
| Admin | `/admin`, `/admin/login` | Contraseña única; fuera del producto |

Páginas más grandes: `creator/profile` (567), `partner/profile` (452), `partner/discover` (419), `creator/discover` (417), `admin/index` (403), `creator/post/[id]` (346), `partner/requests` (341).

### 3.2 Páginas duplicadas entre roles

| Par | Líneas (creador / partner) | Líneas idénticas |
|---|---|---|
| Descubrir | 417 / 419 | 274 |
| Perfil | 567 / 452 | 247 |
| Colaboraciones | 289 / 341 | 151 |
| Inicio | 235 / 247 | 68 |

La diferencia real entre roles son los datos que se muestran, el sentido de la relación (creador busca marcas o marca busca creadores) y las acciones (el partner paga y aprueba; el creador propone y publica). Cada arreglo de diseño hoy se hace dos veces, y ya ha pasado que uno se queda sin el otro (por ejemplo U-11).

## 4. Navegación

| | Creador | Partner |
|---|---|---|
| **Destinos principales** (barra lateral / menú) | Hoy, Publicaciones, Descubrir, Colaboraciones, Métricas | Inicio, Descubrir, Colaboraciones |
| **Destinos secundarios** | Chat, Bandeja de entrada, Guardados, Perfil | Los mismos 4 |
| **Total** | **9** | **7** |

Dónde aparece cada cosa:
- **Escritorio:** barra lateral con los principales; bloque inferior con la cuenta (Perfil) y 3 accesos secundarios (Chat, Bandeja, Guardados). La barra superior repite Chat, Bandeja y el avatar del Perfil.
- **Móvil:** barra inferior con **3 principales + Chat** y un botón «Más» que reúne el resto (incluida la Bandeja, con su contador). Barra superior con «volver», título, Chat, Bandeja y avatar.
- **Duplicación:** Chat y Bandeja están en la barra superior y también en el menú lateral o en «Más». Perfil está en el avatar y en el menú.
- **Nombres:** «Hoy» frente a «Inicio» para la portada de cada rol (U-10); el ítem «Colaboraciones» agrupa solicitudes, negociación, publicaciones del acuerdo y pagos.
- **Profundidad:** el detalle de una colaboración (que concentra negociación, brief, entregas, revisión, registro y pago) es una hoja modal con 4 pestañas dentro de otra página con pestañas. En móvil son dos niveles de pestañas.

## 5. Maquetación y responsive

- **Plantilla única:** `AppShell` = barra lateral (escritorio) + `TopBar` + `<main>` + barra inferior (móvil) + hosts de diálogos, avisos y recorrido de bienvenida. El contenido va a **1 100 px máximo**, salvo `fullWidth`, que usan 10 páginas (chat, Descubrir, Métricas, publicación, perfiles).
- **Márgenes:** `px-5 py-5` en móvil, `md:px-8 md:py-8` en escritorio; `pb-28` reserva la barra inferior.
- **Puntos de ruptura usados:** `md` (163 usos) es el punto real de cambio móvil→escritorio; `lg` (73), `sm` (38), `xl` (32), `2xl` (12) y un `xs` propio de 26 rem. El rango 768–1 100 px (tablet) es donde menos se ha comprobado.
- **Fallos conocidos de la auditoría:** desbordamiento de 39 px en el perfil del creador a 390 px (U-01), tarjeta destacada de Descubrir cortada (U-02), botones de revisión cortados en el calendario de la marca (U-03), título truncado en la cabecera móvil (U-14).

## 6. Patrones de pantalla (anatomía)

| Patrón | Dónde | Cómo está resuelto |
|---|---|---|
| **Portada de rol** | `creator/index`, `partner/index` | Saludo, 4 tarjetas de cifras (`grid-cols-2 lg:grid-cols-4`), tarjeta destacada (`HomeHeroCard`), carrusel de sugerencias, y bloques «Necesita tu atención / Tus redes / Para sacarle más partido». Los bloques se montan a mano con `<section>` y clases propias |
| **Lista + detalle en hoja** | Colaboraciones, tablero, revisión | `SegmentedTabs` + tarjetas (`BaseCard`) y `BottomSheet` con pestañas internas |
| **Tablero** | `creator/timeline` | Kanban por estado con arrastrar y soltar; vista de lista alternativa |
| **Perfil con pestañas** | `*/profile` | Pestañas, tarjetas en rejilla de 3 columnas, barra flotante de guardar, vista previa en hoja en pantallas estrechas |
| **Dashboard de métricas** | `creator/metrics/*` | 12 componentes `youtube/` (periodo, comparación, vídeos, detalle) |
| **Chat a dos paneles** | `chat`, `chat/[id]` | Lista + conversación; en móvil, una a la vez |
| **Formularios** | alta, perfil, composer, negociación, brief | Etiquetas visibles y validación en línea; **sin componente de campo común** |

## 7. Inventario de componentes (UI)

- **Base (`components/ui`, 17):** `BaseButton` (119 usos), `BaseCard` (46), `BaseAvatar`, `BottomSheet`, `SegmentedTabs`, `EmptyState`, `StatusPill`, `StatusGlyph`, `ProgressRing`, `SkeletonBlock`, `CoverImage`, `Fab`, `ToastHost`, `ConfirmDialogHost`, `LoadingOverlay`, `AvatarUploader`, `CoverPhotoUploader`.
- **Por dominio:** `timeline` (11), `youtube` (12), `profile` (9), `charts` (7), `landing` (7), `collab` (7), `chat` (6), y grupos pequeños (`layout` 5, `install` 3, `ml`, `post`, `social`, `legal`, `discover` 2 cada uno).
- **Falta o está incompleto:**
  - **Campo de formulario** (texto, área, número, selector): sin componente; 64 copias de la clase de campo.
  - **Título de sección / bloque** (el mini-título en mayúsculas, 35 copias) y **tarjeta de panel con título** (los `<section class="rounded-… border …">` de las portadas se escriben a mano).
  - **Tabs de detalle** (hoja con pestañas) como patrón reutilizable.
  - **Datos clave** (`dl` con `dt/dd`): es el origen de U-07.
  - **Avatar** unificado: dos formas de mostrar iniciales o foto (U-11).
- **Botones crudos:** 108 `<button>` sin `BaseButton`; muchos son legítimos (iconos, chips, filas clicables), pero no hay `IconButton` ni `Chip`, así que cada uno repite sus clases.

## 8. Deuda de diseño con números

| Tema | Dato | Riesgo |
|---|---|---|
| Escala tipográfica | ~10 tamaños arbitrarios; 6 para títulos | Páginas que parecen de la misma familia pero no coinciden |
| Campo de formulario | 99 elementos, clase repetida 64 veces | Cambiar el aspecto de un campo = tocar decenas de ficheros; los estados de foco y error no son uniformes |
| Duplicación por rol | 4 pares de páginas con 27 %–66 % de líneas idénticas | Arreglos dobles; divergencias |
| Tamaño de texto base | 13 px como lectura habitual | Legibilidad, sobre todo en móvil y para personas mayores |
| Contraste | U-04: 33 elementos en 10 páginas (texto pequeño con opacidad) | Accesibilidad (WCAG AA); el token `text-faint` ya se subió, quedan usos con `white/40` |
| Accesibilidad estructural | U-05 a U-08 (controles anidados en el tablero, `dl` mal formada, regiones `main`) | Lectores de pantalla y teclado |
| Colores con doble uso | Magenta (predicción / revisión), violeta (programado / acción) | Confusión en pantallas con ambos |

## 9. Opciones de reorganización

Ordenadas de menor a mayor impacto. Las tres primeras son compatibles entre sí.

### A. Fundamentos del sistema (bajo riesgo, alto retorno)
1. **Definir una escala tipográfica** en el tema (por ejemplo: `caption`, `body-sm`, `body`, `title-sm`, `title`, `display`) y sustituir los valores arbitrarios por esas clases. Decidir a la vez si el texto de lectura sube de 13 a 14 px.
2. **Crear los componentes que faltan:** `BaseField` (texto, área, número, selector, con etiqueta, ayuda y error), `SectionTitle`, `PanelCard` (tarjeta con título), `IconButton`, `Chip`, `DataList` (arregla U-07).
3. **Cerrar los hallazgos abiertos de 04** (U-01…U-14) como parte de esa migración, no por separado.

### B. Navegación (impacto medio)
- **Opción B1 — Dejar los principales y reducir secundarios:** en escritorio, quitar de la barra superior lo que ya está en la lateral (Chat y Bandeja), y dejar solo búsqueda, avisos y avatar. En móvil, unificar «Más» como único sitio de lo secundario.
- **Opción B2 — Agrupar:** fusionar Chat y Bandeja en una sola «Mensajes y avisos» con dos pestañas; Guardados dentro de Descubrir (hoy es un acceso secundario más en el menú).
- **Nombres:** decidir «Hoy» o «Inicio» para los dos roles (U-10).
- **Partner:** hoy tiene 3 principales y nada de métricas ni publicaciones. Si el partner va a ver el rendimiento de una colaboración (A-R15), conviene decidir dónde vive.

### C. Una sola página para los dos roles (impacto alto, mayor ahorro)
- Convertir las 4 parejas en páginas compartidas que reciben el rol (Descubrir primero: 66 % idéntica y ya se probó el patrón). Mantiene las URL actuales.
- Ventaja: cada cambio de diseño se hace una vez. Riesgo: la regresión es amplia (hace falta el E2E de la Fase 7 de la auditoría de colaboraciones).

### D. Detalle de colaboración como página (ya decidido en D-8)
- `/{rol}/collaborations/[id]` con cabecera (otra parte, estado, precio, chat), acuerdo, entregas, revisión, cronología y pago informativo. Quita los dos niveles de pestañas en el móvil y permite enlaces directos. Es la pieza donde más cambia la experiencia.

### E. Identidad visual (decisión de marca)
- **Logotipo nuevo** con «C»: mantener colores o rehacerlos. Si cambian, repasar `status-*`, `signal-*` y las gráficas.
- **Fuente de marca:** Snasm es muy ancha y solo está en peso 300; «CIBERAN» tiene más letras que «FEEDMA» (7 frente a 6) y ocupa más. Comprobar el logotipo en la barra lateral y en móvil.
- **Separar colores de estado y de acción** (violeta programado frente a primario; magenta predicción frente a revisión), o dejar documentado por qué coinciden.
- **Modo oscuro:** no existe. Solo merece la pena si hay petición real; los tokens ya están centralizados, así que sería un trabajo acotado.

## 10. Decisiones que necesito para reorganizar

| # | Pregunta | Mi recomendación |
|---|---|---|
| 1 | ¿Se define una escala tipográfica y el texto de lectura pasa a 14 px? | Sí; 14 px de base y escala de 6 niveles |
| 2 | ¿Se crean `BaseField`, `SectionTitle`, `PanelCard`, `IconButton`, `Chip` y `DataList` antes de tocar pantallas? | Sí, es el paso que abarata todo lo demás |
| 3 | Navegación: ¿B1 o B2? ¿«Hoy» o «Inicio»? | B1 ahora; «Inicio» para los dos |
| 4 | ¿Unificar las páginas de los dos roles (C)? ¿Por cuál empezamos? | Sí; Descubrir, luego Perfil |
| 5 | ¿Dónde ve el partner el rendimiento de sus colaboraciones? | Dentro del detalle de colaboración (D), sin ítem nuevo en el menú |
| 6 | ¿Qué logotipo y colores tiene CIBERAN? | Lo decides tú; hasta entonces, mantener los tokens y cambiar solo la letra |
| 7 | ¿Se quiere modo oscuro? | No por ahora |

## 11. Orden propuesto

1. **Escala tipográfica + componentes base** (A1, A2). Sin cambios visibles apreciables salvo coherencia.
2. **Migración de formularios y títulos** a los componentes nuevos, cerrando U-04 a U-08 de paso.
3. **Navegación** (B) y nombres.
4. **Detalle de colaboración como página** (D) junto con las fases 3 a 7 del flujo de colaboraciones.
5. **Páginas compartidas entre roles** (C), empezando por Descubrir.
6. **Logotipo y marca** (E) en cuanto haya una decisión; puede hacerse en cualquier momento porque solo toca assets y tokens.

Cada paso se verifica con `ux-capture` (capturas a 390, 768 y 1 440 px más axe), que ya existe en `scripts/demo-video/`.

## 12. Qué queda sin analizar

- **Pantallas reales en esta sesión:** no se abrieron; las observaciones visuales dependen de la auditoría 04 y de las capturas existentes.
- **Tablet (768–1 100 px):** casi no está cubierta por las capturas.
- **Rendimiento visual** (Lighthouse, tamaño de las imágenes de la portada): pendiente (R-32).
- **Contenido y textos de marca:** el cambio a CIBERAN se hizo por sustitución; falta una revisión editorial del tono.
- **Portada:** se vio una vez en la auditoría 04; no se ha evaluado su estructura de conversión.
