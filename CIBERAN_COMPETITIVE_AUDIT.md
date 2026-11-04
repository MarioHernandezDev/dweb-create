# Auditoría competitiva: Collabstr → Ciberan

> Fecha: 2026-11-04 · Fase de investigación: **no se ha modificado código, migraciones, dependencias ni diseño.**
> Fuera de alcance por encargo: conexión de redes sociales y sistema de pagos/retención de dinero (otro miembro del equipo).

---

## 0. Aviso de método (leer primero)

**Revisión del 04/11/2026: la segunda investigación (con navegador) está integrada en todo el documento.** La versión anterior de este informe no pudo abrir Collabstr (HTTP 403 desde clientes automáticos). Esta revisión sí se ha hecho **navegando la web con el navegador integrado, sin sesión, sin crear cuenta y sin compras**. Cookies: rechazadas.

**Páginas que he visto:** inicio, `/pricing`, un listado filtrado (`/influencers?qs=under_250…`), un perfil público de muestra (`/alleesuttonhethcoat`), las siete páginas `/features/*`, `/creator`, `/use-cases/influencer-marketing/`, y la pantalla de registro a la que llevan el botón «Add to Cart» y un filtro (no la rellené). `/influencer-analytics` me redirigió al registro y apenas pude leerla.

**Leyenda de evidencia** (sustituye a la anterior):

- 🔵 **Observado**: lo he visto yo en el navegador el 04/11/2026, sin sesión.
- 🟢 **Declarado**: texto de su propia web que he leído, pero **sin ver la función en uso** (casi todo lo que está detrás de login).
- 🟡 **Tercero**: viene de la versión anterior (reseñas/agregadores) y **no lo he re-verificado**.
- 🔴 **No comprobado / no encontrado**: no lo he visto ni lo declaran en lo que leí. No significa que no exista.

**Límites de esta revisión (importantes):**

1. **Todo lo que está tras el login sigue sin verse**: panel de marca y de creador, creación de campaña, bandeja de aplicaciones, detalle de pedido, revisión/aprobación, chat, notificaciones, carrito y pago, estados vacíos y de error. Esas partes son 🟢 como mucho. Por eso la pregunta «¿sabe el usuario dónde está, qué tiene pendiente y cuál es el siguiente paso?» **no se puede responder con evidencia** (ver §4.4).
2. **Anchura de pantalla:** el panel del navegador mide ~620–770 px, así que lo que describo del diseño es el **layout móvil/tablet** (también probé 375 px). Con emulación de 1100 px vi la navegación de escritorio, pero las capturas salían recortadas: **no valoro la composición de escritorio ancho**.
3. **Ciberan no se ha re-inspeccionado en esta sesión.** El repositorio no estaba accesible (ninguna carpeta conectada). La columna «Ciberan hoy» del §5 se hereda de la versión anterior (código + `docs/audit/08_COLLABORATION_FLOW_AUDIT.md`, 03/11) y **no está re-verificada hoy**. Las referencias a archivos y composables de Ciberan son las de esa versión.
4. **Incidencia:** una página de Collabstr abrió una ventana emergente de inicio de sesión de Google. No la toqué ni inicié sesión; cuando volví a comprobar ya no estaba abierta.

**Qué corrige esta revisión respecto a la anterior:**

- **Planes:** Pro 249 $/mes y Premium 333 $/mes (facturación anual); Enterprise/Agency desde 1.000 $/mes. La cifra de 199 $ de un agregador era errónea.
- **Escala:** su web dice hoy 1,3 M+ creadores (no 930 k ni 1,1 M).
- **Filtros demográficos:** su página de precios **no dice que sean de pago**. Anónimo, el filtro «Ethnicity» lleva al registro; no he podido comprobar qué desbloquea una cuenta gratuita.
- **Comisión del creador:** además del 10 % de la marca, el creador paga **15 %** sobre su cobro (🟢, FAQ de precios).
- **Relación recurrente:** Collabstr **sí declara** roster de creadores, «rehire» desde el historial y colaboraciones en retainer. Matiza la idea de que «pierde en relación a largo plazo».
- **Negociación y equipos:** Collabstr **sí declara** «Negotiate a Package» (el creador acepta, contraoferta o rechaza) e invitar equipo (sin roles todavía). La versión anterior los daba por no encontrados.
- **Reseñas:** existen (🔵), con desglose por comunicación, puntualidad y satisfacción.
- **Disputas:** no aparecen en ninguna página que leí (🔴), aunque la versión anterior las daba por existentes.

**Qué se ha revisado en el resto del documento.** §1 y §6–§12 se han reescrito con esta evidencia:

- Se retiran las conclusiones que habían quedado obsoletas: que Collabstr «pierde en relación a largo plazo», que no declara negociación ni equipos, que la negociación y las valoraciones de Ciberan eran ventajas, y el aviso de que no se pudo navegar.
- Cada propuesta de §7 indica ahora su **base en Collabstr** (🔵 observado, 🟢 declarado, 🔴 no encontrado) y si es diferencial. §8 separa los diferenciales con base, lo que ya es paridad y lo que no se puede evaluar.
- §10 añade la columna «Base Collabstr» y explica qué prioridades cambian (F7 sube, F11 pierde su «diferencial») y por qué; §11 reordena las fases en consecuencia.
- §12 separa lo observado, lo declarado y lo no comprobado.

---

## 1. Resumen ejecutivo

> Evidencia sobre Collabstr: 🔵 observado por mí en el navegador · 🟢 declarado en su web, sin verlo funcionar · 🟡 de terceros, no re-verificado · 🔴 no comprobado o no encontrado (no significa que no exista).
> Sobre Ciberan: ✅ existe · ⚠️ débil · ❌ no existe, **heredado del código y de la auditoría 08 (03/11), no re-verificado en esta revisión**.

1. **Collabstr es un marketplace con herramientas de programa encima**, no solo un sitio de compra suelta. Lo que he visto funcionar (🔵) es el escaparate público: búsqueda, perfiles, precios y planes. Lo demás —negociar paquetes, revisar y aprobar entregables, recontratar desde el historial, equipos, seguimiento automático— es **declarado** (🟢): está tras el login y no lo he visto.
2. **Dónde Collabstr va por delante, con evidencia:** descubrimiento público más completo y compartible (filtros en la URL, colecciones, precio y prueba social en la tarjeta), un camino perfil → compra muy corto con barra de acción fija, y señales de confianza en el perfil («Top Creator», reseñas con desglose) (🔵). Además declara campañas abiertas con aplicaciones, reservadas a los planes de pago (🟢).
3. **Dónde Ciberan ya compite o es distinto (heredado):** Studio del creador (calendario, tablero, checklists), predicción de éxito y chat con ofertas y privacidad. El calendario y la predicción **no aparecen** en lo que leí de Collabstr (🔴), lo cual no prueba que no existan. Negociación, valoraciones y guardados son **paridad**, no ventaja.
4. **El mayor problema de Ciberan es interno y no depende de Collabstr:** la colaboración es «una tarjeta con precio y estado», sin página propia, sin entregables, sin cronología y con una aprobación que no obliga (auditoría 08). Collabstr declara resolver ese mismo ciclo, así que **cerrar esa brecha es prioridad de producto, no una ventaja competitiva**.
5. **Las oportunidades, reordenadas tras la segunda investigación:**
   - **A. Cerrar la brecha del ciclo de colaboración** (página propia, entregables, cronología, «siguiente paso»): F1, F2, F3. Prioridad alta por el problema interno; **paridad** con lo declarado.
   - **B. «Qué me toca» unificado** (F4): resuelve la dispersión de información de Ciberan. No puedo decir si diferencia frente a Collabstr, porque no he visto su panel. Se puede empezar con los datos actuales.
   - **C. Apostar por lo que Collabstr no mostró:** planificación compartida marca ↔ creador con plazos y recordatorios (F7), apoyada en el Studio y en la predicción. F7 es la **única propuesta nueva con base de diferenciación**; el Studio y la predicción (ya existentes) son los otros dos diferenciales posibles. Los tres descansan en una ausencia **no verificada**.
6. **Qué no copiar:** muro de registro tan temprano, filtro por etnia (dato de categoría especial en el RGPD), suscripciones que bloquean funciones básicas, informes de audiencia de pago, afiliados/comercio y equipos con roles hasta validar demanda.
7. **Límite principal:** no he visto nada detrás del login de Collabstr. Antes de diseñar F5 (campañas) y de afirmar diferenciales sobre planificación o cronología hace falta una pasada con cuenta de prueba (lista de pantallas en §4.4).

