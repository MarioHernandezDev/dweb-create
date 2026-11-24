# CIBERAN — Fase 1: descubrimiento jurídico

**Fecha:** 24-nov-2026 · **Versión:** 0.1 (borrador interno) · **Alcance:** solo lectura del repositorio, de la documentación del proyecto y del esquema real de la base de datos (Supabase `qymqzddqrnsxjnwbqlgq`). No se ha modificado código ni datos. No se ha consultado legislación todavía (eso es la Fase 2).

> Este documento no es asesoramiento jurídico. Separa tres niveles: **[V] verificado** en código/base de datos de hoy, **[D] declarado** en la documentación del proyecto o en conversaciones, **[?] no verificable** con lo que hay en el repositorio.

---

## 1. Qué recursos he podido y no he podido consultar

| Recurso | Estado |
|---|---|
| Código (`app/`, `server/`, `supabase/migrations/` — 76 migraciones) | Leído por búsqueda dirigida |
| Esquema real de la base de datos y recuentos de filas | Consultado en solo lectura |
| Documentación (`docs/`, `CONTEXT.md`, `PROJECT_OVERVIEW.md`, `docs/15-cierre-lanzamiento-gratis.md`, `docs/13-INTEGRACIONES-PENDIENTES.md`, `docs/14-OPERACIONES-ADMIN.md`, `docs/16-EMAIL-SMTP.md`) | Leída |
| Textos legales actuales (`/privacidad`, `/terminos`, `app/utils/legal.ts`) | Leídos íntegros |
| Conversaciones anteriores contigo en este proyecto | Solo lo que consta en esta sesión: pagos, predicción IA y Google login apagados; métricas de redes aplazadas; Supabase Pro aplazado hasta tener la política de privacidad revisada por abogado (tras el 29-N); una única base compartida para desarrollo, pruebas y producción |
| Panel de Supabase, Stripe, Sentry, hosting, proveedor de correo | **No accesibles.** Lo que se diga de su configuración es [D] o [?] |
| Conversaciones con Mario o con terceros fuera del repositorio | **No accesibles** |

---

## 2. Qué es CIBERAN hoy (mapa funcional)

Plataforma web (Nuxt 4 + Supabase + Nitro) que conecta **creadores** y **partners** (marcas/agencias). Hay un tercer perfil interno: **equipo de administración**.

### 2.1 Funcionalidades ACTIVAS [V]
- Registro y acceso con email/contraseña; recuperación de contraseña por correo; cambio de contraseña con código por correo; aceptación de términos con versión y fecha.
- Fichas públicas de creador y de partner (se pueden ocultar con `public_profile_enabled`); portada, avatar, bio, nicho, ubicación, categorías, tarifas mínimas/máximas, «qué busco», paquetes (título, descripción, precio, entregables).
- Descubrir (búsqueda y filtros), favoritos, búsquedas guardadas, plantillas de propuesta.
- Chat entre usuarios con ajuste de privacidad (`chat_privacy`: todos / solo con ofertas aceptadas) y ofertas dentro del chat.
- Colaboraciones: solicitud → negociación (contraofertas) → aceptación → entregables → publicaciones → revisión/aprobación de la marca → cierre o cancelación de común acuerdo → terminación por incumplimiento → valoración mutua. Cronología de eventos, archivos adjuntos (bucket privado `collab-files`), expiración de solicitudes.
- Publicaciones y calendario del creador; suscripción a calendario (`.ics`) por enlace secreto; biblioteca de archivos (tope 50).
- Avisos dentro de la app y correo de resumen de avisos con baja por enlace.
- **Reportes de usuarios y panel de administración** (revisión, aviso, bloqueo, anonimización o borrado de cuentas, registro de acciones del equipo). Alta de miembros del equipo por `admin_members`.
- Eliminación de cuenta a petición (inmediata si no hay historial; en solicitud si lo hay) y **descarga de mis datos** (`DataExportCard`, excluye tokens e identificadores de Stripe).
- Sentry opcional (sin DSN no envía nada; configurado con `sendDefaultPii: false`, sin trazas ni replays).

