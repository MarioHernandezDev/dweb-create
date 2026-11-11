# CIBERAN · Hoja de ruta técnica y de producto

*Versión 2 (2026-11-06). Centrada en la app: funcionalidades, calidad técnica y pulido de lo que ya existe. **Dinero y métricas de negocio quedan para la fase final** (§11). Decisión tomada: **no se retiene dinero** (nada de escrow ni monedero): el pago sigue siendo directo de la marca al creador por Stripe.*

Esfuerzo: **S** = días · **M** = 1–2 semanas · **L** = 3–5 semanas (una persona con Claude). Son estimaciones para ordenar, no compromisos.

---

## 0. Punto de partida (qué hay y qué falta, técnicamente)

**Hecho y sólido:** flujo de colaboración con estados y cronología · entregables como datos con versión y guarda de aprobación · negociación por chat · Descubrir con filtros, orden y búsquedas guardadas · perfil público rediseñado con estadísticas por red, audiencia declarada y contenido destacado · Studio (tablero, calendario, lista) · colaboraciones en tablero/lista/calendario · señales de marketplace (verificada, tipos de colaboración, caducidad) · seguridad por columnas (RLS) · rendimiento razonable.

**Lo que falta, agrupado:**

| Área | Hueco principal |
|---|---|
| Fiabilidad | Todo corre contra una única base compartida; sin staging, sin CI, sin monitorización de errores, sin copias probadas |
| Comunicación | Los avisos son solo dentro de la app; no hay email ni push; no hay tareas programadas |
| Colaboración | No hay archivos adjuntos, ni documento del acuerdo, ni cancelación pactada, ni recordatorios de plazo |
| Descubrir/perfiles | Las búsquedas guardadas viven en el navegador; sin listas de favoritos con notas; sin tarifario por formato; sin disponibilidad; perfiles solo visibles con sesión |
| Studio | No se puede reprogramar arrastrando en calendario; sin plantillas ni biblioteca de archivos |
| Cuenta | Sin 2FA, sin inicio con Google, sin lista de sesiones, sin exportar mis datos |
| Escala de uso | Una persona por cuenta; solo relaciones 1↔1 |
| Integraciones | Solo Instagram y YouTube con OAuth; TikTok sin integración |

**Principio de orden:** primero lo que protege lo ya hecho (fiabilidad), luego lo que hace que la gente vuelva (avisos), luego lo que profundiza el flujo central (colaboración), luego lo que lo amplía (descubrir, equipos, integraciones).

---

## Fase 1 · Cimientos técnicos (1–2 semanas) — *sin esto, todo lo demás es frágil*

### 1.1 Subir lo pendiente sin romper nada · S
- **Estado:** ~6 commits locales sin push y **5 migraciones preparadas sin aplicar** en la base compartida: `20261105100000`, `110000`, `120000` (Fase 2 de colaboraciones), `130000` (señales del marketplace), `140000` (datos del perfil público).
- **Orden obligatorio:** migraciones **antes** que el código (el código nuevo lee columnas nuevas: al revés rompe Descubrir y los perfiles). Huella del esquema antes y después de cada una; lecturas de comprobación; después push.
- **Hecho cuando:** `main` = producción y un recorrido registro → propuesta → aceptación → entregable → aprobación funciona sobre la base compartida.
- **Necesita de ti:** la ventana y confirmar que Mario no empuja a `main` a la vez.

### 1.2 Entorno de pruebas (staging) · M
- Segundo proyecto de Supabase (o local con semillas) y variables separadas. Las migraciones se prueban **siempre** primero allí. Hoy una prueba de integración mal escrita ensucia datos reales.
- **Hecho cuando:** `staging` tiene datos de demo reproducibles (script de semilla) y producción deja de usarse para probar.

### 1.3 Integración continua · S
- En cada PR: `vue-tsc`, pruebas unitarias, pruebas de integración contra Supabase local en contenedor. Merge bloqueado si falla.
- Regla automática: **toda migración nueva debe traer su bloque `ROLLBACK`**.