---

## 2. Análisis general de Collabstr

Evidencia: 🔵 observado · 🟢 declarado · 🟡 tercero (no re-verificado) · 🔴 no comprobado. Detalle en §0.

| Aspecto | Qué hay | Evid. |
|---|---|---|
| Propuesta de valor | «Run Influencer Marketing from First Search to Final Payment». Una sola plataforma con siete pasos: Find & Hire, Campaigns, Chat & Negotiate, Approve & Pay, Track & Report, Team, Bring Creators. Promete «reemplazar 10 herramientas con 1». | 🔵 |
| Cifras que anuncia | 1,3 M+ creadores, 550.000+ marcas, 100.000+ piezas entregadas, 48.000+ reseñas de 5 estrellas; a los creadores les anuncia 17,2 M$ en acuerdos con marcas. Son cifras suyas, sin verificar. | 🔵 (el texto) / 🟢 (la cifra) |
| A quién habla | Equipos de marketing, agencias, fundadores y enterprise. El discurso de producto está escrito sobre todo **para la marca**; el creador tiene su propia landing (`/creator`). | 🔵 |
| Dos vías de contratación | **Compra directa** de un paquete desde el perfil (todos los planes) y **campaña** (brief al que aplican creadores; solo Pro/Premium). | 🔵 / 🟢 |
| Planes | **Free** 0 $ (buscar, contratar directo, pago seguro, comisión 10 %). **Pro** 249 $/mes anual (1 campaña/mes según precios, chat previo al pedido, tracking de 5 posts, 20 informes de audiencia). **Premium** 333 $/mes anual (campañas ilimitadas, 15 posts, 50 informes, comisión 5 %, soporte prioritario). **Enterprise/Agency** desde 1.000 $/mes anual (subcuentas por marca/región, asientos y permisos, informes white-label, equipo dedicado). Interruptor anual/mensual con «2 Months Free» y «Compare Plans». | 🔵 |
| Comisiones | Marca: 10 % (Free y Pro), 5 % (Premium). Creador: 15 % adicional sobre su cobro. La landing de creadores solo dice «Free / No cost to get started» y **no menciona el 15 %**. | 🟢 (cifras) / 🔵 (la omisión en `/creator`) |
| Pagos (fuera de alcance) | Fondos en escrow hasta aprobar, reembolso total si no se entrega, todo en USD, documentos fiscales (1099) y cobros en 150 países, cobro del creador por PayPal, Venmo, banco… No encontré ninguna mención a **disputas**. | 🟢 / 🔴 (disputas) |
| Derechos de uso | Se negocian entre marca y creador; Collabstr dice que no es dueño del contenido y que, aprobado y liberado el pago, «la transacción está completa». | 🟢 |
| Búsqueda | Gratuita y pública, pero **anónimo solo se ven ~16 resultados** y luego se pide registro. Ver §4. | 🔵 |
| Campañas | Brief generado con IA, «Instant match» (creadores por puntuación de encaje), aplicaciones con la tarifa del creador, segmentación por nicho, ubicación, edad, idioma y etnia. | 🟢 |
| Seguimiento | Automático en Instagram, TikTok y YouTube, refresco cada 24 h, hasta 3 semanas por post; se pueden añadir posts externos (5 en Pro, 15 en Premium). | 🟢 |
| Equipos | Invitar compañeros a la cuenta (Pro/Premium, sin pago por asiento). **Sin roles todavía** («en desarrollo»). Para varias marcas: cuentas separadas o plan Enterprise. | 🟢 |
| Traer tus creadores | Importar creadores con los que ya trabajas; deben unirse a Collabstr para entregar y cobrar; Pro/Premium; misma comisión. | 🟢 |
| Relación recurrente | Declaran «Creators on retainer»: recontratar desde el historial de la cuenta, roster que «se construye solo», y también gifting/seeding y partnerships a largo plazo. | 🟢 |
| Reputación | Reseñas con nota global y desglose (comunicación, puntualidad, satisfacción), insignia «Top Creator» con criterio explicado («varios pedidos completados y buena nota»). El contenido de las reseñas está bloqueado a anónimos. Trustpilot ~4,7 (≈385 reseñas) según un agregador. | 🔵 / 🟡 |
| Puntos débiles según terceros | Autenticidad de perfiles inconsistente, comisiones altas, creadores que no cumplen, seguimiento de enlaces con quejas, derechos de uso poco detallados. No re-verificado. | 🟡 |
| **Incoherencias en su propio texto** | (1) Pro: «1 campaña/mes» en precios y «2 campañas/mes» en la página de campañas. (2) El chat previo al pedido aparece como ventaja de Pro en precios, pero la página de chat dice que se puede escribir a cualquier creador antes de pedir. (3) Equipos: «Pro/Premium» en su página, pero «asientos y permisos» solo en Enterprise en precios. (4) Seguimiento: «5 posts a la vez» en precios, y «5 posts adicionales externos» en su página de tracking. | 🔵 |

**Lectura de producto.** Collabstr es un marketplace con una capa de herramientas de programa encima. Monetiza dos veces: **comisión por pedido en ambos lados** (10 % + 15 %) y **suscripción** para lo que convierte compras sueltas en un programa (campañas, tracking, informes, equipo). Mi lectura anterior («solo optimiza el momento de la compra») era demasiado corta: **declaran** historial, roster, recontratación y seguimiento. Lo que no puedo confirmar es **cómo se siente** nada de eso, porque está tras el login.

---

## 3. Inventario de funcionalidades de Collabstr observadas

🔵 observado sin sesión · 🟢 declarado en su web · 🔴 no encontrado.

