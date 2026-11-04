# Fase 4 — Auditoría visual y de UX

> Fecha: 2026-11-03 · Entorno: build de producción con datos de demo.
> **Método:**
> - Capturas de 14 rutas a tres tamaños: móvil 390×844 @2x, tableta 768×1024 @2x y escritorio 1440×900. Incluye las páginas públicas, las del creador y las del partner.
> - Análisis automático de accesibilidad con **axe-core 4.10** en 28 páginas (móvil y escritorio).
> - Detección de desbordamiento horizontal.
> - Revisión manual durante los cinco recorridos completos de la demo.
>
> El criterio es buscar problemas reales y concretos, no rediseñar por gusto.

## 1. Valoración general

CIBERAN ya transmite un producto SaaS cohesionado:
- **Identidad:** paleta violeta, Sora para títulos y Hanken Grotesk para texto, aplicadas igual en todas las pantallas.
- **Estructura:** barra lateral en escritorio y barra inferior en el móvil.
- **Diálogos:** tarjetas, hojas y diálogos con el mismo lenguaje visual.
- **Respuesta a las acciones:** avisos («Movida a…», «Publicación creada…») y confirmación antes de las acciones irreversibles (rechazar una oferta, completar una colaboración).
- **Estados vacíos** útiles («Aquí no hay ninguna publicación todavía», «Ninguna conversación coincide» con «Quitar filtros»).
- **Textos honestos:** la predicción avisa de que no usa IA y las redes no soportadas salen como «Próximamente».

Lo que más resta es un puñado de fallos de maquetación en el móvil y de accesibilidad, todos acotados.

## 2. Hallazgos

| ID | Área | Gravedad | Problema | Dónde | Propuesta |
|---|---|---|---|---|---|
| **U-01** | Responsive | Alta | **El perfil del creador desborda 39 px en horizontal en el móvil:** las tarjetas «Redes» y «Actividad» se salen por la derecha | `/creator/profile` a 390 px | Buscar el hijo con ancho fijo o `min-width` (el desborde aparece justo en la columna de tarjetas) y aplicar `min-w-0` / `max-w-full` |
| **U-02** | Responsive | Media | La tarjeta destacada de Descubrir se corta por la derecha en el móvil («Contactar» y el rango de precio pegados al borde) | `/partner/discover` y `/creator/discover` a 390 px | Ajustar el ancho de la tarjeta del carrusel al contenedor (o `scroll-snap` a ancho completo) |
| **U-03** | Maquetación | Media | En el calendario de la marca, «Aprobar» queda cortado por el borde de la tarjeta y «Pedir cambios» se parte en dos líneas | `/partner` («Tu calendario») en escritorio | Botones a ancho completo debajo del título, o solo icono más `aria-label` en tarjetas estrechas |
| **U-04** | Accesibilidad | Alta | **Contraste insuficiente** (axe `color-contrast`, grave) en 10 páginas, 33 elementos. Sobre todo texto pequeño con opacidad (`text-white/40`, `--color-text-faint`) | Portada, tablero, métricas, perfil, colaboraciones | Subir la opacidad mínima o el tono hasta 4,5:1 para el texto normal |
| **U-05** | Accesibilidad | Alta | **Controles interactivos anidados** (axe `nested-interactive`): la tarjeta del tablero es un `div` con `aria-label="Abrir «…»"` que contiene botones (selector de fase, menú) | `/creator/timeline` | Convertir el título en el enlace o botón principal, en lugar de toda la tarjeta |
| **U-06** | Accesibilidad | Media | `aria-label` en elementos que no lo admiten (axe `aria-prohibited-attr`): los iconos «?» de las columnas | `/creator/timeline` | Usar `role="img"` más `aria-label`, o un botón que abra la explicación |
| **U-07** | Accesibilidad | Media | Lista de definiciones mal formada (axe `definition-list`, `dlitem`) en «Datos clave» | Perfil público | Que cada fila sea `div > dt + dd` directamente dentro de `dl` |
| **U-08** | Accesibilidad | Baja | Portada y login sin región `main` (axe `landmark-one-main`, `region`); carrusel horizontal no alcanzable con el teclado (axe `scrollable-region-focusable`) | `/`, `/login` | Envolver en `<main>`; `tabindex="0"` en el contenedor con scroll |
| **U-09** | Contenido | Media | **La portada promete redes que no se pueden conectar:** el pie dice «Redes que conecta: Instagram · TikTok · YouTube · X · Facebook · LinkedIn»; en la app solo funcionan Instagram y YouTube | Pie de `/` | Alinear el texto con la decisión Q4 (hoy: «Instagram y YouTube; más, próximamente») |
| **U-10** | Consistencia | Baja | La portada del creador se llama «Hoy» y la del partner «Inicio» | Menú lateral e inferior | Unificar, o dejarlo como decisión explícita de tono |
| **U-11** | Consistencia | Baja | En las listas de colaboraciones salen iniciales («IS», «NS») aunque el perfil tiene foto; en chat y perfiles sí aparece la foto | `/creator/requests`, `/partner/requests` | Usar el mismo componente de avatar |
| **U-12** | Legibilidad | Baja | Títulos de paquete y descripciones truncados en el perfil público («Reel de lanz…», «Campaña co…»): la columna del precio (estilo ticket) deja poco ancho | Perfil público, 2 columnas en escritorio | Una columna por debajo de ~1100 px de contenido, o el precio debajo del título |
| **U-13** | Medios | Baja | La vista previa de la publicación recorta la pieza vertical (4:5) a una franja horizontal de 160 px, y se pierde lo importante (justo lo que revisa la marca) | `/creator/post/:id`, hoja de revisión de la marca | `object-contain` sobre fondo neutro, o proporción 4:5 en la hoja de revisión |
| **U-14** | Móvil | Baja | Títulos de cabecera truncados («Publicacio…») y «Buscar con IA» en dos líneas a 390 px | Cabecera móvil, Descubrir | Título más corto en el móvil o menos iconos en la cabecera; botón solo con icono |
| **U-15** | Feedback | Baja | Tras crear una publicación con predicción, su ficha decía «Todavía no has predicho» hasta recargar (F-03) | `/creator/post/:id` | **Corregido** (ver F-03) |