### 1.4 Monitorización de errores · S
- Sentry (o similar) en cliente y servidor. Aviso a un canal que mires cuando salte un error nuevo. Chequeo de disponibilidad externo a la home.
- **Hecho cuando:** provocas un error a propósito y te llega en menos de 2 minutos.

### 1.5 Copias de seguridad probadas · S
- Copias diarias (PITR si el plan lo permite) y **una restauración de prueba** documentada en 10 líneas en el repo.

### 1.6 Endurecimiento de seguridad · M
- Límite de tasa (ya existe `enforceRateLimit` en Descubrir): extenderlo a registro, chat, envío de propuestas y subidas.
- Subidas de archivos: validar tipo, tamaño y extensión **en el servidor**.
- Revisar cada endpoint con *service role*: que compruebe quién llama (hay un patrón, falta un chequeo sistemático).
- Ampliar las pruebas de RLS a todas las tablas con datos de usuarios (hoy cubren las de las últimas fases).
- Rotar las contraseñas de las cuentas demo y asegurar que no existen en producción.

### 1.7 Calidad transversal · M
- **Navegadores:** Safari y Firefox (solo se ha validado en Chrome). Especial atención a: deslizadores de doble punta, `select` personalizados, `backdrop-filter`, descargas de CSV.
- **Accesibilidad:** pasada con teclado y lector de pantalla en los flujos clave (diálogo de proponer, tablero, filtros, perfil). Contraste de los chips de fase.
- **Rendimiento pendiente:** sustituir `vuedraggable` por Sortable directo (~170 KB menos, sin el compilador de plantillas en producción); medir contra la base compartida real, no solo la simulada; revisar peso de imágenes en producción.
- **Estados vacíos, de carga y de error:** unificar (hoy cada pantalla tiene los suyos con estilos distintos).

---

## Fase 2 · Que la app avise y recuerde (2–3 semanas)

### 2.1 Tareas programadas (cron) · S–M — *prerrequisito de lo demás de esta fase*
- Hoy no hay ninguna. Necesarias para: recordatorios, aviso de propuesta a punto de caducar, aprobación tácita (ver 3.4), fin del plazo de uso del contenido, créditos mensuales del plan Pro, limpieza de datos temporales.
- **Cómo:** Supabase Cron / funciones programadas, idempotentes (cada ejecución se puede repetir sin duplicar avisos) y con registro de ejecución.

### 2.2 Email transaccional · M
- Servicio (Resend/Postmark) + plantillas con la identidad de marca. Eventos: nueva propuesta, respuesta, propuesta a 24 h de caducar, entregable enviado a revisión, cambios pedidos, aprobación, valoración pendiente, mensaje nuevo si llevas > 1 h sin conectarte.
- **Fuente natural:** el motor de «Qué me toca» ya sabe qué toca a quién; el resumen semanal sale de ahí («Tienes 2 cosas pendientes»).
- **Hecho cuando:** una propuesta genera un email en < 1 minuto con enlace directo a la colaboración.

### 2.3 Preferencias de notificación · S–M
- Pantalla en Tu perfil → Privacidad: qué recibir y por qué canal (email / push / solo en la app), resumen diario o semanal, horas de silencio. Respeto obligatorio en todos los envíos.

### 2.4 Push web (PWA) · M
- Ya hay una página de instalación. Añadir *service worker*, suscripción push y los mismos eventos que el email. iOS solo admite push en PWA instalada: explicarlo en la pantalla de instalación.

### 2.5 Bandeja de notificaciones mejorada · S
- Agrupar (ya hay `notifications-group`), marcar todo como leído, filtros (colaboraciones / chat / sistema) y enlace profundo a la pieza exacta.

---

## Fase 3 · Colaboración más sólida (3–4 semanas)

### 3.1 Archivos de la colaboración · M — *la pestaña «Archivos» del mockup*
- Adjuntos del brief (guías de marca, material de producto) y de cada entregable, con versiones, vista previa y límites. Almacenamiento en bucket privado con acceso solo para las dos partes (políticas por colaboración).
- **Reutiliza:** el patrón de `post-media`; la cronología registra «archivo añadido».

