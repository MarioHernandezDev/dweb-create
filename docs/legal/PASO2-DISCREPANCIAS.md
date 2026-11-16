# Paso 2 · Discrepancias entre los textos legales y la app

Preparado para revisión por un abogado. Fecha de referencia: 2026-11-15.
Base: inventario del Paso 1, aprobado. Este documento **no cambia código**: solo lo describe.

Decisiones de lanzamiento que fija este documento:

- Lanzamiento **gratuito**: sin suscripciones, pagos, comisiones ni desistimiento activos.
- **Modo IA de Discover apagado.** Sentry **apagado** (sin DSN en producción). Google login apagado. Métricas de redes aplazadas.
- Titular: **persona física** (sin sociedad ni razón social). Datos pendientes: `[TITULAR_NOMBRE]`, `[TITULAR_DNI]`, `[TITULAR_DOMICILIO]`, `[EMAIL_CONTACTO]`.
- Región de Supabase y hosting: `[DUDA]`.

---

## A. Qué dicen los textos actuales que la app NO hace hoy (sobra o hay que marcar «pendiente de activar»)

| # | Dónde | Qué dice | Realidad hoy | Acción en los textos nuevos |
|---|---|---|---|---|
| A1 | Términos §7 | Plan gratuito y plan de pago (Pro), renovación automática, cancelación | No se cobra nada (`PAYMENTS_ENABLED` apagado) | Quitar. Dejar un apartado «Pagos: pendiente de activar» sin afirmar que hoy se cobra. |
| A2 | Términos §7 | El partner paga a través de la plataforma y se transfiere al creador | Apagado | Igual que A1. |
| A3 | Términos §7 | «Comisión de la plataforma» | No hay comisión | Quitar; mención solo en el apartado pendiente. |
| A4 | Términos §7 | Desistimiento y reembolsos (`[POR COMPLETAR]`) | No hay venta ni contratación | Quitar. Volver a incluir cuando se activen pagos (`[DUDA]` abogado). |
| A5 | Términos §8 y Privacidad §3 | «Predicciones de rendimiento» y sugerencias de IA sobre tu contenido | Predicción apagada (`PREDICTIONS_ENABLED`) | Quitar. |
| A6 | Privacidad §2 | «Pagos: estado e importe de suscripciones y colaboraciones» | No se tratan pagos | Quitar; marcar como pendiente de activar. |
| A7 | Privacidad §3 | Base legal «obligaciones fiscales y contables sobre pagos» | Sin pagos no hay obligación | Quitar; mencionar solo en el apartado pendiente. |
| A8 | Privacidad §4 | Stripe como encargado «de cobros, suscripciones y pagos a creadores» | Sin Stripe activo | Mover a «pendiente de activar». |
| A9 | Privacidad §4 | OpenRouter como proveedor de IA («solo se envía el texto de la consulta») | IA de Discover apagada por decisión. Además la frase era inexacta (ver B1). | Quitar de la lista de proveedores. Mencionar solo como «próximamente» si hace falta. |
| A10 | Privacidad §5 | Datos fiscales conservados por ley durante `[plazo]` | Sin pagos no hay datos fiscales | Quitar; pendiente de activar. |
| A11 | Términos §1 | «Datos registrales», «NIF/CIF», «razón social» | El titular es persona física | Usar DNI y nombre; sin registro mercantil. |
| A12 | Términos §6 | «Por ahora CIBERAN no se conecta con redes sociales» | Cierto | **Mantener.** Redactar como «próximamente». |
| A13 | Términos §3, Privacidad §8 | «Debes ser mayor de edad» | Declarado, **no verificado** (ver B6) | Mantener solo junto con la casilla de edad (cambio de código 1). |
| A14 | Privacidad §5 | «Si la eliminas, borramos tus datos personales» | Solo es cierto sin historial de colaboraciones; con historial hay revisión manual y muchos datos se conservan (ver B3) | Reescribir con lo que de verdad ocurre. |
| A15 | Privacidad §6 | «Responderemos en el plazo legal de un mes» | Cierto para el RGPD; no hay plazo propio para solicitudes de borrado de cuenta | Mantener el mes (art. 12.3 RGPD) y definir plazo operativo (cambio de código 6). |
| A16 | Aviso de borrador (`LegalDocument.vue`) | «Se completan en `app/utils/legal.ts`» | Texto interno, visible al usuario mientras haya huecos | Se retirará al completar los datos. No hace falta cambiarlo ahora. |

