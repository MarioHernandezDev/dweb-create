# Propuesta A-R18 — Perfiles a ancho completo (`/creator/profile` y `/partner/profile`)

Estado: **implementada (A-R18a–f, ver CHANGELOG Alex-37).** Desviaciones respecto a lo propuesto: sin esqueletos de carga (la página espera sus datos antes de pintar), pestañas horizontales en lugar de lateral y el resumen del creador no usa el snapshot de suscriptores sino `followers_count` de la cuenta conectada. Fecha: 2026-10-30. Autor: [Alex].
Alcance: presentación y usabilidad. Sin migraciones, sin cambios de RLS, sin tocar datos reales.

## 1. Auditoría técnica

### Archivos
- Páginas: `app/pages/creator/profile.vue` (522 líneas), `app/pages/partner/profile.vue` (416). Casi idénticas en estructura: ~70 % del código está duplicado (ficha, categorías, rango económico, paquetes/necesidades, privacidad del chat).
- Componentes compartidos: `components/profile/ProfileSettingsNav.vue` (pestañas: menú lateral en escritorio, tira con scroll en móvil), `ProfileCompletionBar.vue`, `ProfileHeaderCard.vue` (el mismo que pinta el perfil público `/profile/[role]/[id]`), `PackageCard.vue`, `PackageFormSheet.vue`; además `AvatarUploader`, `CoverPhotoUploader`, `BaseCard`, `BaseButton`, `BottomSheet`, `EmptyState`.
- Composables: `useMyCreator`, `useMyPartner` (lectura y `updateFicha`), `useMyAvatar`, `usePackages`, `useOffers`, `useChatSettings`, `useMyBilling`, `useMyCredits`, `useConfirm`, `useClipboard`, `useUnsavedChangesGuard`, `useOnboardingTour`.
- Anchura: la limitación **no viene de un contenedor compartido** sino de dos sitios. (1) `AppShell.vue` pone `max-w-[1100px]` en `<main>` salvo que se pase `fullWidth` (Métricas ya lo usa). (2) Cada página añade `md:max-w-5xl` y, dentro de cada pestaña, `md:max-w-lg` (512 px). Resultado: en una pantalla de 1920 px el contenido útil ocupa ~512 px. **Basta pasar `full-width` al `AppShell` de estas dos páginas; no hay que tocar el shell ni otras páginas.**

### Datos reales disponibles (lo único que se puede mostrar)
| | Creador (`creators`) | Partner (`partners`) |
|---|---|---|
| Identidad | `display_name`, `niche`, avatar, `cover_url` | `company_name`, `industry`, avatar, `cover_url` |
| Ficha | `bio`, `categories`, `min/max_rate_cents`, `looking_for` | `bio`, `categories`, `min/max_budget_cents`, `looking_for` |
| Otros | `weekly_post_target`, `stripe_connect_onboarded`, créditos, plan (Stripe) | — |
| Compartido | paquetes/necesidades, privacidad del chat, enlace público, recorrido de bienvenida, cierre de sesión | ídem |

**No existen** `username`, ubicación, sitio web, tamaño de empresa ni verificación de empresa. La cabecera **no puede mostrarlos** y no se inventan; si se quisieran, requieren columnas nuevas (migración y aprobación; ver §6).
Redes conectadas: sí existen (`social_accounts` con `connection_status`: `connected` / `expired` / `revoked` / `missing_permissions`, expuesto de forma segura para el navegador). Hoy la pestaña Cuenta del creador solo enseña un enlace "Redes conectadas" sin estado.

## 2. Las cuatro pestañas actuales