### 3.2 Documento del acuerdo · S–M
- Una página/PDF de **«Resumen del acuerdo»** generada con lo pactado (entregables, plazos, uso del contenido, revisiones, exclusividad, fecha de aceptación), con versión y huella de contenido. Es un resumen informativo de lo acordado en la plataforma, no un contrato legal firmado.
- Útil para ambas partes y base si algún día hay disputa.

### 3.3 Reglas de revisiones y plazos · M
- **Revisiones incluidas** (`revisions_included` ya existe): contador visible (2 de 3 usadas) y aviso al superarlas; pedir más requiere conformidad de la otra parte.
- **Plazos:** cada entregable con fecha y recordatorios automáticos (2.1) a creador y marca; atraso visible en la fase.
- **Cambio de fecha pactado:** el creador propone una nueva fecha, la marca acepta; queda en la cronología.

### 3.4 Aprobación tácita y reapertura · S–M
- Si la marca no responde a una revisión en N días hábiles, el entregable pasa a aprobado tácitamente (regla visible desde el primer día, avisos previos). Hoy existe «aceptar sin aprobación» manual con motivo: esto lo automatiza sin retener nada.
- Reapertura con motivo (ya existe para completadas): documentar los límites.

### 3.5 Cancelación y cierre pactado · M
- Hoy una colaboración aceptada solo termina completándose. Añadir **«Cancelar de común acuerdo»** (una parte propone, la otra acepta, con motivo) y **«Dar por terminada por incumplimiento»** (con motivo y aviso al admin). Estados y cronología nuevos, sin tocar pagos.

### 3.6 Conversación contextual · M
- Chat embebido dentro del detalle de colaboración (mockup), con los mensajes de esa colaboración arriba y atajo para citar un entregable. Respuestas rápidas («Acepto», «Propongo otra fecha»).
- Adjuntos en el chat, estados de lectura visibles, búsqueda dentro de la conversación.

### 3.7 Título propio y plantillas de colaboración · S–M
- Campo **título** al proponer (hoy se deduce del brief). **Plantillas** de propuesta guardadas por el creador y por la marca («Pack 3 reels», «Reseña de producto») que rellenan entregables y condiciones.

### 3.8 Calendario conectable · S–M
- Exportar entregables y plazos como **feed ICS** suscribible (Google/Apple Calendar), por usuario y con token revocable. Después, sincronización bidireccional con Google Calendar (Fase 8).

### 3.9 Comentarios sobre el entregable · M
- Hilo por entregable con comentarios anclados («en el segundo 0:12», «en la imagen 3»). Sustituye a las notas de revisión sueltas y mejora mucho la claridad de los cambios pedidos.

---

## Fase 4 · Descubrir y perfiles más inteligentes (3–4 semanas)

### 4.1 Búsquedas guardadas en servidor y alertas · M
- Pasar de `localStorage` a tabla propia (con RLS) para que sobrevivan al cambio de dispositivo; alerta («hay 2 perfiles nuevos que encajan») por email/push usando la Fase 2.

### 4.2 Listas y notas privadas · M
- «Guardados» pasa a **listas con nombre** (p. ej. «Campaña otoño», «Para el verano») con **notas privadas** por perfil, etiquetas y orden. Compartir una lista con un compañero de equipo cuando exista 7.1.

### 4.3 Tarifario del creador (precio por formato) · M — *muy valioso y barato*
- El creador declara precio por formato: reel, post, story, vídeo largo, paquete mensual (+ moneda y plazo de entrega habitual). Se muestra en su perfil y **precarga** el diálogo de «Proponer» (entregables × precio), se puede filtrar en Descubrir y alimenta el rango de presupuesto.
- Datos y edición en la ficha (como la audiencia), con validación y permisos por columna.

### 4.4 Disponibilidad · S–M
- Estado «Disponible / Con agenda llena / No acepto encargos» y fecha de próxima disponibilidad. Visible en la tarjeta y filtrable; evita propuestas que no se van a atender.

### 4.5 Ranking explicable · M
- Hoy sin filtro de categoría todas puntúan 50 %. Cálculo simple y transparente: categorías, rango de precio, ubicación, tasa y rapidez de respuesta, ficha completa, actividad reciente, valoraciones. Cada tarjeta explica **«Encaja porque…»**. La IA queda como reordenación opcional encima de una base determinista.