### 2.2 Implementadas pero APAGADAS por variable de entorno [V código / D estado en producción]
| Función | Interruptor | Qué hay construido |
|---|---|---|
| Cobros | `PAYMENTS_ENABLED` | Stripe Checkout para suscripción Pro; pago de colaboración con Stripe Connect y `application_fee_amount` (comisión 10 % fijada en `app/utils/fees.ts`); webhook idempotente; cuenta de cobro del creador (Connect). Con el interruptor apagado los endpoints devuelven 403. |
| Predicción y sugerencias con IA | `PREDICTIONS_ENABLED` | `/api/ml/predict` y `/api/ml/trends` (OpenRouter). Créditos de predicción (`credit_ledger`). UI oculta. |
| Inicio de sesión con Google | `GOOGLE_AUTH_ENABLED` | Botón y flujo; sin proveedor configurado en Supabase [D]. |

### 2.3 Aplazadas, código apartado en `_disabled/` [V]
Conexión OAuth con Instagram y YouTube, sincronización de métricas, almacenamiento cifrado de tokens, endpoints de borrado de datos de Meta. **Hoy no se conectan cuentas de redes ni se leen métricas** (`social_accounts`, `metrics`: 0 filas). El texto legal vigente ya lo afirma («Por ahora CIBERAN no se conecta con tus cuentas de redes sociales»).

### 2.4 Solo planificado [D]
Suscripción **CIBERAN Pro** (la hipótesis de 30 €/mes no consta en el código; el precio vive en Stripe/inline y no lo he podido confirmar [?]), portal de cliente de Stripe, equipos con varios miembros por marca, correo transaccional más allá del resumen, push web, métricas de redes sociales.

---

## 3. Tipos de usuarios y roles

| Perfil | Descripción | Observaciones jurídicas iniciales |
|---|---|---|
| Visitante | Navega landing, fichas públicas, ayuda, términos y privacidad | Almacenamiento técnico y localStorage, sin analítica ni publicidad [V] |
| Creador | Persona (previsiblemente autónomo o consumidor que actúa con fines profesionales: **sin verificar**) | Mayores de edad exigido en términos, pero **no hay verificación de edad** [V] |
| Partner | Marca, empresa o agencia | Puede ser persona jurídica o autónomo; `verified_at` lo pone el equipo |
| Administración | Equipo interno con roles (`admin_members`) | 0 miembros en la tabla hoy; existe además acceso por `ADMIN_PASSWORD` compartido (hay variable para desactivarlo) |

Un usuario tiene **un único rol** (creador o partner) y una ficha 1:1 [V]. No hay cuentas de equipo [V].

---

## 4. Inventario de datos personales (por tabla real)

Estado de la base hoy: 5 perfiles, 3 creadores, 2 partners, 4 colaboraciones, 0 mensajes, 0 suscripciones, 0 cuentas sociales. **Prácticamente no hay usuarios reales todavía.**