| Área | Funcionalidad | Evid. | Cómo se vio |
|---|---|---|---|
| Descubrimiento | Búsqueda pública con selector de plataforma + palabra clave | 🔵 | Hero de la home; el texto de ejemplo del campo se «escribe» solo |
| Descubrimiento | Colecciones rápidas (chips): Rising Instagram Stars, Rising TikTok Stars, Most Viewed, Under $250, UGC, Fashion, Beauty, Health & Fitness | 🔵 | Los cuatro primeros chips enlazan a un listado ya filtrado, con los filtros en la URL (vi los enlaces; los otros cuatro no los inspeccioné) |
| Descubrimiento | Controles de filtro: plataforma, palabra clave/categoría, tipo de contenido, seguidores, ubicación, precio, género, edad, etnia, idioma, «Clear All» | 🔵 | Chips desplegables; el aplicado se muestra como chip oscuro con ✕ |
| Descubrimiento | Filtro de seguidores solo tras elegir plataforma | 🔵 | Mensaje en el propio filtro: «Select a platform to filter by followers» |
| Descubrimiento | Filtros demográficos usables | 🔴 | Al pulsar «Ethnicity» sin sesión me llevó al registro; no probé Género, Edad ni Idioma |
| Descubrimiento | Filtro por engagement | 🟢 | Lo citan, pero no vi ese control en el listado |
| Descubrimiento | Titular dinámico con recuento («Over 59,000 Influencers Under $250») | 🔵 | Listado filtrado |
| Descubrimiento | Tarjeta de creador: foto, plataforma + seguidores, insignias (Top Creator, UGC), nombre, nota, entregable de entrada + precio, ciudad/país, corazón de guardar | 🔵 | Listado |
| Descubrimiento | Tope anónimo: ~16 resultados, dos interrupciones de registro y un muro final («Sign up to see all 59389 creators») | 🔵 | Listado |
| Descubrimiento | «Instant match» (ranking por encaje) | 🟢 | Páginas de campañas y búsqueda |
| Descubrimiento | Shortlists y comparación lado a lado, visibles al equipo | 🟢 | `/features/find-and-hire` |
| Descubrimiento | Informes de audiencia (20/mes Pro, 50/mes Premium) | 🟢 | `/pricing` |
| Perfil | Galería de fotos (1/4), titular, ubicación, nota y nº de reseñas, seguidores por plataforma | 🔵 | Perfil de muestra |
| Perfil | Insignia «Top Creator» con explicación del criterio | 🔵 | Perfil de muestra |
| Perfil | Biografía con mensaje personal del creador | 🔵 | Perfil de muestra |
| Perfil | Paquetes por plataforma (pestañas Todos/Instagram/TikTok/UGC/YouTube) con precio, descripción y «See More» | 🔵 | Perfil de muestra |
| Perfil | Tarjeta «Negotiate a Package» junto a los paquetes cerrados | 🔵 | Perfil de muestra |
| Perfil | **Barra fija inferior**: precio + selector de paquete + «Add to Cart» + enlace «Negotiate a Package» | 🔵 | Perfil de muestra |
| Perfil | Analítica de audiencia (país, edad, género) por plataforma | 🔵 | Existe pero **desenfocada** a anónimos («Create a free account to unlock analytics») |
| Perfil | Reseñas con desglose (comunicación, puntualidad, satisfacción) y fecha | 🔵 | Contenido bloqueado a anónimos |
| Perfil | Enlaces a categorías relacionadas | 🔵 | Final del perfil (típico de SEO) |
| Contratación | Compra directa por carrito | 🔵 | «Add to Cart» → registro; el resto (carrito, pago) 🟢 |
| Contratación | Campañas: brief con IA, segmentación, aplicaciones con tarifa, varias a la vez | 🟢 | `/features/post-campaigns` |
| Contratación | Importar creadores propios (invitación; deben unirse) | 🟢 | `/features/bring-your-own-creators` |
| Contratación | Recontratar desde el historial, roster, gifting/seeding, partnerships | 🟢 | `/use-cases/influencer-marketing` |
| Colaboración | Mensajes previos al pedido; propuesta de tarifa y entregables que el creador acepta, contraoferta o rechaza | 🟢 | `/features/chat-and-negotiate` |
| Colaboración | Plazos, derechos de uso y revisiones «en el registro» antes de empezar | 🟢 | Ídem |
| Colaboración | Entregable visible en el panel, revisión con comentarios concretos, aprobar en un clic | 🟢 | `/features/approve-and-pay` |
| Colaboración | Revisión del equipo antes de pedir | 🟢 | Chat y equipos |
| Seguimiento | Tracking automático IG/TikTok/YouTube, 24 h, 3 semanas por post; posts externos; filtros por creador/plataforma/campaña; comparación de creadores y formatos | 🟢 | `/features/track-and-report` |
| Equipos | Invitar a la cuenta, sin coste por asiento, mismo nivel de acceso para todos; roles «en desarrollo» | 🟢 | `/features/invite-team` |
| Equipos | Subcuentas, asientos y permisos, white-label | 🟢 | `/pricing` (solo Enterprise) |
| Pagos (fuera de alcance) | Escrow, reembolso, USD, 1099, 150 países, cobro por PayPal/Venmo/banco | 🟢 | Varias páginas |
| Onboarding | Registro solo con email o Google/Apple; banner con el creador por el que vienes; botón «Sign Up» en gris mientras el email está vacío | 🔵 | Pantalla de registro (no la rellené) |
| Onboarding (creador) | Reclamar tu usuario `collabstr.com/tunombre` como primer paso | 🔵 | `/creator` |
| Creador | Aplicar a campañas con tu tarifa; «tu historial es tu portfolio» | 🟢 | `/creator` |
| Prueba social | Testimonios con nombre y cargo, casos de éxito (Mane Theory, Wealthsimple, Numi, una agencia) | 🔵 | Inicio y precios |
| **No encontrado** | Calendario o planificación de contenido; notificaciones dentro de la app; resolución de disputas; API pública | 🔴 | No aparece en lo que leí; puede existir tras el login |

---

## 4. Auditoría UX/UI de Collabstr

Todo lo de §4.1–§4.3 es 🔵 y se refiere al **sitio público** visto a 375–770 px de ancho. §4.4 explica por qué no puedo valorar la app con sesión.

### 4.1 Diseño visual

- **Jerarquía.** Titulares muy grandes y gruesos, subtítulo gris corto, un único botón principal por bloque. La home empieza con la acción (buscar) en la primera pantalla y no con una explicación.
- **Paleta.** Neutros (carbón casi negro, blanco, grises claros) y **un solo acento rosa** que se reserva para palabras clave de los titulares y para los botones. El «Add to Cart» del perfil usa un degradado rosa-naranja/violeta; es el único degradado que vi y coincide con la acción principal.
- **Tipografía.** Sans-serif neutra de trazo grueso en titulares, con una palabra en rosa y, en «Final Payment», cursiva. No he medido la escala ni identificado la fuente.
- **Composición.** El hero es una **tarjeta oscura redondeada** sobre fondo blanco, con el buscador como píldora blanca (selector de plataforma + campo + botón). Debajo, chips en píldora con icono y una fila de tarjetas de creador.
- **Imágenes.** El contenido es **fotografía de retrato**. Las tarjetas superponen insignias (plataforma + seguidores arriba, burbuja con una cita de reseña, nombre, nichos y precio abajo). Es la decisión visual que más peso tiene en la web: cada tarjeta muestra prueba social y precio sin abrir el perfil.
- **Componentes.** Píldoras para chips y botones, desplegables-chip para filtros, lista de paquetes con selector circular, acordeones de FAQ, barra fija inferior en el perfil. Iconografía: logos de plataforma y trazos de línea simples; corazón para guardar.
- **Microinteracciones.** El ejemplo del buscador se «teclea» solo; las citas de reseña de las tarjetas **rotan**; en móvil las tarjetas van en carrusel horizontal con la siguiente asomando, lo que invita a deslizar.
- **Consistencia.** La web de marketing (inicio, precios, features, creadores) es coherente entre sí. La **pantalla de registro es otro lenguaje**: blanca, centrada, sin logo ni cabecera, formulario mínimo. El salto se nota, aunque por ser un paso corto no estorba.
- **Responsive.** A 375–770 px: cabecera con logo, botón «Sign Up» y menú hamburguesa; contenido en una columna. Con 1100 px emulados aparece el menú de escritorio (Features, For Brands, Use Cases, Pricing, For Creators, Log in, Sign Up). Composición de escritorio ancho: 🔴 no valorada.
- **Detalle menor.** El aviso de cookies tapaba parte de las tarjetas en la primera carga en móvil.

### 4.2 Usabilidad

- **Pasos hasta lo importante (sin sesión).**
  - Home → listado filtrado: **1 clic** por diseño (los chips son enlaces a listados ya filtrados; vi los enlaces, abrí el listado por URL).
  - Home/listado → perfil: las tarjetas de la home enlazan a URLs limpias (`/usuario`); **1 clic** (abrí el perfil por URL).
  - Perfil → «Add to Cart» → registro: **1 clic** (este sí lo pulsé), y la pantalla de registro dice a quién has elegido («Join Collabstr to view @usuario’s full profile and place an order»). Más allá del registro no puedo ver nada.
- **Qué reduce fricción (🔵).** Precio visible en tarjeta y perfil; filtros guardados en la URL (se pueden compartir); titular con recuento; el filtro de seguidores explica por qué está desactivado; acción principal siempre visible en una barra fija; registro con email o Google/Apple, que conserva a dónde ibas; el creador empieza reclamando su nombre de usuario; «No credit card required» a la vista.
- **Cómo evita la sobrecarga (🔵).** Una cosa por pantalla en el perfil: cabecera, paquetes, analítica, reseñas, en ese orden y con títulos. Descripciones de paquete recortadas con «See More». Los filtros de la búsqueda caben en una fila de chips en vez de un panel lateral.
- **Estados vacíos, errores y confirmaciones.** 🔴 No los vi: sin sesión no hay ninguno que provocar de forma natural.
- **Qué está bien integrado (🟢, no visto en uso).** Dicen que la conversación, el pedido, los términos y el pago son «el mismo objeto». Es lo que más conviene validar con una cuenta de prueba.

### 4.3 Decisiones cuestionables y problemas

1. **Muro de registro muy temprano.** Anónimo solo ves ~16 resultados, un filtro demográfico te saca de la búsqueda y la analítica y las reseñas aparecen desenfocadas. Capta usuarios, pero a costa de que quien aún no se ha registrado **no pueda evaluar el producto**. Es una decisión de captación, no de usabilidad.
2. **Contradicciones en su propio texto** (§2): campañas 1 vs 2 al mes, quién puede chatear antes de pedir, equipos, tracking. En una página de precios es una fuente de desconfianza justo donde la persona decide pagar.
3. **Cifras que no cuadran en un mismo perfil.** El de muestra decía «20 Reviews» arriba y «5 Reviews» en la sección de reseñas. Puede deberse al bloqueo, pero un usuario lo leerá como un error.
4. **La comisión del creador no está donde el creador decide.** `/creator` dice «Free» y el 15 % solo sale en las FAQ de precios.
5. **Metáfora de carrito para algo negociable.** «Add to Cart» encaja con un paquete cerrado, pero convive con «Negotiate a Package». No pude ver cómo se resuelve en el carrito.
6. **Afirmaciones de marketing sin respaldo** (p. ej. «de 40 horas a 1 hora»).
7. **Filtro por etnia.** No he visto cómo funciona, pero el control está en la búsqueda pública. En la UE la etnia es un dato de categoría especial (RGPD, art. 9): si Ciberan se planteara algo parecido, consultarlo antes con asesoría legal. No lo recomiendo copiar.