### 4.6 Filtros nuevos · S
- **Ubicación** (el dato ya existe), idioma, disponibilidad, tarifa por formato, verificada ya existe. Persistencia de filtros en la URL (compartir una búsqueda por enlace).

### 4.7 Perfiles públicos indexables (SEO) · M–L
- Vista pública opt-in (`/c/<alias>`, `/m/<alias>`) con SSR, meta/OpenGraph generados, `schema.org`, `sitemap.xml` y páginas de categoría y ciudad. El contacto sigue exigiendo registro. Interruptor «visible en buscadores» y retirada inmediata al desactivarlo.

### 4.8 Media kit en PDF · S–M
- Generado desde la ficha, estadísticas, tarifario y contenido destacado. Los creadores lo hacen a mano hoy: razón fuerte de uso y de compartición.

### 4.9 Comparador de perfiles · S–M
- Seleccionar 2–4 perfiles de una lista y verlos lado a lado (tarifas, métricas, respuesta, categorías).

### 4.10 Perfil de marca más rico · S–M
- Guía de marca (qué sí / qué no, tono, hashtags obligatorios, enlaces) que se adjunta automáticamente al brief; campañas anteriores; testimonios (comentarios de las valoraciones, hoy solo se muestra la media).

---

## Fase 5 · Studio y productividad (2–3 semanas)

### 5.1 Calendario del Studio interactivo · M
- **Arrastrar para reprogramar** en el calendario y en «Esta semana»; vista semanal además de mensual; filtros ya compartidos con el tablero.

### 5.2 Plantillas y reutilización · M
- Plantillas de publicación (estructura, hashtags, checklist), duplicar publicación, publicaciones recurrentes, checklist por plantilla.

### 5.3 Biblioteca de archivos · M
- Almacén de medios del creador (imágenes, vídeos, borradores) con carpetas y etiquetas, reutilizable en publicaciones y en entregables.

### 5.4 Búsqueda global y atajos · M
- Paleta **Cmd/Ctrl+K**: buscar colaboraciones, publicaciones, chats, perfiles y acciones («Nueva publicación», «Ir a Colaboraciones»). Atajos de teclado documentados.

### 5.5 Deshacer y guardado seguro · S–M
- «Deshacer» (toast) para borrar, mover de fase y archivar; autoguardado de borradores en formularios largos (ficha, propuesta, publicación) para no perder trabajo.

### 5.6 Asistencia de IA útil y acotada · M
- Sugerencias de pie de foto, hashtags y mejor hora (con **datos propios** del creador cuando haya métricas), reescritura de propuesta. Siempre con créditos por plan y caché; la base debe funcionar sin IA.

---

## Fase 6 · Cuenta y seguridad del usuario (2 semanas)

- **6.1 Inicio de sesión con Google** (y Apple si se hace app) · S–M
- **6.2 Verificación de correo y recuperación de cuenta** revisadas de punta a punta · S
- **6.3 Autenticación en dos pasos (TOTP)** opcional; obligatoria para admins · M
- **6.4 Sesiones activas:** lista de dispositivos, cerrar sesión remota · S–M
- **6.5 Exportar mis datos** (ZIP con ficha, colaboraciones, mensajes) y **borrado verificado** que cubra las tablas nuevas · M
- **6.6 Consentimientos y cookies:** gestor de consentimiento y registro de aceptación de términos con versión · S

---

## Fase 7 · Equipos y campañas con varios creadores (4–6 semanas)

### 7.1 Cuentas de equipo · L
- Varios usuarios por cuenta de marca (y de agencia) con **roles** (administrador / gestor de campañas / solo lectura), invitaciones, historial de quién hizo qué, «responsable» por colaboración y por publicación (el mockup de Publicaciones ya lo prevé).
- **Es un cambio de modelo de permisos** (hoy `partners.profile_id` es 1:1): requiere propuesta técnica propia, tabla de miembros y revisión completa de RLS. No empezarlo sin esa propuesta.

