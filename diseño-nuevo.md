# CIBERAN — Rediseño integral de identidad visual y sistema de diseño

> ## Traspaso: estado a 2026-11-04 y cómo continuar
>
> Esta sección la añadió el Claude de Alex para que otra sesión (la de Mario) siga el rediseño sin repetir lo hecho. El encargo original está debajo, sin cambios. **Lee esta sección entera antes de tocar nada.**

### A. Qué está hecho

| Fase | Estado | Dónde |
|---|---|---|
| 0 · Auditoría y propuesta | **Hecha y aprobada por Alex**, con una pasada de refinamiento («menos decoración gratuita») | [`docs/design/00_PROPUESTA_FASE0.md`](docs/design/00_PROPUESTA_FASE0.md), sobre todo §2 (paleta), §3 (sistema), §3.9 (criterios de acabado), §4 (arquitectura CSS), §5 (componentes) y §6 (orden de migración) |
| 1 · Fundamentos | **Hecha** (CHANGELOG Alex-61) | [`docs/design/01_DESIGN_SYSTEM.md`](docs/design/01_DESIGN_SYSTEM.md) y `app/assets/css/` |
| 2 · Biblioteca de componentes | **Hecha** (CHANGELOG «[Mario] Rediseño Señal, Fases 2 a 4») | [`docs/design/01_DESIGN_SYSTEM.md`](docs/design/01_DESIGN_SYSTEM.md) §4b y `app/assets/css/components/` |
| 3 · Shell y navegación | **Hecha** | `patterns/shell.css`, `AppShell`, `SideRail`, `TopBar`, `BottomTabBar` |
| 4 · Migración de páginas | **Parcial.** Hecho: portada, integraciones, acceso, alta, error, legales, Hoy (2 roles), tablero, colaboraciones (lista), Métricas > Conexiones. **Pendiente de recomponer:** Descubrir, detalle de colaboración, Chat/Bandeja, YouTube, Perfiles, Perfil público, Guardados, detalle de publicación, Admin | CHANGELOG, sección «Sin verificar o pendiente» |
| 5 y 6 | Pendientes | — |

> **Actualización 2026-11-04 (logotipo y hormigas):** el logotipo vigente es `public/img/newlogo.jpeg` (manta raya en círculo), no el símbolo de dos arcos de la Fase 1; se regenera todo con `node scripts/design/build-brand-assets.mjs`. Las hormigas están eliminadas de toda la app. Donde esta sección habla del «símbolo de dos arcos y punto voltio» o de «las hormigas decorativas», manda esta nota.

Lienzo visual de la propuesta (sistema, inicio de escritorio y móvil): https://claude.ai/artifact/CMy3yfWPDDgMDWByoRGSZ6. **Es privado de Alex**: si no lo puedes abrir, pídele que lo comparta. Todo lo que muestra está descrito en `00_PROPUESTA_FASE0.md`.

### B. Decisiones cerradas (no volver a preguntarlas)
- **Concepto «Señal»:** papel (hueso) y tinta como base; **voltio** `#c6f24e` como firma (lo activo y la acción principal; nunca un estado ni texto sobre claro); coral solo decorativo en portada; **lila solo para la predicción**; cobalto para enlaces, foco y datos; tintes pastel como superficies.
- **Tipografía:** Bricolage Grotesque (títulos, cifras, logotipo) + Hanken Grotesk (texto, 16 px de lectura). **Sin tercera familia ni cursivas de acento.**
- **Estados:** fases de publicación = chip rectangular con tinte y texto tinta, **sin punto de color**; estado de colaboración = píldora con contorno, sin relleno ni icono (solo «Rechazada» en rojo). Hoy `app/utils/status.ts` da a las colaboraciones los mismos colores que a las fases: hay que separarlos en la Fase 2 (`PhaseChip` y `CollabStatus`).
- **Sin decoración gratuita** (§3.9 de la propuesta): nada de etiquetas en mayúsculas espaciadas, degradados, blobs, chispas para la IA ni puntos de no leído sin número. El único gráfico de marca es el **motivo de ondas** (los arcos del símbolo, trazo fino y baja opacidad) en portada, cabecera de marca y tarjeta destacada.
- **Logotipo:** símbolo de dos arcos y punto voltio, wordmark «ciberan» en minúsculas. Se pinta **siempre** con `<BrandMark>` (`app/components/brand/BrandMark.vue`).
- **CSS:** identidad en CSS con tokens y clases BEM; **Tailwind solo para maquetación**. `main.css` es el índice; un archivo por componente en `app/assets/css/components/` y patrones en `patterns/`. Capas `base`, `components`, `utilities`. Valores de Vue → variables CSS (`--progress`, `--hue`), nunca propiedades visuales en `:style`.