### 4.4 ¿Sabe el usuario dónde está, qué puede hacer, qué tiene pendiente, qué ha pasado y cuál es el siguiente paso?

🔴 **No evaluable.** Esas cinco preguntas se responden dentro del panel de marca/creador y del detalle de un pedido, y no tengo acceso. Lo único que puedo decir es lo que **declaran**: panel con aprobación en un clic, «registro de todo en la cuenta», correos de estado automáticos (🟢). Antes de tomar decisiones de producto sobre cronología, entregables o «qué me toca» (F1–F4), conviene una pasada con cuenta de prueba por estas 6 pantallas: resultados con sesión, creación de campaña, bandeja de aplicaciones, detalle de pedido (entrega/revisión/aprobación), carrito/pago y analítica de una publicación.

### 4.5 Qué aprender para Ciberan (solo lo observado)

| Observación | Qué haría en Ciberan | Dónde (según la versión anterior) |
|---|---|---|
| Barra fija con precio, paquete y acción en el perfil | Barra inferior de acción en `PublicProfileView` con el paquete elegido y «Pedir» / «Negociar» | `PublicProfileView`, `PackageCard`, `NegotiationPanel` |
| Listados con filtros en la URL y colecciones rápidas | Guardar los filtros de Descubrir en la URL y ofrecer 3–4 colecciones útiles (p. ej. «dentro de tu presupuesto») | `DiscoverFilters.vue`, `useDiscover.ts` |
| Tarjeta con prueba social y precio visible | Mostrar en la tarjeta del creador la nota y una cita corta de una colaboración | `DiscoverBrowser`, tarjeta de perfil |
| Teaser de datos bloqueados con motivo | **No** copiar el muro de registro. Sí el patrón de explicar qué se desbloquea y por qué | Perfil público sin sesión |
| Registro que recuerda a dónde ibas | Registro con contexto («para contactar con X») y retorno al perfil | Flujo de registro |
| «Top Creator» con criterio explicado | Distintivo con criterio visible, solo si se puede calcular de forma honesta con datos propios | `profile_rating*`, `collaboration_ratings` |
| Reseñas con desglose | Comprobar si `collaboration_ratings` ya separa dimensiones (comunicación, puntualidad…) y mostrarlas | `RatingPrompt`, `useRatings` |

---

## 5. Comparativa Collabstr vs. Ciberan

Para Ciberan: ✅ existe y funciona · ⚠️ existe pero débil · ❌ no existe. **Heredado de la versión anterior (código + auditoría 08 del 03/11); no re-verificado hoy.** Para Collabstr: 🔵 observado · 🟢 declarado · 🔴 no encontrado.

| Capacidad | Collabstr | Ciberan hoy | Comentario |
|---|---|---|---|
| Búsqueda y filtros | 🔵 plataforma, categoría, tipo de contenido, seguidores, ubicación, precio, género, edad, etnia, idioma; filtros en la URL; ~16 resultados sin sesión | ✅ categorías, presupuesto, nombre y modo IA (`/api/discover/search`, `DiscoverBrowser`) | Collabstr filtra bastante más y se puede compartir una búsqueda. Ciberan tiene IA y puntuación de afinidad. Collabstr también declara IA («Instant match», 🟢), pero ligada a una campaña. |
| Perfil público con paquetes | 🔵 galería, nota y reseñas, Top Creator, paquetes por plataforma, analítica y reseñas bloqueadas, barra fija de compra | ✅ `PublicProfileView`, `PackageCard`, valoraciones | Equivalente en contenido. Collabstr gana en la **barra de acción fija**, en explicar el criterio de «Top Creator» y en mostrar precio y prueba social en la tarjeta. |
| Contratación directa de paquete | 🔵 «Add to Cart» → registro; 🟢 resto del pago en la plataforma | ⚠️ paquete → chat → oferta (`ChatOfferSheet`) → aceptar | Collabstr es un camino más corto para quien solo quiere comprar. |
| Negociar un paquete | 🟢 «Negotiate a Package»: el creador acepta, contraoferta o rechaza; plazos, derechos de uso y revisiones quedan «en el registro» | ✅ chat con ofertas, privacidad de chat | **Paridad.** La versión anterior lo trataba como diferencial; Collabstr lo declara. Lo que Ciberan puede hacer mejor es mostrarlo (ver F1/F3). |
| Campañas abiertas con aplicaciones | 🟢 brief con IA, segmentación, aplicaciones con tarifa, «Instant match»; Pro/Premium | ❌ no hay campañas publicadas, solo «necesidades» del partner | Hueco real. Collabstr lo reserva a planes de pago. |
| Detalle de colaboración | 🟢 pedido con panel de revisión y aprobación | ⚠️ hoja modal sin URL propia; avisos llevan a la lista | Fallo principal de Ciberan (auditoría 08, D-8). No se puede comparar con la UI real de Collabstr (🔴). |
| Entregables definidos | 🟢 el paquete comprado es el entregable; términos que «pasan» a aprobación y pago | ❌ no se guardan los entregables comprados | Fallo principal. |
| Revisión y aprobación | 🟢 revisión con comentarios concretos, aprobar en un clic | ⚠️ RPC atómicas `approve_post` / `request_post_changes`, pero la aprobación no obliga ni caduca | Base sólida en Ciberan, reglas incompletas. |
| Cronología del acuerdo | 🔴 no vista; solo declaran «todo queda en el registro» | ❌ «Registro» manual | Sigue siendo oportunidad, pero no se puede afirmar que Collabstr no la tenga. |
| Historial y recontratación | 🟢 «rehire» desde el historial, roster «que se construye solo» | ❌ | **Paridad si lo hacemos igual.** La versión anterior lo marcaba como diferencial (F11); ya no lo es por sí solo. |
| Importar creadores propios | 🟢 Pro/Premium; el creador debe unirse | ❌ | Candidata: invitación por enlace (F12). |
| Reseñas | 🔵 existen, con desglose y fecha; contenido bloqueado a anónimos; 🔴 si son simultáneas | ✅ `collaboration_ratings`, `RatingPrompt`; ⚠️ se revelan al instante | No sé si Collabstr evita el sesgo de represalia. F8 sigue siendo válida por sí misma. |
| Calendario y tablero de contenido | 🔴 no encontrado | ✅ Studio (calendario, tablero, biblioteca, checklists, etiquetas) | **Posible** diferencial, pero solo del creador. La ausencia en Collabstr es 🔴: puede existir tras el login. |
| Analítica de publicaciones | 🟢 automática IG/TikTok/YouTube, 24 h, 3 semanas | ✅ métricas con YouTube/Instagram (otro responsable) | No tocar; solo UX. |
| Predicción de éxito | 🔴 no encontrado | ✅ `ml_predictions`, `SuccessScoreCard` | **Posible** diferencial (ausencia 🔴 sin verificar). Collabstr declara IA para briefs y encaje, no para predecir. |
| Informes de audiencia | 🟢 20/50 al mes de pago | ❌ | No prioritario. |
| Equipos y roles | 🟢 invitar a la cuenta; sin roles («en desarrollo»); permisos solo en Enterprise | ❌ tablas `managers` y `brand_clients` sin UI ni API | Deuda: decidir usar o retirar. Ni ellos tienen roles aún. |
| Guardados y comparación | 🔵 corazón; 🟢 shortlists y comparación lado a lado | ✅ `saved_profiles` (sin listas ni notas) | Mejorable (F9). |
| Notificaciones | 🔴 solo mencionan «correos de estado» | ⚠️ `notifications` + triggers; cobertura incompleta | Cerrar huecos. |
| Onboarding | 🔵 email o Google/Apple, banner contextual, `next=`; creador reclama su usuario | No comparado en esta revisión | Ver §4.5. |
| Admin y moderación | 🔴 | ✅ `admin/*`, reportes | Fuera de foco. |
| Pagos y escrow | 🟢 | (otro miembro) | Fuera de alcance. |

**Dónde Collabstr resuelve mejor, siendo críticos:**