### 7.2 Campañas con aplicaciones · L
- La marca publica un **encargo** (brief, presupuesto por pieza, plazo, nº de creadores). Los creadores **aplican**; la marca compara, preselecciona y convierte cada selección en una colaboración normal. Reutiliza `ProposalDialog`, colaboraciones y entregables.
- Pantallas: crear encargo, escaparate de encargos para creadores (con filtros y alertas 4.1), panel de aplicaciones.

### 7.3 Managers y agencias de talento · M
- Un manager gestiona varios creadores (propuestas en su nombre, calendario conjunto). Depende de 7.1.

---

## Fase 8 · Integraciones (continuo, con esperas externas)

- **8.1 TikTok:** solicitar acceso a la API **ya** (tarda semanas), aunque se integre después. OAuth, seguidores y métricas, enlace de publicaciones.
- **8.2 Revisión de la app de Meta** para producción de Instagram: confirmar estado; es un bloqueo externo.
- **8.3 Google Calendar** bidireccional (continuación de 3.8) · M
- **8.4 Publicación programada** directa en redes desde el Studio (Instagram Graph / YouTube) · L — valorar si merece la pena frente a mantenimiento.
- **8.5 Webhooks y API pública de lectura** para marcas con su propio CRM · M, solo con demanda.
- **8.6 Notificaciones en Slack/Teams** para equipos de marca (tras 7.1) · S.

---

## Fase 9 · Herramientas de administración y operación (2–3 semanas, puede ir en paralelo)

- **Cola de moderación:** reportes, cuentas marcadas, contenidos denunciados, con estado, responsable y plazo.
- **Registro de auditoría** de acciones de admin (quién verificó/bloqueó/regaló Pro y cuándo).
- **Ver como usuario** en modo solo lectura para diagnosticar problemas de soporte (con registro).
- **Buscador de usuarios** y ficha de usuario con su actividad.
- **Banderas de funcionalidad (feature flags)** para activar cosas por cuenta o por porcentaje sin desplegar.
- **Avisos del sistema** (banner de mantenimiento, novedades) y **modo mantenimiento**.
- **Detección básica de abuso:** cuentas con muchas propuestas sin respuesta, mensajes con enlaces o teléfonos al primer contacto (aviso amable de no sacar la conversación de la plataforma).

---

## Fase 10 · Preparar la escala (continuo)

- **Textos traducibles (i18n):** hoy el castellano está embebido en componentes. Sacarlo a ficheros de idioma *antes* de crecer, porque cuanto más código, más caro. Primero castellano, después inglés/portugués.
- **Paginación y límites** en todas las listas (hay topes de 300 en algunas); índices revisados con volúmenes grandes.
- **Pruebas de extremo a extremo** (Playwright) de los 5 recorridos críticos, ejecutadas en CI contra staging.
- **Documentación técnica viva:** mapa de tablas y permisos, guía de migraciones, guía del sistema de diseño «Señal», plan de continuidad si caen Stripe, Supabase o el proveedor de IA.
- **Tema oscuro** y preferencias de movimiento reducido (parte ya soportada), solo si hay petición.

---

## Secuencia recomendada

```
Semanas  1-2    Fase 1  Cimientos: subir y aplicar migraciones · staging · CI · Sentry · copias · seguridad · navegadores/accesibilidad
Semanas  2-5    Fase 2  Cron · email · preferencias · push
Semanas  4-8    Fase 3  Archivos · acuerdo · revisiones/plazos · cancelación · chat embebido · plantillas · ICS
Semanas  7-11   Fase 4  Alertas · listas · tarifario · disponibilidad · ranking explicable · SEO · media kit
Semanas  9-12   Fase 5  Calendario interactivo · plantillas · biblioteca · búsqueda global
Semanas 11-13   Fase 6  Google · 2FA · sesiones · exportar datos
Semanas 13-20   Fase 7  Equipos y campañas con aplicaciones (con propuesta técnica propia)
Continuo        Fase 8  Integraciones según esperas externas · Fase 9 administración · Fase 10 escala
```
**Dependencias duras:** 1.2 (staging) antes de cualquier migración grande · 2.1 (cron) antes de recordatorios, aprobación tácita y alertas · 2.2 (email) antes de 4.1 · 7.1 (equipos) antes de 7.3 y 8.6.