### Creador: Cuenta · Ficha pública · Paquetes · Privacidad y pagos
| Pestaña | Objetivo | Problemas detectados |
|---|---|---|
| Cuenta | Atajos de cuenta | Tarjeta de 4 filas en 512 px; "Redes conectadas" es un enlace sin estado; créditos con texto largo en 12 px; objetivo semanal suelto aquí aunque afecta a "Hoy"; recorrido y cerrar sesión a ancho completo de botón, compiten con lo importante |
| Ficha pública | Lo que ve el partner en Descubrir | Formulario de 512 px + vista previa de 288 px sobrando ancho a ambos lados; un único "Guardar" al final del formulario (lejos en pantallas altas); `Guardado.` desaparece solo al volver a editar; sin validación (tarifa mínima > máxima se guarda); sin contador de caracteres de la bio |
| Paquetes | Catálogo ofertable | Lista de tarjetas en una columna de 512 px; recuento "activos · ofertas pendientes" en texto gris; estado vacío correcto pero sin acción |
| Privacidad y pagos | Chat y cobros | Dos secciones sin conexión visual con su estado; plan y cuenta de pagos como filas de texto; el estado "verificada" solo es un icono |

### Partner: Cuenta · Ficha pública · Necesidades · Privacidad
| Pestaña | Objetivo | Problemas detectados |
|---|---|---|
| Cuenta | Atajos | Casi vacía (un enlace y dos botones); mucho espacio muerto en escritorio |
| Ficha pública | Lo que ve el creador | Mismos que el creador: ancho, único Guardar lejano, sin validación de presupuesto mín/máx |
| Necesidades | Lo que busca | Igual que Paquetes: columna estrecha, estado vacío sin acción |
| Privacidad | Chat | Una sola sección en 512 px |

Problemas comunes: la barra de progreso (`ProfileCompletionBar`) y el avatar ocupan una franja alta sobre las pestañas y repiten información que luego aparece en la ficha; no hay indicador de cambios sin guardar visible (solo el aviso al salir); sin atajos de teclado entre pestañas (los botones sí son enfocables pero la nav no usa `role="tablist"`); las pestañas se alternan con `v-show` sin transición.

## 3. Nueva distribución full width

Principio: `AppShell full-width` + una rejilla de 12 columnas a partir de `lg`; en `md` dos columnas; en móvil una. Cada pestaña distribuye por objetivo, no se estira.

### Cabecera (los dos perfiles; un componente `ProfileHero`)
Banda con portada (la que ya existe) y, sobre ella, avatar, nombre y subtítulo; a la derecha las acciones (Ver perfil público, Copiar enlace, Editar ficha → lleva a la pestaña). Altura contenida (~160–200 px en escritorio). Debajo, una fila de datos reales:
- **Creador:** nicho, categorías (máx. 4 + "+N"), "Redes: YouTube · conectada", rango de tarifa, plan.
- **Partner:** sector (`industry`), categorías, rango de presupuesto, estado del perfil ("Ficha al 71 %").
La barra de completitud pasa **a la cabecera** y desaparece de encima de las pestañas, así no se duplica. Sin ubicación ni usuario (no existen).
Las redes se muestran con estado real: solo `connected` lleva el check verde; `expired`/`revoked`/`missing_permissions` se rotulan con su causa y enlazan a "Reconectar" en Métricas > Conexiones.

### Creador
1. **Cuenta → "Resumen"**: rejilla 3 columnas: tarjeta *Redes* (estado real por plataforma y enlace a Métricas; si hay YouTube conectado, los suscriptores del último snapshot, rotulado "dato de YouTube"); tarjeta *Actividad* (objetivo semanal editable en línea, créditos y cómo se renuevan); tarjeta *Pendiente de completar* (la lista de `completionItems` con cada elemento como enlace a donde se corrige). Abajo, acciones secundarias (recorrido, cerrar sesión) como enlaces discretos, no botones a todo ancho.
2. **Ficha pública**: formulario en 2 secciones (Identidad y bio · Categorías y colaboración) en la columna izquierda (7/12) y vista previa fija a la derecha (5/12, más grande que hoy). Barra de guardado **fija abajo** ("Cambios sin guardar · Descartar · Guardar"), con aviso de guardado persistente 3 s. Validación: mín ≤ máx, bio ≤ 500 (contador).
3. **Paquetes**: cuadrícula de tarjetas 2–3 columnas (mantiene arrastrar para reordenar), resumen arriba (activos, ofertas pendientes) y estado vacío con botón "Crear mi primer paquete".
4. **Privacidad y pagos**: dos tarjetas lado a lado: *Chat* (opciones actuales) y *Cobros* (plan y cuenta de pagos con estado en insignia y la acción principal destacada).

