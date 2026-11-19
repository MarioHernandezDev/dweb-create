# CIBERAN — Auditoría UX/UI (segunda ronda) · foco en paquetes

> Fecha: 2026-11-18 · Alcance: lo comprobado en navegador con una sesión de **creador** (cuenta real de la base compartida) a 800 px de ancho, más lectura de código. Complementa `UX_UI_AUDIT.md` y `UX_UI_IMPLEMENTATION.md`.
> **No se ha podido revisar** la vista de partner (no había sesión de partner), ni un perfil público con paquetes publicados (la cuenta de prueba no tenía ninguno), ni escritorio ancho ni móvil.

## 1. Conclusión principal: los paquetes están enterrados

Los paquetes son lo que permite que te contraten (ofertas directas, chat limitado a ofertas, filtros de confianza), pero en la interfaz son una función secundaria. Mapa de dónde aparecen hoy, medido:

| Lugar | Cómo aparece | Problema |
|---|---|---|
| Menú lateral / barra inferior | **Corregido**: entrada «Paquetes» / «Necesidades» | Antes: Avatar → Perfil → pestaña «Paquetes» (3.ª de 4). En móvil queda en «Más». |
| Inicio del creador | Panel «Tus paquetes» | Estaba a **1.675 px** (más de dos pantallas, tras gráficos y recomendaciones). **Corregido**: ahora a 524 px. |
| Perfil propio | Pestaña «Paquetes» | Tras «Resumen» y «Ficha pública». La pestaña inicial no los menciona. |
| Perfil público ajeno | Primera pestaña **solo si hay paquetes** | Sin paquetes, la pestaña queda la última («Necesidades» en partner) y el botón principal es «Proponer colaboración», genérico. |
| Descubrir (tarjeta) | Línea «N paquetes · desde X €» | Línea pequeña entre bio y presupuesto; no se puede filtrar ni ordenar por precio de paquete. Cada tarjeta sin paquetes no explica por qué no se puede ofertar. |
| Descubrir (filtros) | — | No hay filtro «Con paquetes» ni orden por precio de paquete. |
| Chat / colaboración | Ofertas sobre paquete | Bien resuelto una vez dentro; el problema es llegar. |

## 2. Hallazgos

**P-01 · Sin entrada de primer nivel · Prioridad alta · Complejidad media · HECHO.** Página propia `/creator/packages` («Paquetes») y `/partner/packages` («Necesidades»), con entrada en el menú lateral (después de Descubrir en creador; después de Colaboraciones en partner) y marcada como activa. La gestión (listado reordenable, alta, edición, pausa, destacado, duplicado, borrado) pasa a un componente compartido, `PackagesManager.vue`, que usan la nueva página y la pestaña del perfil. `?nuevo=1` sigue abriendo el formulario de alta y los enlaces de Inicio, «Primeros pasos» y el perfil público apuntan ya a la página nueva. En móvil la entrada queda en «Más» (la barra inferior solo tiene 3 destinos de rol). Pendiente: el paso del recorrido inicial sigue apuntando a «Perfil», y el título de página y el encabezado «Tus paquetes» se repiten.

**P-02 · Panel de Inicio demasiado abajo · Alta · Pequeña.** **Hecho** (ver arriba). Pendiente de revisar con paquetes reales y en partner: el panel equivalente del partner («necesidades») no se ha tocado.

**P-03 · Perfil público sin paquetes pierde el CTA · Alta · Pequeña.** Sin paquetes, quien visita solo ve «Proponer colaboración» y un mensaje genérico; el texto «Todavía no se le puede hacer una oferta» vive en una pestaña poco visible. Propuesta: un bloque en «Sobre …» que lo diga cerca del botón.

**P-04 · Descubrir no usa los paquetes para decidir · Alta · Media.** Falta filtro «Con paquetes», orden por «desde X €» y destacar el paquete principal en la tarjeta. Los resúmenes se piden solo para las tarjetas visibles, así que un filtro correcto necesita traer el resumen en la búsqueda del servidor (`/api/discover/search`). Con el campo `is_featured` ya existe el dato del paquete principal.

**P-05 · Paquete destacado todavía sin salida pública · Media · Pequeña.** Se marca y se ordena primero en el perfil, pero Descubrir y la tarjeta lateral siguen mostrando solo el recuento y el mínimo. Propuesta: «Destacado: {título} · {precio}» en la tarjeta de Descubrir.

**P-06 · «Primeros pasos» al final de Inicio · Media · Pequeña.** «Publica tu primer paquete» es el primer paso, pero la tarjeta está la última (≈1.950 px). Con el panel de paquetes arriba se cubre en parte; conviene revisar si ambos se solapan.

**P-07 · Colisión de clase CSS `.choice` · Media · Pequeña.** `settings.css` y `choice.css` definen `.choice` con estilos distintos; al pasar el ratón por un grupo de chips aparece un fondo beige con relleno. Anterior a esta ronda. Renombrar una de las dos.

**P-08 · Fila de acciones del paquete · Corregido.** Con el botón de estrella, «Editar» quedaba aplastado; ahora la fila baja de línea si no cabe.