Nota sobre la exactitud: la política actual afirma que a OpenRouter «solo se le envía el texto de la consulta». El código enviaba además nombre, bio, categorías y `id` de hasta 16 perfiles de otros usuarios. Al apagar el modo IA se resuelve; mientras no esté apagado, la frase no es veraz.

## B. Qué hace la app que los textos NO mencionan

| # | Qué hace la app | Detalle verificado en el código | Dónde debe aparecer |
|---|---|---|---|
| B1 | **Modo IA de Discover** (`/api/discover/search`, modo `ai`) | **No existe hoy ningún interruptor.** El botón «Con IA» siempre se ve, y la llamada a OpenRouter ocurre cuando existe `OPENROUTER_API_KEY`. Los flags `PREDICTIONS_ENABLED` y `PAYMENTS_ENABLED` no lo afectan. Ver cambio de código 0. | Privacidad (solo «próximamente»). |
| B2 | Registro de las búsquedas (`discovery_searches`) | Se guarda texto de búsqueda, filtros, resumen y recuento por usuario, para analítica de admin. Al borrar la cuenta solo se anula el `profile_id`; **el texto se conserva**. Sin purga. | Privacidad: datos, finalidad (interés legítimo), plazo. |
| B3 | Conservación tras borrar la cuenta | Los mensajes se conservan en la conversación de la otra parte (`sender_id` pasa a null). Denuncias, auditoría de admin y registros de colaboración quedan. Con historial de colaboraciones, la baja es una **solicitud revisada a mano**, y el perfil público se oculta mientras tanto. | Privacidad §conservación. Pregunta al abogado: base legal para conservar. |
| B4 | Archivos subidos | `post-media` (imágenes ≤ 8 MB) es un bucket **público**; `collab-files` (≤ 10 MB) es privado. **No se borran de Storage al borrar la cuenta** (no hay código que lo haga). | Términos (contenido de usuarios), Privacidad (qué es público y plazos). |
| B5 | Perfil público sin sesión | Con `public_profile_enabled` activo, la ficha es visible sin login. `robots.txt` no bloquea nada y la ficha no lleva `noindex`, por lo que puede indexarse. **El valor por defecto es «visible»** (`default true`). Ver cambio de código 7. | Privacidad: qué datos son públicos y cómo ocultarlos. |
| B6 | Sin control de edad | En el alta solo hay una casilla de aceptar términos y política. No hay confirmación de mayoría de edad ni fecha de nacimiento. | Términos y Privacidad (18 años) tras el cambio de código 1. |
| B7 | Aceptación de términos con versión | `terms_version` y `terms_accepted_at` por cuenta; aviso bloqueante al cambiar versión. | Privacidad (dato tratado) y Términos (cómo se comunican los cambios). |
| B8 | Exportación de datos | ZIP de CSV generado en el navegador. **No incluye mensajes recibidos ni archivos subidos.** | Privacidad (derecho de acceso/portabilidad): decir qué incluye y que el resto se pide por email. |
| B9 | Correos de aviso | Resumen de avisos sin leer, con enlace de baja, enviado desde `info.ciberan@gmail.com` (Gmail SMTP). Los correos de registro y recuperación salen por Supabase con el mismo buzón. | Privacidad: encargado (Google) y base legal (ejecución del contrato; el correo de avisos se puede desactivar). |
| B10 | Panel de administración | El equipo ve email, nombre y datos de actividad, y existe un registro de acciones (`admin_audit_log`). | Privacidad: quién accede y con qué fin. |
| B11 | Moderación y denuncias | Existe flujo de denuncias, revisión con nota obligatoria al cerrar y bloqueo de usuarios por el admin. | Términos (normas, qué hacemos con denuncias). Ya cubierto en parte por §10 actual. |
| B12 | Cookie y almacenamiento técnico | Sesión de Supabase, cookie `ciberan-rail-collapsed`, cookie `httpOnly` del admin y tres usos de `localStorage` (aviso de bienvenida, recorrido, migración de búsquedas). | Política de cookies. |
| B13 | Tercero que ve la IP del visitante: **Unsplash** | Las imágenes de la landing y portadas de ejemplo se piden directamente a `images.unsplash.com`. | Política de cookies/Privacidad, **hasta resolver el cambio 3**. |
| B14 | Terceros de infraestructura: **IONOS** (dominio) y DNS/hosting | Ven las peticiones y la IP de los visitantes. | Privacidad §destinatarios (`[DUDA]` hasta elegir). |
| B15 | Límite de uso por IP | La IP se usa solo en memoria para limitar abusos y no se almacena. | Privacidad §datos técnicos. |
| B16 | Valoraciones y comentarios entre usuarios | Se guardan y se muestran a la otra parte. | Términos (contenido de usuario). |
| B17 | Tablas de redes sociales (`social_accounts`, `metrics`) | Sin uso mientras las métricas estén aplazadas. | No mencionar. Revisar que estén vacías antes de desplegar. |