### C. Cómo está montado (lo que tienes que saber del código)
- **Alias de transición** (final de `app/assets/css/tokens.css`): los tokens antiguos (`--color-primary-500`, `--color-ink`, `--color-ink-overlay`, `--color-status-*`, `--shadow-float`…) apuntan a los nuevos. Por eso toda la app ya tiene la paleta nueva sin haber migrado las páginas. **No los uses en código nuevo**; se borran cuando la última pantalla esté migrada.
- `--color-primary-500` ahora es **tinta** (los botones primarios son negros). El voltio todavía no aparece en ninguna pantalla: lo introducen los componentes (botón de marca, indicador activo de navegación) en las Fases 2 y 3.
- Tokens tipográficos: clases `text-micro`, `text-sm`, `text-base`, `text-lg`, `text-title`, `text-headline`, `text-display`, `text-hero`. Las páginas siguen con tamaños arbitrarios (`text-[0.8125rem]` aparece 354 veces): se sustituyen al migrar cada pantalla, no con un reemplazo masivo.
- **CSS anidado:** solo sintaxis nativa (`&:hover`, `& .x`, `&.x--mod`, `@media` dentro). **`&-sufijo` no existe** (es Sass); ya me pasó una vez.
- `base.css` no da familia a `h1`–`h4` a propósito: hay encabezados que hoy son etiquetas pequeñas.
- Las fuentes Snasm (`app/assets/fonts/*.otf`) ya no se usan; se borran en la limpieza final.

### D. Qué hacer ahora: Fase 2 (biblioteca de componentes)
Lista completa en §5 de la propuesta. En resumen:
1. `BaseButton` rehecho (`primary` tinta, `brand` voltio, `secondary`, `outline`, `ghost`, `destructive`; `sm`/`md`/`lg`; `loading`; foco cobalto) e `IconButton` nuevo con `aria-label` obligatorio.
2. `BaseField` + `BaseInput` + `BaseTextarea` + `BaseSelect` (48 px, radio 12, fondo `--surface-raised`, borde `--line-strong`, error con `aria-describedby`, textarea de 120 px mínimo con redimensionado vertical).
3. `Chip`, `SegmentedTabs` (indicador en CSS), `BaseCard` con variantes (§3.6), `PanelCard`, `SectionTitle`, `PageHeader`, `DataList` (arregla U-07), `BaseAvatar` unificado (U-11), `EmptyState`, `SkeletonBlock`, `CoverArt` (sustituye las portadas generadas con estilos inline), `PhaseChip` y `CollabStatus`.
4. Cada componente: su CSS en `app/assets/css/components/<nombre>.css`, importado en `main.css`; su documentación en `01_DESIGN_SYSTEM.md`.
5. Los componentes existentes que se rehacen (`BaseButton`, `BaseCard`, `StatusPill`, `SegmentedTabs`…) se usan en decenas de sitios: **mantén sus props actuales** o aporta un adaptador, para que nada se rompa antes de migrar cada pantalla.

Después: Fase 3 (shell y navegación: `AppShell`, `SideRail` con indicador voltio, `TopBar`, barra inferior flotante), Fase 4 (pantallas en el orden de §6 de la propuesta), Fase 5 (pulido y hallazgos U-01 a U-14 de `docs/audit/04_UX_AUDIT.md`) y Fase 6 (verificación final).