## 3. Por criterio

| Criterio | Estado | Notas |
|---|---|---|
| Jerarquía visual | ✅ | Título de página, subtítulo, tarjetas; las acciones principales en violeta sólido |
| Consistencia | ✅ con matices | U-10 y U-11 |
| Espaciado | ✅ | Ritmo regular de 8 px; tarjetas con aire |
| Tipografía | ✅ | Sora y Hanken bien combinadas; legible a 1080p |
| Paleta | ✅ con matices | Coherente; contraste del texto atenuado (U-04) |
| Responsive | ⚠️ | El móvil funciona (barra inferior, columnas apiladas); 2 desbordamientos (U-01, U-02) |
| Navegación | ✅ | Menú lateral o inferior; los avisos llevan al sitio exacto (p. ej. el cambio pedido) |
| Estados vacíos | ✅ | Explican qué pasa y qué hacer |
| Skeletons | ✅ | No se vieron saltos de contenido al cargar en los recorridos |
| Feedback de acciones | ✅ | Avisos, estados de carga en botones, confirmaciones |
| Formularios | ✅ | Etiquetas visibles, validación en línea («Indica un precio…», comentario obligatorio al pedir cambios) |
| Modales | ✅ | Hojas centradas con fondo difuminado en escritorio; cierre con ✕ |
| Transiciones y animaciones | ✅ | Suaves; la portada anima con el scroll (GSAP). Conviene comprobar `prefers-reduced-motion` |
| Accesibilidad | ⚠️ | 14 de 28 páginas sin incidencias en axe; las otras 14 tienen U-04 a U-08 |

## 4. Evidencia

Las capturas por tamaño y el informe de axe (`ux-report.json`) están en la carpeta de trabajo de la auditoría. Las páginas sin incidencias de axe son: login y alta en el móvil; alta en escritorio; «Hoy», colaboraciones, chat (móvil) y bandeja del creador; inicio y Descubrir del partner.
