# Propuesta A-R20 — Auditoría y rediseño del chat

Estado: **R20a–d y parte de R20e implementadas (CHANGELOG Alex-42); R20f y Chat en la barra móvil hechos (Alex-43); R20h y R20i preparadas como migraciones SIN APLICAR; R20g completo pendiente.** (Auditoría original abajo.) Fecha: 2026-10-30. Autor: [Alex].
Alcance de la verificación: **lectura de código y SQL**. No se ha ejecutado ninguna prueba nueva de chat para este documento; lo que no está leído en el código se marca como hipótesis.

---

## A. Diagnóstico actual

### A.1 Hechos comprobados en el código

**Rutas y componentes.** `app/pages/chat/index.vue` (75 líneas, bandeja) y `app/pages/chat/[id].vue` (309, hilo); componentes `chat/MessageBubble.vue`, `OfferCard.vue`, `ChatOfferSheet.vue`, `TypingDots.vue`; composables `useChat.ts` (537), `useOffers.ts`, `useChatSettings.ts`. Ambas páginas viven fuera de `/creator` y `/partner` a propósito (las visitan los dos roles; `role-guard.global.ts` bloquearía la sección contraria). El acceso al chat es `/chat` en `SideRail`, `BottomTabBar` y el icono de `TopBar` (con contador); **en móvil Chat está bajo «Más»** (`secondaryNav`), no en la barra inferior.

**Esquema** (`20261021160000_chat_packages_offers.sql`, más `20261025090000` y `20261025190000` para `respond_offer`):
- `conversations` (par normalizado `least/greatest`, único; `participant_*_last_read_at`; `last_message_at`), `messages` (`kind` text/system/offer, `offer_id` con `on delete set null`), `offers` (`package_id` con `on delete cascade`). RLS solo `select` para los participantes; **ninguna policy de escritura**: todo pasa por RPC `security definer` (`get_or_create_conversation`, `send_text_message`, `create_offer`, `respond_offer`, `mark_conversation_read`, `my_chat_unread_count`).
- La privacidad se aplica en servidor: `get_or_create_conversation` y `send_text_message` rechazan si el destinatario es `accepted_offers_only` y no hay oferta aceptada entre ambos (`has_accepted_offer_between`); `create_offer` nunca mira la privacidad.
- **Diferencia con la descripción funcional del encargo:** al aceptar una oferta entre un creador y un partner, `respond_offer` además **crea (o reutiliza por `offer_id`) una colaboración en estado `accepted`** y avisa al partner con enlace a `/partner/requests` (corregido en `20261025190000`). Entre dos creadores no se crea colaboración. Esto no estaba en la lista de comportamientos y es relevante para el diseño de la tarjeta de oferta.
- Las tres tablas están en la publicación `supabase_realtime` con `replica identity full`.

**Tiempo real (`useChat.startRealtime`).** Un canal global `postgres_changes` INSERT sobre `messages` (sin filtro; la RLS filtra por suscriptor) y otro UPDATE sobre `offers`; broadcast de «escribiendo» con un canal por destinatario. Hay guarda `import.meta.server` (un fallo anterior documentado en el código: el flag llegaba a `true` desde el SSR y el canal nunca se abría). En cada `SUBSCRIBED` (también tras reconexiones) se hace `refreshConversations` + `refreshUnreadCount`. La bandeja se refresca además cada 20 s y al volver la pestaña a visible.

**Lectura y «Visto».** `mark_conversation_read` guarda `now()` en la columna del participante. `my_chat_unread_count` cuenta en servidor (correcto sin límite). El contador por conversación en la bandeja se calcula **en el cliente sobre los últimos 500 mensajes de todas las conversaciones juntas** (`MESSAGE_PREVIEW_LIMIT`). El «Visto» se deriva de `otherLastReadAt` con granularidad de conversación y se actualiza **con un sondeo de 15 s** (`loadConversationSummary`) porque el cliente no escucha `conversations` aunque la tabla esté publicada. El divisor «N mensajes nuevos» se calcula una sola vez al abrir (fijo durante la visita).

**Hilo.** Agrupa mensajes de texto del mismo emisor a menos de 5 min, separadores de fecha, aviso flotante «Nuevos mensajes» si no estás al final, no te arrastra al final si leías historial, reenvío del borrador si falla el envío. Contenedor `md:max-w-2xl` y alto fijo `h-[calc(100dvh-9rem)]` (móvil `11.25rem`, valores medidos a mano en una auditoría anterior).