### E. Cómo verificar (no des nada por terminado solo porque compile)
- `npm run typecheck`, `npm test`, `nuxt build` y `node scripts/design/check-contrast.mjs`.
- **Capturas y accesibilidad:** `scripts/demo-video/ux-capture.mjs` (390, 768, 1 024 y 1 440 px, 14 páginas, axe). Necesita la app servida en `http://localhost:3300` contra un **Supabase local** con datos ficticios. El procedimiento está en `scripts/demo-video/README.md` y `docs/demo/DEMO_DATA_PLAN.md`:
  1. Docker y `npx supabase@2 start` (aplica todas las migraciones en local).
  2. Una copia aislada de la app (`git archive HEAD`) con un `.env` que apunte **solo** al Supabase local; `nuxt build` y `PORT=3300 node .output/server/index.mjs`. No compiles en la carpeta del proyecto si hay un `nuxt dev` abierto: comparten `.nuxt`.
  3. Imágenes ficticias (`scripts/demo-video/gen-demo-images.mjs`) y siembra (`scripts/seed-demo-video.mjs`, que se niega a ejecutarse si la URL no es local).
- Referencia de la Fase 1: a los mismos tamaños que la Fase 0, axe marca 21 nodos con contraste insuficiente (antes 33). Quedan el texto blanco al 40 % de la portada, los colores de plataforma en Métricas y una píldora de estado en Colaboraciones.

### F. Reglas del proyecto que siguen vigentes
- **Supabase compartido:** no apliques migraciones a la base compartida; las aplica Alex. Pendientes de aplicar (ajenas al diseño): `20261104110000_collaboration_agreement_phase2.sql` y `20261104120000_rename_brand_ciberan.sql`.
- El rediseño **no cambia** rutas, permisos, contratos de Supabase, RPC, endpoints, Stripe ni reglas de negocio (§9 del encargo).
- Las cuentas demo y de prueba siguen siendo `@feedma.test`, porque existen así en el Supabase compartido. La contraseña de demo sigue escrita en `app/pages/login.vue` (R-01, en `docs/PENDIENTE_MARIO.md`).
- CHANGELOG: una entrada por fase con «Qué se cambió / Verificado / Sin verificar», prefijo `[Mario]`. No digas que algo está verificado si no lo has ejecutado.
- La referencia de Dribbble no se puede abrir de forma automática (bloquea los bots). Si hace falta, pide capturas a Alex.

### G. Lo que todavía se ve del diseño antiguo (lista de trabajo para las Fases 2 a 4)
Tarjetas de cifras con borde izquierdo grueso; franjas, puntos y barras de estado repetidos en las tarjetas del tablero; portadas generadas con el arco antiguo; etiquetas pequeñas en mayúsculas; las hormigas decorativas de la portada y de la pantalla de carga; campos con fondo hundido; píldoras de colaboración con colores de fase; contenido de la portada que solo aparece al animarse con el scroll (V-01); la barra lateral que termina a la altura de la ventana en páginas largas (V-02); el aviso desfasado de Métricas (V-03).

---

## 1. Objetivo del proyecto

Vamos a realizar un **rediseño visual completo de CIBERAN**, tanto de su identidad de marca como de la interfaz de toda la aplicación.

CIBERAN es una plataforma que conecta creadores de contenido con marcas y empresas para gestionar colaboraciones, publicaciones, métricas, negociaciones y campañas.

No quiero que la aplicación siga teniendo apariencia de un dashboard administrativo convencional. Quiero que transmita que estamos utilizando una plataforma moderna, cuidada, profesional y atractiva, diseñada específicamente para el ecosistema de creadores de contenido.

El objetivo es conseguir una identidad visual reconocible, consistente y con personalidad propia.

**Importante:** el documento `INFORME_DISENO_CIBERAN.md` (o el informe adjunto) contiene el análisis del estado actual de la aplicación. Utilízalo como punto de partida y fuente de información sobre la arquitectura visual existente, los componentes, las páginas y los problemas detectados.

No quiero que te limites a solucionar los problemas enumerados: quiero aprovechar esta oportunidad para establecer una nueva dirección visual para todo el producto.

## 2. Referencia artística y dirección visual

Esta es la referencia principal que quiero que estudies:

https://dribbble.com/shots/27860733-Brand-Guidelines-Brandbook-for-Creator-Platform-Passion-io

Me gusta especialmente el lenguaje visual de este proyecto de branding de Passion.io.

Quiero que analices sus recursos visuales y los traduzcas a una identidad propia para CIBERAN.

### Qué quiero transmitir visualmente