| Categoría | Tablas / campos [V] | Quién lo ve | Sensibilidad |
|---|---|---|---|
| Identidad y cuenta | `auth.users` (email, hash de contraseña — en Supabase Auth), `profiles` (nombre, avatar, rol, versión y fecha de términos, fecha de onboarding) | Propio; nombre/avatar visibles a contrapartes | Normal |
| Perfil público | `creators`/`partners` (nombre comercial, nicho, bio, ubicación, web, avatar, portada, categorías, tarifas, «qué busco», audiencia declarada) | Público si `public_profile_enabled` | Normal; **datos publicados por voluntad del usuario** |
| Ofertas comerciales | `packages`, `offers`, `collaboration_offers` (precios, mensajes) | Partes implicadas | Económico, confidencial comercial |
| Colaboraciones | `collaborations` (brief, presupuesto, alcance, exclusividad, derechos de uso, objetivo, público, tono, estados, motivos de cancelación/terminación), `collaboration_events`, `collaboration_log_entries`, `collaboration_deliverables(_decisions)`, `collaboration_ratings` (estrellas y comentario) | Partes; valoraciones visibles según diseño | Contractual; **comentarios libres pueden contener datos de terceros** |
| Archivos | Bucket privado `collab-files` y `collaboration_files`; bucket **público** `post-media` (publicaciones, avatares, portadas, biblioteca) | Privado: partes; público: cualquiera con la URL | Puede contener **imagen/voz de personas** (derechos de imagen) |
| Mensajes | `conversations`, `messages` (texto libre, ofertas) | Participantes | Alto (privacidad de comunicaciones); 0 filas hoy |
| Publicaciones | `posts` (título, caption, hashtags, enlaces de borrador/resultado, fechas, estado, `submitted_at`) | Creador; partner desde primer envío a revisión | Contenido creativo |
| Avisos | `notifications` (+`emailed_at`), `notification_preferences` | Propio | Normal |
| Actividad de uso | `discovery_searches` (consultas, filtros, resultados), `saved_profiles`, `saved_searches` | Solo servicio/administración | **Perfilado de comportamiento** a valorar |
| Calendario | `calendar_feeds` (token secreto por usuario) | Quien tenga el enlace | Token = credencial |
| Pagos (apagado) | `subscriptions` (ids de Stripe, estado), `credit_ledger`, `collaborations.stripe_payment_intent_id`, `paid_at`, `creators.stripe_connect_account_id` | Propio/admin | Financiero; **sin datos de tarjeta en CIBERAN** [V] |
| IA (apagado) | `ml_predictions` (puntuaciones, sugerencias) y envío de título + caption + hashtags a OpenRouter | Propio | 0 filas |
| Redes (aplazado) | `social_accounts` (tokens cifrados), `metrics`, `social_account_snapshots`, `post_external_links` | — | 0 filas |
| Moderación | `reports` (motivo, detalle, nota interna, estado, asignado), `account_deletion_requests`, `admin_audit_log` (acciones del equipo) | Equipo | Alto; incluye imputaciones entre usuarios |
| Equipo interno | `admin_members` (email, nombre, rol, hash de contraseña) | Equipo | Datos de empleados/socios |
| Técnicos | IP en memoria para límite de uso (`rate-limit.ts`, no persiste [V]); registros del servidor y de Supabase [?]; Sentry sin PII | — | IP = dato personal |

**Datos de categoría especial (art. 9 RGPD):** no se solicitan de forma estructurada [V]. Riesgo: campos de texto libre (brief, mensajes, comentarios, reportes) y contenido audiovisual podrían contener datos de salud, ideología, orientación, etc. por iniciativa del usuario [?].

**Menores:** el producto se dirige a mayores de edad pero no hay control técnico; los creadores jóvenes son un público realista [?].

---

## 5. Proveedores y flujo de datos