**Bandeja.** Lista de tarjetas en `md:max-w-xl` (576 px), cada una: avatar, nombre, contador, vista previa, hora relativa, «Escribiendo…». Sin búsqueda, sin filtros, sin cabecera de rol.

**Tests existentes.** Solo `tests/integration/offers.spec.ts` (crear/aceptar oferta → colaboración, rechazos básicos). **No hay pruebas de `send_text_message`/privacidad, lectura, RLS de conversaciones/mensajes ni de la interfaz del chat.**

### A.2 Problemas detectados

**Integridad y estados que no están contemplados (verificados en el esquema, sin reproducir en navegador):**
1. **Paquete borrado ⇒ mensaje de oferta huérfano.** `offers.package_id` es `on delete cascade` y `messages.offer_id` es `on delete set null`: al borrar un paquete se borran sus ofertas (aceptadas incluidas) y el mensaje queda `kind='offer'` con `offer_id=null`. `MessageBubble` entonces cae en la rama de texto y pinta una burbuja con `body` (el mensaje opcional, normalmente vacío). El texto de borrado de paquetes ya avisa «junto con cualquier oferta», pero la conversación queda con huecos. Es una **decisión de producto + posible backend**, no solo de interfaz.
2. **Oferta que no carga** (`ensureOffer` devuelve `null`): `OfferCard` no renderiza nada y el mensaje queda como una fila vacía sin explicación.
3. **Vista previa sin perspectiva:** cualquier oferta se resume como «Oferta enviada», incluso para quien la recibe; las ofertas aceptadas se ven como el texto del mensaje de sistema. No hay forma de saber desde la bandeja dónde hay una oferta pendiente de responder.
4. **Escenario B (privacidad restringida) no se explica antes de escribir:** el usuario puede redactar y el servidor rechaza con el mensaje genérico del RPC; el borrador se restaura (bien) pero la interfaz nunca ofrece la vía legítima (oferta) de forma contextual. El único aviso previo está en el perfil público.
5. **Sin estado de conexión:** si el socket cae no hay aviso; solo se recupera al reconectar o por el sondeo. Un mensaje enviado depende del RPC (sin estado «enviando/error» por mensaje; sí hay `sending` global y error en línea).
6. **Contador por conversación inexacto con mucha actividad** (límite de 500 mensajes compartido); el contador global del icono sí es exacto.
7. **Coste del sondeo:** `refreshConversations` hace ~5 consultas (conversaciones, perfiles, creadores, partners, 500 mensajes) cada 20 s en la bandeja y en cada reconexión; `loadConversationSummary` repite 3 consultas de nombres cada 15 s dentro de un hilo solo para leer `last_read_at`.
8. **Cuenta cambiada en la misma pestaña:** `startRealtime` conserva el `me` con el que arrancó (limitación ya documentada en `useChat.reset`). Riesgo bajo (RLS impide ver lo ajeno) pero puede dar contadores y avisos de la cuenta anterior hasta recargar.
9. **Accesibilidad:** el campo de mensaje no tiene etiqueta (solo placeholder), la zona de mensajes no es una región `role=log`/`aria-live`, no hay foco gestionado al abrir ofertas, y el botón «+» solo tiene `title`.
10. **Mensaje de texto de una línea (`<input>`):** no admite saltos de línea ni crece; el servidor y el cliente aceptan mensajes y ofertas **sin límite de longitud** (ver «Seguridad» abajo).

**Espacio y navegación:** 576 px (bandeja) y 672 px (hilo) en pantallas de 1920 px; la cabecera del hilo es solo avatar + nombre; para ir de un chat a otro hay que volver a la bandeja (dos pantallas, recarga de datos de cada una); «Hacer oferta» está tras un botón «+» sin etiqueta; en móvil Chat vive en «Más».

**Lo que está bien y se conserva:** reglas en servidor; RPC como única vía de escritura; una conversación por pareja; agrupación y separadores de fecha; aviso de nuevos mensajes sin saltos de scroll; divisor de no leídos fijado antes de `markRead`; borrador restaurado si falla el envío; deduplicación por `id` entre respuesta del RPC y eco de Realtime (`pushMessage`); guardas de SSR; confirmación al rechazar una oferta; refresco local tras responder; contador global exacto en servidor; refetch al reconectar.