- **Identidad de marca potente:** que CIBERAN tenga personalidad propia y no parezca una plantilla de SaaS.
- **Estética contemporánea:** una mezcla entre producto digital premium, plataforma creativa y branding editorial.
- **Composiciones visuales interesantes:** evitar que todas las secciones sean una sucesión de tarjetas idénticas.
- **Formas orgánicas:** bordes redondeados, superficies, contenedores y elementos gráficos con una geometría coherente.
- **Tipografía expresiva:** títulos con personalidad, buena jerarquía y textos cómodos de leer.
- **Color con intención:** una paleta reconocible, con colores principales, secundarios y de apoyo bien definidos.
- **Degradados y recursos gráficos:** utilizarlos cuando aporten valor a la identidad, no como decoración indiscriminada.
- **Detalles visuales:** iconografía consistente, separadores, fondos, texturas sutiles y elementos de marca.
- **Interacciones agradables:** animaciones, transiciones y microinteracciones que den sensación de producto vivo.

No quiero una copia de Passion.io. Quiero que CIBERAN tenga su propia identidad, inspirada en ese tipo de dirección artística.

### Evitar

- El típico dashboard SaaS genérico.
- Interfaces excesivamente minimalistas que terminen pareciendo vacías.
- Abuso de tarjetas blancas idénticas.
- Degradados aleatorios en todos los elementos.
- Sombras exageradas.
- Bordes redondeados sin jerarquía.
- Interfaces excesivamente compactas.
- Textos pequeños como tamaño habitual de lectura.
- Animaciones que dificulten la navegación o ralenticen la aplicación.

## 3. Renovación del sistema de diseño

Quiero que establezcas un auténtico Design System para CIBERAN.

No quiero que cada página tenga sus propias decisiones de diseño ni que cada componente invente sus propios estilos.

Todo debe partir de un sistema centralizado, documentado y reutilizable.

### 3.1. `main.css`: nueva fuente de verdad visual

Quiero que revises y reorganices completamente:

`app/assets/css/main.css`

Este archivo debe convertirse en la fuente principal del sistema visual de CIBERAN.

Organiza el CSS mediante secciones claras y utiliza CSS Nesting para agrupar los estilos relacionados.

Una posible organización:

- Fuentes y tipografías.
- Design tokens.
- Colores y superficies.
- Escala tipográfica.
- Espaciado.
- Radios y bordes.
- Sombras.
- Transiciones y animaciones.
- Componentes base.
- Patrones de interfaz.
- Estados interactivos.
- Utilidades.
- Accesibilidad y preferencias de movimiento.
- Responsive.

No quiero un archivo CSS convertido en un enorme bloque desordenado. Debe ser fácil localizar, comprender y modificar cualquier regla.

Utiliza variables CSS para los valores compartidos y evita repetir valores arbitrarios.

Comprueba previamente que la configuración actual de Nuxt, Tailwind y PostCSS permite utilizar el nesting elegido.

### 3.2. Sacar los estilos de JavaScript

Quiero separar correctamente responsabilidades.

**Todo lo que sea presentación debe estar en CSS, no en JavaScript.**

Revisa los componentes y páginas buscando:

- Estilos inline.
- Modificaciones de `element.style`.
- Asignaciones dinámicas de propiedades visuales desde JavaScript.
- Clases construidas de forma desordenada.
- Estilos repetidos.
- Animaciones implementadas mediante manipulación directa del DOM.
- Lógica de presentación mezclada con lógica de negocio.

Cuando corresponda, traslada estas responsabilidades a CSS mediante clases, modificadores, atributos y variables CSS.

JavaScript y Vue deben encargarse del comportamiento, los datos y los estados de la aplicación. CSS debe encargarse de cómo se representan visualmente.

No elimines lógica dinámica necesaria. Por ejemplo, una barra de progreso puede recibir un valor calculado desde Vue, pero su apariencia, transiciones y estados deben definirse en CSS.

No introduzcas manipulación directa del DOM cuando Vue pueda resolverlo declarativamente.

### 3.3. Organización y nomenclatura

Quiero un código limpio, predecible y escalable.

Utiliza una nomenclatura coherente para las clases CSS.

Por ejemplo:

- `.card`
- `.card__header`
- `.card__content`
- `.card__footer`
- `.card--featured`
- `.card--interactive`

Puedes utilizar una metodología BEM o una alternativa equivalente, siempre que mantengas coherencia.