## C. Qué falta y debería haber

| # | Falta | Estado hoy | Nota para la redacción |
|---|---|---|---|
| C1 | **Aviso legal** (art. 10 LSSI) | No existe | Hay que crearlo, y añadir el enlace al pie. Titular persona física: nombre, DNI, domicilio y email. |
| C2 | **Política de cookies** | Solo 3 líneas en Privacidad | Redactar documento propio. Con lo inventariado, solo cookies técnicas (ver D1). |
| C3 | CIBERAN como plataforma, no parte de los acuerdos | Hay una frase en Términos §2 | Ampliar con lenguaje claro. |
| C4 | Responsabilidad sobre el contenido de usuarios | Parcial en §10 | Añadir cómo notificar contenido ilícito (art. 16 DSA; requiere cambio de código 4). |
| C5 | Propiedad intelectual y licencia | Parcial en §5 | Ampliar: licencia limitada, derechos de la colaboración entre las partes. |
| C6 | Normas de conducta | §4 | Mantener, concretar. |
| C7 | Edad mínima 18 | Sin control | Ver cambio de código 1. |
| C8 | Derechos RGPD y cómo ejercerlos | Parcial en §6 | Listar los seis derechos, el email y el plazo, e indicar qué pueden hacer solos (exportar, borrar) y qué piden por email. |
| C9 | Encargados de tratamiento | Parcial | Supabase, Google (SMTP), hosting, IONOS. Faltan los contratos y la región (`[DUDA]`). |
| C10 | Transferencias internacionales | Frase genérica | Google (EE. UU.) casi seguro. Supabase y hosting según región. Base: cláusulas tipo / Marco de Privacidad UE-EE. UU. (`[DUDA]` abogado). |
| C11 | Plazos de conservación | Solo «mientras mantengas la cuenta» | Definir (ver cambio de código 5). |
| C12 | Estado de Stripe «pendiente de activar» | Mezclado con el texto vigente | Apartado separado que no afirme cobros y que obligue a actualizar términos antes de activar. |
| C13 | Registro de actividades de tratamiento (art. 30 RGPD) | No existe | Interno, no público. Recomendar al abogado. |
| C14 | Procedimiento ante brecha de seguridad | No existe | Interno (art. 33-34 RGPD). Recomendar al abogado. |
| C15 | Delegado de protección de datos / evaluación de impacto | No existe | Casi seguro no obligatorio a esta escala (`[DUDA]` abogado). |
| C16 | Cómo se comunican cambios en los términos | §12 actual | Reescribir; hoy «seguir usando el servicio supone aceptación» es débil frente a consumidores. |