### Partner
1. **Cuenta → "Resumen"**: *Perfil público* (enlace, copiar), *Estado de la ficha* (pendientes con enlace), *Actividad* (necesidades activas y ofertas pendientes, ya calculadas). No se añade nada que no exista.
2. **Ficha pública**: mismo patrón que el creador (formulario + vista previa), con textos de empresa ("Qué tipo de creadores buscas", presupuesto).
3. **Necesidades**: cuadrícula con resumen y vacío con acción.
4. **Privacidad**: chat en una tarjeta con la explicación de cada opción al lado (no solo radios), ocupa el ancho en 2 columnas con "Quién puede escribirte" y la consecuencia de cada opción.

Diferencias intencionadas: el creador tiene redes, métricas, cobros y créditos; el partner no. El partner se presenta como empresa (sector, presupuesto, necesidades); el creador como persona con potencial de colaboración (nicho, tarifa, redes).

## 4. Mejoras

**Visuales (sin backend):** cabecera con portada; rejilla full width; tarjetas con distinta jerarquía (no todas iguales); insignias de estado; transición de pestaña (fundido de 150 ms) y entrada escalonada de secciones; hover sutil; todo bajo `prefers-reduced-motion`.
**De usabilidad (sin backend):** `role="tablist"/"tab"/"tabpanel"` con flechas de teclado; barra de guardado fija con estado "sin guardar"; validaciones (mín ≤ máx, límites de texto); estados de carga con esqueleto (hoy la página bloquea con `await`); objetivo táctil ≥ 44 px; pestaña activa en la URL (`?tab=`, ya existe).
**Funcionales viables con lo que ya existe:** estado real de redes en el perfil del creador; suscriptores del último snapshot (A-R8a); lista de "pendiente" con enlaces; resumen de actividad (paquetes activos/ofertas).
**Requieren backend/migración (no se proponen ahora):** ubicación, usuario, sitio web, logotipo distinto del avatar, verificación de empresa, métricas agregadas públicas del creador. Cada una exige columnas, política de privacidad sobre qué se publica y aprobación explícita.
**Descartadas:** insignias de "verificado" para redes sin conexión válida; cifras de seguidores sin snapshot; "tamaño de empresa" u otros datos ficticios.

## 5. Dependencias y orden

- Ninguna bloquea con seguridad ni arquitectura: es presentación. Sí conviene hacerlo **después** de A-R4/A-R6 si éstos tocan la gestión de cuenta (el borrado de cuenta M-L2 de Mario añade acciones en Cuenta) y de que Mario fusione su trabajo de perfil, para no duplicar cambios en estos dos archivos (hoy son los más propensos a conflictos).
- Reutiliza el estado de conexión de las cuentas que ya lee Métricas > Conexiones (A-R17) y el snapshot de A-R8a.
- `ProfileHeaderCard` (perfil público) **no se modifica** para no alterar la página pública; la nueva cabecera es un componente aparte.

### Fases propuestas (cada una validada con unit, vue-tsc, navegador a 390/768/1280/1920 y build)
- **A-R18a** — Full width + rejilla de pestañas, sin cambiar contenido (quita `max-w-*`, reorganiza); regresión de formularios.
- **A-R18b** — `ProfileHero` con datos reales y estado de redes; barra de completitud movida a la cabecera.
- **A-R18c** — Ficha pública: barra de guardado fija, validaciones, contador, vista previa mayor.
- **A-R18d** — Pestañas Cuenta/Resumen de cada rol.
- **A-R18e** — Paquetes/Necesidades en cuadrícula y estados vacíos con acción; Privacidad/Pagos.
- **A-R18f** — Accesibilidad de pestañas (tablist), transiciones y `prefers-reduced-motion`, esqueletos.

## 6. Decisiones que quedan para Alex (solo si se quieren)
- Añadir ubicación/usuario/web: requiere migración y política de qué se publica.
- Dejar de duplicar el código entre los dos perfiles extrayendo solo lo claramente igual (formulario de ficha con props de etiquetas); lo demás se mantiene separado a propósito.