Evita:

- Selectores excesivamente específicos.
- Cadenas de clases interminables.
- Estilos duplicados.
- `!important` como solución habitual.
- Selectores globales que afecten accidentalmente a otras páginas.
- Modificadores de estado con nombres inconsistentes.

No quiero que cada componente tenga una implementación visual completamente independiente cuando comparte el mismo patrón con otros.

## 4. Construir una biblioteca de componentes

Antes de migrar todas las páginas, quiero que establezcas componentes base reutilizables.

El informe actual identifica varias carencias. Aprovecha el rediseño para resolverlas.

Como mínimo, estudia y desarrolla:

### Elementos de interacción

- `BaseButton`: variantes primary, secondary, outline, ghost y destructive.
- `IconButton`: botones de icono con estados y tamaños consistentes.
- `BaseField`: campo de formulario reutilizable.
- `BaseTextarea`: áreas de texto con estados visuales.
- `BaseSelect`: selectores.
- `Chip`: etiquetas y elementos seleccionables.
- `SegmentedTabs`: pestañas y selectores de vista.

### Elementos de contenido

- `BaseCard`: componente de tarjeta flexible.
- `PanelCard`: panel con cabecera, título y contenido.
- `SectionTitle`: títulos de sección con jerarquía.
- `StatusPill`: estados de publicaciones y colaboraciones.
- `BaseAvatar`: representación unificada de perfiles.
- `DataList`: presentación estructurada de datos.
- `EmptyState`: estados vacíos.
- `SkeletonBlock`: estados de carga.

No es obligatorio crear exactamente estos componentes si encuentras una arquitectura mejor. Lo importante es que exista una biblioteca coherente y que se aproveche realmente.

### 4.1. Sistema de botones

Quiero que todos los botones tengan:

- Alturas y tamaños coherentes.
- Tipografía consistente.
- Radios definidos.
- Estados hover.
- Estados active.
- Estados focus-visible.
- Estados disabled.
- Estados loading.
- Transiciones suaves.

Los botones principales deben destacar sin competir constantemente con otros elementos.

### 4.2. Sistema de formularios

Este punto es especialmente importante.

Ahora mismo existen numerosos campos que repiten las mismas clases.

Quiero un sistema completo de formularios que contemple:

- Inputs de texto.
- Textareas.
- Selectores.
- Campos numéricos.
- Campos de búsqueda.
- Campos con iconos.
- Campos con ayuda contextual.
- Campos con validación.
- Estados de error y éxito.
- Estados disabled y readonly.

Los textareas deben tener un diseño especialmente cuidado: buen espacio interior, altura adecuada, redimensionamiento controlado, focus visible y transiciones suaves.

Las etiquetas, mensajes de ayuda y errores deben mantener siempre la misma jerarquía visual.

### 4.3. Sistema de tarjetas

No quiero que todas las tarjetas sean visualmente iguales.

Define diferentes patrones según su finalidad:

- Tarjetas de información.
- Tarjetas de estadísticas.
- Tarjetas destacadas.
- Tarjetas de perfiles.
- Tarjetas de colaboraciones.
- Tarjetas de publicaciones.
- Tarjetas interactivas.
- Tarjetas de actividad.
- Paneles de contenido.

Cada patrón debe tener una razón de existir y mantener la identidad general.

## 5. Microinteracciones y animaciones

Quiero que la aplicación tenga una experiencia mucho más agradable.

Presta especial atención a:

### Hover

- Las tarjetas interactivas deben responder al cursor.
- Los botones deben tener feedback visual.
- Los elementos seleccionables deben mostrar claramente su estado.
- Los enlaces deben tener transiciones cuidadas.
- Los iconos pueden tener pequeños cambios de escala, color o posición cuando tenga sentido.

### Focus y active

No descuides la navegación mediante teclado.

Todos los elementos interactivos deben mostrar correctamente sus estados de foco y activación.

### Transiciones

Define un sistema común de duración y curvas de animación.

Quiero transiciones naturales, sin movimientos bruscos ni efectos exagerados.

### Animaciones de entrada

Puedes utilizar pequeñas animaciones de aparición para secciones, tarjetas y contenido dinámico.

No todas las páginas necesitan animarse constantemente.