| Proveedor | Para qué | Datos | Ubicación | Estado |
|---|---|---|---|---|
| **Supabase** (proyecto en eu-west-1, Irlanda [V]) | BD, Auth, Storage, RLS | Todo | UE (Irlanda); matriz del proveedor y soporte pueden implicar transferencias [?] | Activo. Plan **Free**; sin backups descargables/PITR; Pro aplazado [D] |
| **Stripe** | Cobros, suscripciones, Connect | Identificadores, importes, datos de verificación del creador (los recoge Stripe) | EE. UU./UE [?] | Código listo, **apagado**; claves de test [D] |
| **OpenRouter** (modelos de terceros por debajo) | Predicciones y sugerencias | Título interno, caption, hashtags, nicho, temas recientes | EE. UU. [?] y el modelo concreto cambia (catálogo gratuito rotativo) | **Apagado**; el texto legal ya lo cita |
| **Google (Gmail SMTP)** | Correo saliente de la app y de Supabase Auth (`info.ciberan@gmail.com`) | Email y contenido de los avisos y mensajes de autenticación | EE. UU./UE [?] | Activo según docs/16. **No figura en la política de privacidad actual** |
| **Sentry** | Errores | Mensajes de error; sin PII por configuración | UE/EE. UU. según región elegida [?] | Opcional; sin DSN inerte. **No figura en la política** |
| **Google Fonts** (vía `@nuxt/fonts`) | Tipografías | — | — | `@nuxt/fonts` las descarga en la compilación y las sirve desde el propio dominio por defecto; **comprobar en el despliegue que no hay petición a Google** [?] |
| Hosting (Vercel/Netlify/servidor Node) | Servir la app | IP y registros | [?] | **Sin decidir** [D]; la política tiene el hueco `[POR COMPLETAR: dónde se despliega la aplicación]` |
| Meta/Google OAuth | Redes e inicio de sesión | — | — | Apagado/aplazado |
| Dominio/DNS | — | — | — | Sin dominio definitivo [D] |

---

## 6. Pagos, comisiones y facturación

- **Hoy no se mueve dinero por CIBERAN** (lanzamiento gratuito): el importe de una colaboración es una referencia y se paga fuera [V/D].
- Diseño previsto [V código]: el partner paga con Stripe Checkout; el dinero va **directo a la cuenta Connect del creador** y CIBERAN retiene `application_fee_amount` = **10 %** (`MARKETPLACE_FEE_RATE = 0.1`). Esto es un flujo de pago *entre terceros* con comisión de plataforma: su calificación (agente comercial, intermediario de pagos, exención de servicios de pago, qué entidad factura) **es una cuestión abierta de la Fase 2**.
- Facturación: no hay generación de facturas en el código [V]. No está definido quién factura qué (comisión al creador y/o al partner, suscripción, IVA, retenciones) [?].
- Suscripción Pro: Checkout con `price_data` inline; precio y renovación no confirmados [?].
- Reembolsos y contracargos: no hay flujo definido en código [V]; el texto legal tiene el hueco de desistimiento/reembolsos.
- Fiscalidad de plataformas (DAC7): sin ningún tratamiento previsto [V]. Depende de que se confirme que CIBERAN es «plataforma» a efectos de esa norma y de si hay actividad relevante.

---

## 7. Proceso de contratación entre usuarios [V]

1. Solicitud (con brief y presupuesto) o contraoferta, con **caducidad** automática de la solicitud (el servidor fija `expires_at`).
2. Aceptación/rechazo por RPC en servidor; **condiciones inmutables** tras aceptar (trigger).
3. Condiciones pactadas en campos: alcance, nº de revisiones, exclusividad, derechos de uso, objetivo, público, tono, entregables confirmados por el creador.
4. Entregas → revisión → aprobación o cambios (versionado de contenido y aprobación obligatoria antes de programar/publicar).
5. Salidas: completada; cancelada de común acuerdo (propuesta + aceptación); terminada por incumplimiento (con reporte automático al equipo).
6. Valoración mutua.

**No existe un contrato escrito generado** ni aceptación de unas condiciones de colaboración tipo: la «forma» del contrato son los campos y el historial de eventos. **No hay mecanismo de disputa más allá del reporte.**

---

## 8. Tratamientos de datos (lista preliminar para el registro de actividades)

1. Gestión de cuentas y autenticación.
2. Perfiles públicos y descubrimiento (búsqueda, favoritos, búsquedas guardadas).
3. Mensajería y ofertas.
4. Gestión de colaboraciones, entregables, archivos y valoraciones.
5. Avisos in-app y por correo.
6. Calendario por enlace secreto.
7. Moderación, reportes y bloqueos; auditoría de acciones del equipo.
8. Eliminación de cuenta y exportación de datos.
9. Seguridad y prevención de abusos (límites por IP, registros).
10. Analítica interna agregada de la plataforma (panel de administración; `discovery_searches`).
11. Pagos y suscripciones (apagado).
12. Predicciones/sugerencias con IA (apagado).
13. Conexión de redes y métricas (aplazado).