1. **Descubrimiento público compartible:** más filtros, búsquedas con URL, colecciones y precio visible en la tarjeta.
2. **Camino de compra:** perfil → barra fija → registro con contexto. Pocos clics y sin fricción visible hasta el registro.
3. **Campañas abiertas con aplicaciones y tarifa** (con IA para el brief).
4. **«Todo en un sitio» declarado:** seguimiento automático, roster y recontratación, equipos.
5. **Señales de confianza en el perfil:** «Top Creator» con criterio y reseñas desglosadas.

**Dónde Ciberan es más rico o diferente (con cautela, 🔴 = no encontrado en lo que leí, no inexistente):**

1. **Planificación de contenido del creador** (Studio).
2. **Predicción de éxito** de publicación.
3. **Negociación por chat con privacidad**: paridad en la función, pero la privacidad de chat no la vi mencionada en Collabstr.
4. **Valoraciones mutuas**: existen en ambos; Ciberan puede hacerlas más honestas (F8).

---

## 6. Problemas y oportunidades detectados en Ciberan

Los problemas P1–P13 son **independientes de Collabstr** y se heredan del código y de la auditoría 08 (no re-verificados hoy). La última columna contrasta cada uno con lo que se vio o se declara en Collabstr: sirve para saber si es solo nuestro o también una brecha frente a la competencia.

| # | Problema | Dónde | Efecto | Contraste con Collabstr |
|---|---|---|---|---|
| P1 | La colaboración no tiene página propia (hoja modal); avisos y «Ver colaboración» llevan a la lista | `pages/{creator,partner}/requests.vue` | No hay enlace compartible ni profundo; se pierde contexto. | 🟢 declaran un panel de pedido con revisión y aprobación; 🔴 no he visto su pantalla. |
| P2 | Dos orígenes → acuerdos distintos: desde una oferta aceptada en el chat nace sin brief ni condiciones | migración `…collaboration_agreement_phase2` (preparada) | Fase 2 lo resuelve con `complete_collaboration_brief`; **pendiente de aplicar en la BD compartida**. | Interno. |
| P3 | No existen entregables ni condición de cierre | `collaborations`, `mark_collaboration_completed` | Se puede completar sin entregar. | 🟢 declaran que el paquete comprado es el entregable y que los términos pasan a aprobación y pago. |
| P4 | Aprobación no vinculante; el creador puede pasar a Publicado sin `approve_post`; reenvío a revisión no avisa | RLS de `posts`, `PostReviewActions` | Trazabilidad débil. | 🟢 declaran revisión con comentarios concretos y aprobar antes de liberar el pago (el pago está fuera de alcance). |
| P5 | No hay cronología unificada (eventos, ofertas, mensajes clave, cambios de estado) | `CollaborationLogCard` (manual) | El «qué ha pasado» se reconstruye a mano. | 🟢 «todo queda en el registro / historial de la cuenta»; una cronología de eventos como tal: 🔴 no vista. |
| P6 | Información de «lo que me toca» dispersa en Inicio, Bandeja, Chat, Calendario, Colaboraciones | `creator/index.vue`, `partner/index.vue`, `inbox.vue` | El usuario no sabe el siguiente paso. | 🔴 su panel no se ha visto; solo declaran «correos de estado» automáticos. |
| P7 | El partner no tiene vista de calendario/planificación de sus colaboraciones | `partner/index.vue` | Asimetría de herramientas entre roles. | 🔴 calendario no encontrado en lo que leí de Collabstr. |
| P8 | Filtros de Descubrir limitados y sin guardar búsquedas | `DiscoverFilters.vue`, `useDiscover.ts` | Marcas repiten búsquedas. | 🔵 Collabstr: unos diez controles de filtro y filtros guardados en la URL (se pueden compartir). |
| P9 | Guardados sin listas ni notas | `favorites.vue`, `useSavedProfiles.ts` | No sirve para comparar ni organizar. | 🟢 shortlists y comparación lado a lado; 🔵 corazón de guardar en las tarjetas. |
| P10 | Rendimiento: SSR con varias consultas encadenadas; Descubrir del partner ~2,3 s | `role-guard.global.ts`, `partner/discover.vue` | Percepción de lentitud (ya mitigado en parte). | No medido en Collabstr. |
| P11 | Coherencia visual a medias: parte de la app aún usa estilo antiguo (publicación `[id]`, chat, métricas, admin) | ver rediseño pendiente | Inconsistencia. | 🔵 su web pública es coherente; el registro cambia de lenguaje visual. No comparable con su app. |
| P12 | `managers`/`brand_clients` huérfanas | migraciones | Superficie sin uso. | 🟢 Collabstr ofrece invitar equipo, sin roles aún: no valida demanda. |
| P13 | Valoraciones visibles al instante | `RatingPrompt`, `useRatings` | Sesgo y miedo a puntuar honestamente. | 🔵 sus reseñas existen con desglose; 🔴 no sé si son simultáneas. |

### Oportunidades que salen de lo observado en Collabstr

**No son problemas confirmados de Ciberan**: primero hay que comprobar cómo están hoy esas pantallas.

| # | Oportunidad | A verificar en | Evidencia en Collabstr |
|---|---|---|---|
| O1 | Barra de acción fija en el perfil (precio + paquete + acción) y tarjeta de creador con nota y cita corta | `PublicProfileView`, `PackageCard`, tarjeta de `DiscoverBrowser` | 🔵 |
| O2 | Registro que recuerda a quién ibas a contactar y devuelve al perfil | flujo de registro y retorno | 🔵 |
| O3 | Reseñas con desglose (comunicación, puntualidad, satisfacción) y criterio visible para un distintivo tipo «Top Creator» | `collaboration_ratings`, `RatingPrompt`, `profile_rating*` | 🔵 |
| O4 | Filtros de Descubrir reflejados en la URL, con 3–4 colecciones rápidas | `useDiscover.ts`, `DiscoverFilters.vue` | 🔵 |

---

## 7. Nuevas funcionalidades propuestas

Tamaño: S (días) / M (1–2 semanas) / L (varias semanas). UX = mejora de UX/UI, F = funcionalidad nueva, E = cambio estructural.

Cada propuesta indica **qué base hay en Collabstr** (🔵 observado · 🟢 declarado · 🔴 no encontrado) y **si es diferencial**. Si la ausencia en Collabstr es 🔴, el diferencial es una hipótesis, no un hecho.

### F1. Página de colaboración `/{rol}/collaborations/[id]` — **Alta · E · L**
- **Problema:** P1, P5. **Cómo:** una página con cabecera de estado y «siguiente paso», pestañas *Resumen · Entregables · Conversación · Cronología*, enlace compartible entre las partes, avisos que aterrizan aquí. **Beneficia:** ambos. **Ventaja:** un lugar único del acuerdo. **Dependencias:** decisión D-8 (aceptada); reutiliza `CollabCard`, `CollaborationTermsCard`, `RatingPrompt`. **Tocar:** nuevas páginas, `useMyCollaborations`, `useCollabRequests`, notificaciones (enlaces).
- **Base en Collabstr:** 🟢 declaran panel de pedido y registro de todo; 🔴 su pantalla no se ha visto.
- **Diferencial:** **no**, es paridad con lo declarado. Se prioriza por el problema interno.

### F2. Entregables como datos — **Alta · E · L**
- **Problema:** P3, P4. **Cómo:** al aceptar se copia el paquete como lista de entregables (tipo, plataforma, fecha límite); cada publicación vinculada ocupa un hueco; el estado de cada hueco (pendiente / en revisión / cambios / aprobado / publicado); completar la colaboración exige tenerlos aprobados (o dejar constancia). **Ventaja:** la marca sabe qué compró, el creador qué debe. **Dependencias:** Fase 2 del flujo (instantánea del paquete, ya preparada), cambio de RLS para que `Publicado` exija aprobación. **Riesgo:** medio-alto (reglas de estado, datos existentes).
- **Base en Collabstr:** 🟢 el paquete es el entregable y los términos «pasan» a aprobación y pago.
- **Diferencial:** **no**, paridad. Prioridad por P3/P4.

