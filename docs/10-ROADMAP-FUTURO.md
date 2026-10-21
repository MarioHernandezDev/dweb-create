# 10. Roadmap futuro — qué es esto y qué sigue

Conversación de planificación del 2026-10-21 entre el usuario (Mario) y Claude, sin código de por medio — solo para dejar claro el rumbo antes de seguir. Si retomas esto "en frío", empieza por aquí antes que por el `CHANGELOG.md` (ese es el detalle técnico de lo ya hecho; este documento es hacia dónde vamos).

## 0. Qué es FEEDMA, de verdad

Un proyecto de dos amigos desarrolladores, construido con Claude Code, por diversión y aprendizaje — **no** el negocio de sus vidas, pero sí con la esperanza de que genere algo de dinero de forma casi pasiva si cuaja.

**Posicionamiento decidido en esta conversación**: no se compite con las plataformas grandes de influencer marketing (GRIN, Upfluence, CreatorIQ, Aspire...) — esas son herramientas B2B para que una marca gestione cientos de influencers a la vez, con precios de empresa (649$/mes+) y equipos de ventas detrás. Eso no es jugable para 2 personas.

Lo que sí tiene sentido, y para lo que ya está construida la mayor parte del producto: **una herramienta directa para un creador individual y una marca pequeña que negocian y gestionan un encargo entre ellos**, sin intermediarios ni escala — ejemplo que puso el usuario: "tengo una empresa de zapatos, busco un influencer que ofrezca un pack de vídeos mensuales, y ambos lo gestionamos aquí, con IA incluida, y yo me llevo una comisión".

El bucle completo **ya existe**: descubrir creador → contactar → negociar presupuesto por contraoferta → el creador lo gestiona en su tablero (idea → producción → revisión → programado → publicado) → el partner aprueba → se paga por Stripe Connect con comisión de plataforma automática (10%, `MARKETPLACE_FEE_RATE`) → hay predicción de éxito por IA en cada publicación. El plan Pro de pago (19,99€/mes) es la segunda pata de ingresos. Monetización: ya programada, falta tracción real.

### Las 2 piezas que faltan para que esta visión se sienta completa

1. **"Descubrir" hoy es una lista plana sin filtros** (`partner/discover.vue` hace un `select *` de todos los creadores, sin buscar por nicho ni nada). Para que una marca pequeña encuentre al creador adecuado hace falta, como mínimo, filtro por nicho/categoría — y sería un diferenciador de verdad (no solo paridad) usar la IA que ya está conectada (OpenRouter) para un recomendador "qué creadores encajan con tu marca", en vez de solo un buscador de texto.
2. **"Packs mensuales" (retainers recurrentes) no existen todavía** — hoy una colaboración es un presupuesto único, de una vez. Un pack tipo "4 vídeos al mes durante 3 meses, X€/mes" necesita modelar la recurrencia tanto de la entrega como del cobro (suscripción de Stripe, no pago único). Si esto es el corazón de la propuesta, merece diseñarse como pieza propia, no como parche sobre `collaborations`.

**Decisión tomada (2026-10-21, sesión 20)**: se eligió descubrimiento primero — ver `docs/CHANGELOG.md` entrada (20) para el detalle completo (ambas direcciones: creador busca partners y viceversa, filtros + buscador con IA, analíticas de admin de "qué pide la gente"). Los packs recurrentes siguen pendientes, sin tocar.

## 1. Roadmap priorizado (todo lo demás que se habló)

### Fase "que no nos pille desprevenidos" — antes que nada más