### A.3 Seguridad e integridad (documentado, **no corregido**)
Nada que pase de P1 por sí solo, pero conviene que lo vea quien lleva «límites de uso» (Mario, ver `TRABAJO_ALEX` §Reparto):
- `send_text_message` y `create_offer` no limitan **longitud del texto ni frecuencia**; al ser RPC directos desde el navegador no pasan por `enforceRateLimit` de Nitro. Un usuario autenticado puede llenar una conversación (con restricción por privacidad solo en texto, no en ofertas, que puede abrir cualquiera). Impacto: abuso/spam y coste de almacenamiento; ningún dato ajeno queda expuesto. Corrección = migración (check de longitud y/o limitador), **requiere aprobación y coordinación con Mario**.
- `create_offer` abre conversación con cualquiera sin comprobar que exista un perfil/rol válido más allá de que el paquete sea activo; es intencionado (las ofertas desbloquean el chat).
- Notificaciones de chat: `notify(...)` con enlace `/chat/<id>`; el enlace sigue siendo válido con cualquiera de las alternativas de abajo.

### A.4 Hipótesis que requieren verificación antes de implementar
- Que el canal de Realtime entregue eventos de forma fiable tras suspensión del equipo/pérdida de red (el código depende de supabase-js; hay un refetch en `SUBSCRIBED`, pero no se ha probado el caso real).
- Que dos pestañas del mismo usuario mantengan contadores coherentes.
- Rendimiento real con cientos de conversaciones (el límite de 200 es un tope, no una paginación).
- El comportamiento exacto del mensaje huérfano de oferta (A.2 punto 1) en el navegador.

### A.5 Decisiones de producto, no errores
Colores de burbuja (hoy «mío» = gris y «ajeno» = color primario, inverso al uso habitual), si Chat debe subir a la barra inferior en móvil, si las ofertas deben conservarse al borrar un paquete, cómo se muestra el vínculo con la colaboración creada.

---

## B. Propuesta de interfaz

**Principio:** el hilo es el área principal; la bandeja es una herramienta de decisión (¿dónde tengo algo que atender?).

**1. Bandeja** (columna de 340–380 px en escritorio; pantalla completa en móvil). Cabecera con búsqueda por nombre (filtrado local sobre lo cargado, honesto con el límite) y filtros **Todos · No leídos · Ofertas pendientes**. Cada fila: avatar, nombre, **etiqueta de rol** discreta (Creador/Empresa), hora relativa, vista previa **con perspectiva** («Te ha enviado una oferta · 450 €», «Has enviado una oferta», «Oferta aceptada · 450 €», «Tú: …»), contador o punto de no leído y una marca «Responder» cuando hay una oferta pendiente dirigida a mí. «Escribiendo…» sustituye a la vista previa. Fila activa resaltada. Estados: esqueleto de carga, vacío con explicación y enlace a Descubrir, error con reintentar, «sin resultados» al filtrar.
Datos: todo sale de lo que ya se lee (conversaciones, últimos mensajes) más **una consulta** a `offers` (`to_profile_id = yo` y `status = pending`, índice existente, RLS ya lo permite) — sin cambios de backend.
No se propone: fijar/archivar/silenciar (requieren columnas nuevas), separar «recientes» y «antiguas» (con 200 conversaciones máximas no aporta).

**2. Hilo en escritorio.** Panel derecho que ocupa el resto del ancho; columna de mensajes con **ancho de lectura máximo (~760 px) centrada en el panel** para no estirar líneas de texto en 1920 px; cabecera con avatar, nombre (enlace al perfil público), rol, y acciones reales: *Ver perfil*, *Hacer oferta* (con etiqueta), y, si existe una colaboración creada desde una oferta aceptada, un acceso «Ver colaboración» (a `/creator/requests` o `/partner/requests`). **Sin «en línea»/«activo hace…»**: no hay datos. Solo se mostrará «Escribiendo…» (dato real, broadcast). Lo que se desplaza es la lista y el hilo, no la página: contenedor con altura de panel calculada una vez (variable CSS), sin las constantes `9rem/11.25rem` repartidas por la página.