### F3. Cronología del acuerdo (`collaboration_events`) — **Alta · F · M**
- Registro automático e inmutable: solicitud, oferta/contraoferta, aceptación, brief completado, entrega enviada, cambios pedidos, aprobación, cierre, valoraciones. Sustituye al registro manual como fuente de verdad (el manual pasa a «notas»). **Ventaja:** trazabilidad y confianza sin pagos. **Dependencias:** triggers existentes (`notify_collaboration_*`) se pueden reutilizar como origen.
- **Base en Collabstr:** 🟢 términos «en el registro» e historial de la cuenta; 🔴 cronología de eventos no vista.
- **Diferencial:** **poco o nada demostrable**. Podría serlo si es automática y legible, pero no puedo compararla con lo que no he visto.

### F4. «Qué me toca» — bandeja de acciones unificada — **Alta · UX · M**
- **Problema:** P6. **Cómo:** una lista priorizada de acciones pendientes (responder oferta, completar brief, revisar entrega, aprobar, entregar antes de X, valorar), cada una con botón directo, en Inicio y como contador en el rail. **v1 con los datos actuales**, sin campañas ni entregables; **v2** se enriquece cuando exista F2. **Ventaja:** responde a «qué tengo pendiente / cuál es el siguiente paso». **Tocar:** `creator/index.vue`, `partner/index.vue`, `inbox.vue`, `useNotifications`.
- **Base en Collabstr:** 🔴 su panel no se ha visto; solo declaran «correos de estado».
- **Diferencial:** **no valorable**. Es una mejora necesaria por P6, independientemente de la competencia.

### F5. Campañas / oportunidades abiertas con aplicaciones — **Media · F · L**
- **Problema:** hueco frente a Collabstr. **Cómo:** el partner publica una «necesidad» con brief y rango; creadores aplican con propuesta y precio; el partner compara aplicaciones y acepta una (genera colaboración con brief ya rellenado). **Reutiliza:** `packages` de partner (necesidades), `NegotiationPanel`. **Dependencias:** F1–F2 para que el resultado sea un acuerdo completo. **Riesgo:** moderación de spam; mejor después de la página de colaboración.
- **Base en Collabstr:** 🟢 brief con IA, «Instant match», aplicaciones con la tarifa del creador, segmentación; solo en planes de pago, con **1 o 2 campañas al mes** según la página (contradicción 🔵). La pantalla de aplicaciones es 🔴.
- **Diferencial:** **no**, es cerrar una brecha. Si hay diferencia posible está en la política (no bloquearlo tras un plan de pago), que es una decisión de negocio. **No diseñar la UX sin ver antes sus pantallas con cuenta.**

### F6. Contratación rápida de paquete («Pedir este paquete») — **Media · UX/F · M**
- Atajo desde el perfil: un formulario corto (brief mínimo, fecha) que crea la solicitud sin pasar por chat; el chat sigue disponible. **Ventaja:** acortar el camino que Collabstr sí tiene corto, sin quitar la negociación. **Tocar:** `PackageCard`, `NegotiationPanel`, `collaborations` insert.
- **Base en Collabstr:** 🔵 perfil → «Add to Cart» → registro en 1 clic; 🟢 el resto del pago.
- **Diferencial:** **no**, cierra una brecha. Lo observado solo prueba que el camino es corto, no que convierta más.

### F7. Calendario compartido de la colaboración — **Alta (diferencial) · F · M**
- **Problema:** P7. **Cómo:** las fechas límite de entregables aparecen en el Calendario del creador (ya existe) **y** en una vista equivalente para la marca; recordatorios 48 h/24 h antes. **Tocar:** `WeekBoard`, nueva vista en `partner/requests` o inicio, tareas programadas (Cron/Edge). **Dependencias:** F2 (fechas por entregable).
- **Base en Collabstr:** 🔴 calendario o planificación **no encontrados** en lo que leí; solo declaran «correos de estado» automáticos (🟢).
- **Diferencial:** **sí, la única propuesta nueva con base**, pero la ausencia en Collabstr no está verificada. Tiene valor aunque se confirme que Collabstr lo tiene, porque resuelve P7 (asimetría entre roles).

### F8. Valoraciones con revelado simultáneo — **Media · F · S**
- P13: ninguna parte ve la nota de la otra hasta que ambas puntúen o pasan 7 días. Mejora honestidad y confianza. **Tocar:** `submit_collaboration_rating`, vistas de perfil (`profile_rating*`).
- **Base en Collabstr:** 🔵 sus reseñas existen con desglose y fecha; 🔴 no sé si se revelan a la vez.
- **Diferencial:** **desconocido**. Se hace por su propio valor y es barata (S, sin dependencias).

### F9. Guardados con listas y notas / comparador — **Media · F · M**
- P9. Listas con nombre («Campaña verano»), nota por perfil, comparar 2–3 creadores lado a lado (seguidores, rango, afinidad, valoración, colaboraciones previas). **Beneficia:** marcas. **Tocar:** `favorites.vue`, `useSavedProfiles`, tabla nueva `saved_lists`.
- **Base en Collabstr:** 🟢 shortlists y comparación lado a lado, visibles para el equipo.
- **Diferencial:** **no**, paridad. Lo único propio sería usar la afinidad y el `reason` de Ciberan dentro de la comparación.

### F10. Descubrir compartible: filtros en la URL, colecciones y búsquedas guardadas — **Media · F · M**
- P8, O4. **Cómo:** los filtros viven en la URL (enlace compartible), 3–4 colecciones rápidas, guardar una búsqueda y avisar de nuevos creadores que encajan; filtros por plataforma y país si hay dato. **Dependencia:** datos de perfil (país/plataforma): hoy no confirmados en `influencers`. **No** copiar el filtro por etnia (ver §4.3).
- **Base en Collabstr:** 🔵 unos diez controles de filtro, filtros en la URL y colecciones en chips.
- **Diferencial:** **no**, cierra una brecha de descubrimiento.

### F11. Continuidad: «creadores con los que ya trabajé» — **Media · F · S–M**
- Vista de relación: historial con un creador (colaboraciones, valoraciones, importes de referencia), botón «repetir colaboración» que copia brief y condiciones. **Tocar:** `PublicProfileView`, `useMyCollaborations`.
- **Base en Collabstr:** 🟢 «Creators on retainer»: recontratar desde el historial, roster que se construye solo.
- **Diferencial:** **no, paridad.** La versión anterior lo vendía como diferencial frente a un marketplace «solo transaccional»; Collabstr declara lo mismo. Se hace porque es barato una vez existe F1, no para destacar.

### F12. Invitar a un creador conocido por enlace — **Baja · F · S–M**
- Equivalente a «traer tus propios creadores»: enlace que lleva a onboarding y deja una solicitud lista. Útil para adquisición.
- **Base en Collabstr:** 🟢 importar creadores propios (Pro/Premium); deben unirse para entregar y cobrar. **Diferencial:** no.

### F13. Resumen semanal por correo/avisos — **Baja · F · M**
- Digest con pendientes y próximos plazos (apoya F4/F7).
- **Base en Collabstr:** 🟢 «correos de estado» automáticos. **Diferencial:** no.

### F14. Equipos / gestores — **Baja · E · L**
- Decidir qué hacer con `managers`/`brand_clients`: o se diseñan (roles en cuenta de marca, agente de creador) o se retiran. **Sin evidencia de demanda**; no priorizar hasta validarlo.
- **Base en Collabstr:** 🟢 invitar a la cuenta sin roles (los roles están «en desarrollo»); permisos solo en Enterprise. Ni ellos lo tienen resuelto. **Diferencial:** no.

### Propuestas descartadas (por no resolver un problema real ahora o por riesgo)
- Informes de audiencia demográfica de pago, afiliados/comercio, planes de suscripción que bloquean funciones básicas, integraciones enterprise/API pública.
- **Filtro por etnia** (🔵 existe el control en Collabstr): dato de categoría especial en el RGPD; si se planteara, consultarlo antes con asesoría legal.
- **Muro de registro** tan temprano (~16 resultados y bloqueo de filtros, analítica y reseñas): no copiar; sí el patrón de explicar qué se desbloquea.

---

## 8. Propuestas de diferenciación

Revisadas con la segunda investigación. Lo que Collabstr **declara** (🟢) ya no cuenta como diferencial. Lo que no encontré (🔴) es una **hipótesis**, porque puede existir tras el login.

### A. Diferenciales con base (ausencia en Collabstr sin verificar)