**Mejor relación valor/esfuerzo** (si hay que recortar): 1.1–1.4, 2.1–2.2, 3.1, 3.3, 3.4, 4.1, 4.3, 4.4, 4.5, 5.1, 6.3.

---

## Riesgos técnicos y cómo los reduzco

| Riesgo | Mitigación |
|---|---|
| Migración que rompe producción | Staging primero, rollback documentado en cada una, huella de esquema antes/después, código tolerante a columnas ausentes cuando sea barato |
| Cambio de modelo de permisos (equipos) | Propuesta técnica aparte, pruebas de RLS por rol, despliegue por fases con bandera |
| Dependencias externas lentas (Meta, TikTok) | Pedirlas ya; el producto funciona sin ellas con datos declarados y rotulados como tales |
| Costes de IA descontrolados | Créditos por plan, caché, modelo barato por defecto, funciones útiles sin IA |
| Deuda por ir rápido | CI obligatorio, pruebas de integración en cada flujo, `CHANGELOG` con lo hecho y lo no hecho |
| Notificaciones molestas (spam) | Preferencias desde el día 1, agrupación, horas de silencio |
| Privacidad al hacer perfiles públicos | Opt-in, retirada inmediata, el contacto exige registro, revisión RGPD |

---

## Decisiones que necesito de ti

1. **Fecha para aplicar las 5 migraciones y hacer push** (1.1) y coordinación con Mario.
2. **Herramientas externas:** Sentry, email transaccional (Resend/Postmark), segundo proyecto de Supabase para staging (≈ 50–120 €/mes al principio).
3. **Equipos y campañas con varios creadores (Fase 7):** ¿son prioridad real o se quedan para después? Es lo más caro y condiciona el modelo de datos.
4. **Tarifario (4.3) y disponibilidad (4.4):** ¿los hacemos pronto? Son baratos y mejoran mucho Descubrir y las propuestas.
5. **Aprobación tácita (3.4):** ¿a cuántos días hábiles? (propongo 5 con avisos previos).
6. **SEO público (4.7):** ¿se activa por defecto para creadores que lo acepten, o solo si lo piden?

---

## Cómo trabajamos cada punto

- Cada punto se convierte en una **propuesta técnica corta** (datos, permisos, pantallas, pruebas, riesgos) que apruebas **antes** de tocar código.
- Migraciones: archivo preparado con `ROLLBACK`, aplicado **primero en local**, y en la compartida solo con tu confirmación y comprobando el esquema antes y después.
- Cada entrega trae pruebas automáticas, verificación en navegador, entrada en el `CHANGELOG` y la lista de lo **no** hecho y por qué.
- Lo que dependa de terceros (APIs, servicios de pago) se marca como bloqueado hasta tener respuesta, sin simularlo.

---

## 11. Fase final (al terminar lo anterior): dinero, métricas y lanzamiento

*Se deja aquí a propósito y de forma breve. Nada de esto condiciona el desarrollo anterior.*

**Dinero (sin retener fondos).**
- Mantener el pago directo marca → creador con comisión de plataforma (ya funcionando). Posibles mejoras que **no** implican custodiar dinero: estado del pago visible para ambos lados, recibos descargables, recordatorios de pago por email, y confianza por reputación (valoraciones, verificación, historial) en lugar de garantía económica.
- **Retención de fondos (escrow): descartada por riesgo.** Solo se volvería a plantear con asesoría legal y fiscal formal y un proveedor que asuma la custodia.
- **Facturación y fiscalidad:** definir con un gestor quién factura la comisión y cómo se documenta el servicio del creador; plantilla de factura generada desde los datos de la colaboración.
- **Planes:** revisar el valor de Pro del creador y valorar una suscripción para marcas (alertas, equipos, exportaciones).

**Métricas.**
- Medir lo que pase en una beta con gente real: embudo de activación por rol, % de propuestas con respuesta, tiempo de respuesta, colaboraciones completadas, repetición entre las mismas partes. Herramienta de analítica de producto y panel en el admin.

**Lanzamiento.**
- Beta cerrada en un nicho y una ciudad, revisión legal de términos y privacidad, página de ayuda y buzón de soporte, y después apertura pública.