**3. Móvil.** Dos pantallas por ruta (lista en `/chat`, hilo en `/chat/[id]`) con botón atrás en la cabecera; el compositor respeta la barra inferior y el teclado. Propuesta (decisión de producto, ver H): subir Chat a la barra inferior en lugar de «Más».

**4. Tarjeta de oferta.** Encabezado con el paquete (título), **quién la envía y a quién**, precio destacado, mensaje, estado con texto e icono (no solo color), y una línea de consecuencia: *Pendiente*: «Esperando a que [nombre] responda» (emisor) o botones Aceptar/Rechazar (destinatario); *Aceptada*: «Precio acordado. Se ha creado la colaboración — gestionarla» (solo si de verdad existe, consultándola por `offer_id`); *Rechazada*: «No se ha aceptado. Puedes hacer otra oferta». Un solo sitio para la acción; confirmación al rechazar (ya existe). Si la oferta no carga o el paquete ya no existe: tarjeta degradada «Esta oferta ya no está disponible» en lugar de una fila vacía. No se tocan las reglas de negocio.

**5. Mensajes de sistema.** Fila centrada con icono y texto en una línea tipo «evento» (no burbuja), con la hora; «Oferta aceptada. Precio acordado: X €» enlazada a la tarjeta/colaboración. Deduplicación por `id` ya existente.

**6. Lectura.** Mantener el divisor «N mensajes nuevos» fijado al abrir y el «Visto» bajo **mi último mensaje** (granularidad de conversación, se dice en la ayuda del control). El «Visto» pasa de sondeo de 15 s a **suscripción a `UPDATE` de `conversations`** (tabla ya publicada, sin migración); el sondeo queda como respaldo con intervalo largo.

**7. Compositor.** `textarea` de crecimiento automático (máx. ~6 líneas), **Enter envía y Mayús+Enter salta de línea**, etiqueta accesible, contador solo al acercarse a un límite si se aprueba uno, botón «Oferta» con texto (distinto de «Enviar»), estado «Enviando…» y error persistente con el texto conservado. Sin adjuntar, grabar, editar ni borrar.

**8. Estados.** Vacío del hilo: explica las dos vías (escribir u ofertar). **Privacidad restringida (Escenario B):** el compositor se sustituye por un aviso — «[Nombre] solo recibe mensajes tras una oferta aceptada» — con botón «Hacer una oferta» (si tiene paquetes activos) o la explicación de que aún no tiene ninguno. Se calcula en el cliente con datos ya legibles (`profiles.chat_privacy` del otro, y sus propias `offers` aceptadas con esa persona); **el servidor sigue siendo la barrera**, la interfaz solo evita el error. Conexión: banda discreta «Sin conexión — reconectando…» cuando el canal no está `SUBSCRIBED`; mensaje no enviado = error junto al compositor, nunca un «enviado» optimista. Interlocutor sin ficha (`otherFichaId = null`): se muestra el nombre sin enlace (ya ocurre).

**Full width:** `AppShell full-width` en `/chat` y `/chat/[id]` y composición en dos paneles; el ancho sobrante en pantallas muy grandes se reparte dejando la lectura a ~760 px y, solo ≥1536 px, un panel de «Contexto» opcional (P3).

---

## C. Comparativa de alternativas

| | A. Dos paneles siempre | B. Bandeja y vista separadas (hoy) | **C. Adaptable (recomendada)** |
|---|---|---|---|
| Escritorio ≥1024 px | Lista + hilo a la vez | Dos pantallas; ancho desaprovechado | Lista + hilo a la vez |
| Móvil/tablet vertical | Panel único apretado o ilegible | Correcto | Dos pantallas (como B) |
| Cambiar de chat | Un clic | Atrás + abrir | Un clic en escritorio, atrás en móvil |
| Rutas y notificaciones | Hay que decidir | `/chat`, `/chat/[id]` intactas | **Mismas rutas** |
| Complejidad | Media | Ninguna | Media (rutas anidadas + un breakpoint) |
| Riesgo | Móvil | Seguir desaprovechando el ancho | Controlado |