### Respeto por el rendimiento

- Evita animaciones que provoquen saltos de layout.
- Prioriza transform y opacity cuando sea posible.
- Respeta `prefers-reduced-motion`.
- No introduzcas dependencias de animación innecesarias.
- Reutiliza las animaciones existentes cuando sigan teniendo sentido.

## 6. Identidad visual de CIBERAN

El cambio de FEEDMA a CIBERAN implica que también debemos renovar la identidad de marca.

No quiero limitarnos a sustituir letras en el logotipo anterior.

Estudia:

- Logotipo y símbolo.
- Tipografía de marca.
- Paleta cromática.
- Versiones para fondos claros y oscuros.
- Aplicación en la barra lateral.
- Aplicación en móvil.
- Favicon.
- Icono de instalación.
- Pantallas de carga.
- Portada pública.

Quiero que propongas una dirección artística coherente.

No des por hecho que tenemos que conservar el violeta actual ni los colores del antiguo logotipo.

Puedes explorar una nueva paleta tomando como inspiración la referencia de Passion.io, pero debes justificar las decisiones y comprobar que funcionan en toda la aplicación.

Los colores de estado de publicaciones y colaboraciones deben seguir siendo fácilmente distinguibles.

Especial atención a no utilizar un mismo color para representar conceptos diferentes cuando pueda generar confusión.

## 7. Aplicación del nuevo diseño a toda la plataforma

El rediseño no debe quedarse en los componentes base.

Quiero que se aplique de manera consistente a toda la aplicación:

- Portada pública.
- Login y registro.
- Onboarding.
- Inicio del creador.
- Inicio del partner.
- Descubrir.
- Colaboraciones.
- Detalle de colaboración.
- Chat.
- Bandeja de entrada.
- Publicaciones.
- Tablero.
- Métricas.
- Perfiles privados.
- Perfiles públicos.
- Favoritos.
- Administración, en la medida en que corresponda.

Quiero que revises la composición de cada pantalla.

No basta con cambiar los colores y los radios: también debes mejorar la jerarquía, distribución del espacio, alineación, densidad de información y organización del contenido.

Evita que todas las páginas parezcan construidas a partir de la misma plantilla.

Cada sección debe tener una composición adaptada a su función.

Aprovecha el ancho disponible cuando tenga sentido. No limites artificialmente las páginas que necesitan aprovechar el espacio horizontal.

Mantén una experiencia responsive cuidada en móvil, tablet y escritorio.

## 8. Reorganización y reutilización

El informe detecta duplicaciones importantes entre las páginas de creador y partner.

Quiero que estudies cómo aprovechar el rediseño para reducir duplicaciones sin introducir una refactorización innecesariamente arriesgada.

Especialmente:

- Descubrir.
- Perfiles.
- Colaboraciones.
- Inicio.

Cuando dos páginas compartan estructura y comportamiento, estudia si conviene convertirlas en componentes o páginas compartidas que reciban el rol y los datos correspondientes.

No fuerces una abstracción cuando las diferencias funcionales sean importantes.

La prioridad es mantener un código fácil de mantener, no conseguir el menor número de archivos posible.

## 9. Restricciones importantes

Este rediseño es visual y estructural, no una reconstrucción del producto.

Por tanto:

1. No elimines funcionalidades existentes.
2. No modifiques reglas de negocio por motivos visuales.
3. No cambies contratos de Supabase, RPC ni endpoints sin una justificación funcional independiente.
4. No alteres los flujos de Stripe ni los pagos.
5. No rompas las rutas actuales ni los permisos por rol.
6. No sustituyas datos reales por datos ficticios.
7. No introduzcas dependencias innecesarias.
8. No hagas cambios masivos sin verificar sus consecuencias.
9. Mantén la accesibilidad y los estados de carga, error y vacío.
10. No sacrifiques la versión móvil para mejorar la de escritorio.

La prioridad es que CIBERAN siga funcionando exactamente como producto, pero con una experiencia visual considerablemente superior.

## 10. Metodología de trabajo

No quiero que intentes modificar las 27 páginas de golpe.

Quiero un pipeline de implementación controlado y verificable.

### Fase 0 — Auditoría y propuesta artística

Antes de modificar código:

1. Lee el informe de diseño completo.
2. Inspecciona `main.css`, `nuxt.config.ts` y la configuración de Tailwind/PostCSS.
3. Revisa los componentes actuales.
4. Inspecciona las pantallas reales en el navegador.
5. Estudia la referencia de Dribbble.
6. Identifica estilos implementados desde JavaScript.
7. Detecta patrones repetidos y oportunidades de reutilización.

Después, prepara una propuesta de diseño que incluya:

- Dirección artística de CIBERAN.
- Paleta cromática propuesta.
- Tipografías propuestas.
- Escala tipográfica.
- Sistema de espaciado.
- Radios y sombras.
- Sistema de botones.
- Sistema de formularios.
- Sistema de tarjetas.
- Estados y microinteracciones.
- Organización propuesta de `main.css`.
- Componentes que se crearán o modificarán.
- Orden de migración de las páginas.

No empieces una migración masiva sin tener clara esta propuesta.

### Fase 1 — Fundamentos

Implementa:

- Nueva identidad visual.
- Tokens.
- Tipografía.
- Escalas.
- Espaciado.
- Radios.
- Sombras.
- Transiciones.
- Estructura de `main.css`.

Verifica que los fundamentos funcionan correctamente antes de continuar.

### Fase 2 — Biblioteca de componentes

Construye y migra los componentes base.

Comprueba que son reutilizables, que aceptan sus variantes correctamente y que no rompen los componentes existentes.

### Fase 3 — Shell y navegación

Rediseña:

- AppShell.
- SideRail.
- TopBar.
- Navegación móvil.
- Menús.
- Estados activos.
- Elementos globales.

Aplica el nuevo branding a toda la estructura.

### Fase 4 — Migración de páginas

Migra las páginas progresivamente, agrupándolas por áreas funcionales.

Comprueba ambos roles cuando corresponda.

No des por terminada una página porque compile: debe haberse comprobado visualmente.

### Fase 5 — Pulido visual

Revisa:

- Consistencia.
- Espaciado.
- Jerarquía.
- Hovers.
- Animaciones.
- Responsive.
- Accesibilidad.
- Estados vacíos.
- Estados de error.
- Estados de carga.

Corrige los problemas detectados en la auditoría UX anterior.

### Fase 6 — Verificación final

Utiliza el sistema de capturas existente (`scripts/demo-video/` y `ux-capture`).

Verifica, como mínimo:

- 390 px.
- 768 px.
- 1024 px.
- 1440 px.

Comprueba las páginas principales de ambos roles.

Ejecuta los tests disponibles, comprobaciones de tipos, lint y builds correspondientes.

No afirmes que algo está verificado si realmente no se ha ejecutado.

Documenta las limitaciones y los problemas pendientes.

## 11. Documentación del sistema

Quiero que el resultado sea mantenible a largo plazo.

Crea documentación del nuevo Design System que explique:

- Filosofía visual.
- Tokens.
- Tipografía.
- Colores.
- Componentes.
- Variantes.
- Patrones de composición.
- Estados interactivos.
- Responsive.
- Convenciones CSS.

La documentación debe servir para que futuras funcionalidades de CIBERAN respeten automáticamente la identidad visual.

## 12. Criterio de calidad final

Quiero que el resultado transmita:

- Una marca profesional.
- Una plataforma creativa.
- Un producto digital moderno.
- Una experiencia cuidada.
- Una interfaz con personalidad.
- Un sistema visual coherente.

No quiero simplemente una aplicación que funcione y tenga buen aspecto.

Quiero que CIBERAN parezca un producto que podría presentarse públicamente, enseñar a marcas y creadores, y utilizarse profesionalmente.

**La calidad visual debe ser consistente en toda la aplicación, no solamente en la portada o en el dashboard.**

---

## Instrucción final

Empieza exclusivamente por la Fase 0.

Analiza, inspecciona y presenta tu propuesta artística y técnica antes de implementar cambios.

Quiero que tomes decisiones de diseño con criterio propio, no que me preguntes por cada color, radio o margen.

Si encuentras varias alternativas, recomienda la que consideres mejor y explica brevemente por qué.

Una vez aprobada la dirección visual, seguiremos el pipeline fase por fase.

Prioriza siempre un resultado visual de alta calidad, código limpio, escalabilidad y cero regresiones funcionales.