**P-09 · Redes de una publicación en el detalle · Corregido.** La cabecera mostraba solo la principal.

## 3. Lo comprobado y correcto

- Formulario de publicación con redes múltiples; tablero con iconos de todas; detalle con el marco de imagen unificado con el tablero.
- Destacar y quitar el destacado funcionan y se guardan; la función no es ejecutable por `anon`.
- Descubrir con una sola marca no inventa motivos de encaje.
- Sin errores nuevos de consola en lo recorrido.

## 4. Orden recomendado

1. P-01 (ruta y entrada de menú «Paquetes»), con actualización del recorrido inicial y de los tests de navegación.
2. P-04 + P-05 (Descubrir: filtro, orden y destacado) — requiere tocar el servidor de búsqueda.
3. P-03 (bloque en el perfil público sin paquetes).
4. P-07 (renombrar `.choice`).
5. Repetir esta auditoría con una cuenta de partner y con datos de paquetes publicados.

## 5. Ronda de intervención (2026-11-18, con sesiones reales de creador y partner)

Probado en el navegador a 660 px (móvil), 768 px (tablet) y 1280 px (escritorio) con dos cuentas de prueba en la base compartida.

**Hecho**
- Inicio de cuenta nueva (creador y partner): «Primeros pasos» arriba; se ocultan tarjetas a cero, gráficos y calendario vacíos; subtítulo coherente.
- Inicio con actividad (creador y partner): lo que exige acción (entrega fuera de plazo / solicitud sin responder / entrega por revisar) sube arriba del todo, antes de los números.
- Sugerencias de creadores del partner: avatar, categorías y resumen real de paquetes.
- Perfil público en móvil y tablet: acciones principales en la cabecera, contenido de la pestaña justo debajo; tarjeta lateral al final. «Hacer oferta» oculto en el perfil propio.
- Colaboraciones: estados vacíos con acción; controles de búsqueda/orden/exportar ocultos sin datos; nombre de campaña visible en tarjetas, cabecera, título de pestaña y selector de publicación.
- Hoja de revisión del partner: imagen por defecto unificada (`CoverArt`) y aviso cuando la pieza llega sin imagen ni texto.
- Choque de la clase `.choice` resuelto (`.choice-chips`).
- Verificación de email: ver `docs/16-EMAIL-SMTP.md`.

**Pendiente**
- Errores de consola `_leaveCb` (2 por carga en desarrollo) sin aislar; tres respuestas 400 sin identificar.
- Estados de carga y de error de red sin probar.
- Studio, predicción de rendimiento y edición de ficha completa sin auditar a fondo.
- Datos de prueba creados en la base compartida: colaboración «Reseña de otoño (prueba)» y su publicación vinculada (aprobada).

## 6. Segunda ronda de intervención (2026-11-18)

**Negociación de prueba completa (creador ↔ partner):** solicitud 200 € → contraoferta del creador 300 € → contraoferta de la marca 250 € → aceptación por el creador. Probado en móvil (375 px) y escritorio.

**Corregido**
- «Siguiente paso» no se actualizaba tras contraofertar (hasta recargar): el panel avisa y la página refresca eventos.
- «Siguiente paso», Inicio y Bandeja dicen el cambio real: «Propone 250 € (antes 300 €) · «mensaje»».
- «Por responder» (partner) y «Solicitud pendiente» (creador) calculan el turno por la última propuesta, no solo por quién inició.
- «Todo al día» ya no sale si la bandeja tiene tareas.
- Avisos de éxito al aprobar, pedir cambios, aceptar, rechazar y contraofertar.
- Lenguaje coherente (marca / creador) en el panel de negociación; botones del calendario del partner sin cortes.
- Nombre de campaña distinguido de marca en detalle de publicación, tablero y filtros (`collabContextLabel`).
- Carga: el velo a pantalla completa solo en la carga inicial o esperas > 1,2 s; en navegación normal basta la barra de arriba.
- Predicción: aviso de que es una estimación, no un resultado.

**Diagnóstico de errores de consola:** `_leaveCb` no se reproduce con el servidor de desarrollo limpio (0 casos en ~15 navegaciones de ambos roles, incluidas hojas con `Teleport`/`Transition`): efecto de recargas en caliente. Los tres 400 coinciden con tres `invalid_credentials` de inicio de sesión (esperados).

**Pendiente**
- «Studio» no existe como sección; la predicción está apagada (`PREDICTIONS_ENABLED`) y no se ha visto en pantalla.
- Rechazar una solicitud y las notificaciones por correo no se han probado.
- Datos de prueba en la base compartida: dos colaboraciones de prueba con sus publicaciones.

## 7. Tercera ronda (2026-11-19): paquetes en Descubrir, enlaces de entrega y Raya