**Recomendación: C, implementada con rutas anidadas de Nuxt** (`pages/chat.vue` como contenedor con la lista, `pages/chat/index.vue` como panel vacío y `pages/chat/[id].vue` como hilo): conserva `/chat` y `/chat/[id]` (los enlaces de notificaciones y de `useOffers` siguen funcionando), no duplica `TopBar`/`SideRail` (el `AppShell` vive en el contenedor), y en móvil el CSS muestra solo la lista o solo el hilo según haya `id`. Rechazo A pura porque degrada en móvil, y B porque es lo que hoy desperdicia el ancho. **Consecuencia técnica a tener en cuenta:** el hilo hoy captura `conversationId` en `setup()`; con el hilo dentro de un contenedor persistente se debe reaccionar a cambios de `route.params.id` (limpiar `activeConversationId`, temporizadores, divisor de no leídos y borrador por conversación).

---

## D. Inventario priorizado

| Prio | Bloque | Dependencias | Riesgo | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|---|
| **P0** | Ninguno encontrado | — | — | — | — |
| **P1** | R20a. Rutas anidadas + `full-width` + bandeja de lista (dos paneles, móvil por rutas) | `AppShell`, notificaciones | Medio (rutas) | M | Mismas URLs; sin desbordes 390/768/1280/1920; el hilo no mueve la página; cambiar de chat sin recarga |
| **P1** | R20b. Vista previa con perspectiva + ofertas pendientes + búsqueda y filtros (1 consulta a `offers`) | R20a, RLS de `offers` | Bajo | M | Una oferta pendiente para mí se ve en la bandeja sin abrir el hilo; filtros correctos con 0, 1 y 200 conversaciones |
| **P1** | R20c. Tarjeta de oferta y mensajes de sistema; estado degradado de oferta huérfana | `useOffers`, `collaborations` (lectura por `offer_id`) | Bajo | M | Los tres estados muestran lo correcto para emisor y receptor; ninguna fila vacía |
| **P1** | R20d. Compositor (textarea, Enter/Mayús+Enter, etiqueta) + aviso de privacidad restringida | R20a | Bajo | M | Con `accepted_offers_only` y sin oferta aceptada, no se puede redactar y se ofrece la oferta; con oferta aceptada sí |
| **P2** | R20e. «Visto» por Realtime (`conversations` UPDATE), banda de conexión, sondeos reducidos, consulta ligera de resumen | Publicación ya existente | Medio (tiempo real) | M | Sin sondeo de 15 s; «Visto» en <2 s; sin canales duplicados al cambiar de chat/cuenta |
| **P2** | R20f. Cargar mensajes anteriores (cursor `created_at`, sin backend) | R20a | Bajo | S | Con >300 mensajes se pueden cargar anteriores sin duplicados |
| **P2** | R20g. Accesibilidad (`role=log`, etiquetas, foco, teclado) y animaciones discretas con `prefers-reduced-motion` | R20a–d | Bajo | S | Navegación completa por teclado; lector de pantalla anuncia mensajes nuevos |
| **P2 (backend)** | R20h. Límite de longitud y de frecuencia en `send_text_message`/`create_offer`; contador de no leídos por conversación en servidor | **Aprobación + Mario** | Medio (RPC compartidos) | M | Pruebas de integración de rechazo por longitud/frecuencia y de recuento exacto |
| **P2 (backend, producto)** | R20i. Qué pasa con las ofertas al borrar un paquete (conservar vs borrar) | Decisión de producto | Medio | S | Ninguna oferta aceptada desaparece sin rastro, o se documenta que sí |
| **P3** | Panel de contexto (colaboración/oferta) ≥1536 px; Chat en la barra inferior móvil; búsqueda en historial; adjuntos; fijar/archivar | — | Variable | — | Fuera del alcance inicial |
| **Descartado** | Grupos, editar/borrar mensajes, «en línea», indicadores de actividad sin datos | — | — | — | Sin datos ni necesidad probada |

## E. Plan incremental (cada entrega verificable por sí sola)

1. **Visual/layout** — R20a (+ esqueletos) → R20b (bandeja) → R20c (tarjetas y sistema).
2. **Interacción** — R20d (compositor y privacidad) → R20g (accesibilidad y animaciones).
3. **Tiempo real y rendimiento** — R20e → R20f. Se separan del rediseño visual: tocan suscripciones y marcas de lectura.
4. **Backend (solo con aprobación)** — R20h y R20i, una migración cada una, con pruebas de integración antes y después y coordinación con Mario.
5. **Funcionalidades nuevas** — ninguna ahora.
No se mezclan: layout/rutas, tiempo real y migraciones nunca en la misma entrega.