Roles que ya se intuyen: CIBERAN **responsable** (1–10); Supabase, hosting, Google (SMTP), Sentry, Stripe (en parte), OpenRouter como **encargados** o **responsables independientes** (Stripe suele serlo para verificación y cumplimiento); creador y partner **responsables de lo que se envían entre sí** (chat, archivos, comentarios). Sin calificación definitiva hasta la Fase 2.

---

## 9. Estado de la documentación legal existente

Existen `/privacidad` y `/terminos` como **plantilla** con huecos `[POR COMPLETAR]` (titular, NIF, domicilio, email, registro, URL, foro, plazo fiscal, comisión, política de desistimiento, hosting, fecha). **No hay aviso legal, política de cookies, condiciones específicas por rol, política de pagos, de IA, de moderación ni documentación interna.** `TERMS_VERSION = 2026-11-11` y la aceptación se registra por usuario (`terms_version`, `terms_accepted_at`).

### 9.1 Desajustes detectados entre los textos actuales y la realidad (a corregir al redactar)
1. La política cita Stripe y OpenRouter como encargados activos, pero **ambos están apagados**; **omite** a Google (correo) y Sentry, que sí pueden estar activos.
2. La política dice «borramos tus datos personales» al eliminar la cuenta, pero el flujo real **no borra** si hay historial compartido (queda en solicitud; el equipo puede **anonimizar** o borrar) y no hay política de plazos para los datos que se mantienen por historial.
3. «Ejecución del contrato» como base para sugerencias/predicciones de IA y «interés legítimo» para seguridad: bases no analizadas todavía.
4. Los términos hablan de un «plan Pro para creadores» y de comisión como si existieran; hoy no se cobra.
5. Los términos dicen «seguir usando el servicio tras el aviso supone su aceptación»: cláusula a revisar frente a la exigencia de consentimiento y a la normativa de consumidores.
6. Limitación de responsabilidad redactada en términos amplios (sección 10): requiere el análisis de cláusulas abusivas de la Fase 2.
7. «No usamos cookies ni seguimiento de terceros»: cierto en código [V], pero hay que confirmar tras el despliegue (hosting, fuentes, iconos) y documentar el uso de `localStorage`.
8. No se informa del **tratamiento de la IP** (límites de uso) ni de los registros técnicos.
9. No existe `/aviso-legal`, ni banner/preferencias de cookies (puede no hacer falta si solo hay almacenamiento técnico: pendiente de confirmar).

---

## 10. Primeros riesgos y huecos (sin graduar todavía; se prioriza en la Fase 3)

**Estructurales**
- **Titular sin definir** (autónomo / SL / ambos fundadores): sin titular no hay aviso legal ni responsable del tratamiento; condiciona NIF, facturación, contratos con proveedores, propiedad del software y responsabilidad.
- **Un único proyecto de Supabase** para desarrollo, pruebas y producción, plan Free sin copias descargables: relevante para seguridad (art. 32 RGPD), brechas y recuperación.
- Hoy casi no hay datos reales, lo que **reduce el riesgo actual** pero hace que **todo hay que dejarlo cerrado antes de abrir el registro**.

**De cumplimiento técnico**
- Aceptación de términos: se guarda versión y fecha, **no el texto aceptado, ni la IP ni un identificador del cliente** [V].
- Consentimientos separados (comunicaciones, IA, etc.) no existen porque esas funciones están apagadas; habrá que diseñarlos antes de encenderlas.
- Bucket `post-media` **público**: cualquier archivo subido (incluida la biblioteca) es accesible por URL sin sesión [V]; relevante para derechos de imagen y para el borrado efectivo.
- Chat sin cifrado de extremo a extremo (normal) y **sin definir qué puede leer el equipo** y bajo qué supuestos (reportes) [?].
- Retención: sin política escrita de plazos (cuentas inactivas, reportes, `admin_audit_log`, `discovery_searches`, archivos de colaboración).
- Registro de actividades, contratos de encargo y protocolo de brechas: no existen.