**Hecho y comprobado en el navegador (creador y partner)**
- Descubrir: filtro «Solo con paquetes (o necesidades) publicados», orden por precio de paquete (más bajo / más alto; sin paquetes al final) y línea «Destacado: título · precio · +N más» en la tarjeta.
- Perfil público sin paquetes: nota junto a las acciones («aún no se le puede hacer una oferta directa…»).
- Enlaces de entrega (migración `20261119100000_posts_delivery_links.sql`, aplicada): panel «Entrega» en el editor de publicación (borrador opcional + enlace de la publicación), con validación http(s), normalización y bloqueo del guardado con motivo. La marca los ve en la hoja de revisión («Ver el borrador», «Ver la publicación»). No invalidan aprobaciones (versión y fase intactas, comprobado en la base).
- Aviso de éxito al aprobar verificado: «Publicación aprobada: queda programada y el creador lo verá.».
- Raya, la mantarraya: acompañante animado en la portada (sigue el scroll, ánimo y frase por sección; sin globo en móvil; fija con movimiento reducido), y presencia en estados vacíos, «Primeros pasos» y 404.
- Botón flotante «+» (móvil) se esconde al bajar; subtítulo repetido de Paquetes eliminado.

**Pendiente**
- «Studio» como Fase 5 de la hoja de ruta (plantillas, biblioteca de archivos, Cmd/Ctrl+K, deshacer/autoguardado, IA): sin empezar, a la espera de que se elija.
- Rechazar una solicitud y correos de notificación: sin probar. Predicción: apagada.
- Estados vacíos con Raya en la app: implementados, sin verse en pantalla con estas cuentas.

## 8. Studio · plantillas y duplicar (2026-11-19)
Primera pieza de la Fase 5 de la hoja de ruta (`docs/HOJA_DE_RUTA.md`), probada de extremo a extremo con la cuenta de creador.
- **Duplicar publicación** (editor → «Reutilizar»): copia en «Idea» con título «… (copia)», texto, formato, redes, hashtags, colaboración y checklist (sin marcar); fecha una semana después (o +3 días si la original ya pasó). No copia imagen, enlaces ni fase.
- **Plantillas de publicación** (tipo `post` en `proposal_templates`, migración `20261119110000_post_templates_kind.sql`, aplicada): guardar desde el editor o desde «Nueva publicación»; aplicar rellena el formulario y añade el checklist al crear. Mismo nombre = actualiza; máximo 15; borrar con confirmación.
- Pendiente de Fase 5: biblioteca de archivos, Cmd/Ctrl+K, deshacer/autoguardado, publicaciones recurrentes, IA.

## 9. Studio · Cmd/Ctrl+K y deshacer (2026-11-19)
- **Paleta de comandos (Cmd/Ctrl+K)**, en los dos roles, con botón en la barra superior (escritorio): sin texto muestra «Ir a» (secciones) y «Acciones»; con texto, busca sin acentos en colaboraciones (por nombre de campaña y marca), publicaciones (creador), conversaciones y perfiles. Flechas, Intro y Escape; foco devuelto al cerrar; diálogo accesible con cuadro combinado. Lógica pura en `app/utils/command-palette.ts` (con tests).
- **Deshacer:** cambiar una publicación de fase muestra «Deshacer» (también devuelve la tarjeta a su columna del tablero). Borrar una publicación propia ya no pide confirmación: desaparece al momento y el borrado real se hace a los 8 s; «Deshacer» la restaura. Las de una colaboración siguen pidiendo confirmación (la marca también las ve). Si se cierra la pestaña antes de los 8 s, no se borra.
- Comprobado en navegador como creador: paleta (teclado, perfiles, sin resultados, móvil 375 px), deshacer fase, deshacer borrado y borrado real tras el plazo.
- Sin comprobar: la paleta como partner; borrar con confirmación una pieza de colaboración.

## 10. Studio · biblioteca de archivos

**Qué hace.** Página «Biblioteca» del creador (`/creator/library`): sube imágenes (JPG/PNG/WebP, máx. 8 MB, hasta 100), con búsqueda, etiquetas (máx. 8), renombrado, abrir y borrar con deshacer de 8 s. Se reutilizan desde un selector («Elegir de la biblioteca») en la portada de las publicaciones y en la portada de los paquetes. Al elegir, se **copia** el archivo: borrar el original de la biblioteca no rompe publicaciones ni paquetes que ya lo usan.

**Migración (aplicada con tu OK):** `supabase/migrations/20261119120000_media_library.sql` — tabla `media_library` con RLS por propietario, permisos por columna, tope de 100 por persona y bloque ROLLBACK.

**Probado (navegador, sesión de creador):** subida y validación, miniaturas, edición y normalización de etiquetas, filtros del selector, portada de publicación (copia independiente, sigue existiendo tras borrar el original), portada de paquete elegida desde la biblioteca (se sube y queda guardada), deshacer del borrado y borrado real (fila y archivo desaparecen). `npm run typecheck` y `npm test` (438) en verde.

**Sin probar:** biblioteca en móvil (375 px), selector en la hoja de publicación en móvil, archivos huérfanos si se cierra la pestaña a mitad de una subida.

**Pendiente de Studio:** autoguardado de borradores, publicaciones recurrentes, asistentes con IA (apagados).