## F. Pruebas y criterios de aceptación

Hoy **no existen** pruebas de privacidad de texto, lectura, RLS del chat ni UI. Se propone:
- **Integración contra Supabase real** (mismo patrón y limpieza que `offers.spec.ts`/`post-links-and-metrics.spec.ts`): conversaciones creador–partner y creador–creador; reutilización del par (misma conversación en ambos órdenes); `send_text_message` con privacidad `everyone` y `accepted_offers_only` (rechazo sin oferta aceptada, éxito con ella); `create_offer` sobre privacidad restringida; solo el destinatario responde; aceptar crea mensaje de sistema, notificación y colaboración (creador↔partner) y no la crea entre creadores; RLS: un tercero no lee conversación, mensajes ni ofertas; `mark_conversation_read` por participante y rechazo a ajenos; recuento exacto de `my_chat_unread_count`.
- **Unitarias** de la lógica pura que se extraerá: vista previa con perspectiva, filtros/búsqueda, derivación de privacidad restringida, agrupación y separadores, «Visto».
- **Navegador (CDP, datos de prueba, dos cuentas):** bandeja y hilo a 390/768/1280/1920 px; cambio de chat sin recarga y sin canales duplicados; mensaje enviado aparece una vez (respuesta + eco); contador y divisor correctos; «Visto»; indicador de escritura que desaparece; aviso de privacidad restringida y apertura de la oferta; tarjeta de oferta para emisor y receptor en los tres estados; oferta huérfana; desconexión simulada (corte de red) y recuperación; estados de carga/vacío/error; foco por teclado; `prefers-reduced-motion`.
- No basta con que la pantalla se renderice: cada criterio de la tabla D tiene una comprobación asociada.

## G. Integración en el pipeline

- **Dónde encaja:** nuevo requisito **A-R20**, como bloque de interfaz posterior a A-R17/A-R18/A-R19. **No bloquea ni es bloqueado** por A-R4 (esperando a Mario M-L1), A-R5 (Q3), A-R6 (cuenta de Instagram), A-R12 ni A-P2 (Q6); no cambia ninguna prioridad aprobada.
- **Dependencias:** perfiles públicos A-R19 («Iniciar chat» y «Hacer oferta» no cambian de flujo); notificaciones (los enlaces `/chat/<id>` se mantienen); ofertas/colaboraciones (la tarjeta lee `collaborations.offer_id`; A-R15 ya usa las colaboraciones); navegación (cambiar Chat en móvil toca `BottomTabBar`, decisión aparte).
- **Coordinación:** el reparto de `TRABAJO_ALEX` asigna a Mario «notificaciones y chat» y «límites de uso»; el historial de `git` muestra 8 commits de Alex y 1 de Mario en los archivos del chat. Antes de R20a conviene avisarle (rutas y archivos); R20h/R20i son suyos o conjuntos y llevan aprobación.
- **Orden recomendado:** R20a → b → c → d (todo sin backend) → e → f → g; R20h/R20i en paralelo solo cuando haya aprobación. Si Mario va a tocar `useChat.ts`/`chat/*`, **esperar a su merge** antes de R20a para no duplicar conflictos.
- Nada de este documento se marca como implementado ni verificado en el pipeline.

## H. Decisiones que requieren tu aprobación (solo estas)

1. **Backend de límites (R20h):** ¿autorizas preparar una migración que limite longitud (p. ej. 2.000 caracteres por mensaje y 500 por mensaje de oferta) y frecuencia de `send_text_message`/`create_offer`, **coordinada con Mario**? Recomendación: sí, pero después del rediseño visual; no la apliqué ni la preparé.
2. **Ofertas al borrar un paquete (R20i):** ¿conservar las ofertas aceptadas/pendientes y marcarlas «paquete ya no disponible» (cambio de la clave foránea, migración) o seguir borrándolas (comportamiento actual, solo con una tarjeta degradada)? Recomendación: conservar las aceptadas, porque respaldan una colaboración.
3. **Chat en la barra inferior del móvil** (cambia la navegación global, hoy está en «Más»). Recomendación: sí.

Todo lo demás (rutas anidadas, ancho de lectura, textarea, filtros, tarjetas, suscripción a `conversations`) queda dentro del alcance aprobado y se decide con las recomendaciones de arriba.