**De negocio / regulación (a investigar)**
- Calificación del modelo de pagos con Connect y comisión; servicios de pago, facturación y DAC7.
- Régimen de la relación creador–partner (mandato, encargo, contrato de servicios, cesión de derechos de explotación; consumidor vs. profesional).
- Publicidad y colaboraciones de influencers: obligación de identificar contenido patrocinado (a quién se dirige y si CIBERAN puede facilitarlo).
- DSA: condición de «servicio de alojamiento de datos»/«plataforma en línea»; mecanismo de notificación y acción y puntos de contacto.
- AI Act: obligaciones de transparencia si se enciende la IA; uso de proveedores externos.
- Propiedad intelectual: licencia que se concede a CIBERAN, cesiones entre partes, música/material de terceros, imagen de personas.

**Empresariales (fundadores)**
- Reparto 50/50 sin pacto escrito conocido [D]: desacuerdos, salida, titularidad del código y de la marca, confidencialidad y responsabilidades [?].

---

## 11. Información que NO puedo obtener del repositorio (preguntas, por orden de importancia)

**A. Bloqueantes para redactar documentos definitivos**
1. ¿Quién será el **titular** el día del lanzamiento: autónomo (¿cuál de los dos?) o SL en constitución? Nombre/razón social, NIF/CIF, domicilio, email legal, datos del Registro Mercantil si procede.
2. ¿Qué **hosting** y región se usará? ¿Hay dominio definitivo? (afecta a aviso legal, transferencias y cookies).
3. ¿Se lanzará con **pagos apagados** (referencia de precio solamente) o hay fecha prevista para encenderlos? ¿Y la suscripción Pro y su precio real?
4. ¿Quién **factura** la comisión del 10 % y a quién (creador, partner)? ¿Hay asesoría o gestoría ya contratada?
5. ¿Se mantiene fuera de la app el pago entre partes durante el lanzamiento gratuito? (determina qué decir sobre pagos hoy).

**B. Importantes**
6. ¿El equipo puede leer **mensajes** de usuarios? ¿En qué supuestos (solo con reporte)?
7. ¿Qué proveedor y región usa Sentry, si se activará, y si se va a mantener el correo desde Gmail o se pasará a un proveedor transaccional con dominio propio?
8. ¿Los creadores son principalmente **autónomos/profesionales** o personas físicas sin actividad económica registrada? ¿Se aceptarán menores de 18?
9. ¿Qué **plazo de conservación** esperáis para cuentas inactivas y para registros de reportes? (sugeriré opciones en la Fase 3).
10. ¿Se prevé expansión a otros países de la UE a corto plazo (para el idioma y los consumidores)?

**C. Futuro (no bloquea)**
11. ¿La IA se activará? ¿Con qué proveedor definitivo (hoy un modelo gratuito rotativo)?
12. Cuentas de equipo para marcas; conexión de redes; push.

---

## 12. Propuesta de continuación

- **Fase 2 (investigación jurídica):** verificar en BOE, EUR-Lex, AEPD, Agencia Tributaria y Comisión Europea el texto consolidado y la fecha de aplicación de cada norma de la lista, y traducirlo a obligaciones concretas de CIBERAN (aplica / depende de / no aplica). Empezaría por: RGPD+LOPDGDD, LSSI-CE, consumidores, DSA, pagos y DAC7, publicidad/influencers, AI Act.
- Antes de pasar a redactar (Fase 5) necesito las respuestas **A1–A5**; el resto puede quedar como campos `[POR COMPLETAR]` identificados.
- Los entregables se crearán en `CIBERAN_LEGAL/` con la numeración que propusiste; este archivo hace de 00 provisional hasta que exista el resumen ejecutivo.