- 🔴 **Política de cuándo se paga, de verdad.** Ahora mismo (`partner/profile.vue`, `payableStatuses`) un partner puede pagar en cuanto el creador **acepta** la colaboración — antes de que exista ni una entrega. Esto es un agujero de fraude en los dos sentidos (el creador cobra y no entrega; o el partner no paga nunca tras recibir el contenido, según cómo se use). Hay que decidir a propósito: ¿pago por hitos (se libera al aprobar cada entrega)?, ¿todo al final?, ¿señal + resto? Esto es más urgente que casi todo lo demás de esta lista: es dinero real de terceros.
- 🔴 **RGPD de verdad** (España/UE, no es opcional en cuanto haya un usuario real que no seáis vosotros): Política de Privacidad, Términos de Servicio, base legal para tratar datos personales (fotos, datos bancarios vía Stripe, mensajes, datos de empresa), derecho a exportar/borrar los datos de alguien.
- 🔴 **El panel de admin no tiene límite de intentos de contraseña** — hoy se puede probar `/api/admin/login` sin límite, sin captcha, sin bloqueo tras fallos. Barato de arreglar, mucha tranquilidad a cambio.
- **Rate limiting en general**: registro de cuentas, envío de solicitudes de colaboración, reportes — nada tiene límite hoy, spam de cuentas o de solicitudes es trivial tal cual está.
- **Avisar sobre fiscalidad para influencers en España** (tipos de cobro, retención de IRPF, alta de autónomo, facturación) — no como asesoría legal nuestra, sino como aviso claro de "esto hay que declararlo, consulta a un gestor" en el momento del cobro, para que nadie se lleve una sorpresa con Hacienda.

### Fase "se siente un producto de verdad"

- Perfil/cuenta: panel para gestionar fotos y personalización — que el creador pueda "juguetear" y tener su perfil bonito y organizado.
- Tablero compartido con el partner, pulido: ya existe la base (`usePartnerPosts` + aprobar/pedir cambios), falta que se vea tan bien como el Kanban nuevo del creador, no construirlo desde cero.
- Redes sociales como portfolio real: en marcha, bloqueado ahora mismo en la creación de la app de Meta (ver `docs/9-INSTAGRAM-OAUTH-SETUP.md`, aviso "📍 Dónde lo dejamos" al principio del archivo — **empezar la próxima sesión por ahí**, es el bloqueo activo más reciente).
- Tests automatizados — empezar por el circuito de dinero (negociación → pago → comisión), es lo que más duele si se rompe en silencio sin que nadie se entere.

### Fase "ya con tracción" (no antes)

- Moderación de contenido subido (fotos de posts) más allá de "reportar" a toro pasado.
- Backups de verdad — el plan gratis de Supabase no tiene point-in-time recovery; en cuanto haya dinero real circulando, deja de ser opcional.
- Rate limiting fino y los "packs mensuales"/recurrentes de la sección 0.
- ~~Discovery con recomendador por IA (sección 0, punto 1)~~ — hecho en la sesión 20 (filtros + IA + bidireccional), ver `docs/CHANGELOG.md`. Queda pendiente aplicar la migración al proyecto real y probarlo en navegador.

## 2. Cosas que ya están resueltas, para no preocuparse por ellas

- **Verificación de identidad de quien cobra**: la resuelve Stripe Connect solo (KYC), no hay que construir nada aparte.
- **Español únicamente**: asumido como decisión consciente (mercado español), no un olvido — si algún día se quiere crecer fuera, es trabajo de internacionalización aparte.
- **Publicar contenido desde la app**: decisión ya tomada, que no se va a construir — el tablero es seguimiento interno, nunca sube nada a redes vía API (ver `docs/9-INSTAGRAM-OAUTH-SETUP.md` §5).
- **Motor de tendencias con IA**: aparcado (`app/_disabled/creator/trends.vue`), no descartado — la IA no daba ideas lo bastante buenas todavía. Código intacto para retomar cuando interese.

## 3. Por dónde seguir mañana, en orden

1. Decidir: ¿descubrimiento o packs recurrentes primero? (sección 0).
2. Resolver el bloqueo de Instagram si se consigue cuenta de Facebook (`docs/9-INSTAGRAM-OAUTH-SETUP.md`, aviso al principio).
3. Diseñar la política de cuándo se paga (🔴 arriba) — antes de que haya una sola transacción real.
4. RGPD básico + límite de intentos en el login de admin (🔴 arriba) — barato, rápido, importante.