## D. Cookies: ¿hace falta banner?

**D1. Conclusión provisional: no, mientras solo haya cookies técnicas.**
Sesión de Supabase y sesión de admin son estrictamente necesarias. Las tres claves de `localStorage` son de funcionamiento o de interfaz. No hay analítica, publicidad ni Sentry en el navegador (apagado).

Dos puntos para el abogado:
- **`ciberan-rail-collapsed`** es una preferencia de interfaz. La AEPD la admite como técnica si es de personalización básica elegida por el usuario. Conviene confirmarlo.
- **Unsplash** no es una cookie, pero envía la IP del visitante a un tercero. Con el cambio de código 3 deja de ser un problema.

Si se activa Sentry en el navegador, analítica o Google login, hay que revisar esta conclusión.

---

## E. Cambios de código necesarios antes de desplegar (por prioridad)

Esta lista sigue el orden pedido. He añadido **0** porque afecta a la veracidad de los textos. **No se ha tocado nada.**

### 0. (Añadido) Interruptor para el modo IA de Discover
- **Problema:** hoy no existe el «flag desactivado por defecto» que se esperaba. El botón «Con IA» ([DiscoverBrowser.vue:191](../../app/components/discover/DiscoverBrowser.vue#L191)) siempre se ve, y [search.post.ts:420-422](../../server/api/discover/search.post.ts#L420-L422) llama a OpenRouter cuando existe `OPENROUTER_API_KEY`.
- **Mitigación sin código:** no definir `OPENROUTER_API_KEY` en producción. Con eso el servidor no llama a OpenRouter, pero el botón sigue visible y no hace nada útil.
- **Propuesta:** un flag público tipo `DISCOVER_AI_ENABLED`, igual que `predictionsEnabled`. Oculta el botón y hace que el endpoint no llame al proveedor.
- **Prioridad:** alta. Sin esto, los textos no pueden afirmar que la IA está apagada.

### 1. Casilla de mayoría de edad en el registro
- **Qué:** casilla obligatoria «Declaro tener 18 años o más» en [onboarding.vue](../../app/pages/onboarding.vue), y guardarla junto con `terms_version` en los metadatos del alta.
- **Por qué:** los Términos exigen 18 años y la app no lo recoge.
- **Preguntas para ti o el abogado:** ¿basta una declaración? ¿Qué se hace con las cuentas ya creadas? (Pueden aceptarlo en el aviso `TermsGate` subiendo `TERMS_VERSION`.)

### 2. Borrar archivos de Storage al borrar la cuenta
- **Qué:** al borrar una cuenta (directamente o desde el panel de admin), eliminar sus objetos de `post-media` y `collab-files`.
- **Detalle:** [account-deletion.ts](../../server/utils/account-deletion.ts) y [admin-account-removal.ts](../../server/utils/admin-account-removal.ts) solo borran filas, no objetos de Storage.
- **Pregunta:** los archivos de colaboraciones que comparte la otra parte, ¿se borran o se conservan? (`[DUDA]` abogado).
- **Cuidado:** hay una sola base compartida. Ensayar con cuentas de prueba, nunca con datos reales.

### 3. Servir las imágenes de Unsplash desde nuestro dominio o sustituirlas
- **Qué:** descargar las imágenes de la landing y las portadas de ejemplo ([images.ts](../../app/utils/images.ts), [LandingBento.vue](../../app/components/landing/LandingBento.vue), [CoverImage.vue](../../app/components/ui/CoverImage.vue)) y servirlas desde `/public` con el optimizador propio.
- **Licencia:** la licencia de Unsplash permite el uso, pero hay que conservar los créditos que ya existen.
- **Resultado:** ningún tercero ve la IP del visitante por las imágenes.

### 4. Botón de denunciar perfil/contenido fuera de colaboraciones + email de contacto legal
- **Problema:** hoy `reports` exige una colaboración, por la política de acceso. No se puede denunciar un perfil, un mensaje o un contenido fuera de ella.
- **Qué:** un canal para denunciar perfiles y contenido, con revisión en el panel de admin. Como mínimo, un enlace «Denunciar» en las fichas públicas y un email de contacto legal visible en el aviso legal y el pie.
- **Nota:** requiere migración no destructiva con bloque ROLLBACK, por la regla de la base compartida.
- **Pregunta:** ¿email de contacto legal distinto de `info.ciberan@gmail.com`? (`[EMAIL_CONTACTO]`).

### 5. Plazos de conservación y purga
Propuestas para decidir (los números son tuyos o del abogado; **no los he aplicado en los textos**):

| Dato | Hoy | Propuesta a decidir |
|---|---|---|
| `discovery_searches` (filas) | Sin plazo | 12 meses (propuesta); el texto se resuelve en el cambio 5b |
| `notifications` | Sin plazo | `[DUDA]` |
| `reports` | Sin plazo | `[DUDA]` |
| `admin_audit_log` | Sin plazo | `[DUDA]` |
| Mensajes de cuentas borradas | Se conservan | `[DUDA]` |
| `account_deletion_requests` | Sin plazo | `[DUDA]` |

- **Mecanismo:** `pg_cron` ya existe en el proyecto (`send-due-reminders`).
- **Cuidado:** purgas no destructivas de datos reales sin tu permiso expreso.

### 5b. (Añadido en la revisión) Registro de búsquedas: reconciliar con el borrado inmediato
- **Contradicción detectada:** la privacidad dice que sin colaboraciones la cuenta «se borra de inmediato», pero `discovery_searches.profile_id` es `on delete set null`: la fila sobrevive con el **texto** de la búsqueda, que puede contener datos personales (nombres, presupuestos, frases libres).
- **Opción A (recomendada): dejar de guardar el texto.** Guardar solo filtros (categorías, presupuesto), modo y número de resultados. En [search.post.ts:459](../../server/api/discover/search.post.ts#L459) basta con no insertar `query_text`; la columna es nullable, así que no hace falta migración.
- **Opción B: borrar las filas al eliminar la cuenta.** Hay que borrarlas antes de `deleteUser` en dos sitios (borrado directo y borrado desde el panel de admin), porque el `set null` ya habría desvinculado las filas. Más puntos de fallo y más código.
- **Por qué recomiendo A:**
  1. Minimización (art. 5.1.c RGPD): el texto solo sirve para la lista de «últimas búsquedas» del panel de admin ([admin/index.vue:247](../../app/pages/admin/index.vue#L247)); los filtros y el recuento bastan para las estadísticas.
  2. El texto libre solo existe en la búsqueda con IA ([DiscoverBrowser.vue:202](../../app/components/discover/DiscoverBrowser.vue#L202)), que estará apagada (cambio 0). Perder ese dato cuesta casi nada.
  3. Elimina la contradicción de raíz, sin purgas ni borrado en cascada.
- **Coste:** el panel de admin dejaría de mostrar las búsquedas recientes con texto; habría que quitar ese bloque o dejarlo vacío.
- **Datos ya guardados:** las filas de prueba existentes con texto habría que vaciarlas (`update ... set query_text = null`). Es una modificación de datos de la base compartida: **solo con tu permiso expreso**.

### 6. Plazo definido de respuesta a solicitudes de borrado
- **Problema:** las solicitudes de baja con historial quedan pendientes de revisión manual, sin plazo ni aviso.
- **Qué:** fijar un plazo interno (máximo legal: un mes, art. 12.3 RGPD) y avisar a la persona cuando se resuelve o se rechaza. Hay alertas de admin por correo, pero hay que comprobar que cubren estas solicitudes.
- **Pregunta:** qué se conserva y con qué base cuando se acepta la baja (`[DUDA]` abogado).

### 7. (Añadido en el Paso 3) Perfiles públicos: no indexar por defecto
- **Situación verificada:** `profiles.public_profile_enabled` tiene `default true`, así que **todas las cuentas tienen ficha pública salvo que la desactiven**. La página `/profile/[role]/[id]` no envía `noindex`, añade `description` y Open Graph, y [robots.txt](../../public/robots.txt) permite todo. Resultado: las fichas (nombre, foto, portada, bio, ubicación, web, categorías, valoración media) pueden aparecer en buscadores. El interruptor está en [PublicProfileToggle.vue](../../app/components/profile/PublicProfileToggle.vue).
- **Opción A (recomendada): `noindex` por defecto.** Añadir `noindex, nofollow` a la ficha vista sin sesión (`<meta name="robots">` y cabecera `X-Robots-Tag`). El enlace compartible y las vistas previas al compartir siguen funcionando, no requiere migración y es reversible. Además, un texto breve junto al interruptor que diga que cualquiera con el enlace puede ver la ficha.
- **Opción B: solo texto junto al interruptor** explicando que puede aparecer en buscadores. Es más barato, pero deja la exposición activada por defecto y con indexación abierta; encaja peor con la protección de datos desde el diseño (art. 25 RGPD).
- **Recomendación:** A, y añadir el texto de B (son dos líneas) para que el usuario sepa qué significa el interruptor.
- **Pregunta de fondo para el abogado:** que la ficha sea pública **por defecto** (opt-out) cuando se crea la cuenta, ¿es aceptable o debería ser opt-in? Cambiar el valor por defecto exige migración no destructiva con ROLLBACK, y no afecta a las cuentas ya existentes sin una decisión expresa.
- **Nota:** al no estar desplegada la app, no hay páginas ya indexadas que retirar.

### Otras tareas menores (no pedidas, solo anotadas)
- **Enlaces al pie:** el pie de la landing ([LandingFooter.vue](../../app/components/landing/LandingFooter.vue)) solo enlaza Privacidad y Términos. Habrá que añadir Aviso legal y Cookies.
- **Rutas públicas:** `nuxt.config.ts` solo exime `/privacidad` y `/terminos` del login. Aviso legal y Cookies deben ser públicas también.
- **Navegación entre documentos:** [LegalDocument.vue](../../app/components/legal/LegalDocument.vue) solo enlaza dos documentos.
- **Exportación:** valorar incluir los mensajes recibidos y los archivos (B8), o documentar que se piden por email.
- **Tablas de redes:** comprobar que `social_accounts` y `metrics` están vacías antes de desplegar (B17).
- **Datos del titular:** completar [legal.ts](../../app/utils/legal.ts) y subir `TERMS_VERSION` al publicar los nuevos textos, para que todos los usuarios los acepten de nuevo.

---

## F. Dudas abiertas hasta ahora (se agruparán en «Preguntas para el abogado» en el Paso 3)

1. Región de Supabase y proveedor de hosting `[DUDA]`.
2. Acuerdo de encargado de tratamiento y transferencias con Supabase, Google (SMTP), hosting e IONOS `[DUDA]`.
3. Base legal y plazo para conservar mensajes, denuncias y auditoría tras la baja.
4. Titular persona física frente a sociedad: responsabilidad personal.
5. Edad mínima: declaración suficiente o verificación reforzada.
6. Responsabilidad por el contenido y los acuerdos entre marcas y creadores.
7. Cookie `ciberan-rail-collapsed` como técnica.
8. Qué deben contener los textos cuando se activen los pagos (desistimiento, condiciones de Stripe Connect, facturación).
9. Obligaciones del titular como prestador intermediario (DSA/LSSI) para notificación y retirada de contenido.