1. **Planificación compartida marca ↔ creador con plazos y recordatorios** (F7). Ciberan ya tiene la mitad: el Studio del creador (✅ heredado). En Collabstr solo vi «correos de estado» (🟢) y ningún calendario (🔴).
2. **IA para predecir, no solo para emparejar.** Ciberan: afinidad y predicción de éxito de publicación (✅ heredado). Collabstr declara IA para redactar briefs y para el encaje de creadores (🟢), no para predecir resultados (🔴). Explicar *por qué* sugiere un resultado (ya hay `reason`) y llevarlo a la comparación (F9).
3. **Un único sitio donde el creador gestiona su semana:** calendario, tablero y checklists del Studio. En Collabstr el creador aparece sobre todo como perfil, tarifa y cobro (🔵 `/creator`, 🟢 resto). Solo es diferencial en tanto el Studio ya exista y siga siendo mejor que lo que haya tras su login.

### B. Ya no es diferencial (paridad declarada)

- **Negociación estructurada:** 🟢 «Negotiate a Package» (el creador acepta, contraoferta o rechaza) y términos «en el registro». Ciberan lo tiene (✅ chat con ofertas), pero es paridad.
- **Recontratar y repetir** (F11): 🟢 «Creators on retainer». Paridad.
- **Valoraciones mutuas:** 🔵 existen en Collabstr, con desglose. Paridad.
- **Guardados y comparación** (F9), **invitar a un creador conocido** (F12), **resúmenes por correo** (F13), **equipo** (F14): 🟢 los declaran.
- **«El acuerdo en un solo sitio»** (F1–F3): 🟢 lo prometen. Para Ciberan es cerrar una brecha, no una diferencia.

### C. No evaluable hasta ver Collabstr con sesión

- Si F1–F3 dan un acuerdo **más claro** que el de Collabstr.
- Si «Qué me toca» (F4) supera a su panel.
- Si nuestras valoraciones con revelado simultáneo (F8) son más honestas que las suyas.

### Por qué cada rol podría preferir Ciberan (hipótesis)

- **Creador:** ve qué le toca, tiene calendario y plazos en un sitio y obtiene señales de qué publicar (Studio + predicción), no solo un perfil con tarifas (A.1–A.3). Lo que depende de F2 y F7 aún no existe.
- **Marca:** ve plazos y estado compartidos sin perseguir por chat (F1 + F7). Comparar y repetir con creadores de confianza es paridad (F9, F11).
- No entro en pagos ni comisiones: están fuera de alcance.

---

## 9. Mejoras de diseño y usabilidad

Principio: decisiones que mejoran comprensión, no decoración. Se mantiene el sistema «Señal» actual. «Base» indica si hay evidencia en Collabstr (🔵 observado, 🟢 declarado) o si es una mejora interna (—).

| # | Mejora | Dónde | Base |
|---|---|---|---|
| D1 | **Cabecera de «siguiente paso»** en la página de colaboración: una frase + un botón principal según estado y rol («Falta tu brief», «Revisa la entrega de Lía») | F1 | — |
| D2 | **Indicador de progreso por entregables** (3/5 aprobados) en `CollabCard` en vez de solo el chip de estado | `CollabCard.vue` | — |
| D3 | **Aprovechar el ancho** en escritorio: colaboración en dos columnas (trabajo a la izquierda, acuerdo/cronología a la derecha), como ya se hace en Ficha | páginas de detalle | — |
| D4 | **Contador de pendientes en el rail** («Colaboraciones 2») conectado a F4 | `SideRail.vue` | — |
| D5 | **Vista de tablero/lista conmutable** para el partner en Colaboraciones (columnas por fase) | `partner/requests.vue` | — |
| D6 | **Comparador lado a lado** en Guardados (paridad con lo que Collabstr declara) | F9 | 🟢 |
| D7 | **Estados vacíos con acción concreta** (ya hay `EmptyState`; revisar copy según rol) | transversal | — (no vi los de Collabstr) |
| D8 | **Confirmaciones reversibles** (deshacer en vez de diálogos) para acciones frecuentes como guardar o mover fase | `useToast` | — |
| D9 | **Formularios largos por pasos** solo donde hay brief + condiciones (solicitud); el resto, una página | `NegotiationPanel` | — |
| D10 | **Terminar de unificar patrones**: publicación `[id]`, chat, métricas/YouTube, admin, `PackageFormSheet`, `ProfileHeaderCard` (plan ya acordado) | ver rediseño | — |
| D11 | Mantener avisos y errores con texto accionable (qué pasó y qué hacer) | transversal | — |
| D12 | **Barra de acción fija** en el perfil con precio, paquete elegido y «Pedir» / «Negociar» | `PublicProfileView`, `PackageCard`, `NegotiationPanel` | 🔵 |
| D13 | **Tarjeta de creador con nota y una cita corta** de una colaboración, y precio visible | tarjeta de `DiscoverBrowser` | 🔵 |
| D14 | **Registro con contexto y retorno**: «para contactar con X» y vuelta al perfil | flujo de registro | 🔵 |

D12–D14 vienen de lo observado (O1, O2 en §6): primero comprobar cómo está hoy cada pantalla en Ciberan.

---

## 10. Tabla de priorización

Impacto / Diferencial / Complejidad / Riesgo: A·M·B (alto·medio·bajo). «?» = no valorable con la evidencia disponible. «Base Collabstr»: 🔵 observado · 🟢 declarado · 🔴 no encontrado.

| ID | Propuesta | Tipo | Prioridad | Impacto | Diferencial (revisado) | Base Collabstr | Complejidad | Riesgo | Depende de |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Página de colaboración | Estructural | **Alta** | A | B (paridad 🟢) | 🟢 | A | M | Fase 2 aplicada |
| F2 | Entregables como datos | Estructural | **Alta** | A | B (paridad 🟢) | 🟢 | A | A | F1, snapshot de paquete |
| F3 | Cronología automática | Funcional | **Alta** | A | B–M (no demostrable) | 🟢 / 🔴 | M | B | F1 |
| F4 | «Qué me toca» (v1 con datos actuales) | UX | **Alta** | A | ? | 🔴 | M | B | datos actuales |
| D1/D2 | Siguiente paso + progreso | UX | **Alta** | A | B | — | B | B | F1/F2 |
| F7 | Calendario compartido + recordatorios | Funcional | **Alta** (antes Media) | A | **A** (hipótesis: ausencia 🔴 sin verificar) | 🔴 | M | M | F2 |
| F8 | Valoración con revelado simultáneo | Funcional | Media | M | ? | 🔵 / 🔴 | B | B | — |
| D12–D14 | Perfil que convierte: barra fija, prueba social en la tarjeta, registro con contexto | UX | Media | M | B (cierra brecha) | 🔵 | B | B | comprobar estado actual (O1, O2) |
| F6 | «Pedir este paquete» | UX/Func. | Media | M | B | 🔵 / 🟢 | M | B | — |
| F10 | Descubrir compartible (URL, colecciones, búsquedas guardadas) | Funcional | Media | M | B | 🔵 | M | M | datos de perfil |
| F9 | Listas, notas y comparador | Funcional | Media | M | B (paridad 🟢) | 🟢 | M | B | — |
| F11 | Repetir colaboración / historial | Funcional | Media | M | **B** (antes A) | 🟢 | B–M | B | F1 |
| F5 | Campañas abiertas con aplicaciones | Funcional | Media* | A | B (paridad 🟢) | 🟢 | A | M | F1–F2; pasada con cuenta |
| D10 | Terminar rediseño pendiente | UX | Media | M | B | — | M | B | — |
| F12 | Invitar por enlace | Funcional | Baja | B | B (paridad 🟢) | 🟢 | B | B | — |
| F13 | Digest semanal | Funcional | Baja | B | B | 🟢 | M | B | F4/F7 |
| F14 | Equipos/gestores | Estructural | Baja | ? | B | 🟢 | A | A | validar demanda |

\* Alta en paridad competitiva, pero conviene *después* de F1–F3 (para que lo contratado acabe en un acuerdo completo) y **después de ver sus pantallas de campañas con cuenta**.

**Qué cambia respecto a la versión anterior y por qué:**

- **F7 sube de Media a Alta.** Es la única propuesta nueva con base de diferenciación (ausencia 🔴 en Collabstr) y además resuelve P7, que es un problema interno. Aunque se confirmara que Collabstr lo tiene, el valor interno se mantiene.
- **F4 sigue Alta pero se adelanta**: una v1 con los datos actuales no depende de F2 y resuelve P6 ya.
- **F11 baja su «Diferencial» de A a B**: Collabstr declara recontratar desde el historial y roster. Mantiene prioridad Media por ser barata una vez exista F1.
- **F9 y F12 quedan como paridad**: Collabstr declara shortlists con comparación e importar creadores propios.
- **F1, F2 y F3 siguen Alta, pero por un motivo distinto**: antes se justificaban también como ventaja; ahora solo por los problemas P1–P5, que son internos.
- **F8**: «Diferencial» pasa de M a «?». No sé si Collabstr revela las reseñas a la vez.
- **F6 y F10** se agrupan con D12–D14 como «cerrar brechas de descubrimiento y compra», con respaldo observado.

---

## 11. Roadmap recomendado

**Fase 0 — Cerrar lo ya hecho (días).** Aplicar en la BD compartida las migraciones `20261104110000` y `20261104120000`; decidir push a `main`; terminar rediseño de ficha de publicación. **En paralelo:** una pasada con cuenta de prueba en Collabstr sobre las 6 pantallas de §4.4, para convertir los 🔴 en 🔵 antes de decidir F5 y los diferenciales.
**Fase 1 — Base del acuerdo y claridad inmediata (≈3–4 semanas).** F1 (página) + F3 (cronología) + D1 + **F4 v1** con los datos actuales (adelantada desde la antigua Fase 3: no depende de F2 y resuelve P6). Sin cambiar aún reglas de estado.
**Fase 2 — Entregables y reglas (≈3–4 semanas).** F2 + D2 + endurecer `Publicado` tras aprobación + aviso a la marca al reenviar; después, F4 v2 con entregables. Es la fase de mayor riesgo: probar con datos existentes y tener plan de migración.
**Fase 3 — La apuesta diferencial (≈2–3 semanas).** F7 (calendario compartido + recordatorios) justo después de F2, D4 (contador en el rail) y F8, que es barata y puede hacerse en cualquier momento. Antes F7 estaba en la Fase 4.
**Fase 4 — Cerrar brechas de descubrimiento y compra (≈3 semanas).** D12–D14, F6, F10, F9 y F11 (barata una vez hay F1). Antes era «captación y paridad», en la última fase.
**Fase 5 — Según decisión.** F5 (solo tras ver las pantallas de campañas de Collabstr con cuenta), F12, F13, F14 (solo si se valida demanda).
**Siempre:** verificar a 390/768/1024/1440 px y con datos reales de la BD compartida; no tocar pagos ni redes sociales; no copiar el filtro por etnia.

---

## 12. Conclusiones y recomendaciones

### Lo que sabemos de Collabstr (🔵 observado, sin sesión)

- Planes y precios publicados (Pro 249 $/mes, Premium 333 $/mes en facturación anual, Enterprise desde 1.000 $), comisión de la marca 10 % o 5 %, y 15 % del creador solo en las FAQ de precios.
- Búsqueda pública con unos diez controles de filtro y filtros en la URL; sin sesión solo ~16 resultados y el filtro «Ethnicity» lleva al registro.
- Perfil con paquetes por plataforma, «Negotiate a Package», barra de acción fija, «Top Creator» con criterio explicado, y analítica y reseñas bloqueadas (con desglose de reseñas).
- Registro con email o Google/Apple, con banner que dice a quién ibas a contactar y retorno al destino.
- Contradicciones en su propio texto (campañas Pro 1 vs 2 al mes, quién puede chatear antes de pedir, equipos, tracking) y un perfil de muestra con «20» y «5» reseñas.

### Lo que Collabstr dice (🟢 declarado, no visto en uso)

Negociación con contraoferta, términos en el registro, revisión y aprobación en un clic, recontratar desde el historial y roster, importar creadores propios, invitar a un equipo (sin roles), seguimiento automático, campañas con aplicaciones e «Instant match», informes de audiencia, escrow y pagos (fuera de alcance).

### Lo que no he podido comprobar (🔴)

- Todo el panel con sesión: dónde estoy, qué tengo pendiente, siguiente paso, notificaciones, estados vacíos y de error, carrito y pago.
- Si existe cronología de eventos, calendario o planificación de contenido, y si las reseñas se revelan a la vez.
- Qué desbloquea una cuenta gratuita (p. ej. los filtros demográficos) y cómo se ve la composición en escritorio ancho.
- Disputas, API pública y cualquier otra función detrás del login.

### Qué hacemos bien (heredado de Ciberan, no re-verificado)

Studio del creador, predicción de éxito, privacidad de chat, RPC atómicas de revisión y un sistema de diseño coherente. **Negociación estructurada y valoraciones** están bien resueltas, pero Collabstr declara o tiene algo equivalente: son paridad.

### Qué hacemos peor (con base)

1. **El ciclo de la colaboración no se materializa** (página propia, entregables, cronología, aprobación que obligue). Es un problema interno (auditoría 08) que Collabstr declara resolver.
2. **Descubrimiento y camino de compra más cortos en Collabstr** (🔵): filtros compartibles, colecciones, prueba social y precio en la tarjeta, barra de acción fija.
3. **Sin campañas abiertas con aplicaciones** (🟢 en Collabstr, solo en planes de pago).

### Qué es verdaderamente diferencial

Solo tres líneas, y las tres dependen de una ausencia **no verificada** en Collabstr: la **planificación compartida con plazos y recordatorios** (F7), el **Studio del creador** y la **predicción de éxito**. El resto de lo que se había presentado como ventaja (negociación, recontratación, valoraciones, guardados, invitar a creadores conocidos) es paridad con lo que Collabstr declara u observa.

### Qué mejorar primero

F1, F3 y F4 v1 en la Fase 1; F2 con cuidado en la Fase 2; F7 en cuanto haya fechas por entregable. Responden a «dónde estoy, qué falta y cuál es el siguiente paso» y a la única apuesta diferencial.

### Qué no copiar

Muro de registro temprano, filtro por etnia (dato de categoría especial en el RGPD), suscripciones que bloquean funciones básicas, informes de audiencia de pago, afiliados/comercio y equipos con roles sin demanda validada.

### Límites de este informe

Collabstr se ha explorado en el navegador, pero **solo la parte pública**; lo demás es declarado o no comprobado (§0). Los datos de Ciberan se heredan del código y de la auditoría 08 y no se han re-verificado en esta revisión. Recomiendo una pasada con cuenta de prueba (Fase 0) antes de decidir F5 y de afirmar cualquier diferencial sobre planificación o cronología.

---

## Referencias consultadas

**Páginas de Collabstr vistas en el navegador el 04/11/2026 (sin sesión):**
- [Inicio](https://collabstr.com/) (también a 375 px)
- [Pricing](https://collabstr.com/pricing)
- [Listado filtrado «Influencers Under $250»](https://collabstr.com/influencers?qs=under_250&title=Influencers%20Under%20$250&pmi=50&pmx=250)
- [Perfil público de muestra](https://collabstr.com/alleesuttonhethcoat)
- Features: [Find & hire](https://collabstr.com/features/find-and-hire/) · [Post campaigns](https://collabstr.com/features/post-campaigns/) · [Chat & negotiate](https://collabstr.com/features/chat-and-negotiate/) · [Approve & pay](https://collabstr.com/features/approve-and-pay/) · [Track & report](https://collabstr.com/features/track-and-report/) · [Invite team](https://collabstr.com/features/invite-team/) · [Bring your own creators](https://collabstr.com/features/bring-your-own-creators/)
- [Para creadores](https://collabstr.com/creator)
- [Caso de uso: influencer marketing](https://collabstr.com/use-cases/influencer-marketing/)
- [Influencer analytics](https://collabstr.com/influencer-analytics) (redirigió al registro; sin lectura útil)
- Pantalla de registro (alcanzada desde «Add to Cart» y desde el filtro «Ethnicity»; no se rellenó)

**No visitadas:** `/use-cases/ugc-for-ads/`, `/use-cases/affiliate-marketing/`, estudios de caso, blog y centro de ayuda.

**Terceros (🟡, de la versión anterior; no re-verificados):**
- [RFP.wiki — Collabstr](https://www.rfp.wiki/vendors/collabstr) (agregador, parte automatizada) · [Capterra](https://www.capterra.co.uk/reviews/203391/collabstr) · [SaaSWorthy](https://www.saasworthy.com/product/collabstr/reviews) · [Toolradar](https://toolradar.com/tools/collabstr)

**Código y documentos de Ciberan (heredados de la versión anterior; no abiertos en esta revisión):** `docs/audit/08_COLLABORATION_FLOW_AUDIT.md`, `docs/PENDIENTE_MARIO.md`, `app/pages/**`, `app/composables/**`, `app/components/{collab,discover,timeline,chat,profile}/**`, `supabase/migrations/**`, `server/api/**`.