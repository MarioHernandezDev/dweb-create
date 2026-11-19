# CIBERAN · Auditoría integral de producto, UX/UI y QA

> **Estado del documento: PARCIAL (sesión 1).** Solo se han completado la Fase 1 (inventario) y la Fase 4 (técnica y seguridad) **en su parte estática**: lectura de código, avisos de seguridad de Supabase, consultas de solo lectura a la base y `npm audit`. **Las fases 2 (visual), 3 (funcional) y 5 (flujos completos) NO se han ejecutado**: en esa sesión no hubo herramienta de navegador ni cuentas de prueba autorizadas. Nada de lo que aparece como «verificado» en esas fases se ha probado.
>
> Solo auditoría: no se ha modificado código, datos, migraciones, variables de entorno ni configuración. No hay commit de este archivo.
>
> **Código auditado:** rama `feat/pronto`, commit `bc44cc4`. Difiere de `main` (`f73ed86`) solo en los archivos de la cabecera del perfil (`ProfileHero`, `ProfileCoverEdit`, páginas de perfil, 3 CSS), que **no están en lo auditado**.
> **Base de datos:** proyecto Supabase único `qymqzddqrnsxjnwbqlgq` (`eu-west-1`), compartido entre desarrollo, pruebas y producción. Fecha: 2026-11-16.

---

## A. Resumen ejecutivo

**Estado general.** Con la evidencia reunida, **no se puede declarar CIBERAN listo para un lanzamiento público**, por dos motivos distintos:

1. **Hay un bloqueo observado en el registro** (F-01) y **ningún test automático funciona** (T-01). Ambos son de proceso y de estado de entorno, no de diseño, pero hoy impiden confiar en el producto.
2. **Más de la mitad de la auditoría está sin hacer** (visual, funcional, flujos de usuario). Lo que sigue **no** es una opinión sobre la calidad visual ni sobre si los flujos funcionan.

**Lo que sí está bien (verificado):**
- **Las 38 tablas de `public` tienen RLS activado.** Las políticas de escritura de las tablas sensibles no permiten manipular créditos, suscripciones, mensajes ni el rol.
- **Los privilegios de columna impiden** que un usuario cambie su `role`, `verified_at`, `collaborations.status` o `paid_at`.
- **Existen triggers de guarda** en `posts` (revisión y aprobación), en `collaborations` (términos inmutables) y en `collaboration_deliverables`.
- **Los 26 endpoints de `/api/admin/*` exigen sesión de admin**, y los de cuenta, Stripe, IA y descubrimiento exigen sesión de usuario con límite de uso. El webhook de Stripe verifica la firma.
- **Ninguna función `SECURITY DEFINER` es ejecutable por `anon`**, salvo `current_creator_id()` y `current_partner_id()`, que devuelven nulo sin sesión.

**Principales riesgos** (detalle en las secciones D, E y H):
- **P0 · Registro bloqueado** mientras la contraseña SMTP de Gmail siga rechazada (F-01).
- **P1 · Sin red de seguridad de tests** (T-01) y **la base de datos única compartida** hace que cualquier prueba escriba en datos reales (T-11).
- **P2 · `/api/img` sin autenticación ni límite**, con origen derivado de la cabecera `Host` y caché en disco sin tope (T-02).
- **P2 · Dependencia `nodemailer` con vulnerabilidad alta** (T-03) y **protección contra contraseñas filtradas desactivada** (T-04).
- **P2 · Privacidad:** ficha pública activada por defecto e indexable, y modo IA de Discover sin interruptor (T-08, T-09; ver `docs/legal/PASO2-DISCREPANCIAS.md`).

**Nivel de calidad actual:** no valorable en lo visual ni en lo funcional. En seguridad de datos, **sólido en lo comprobado** (RLS y privilegios), con carencias de defensa en profundidad y de abuso.

---

## B. Inventario

### B.1 Rutas de la aplicación (33 páginas)

| Módulo | Rutas | Acceso |
|---|---|---|
| **Públicas** | `/` (landing), `/login`, `/onboarding` (registro), `/forgot-password`, `/reset-password`, `/confirm`, `/instalaciones`, `/privacidad`, `/terminos`, `/profile/[role]/[id]` (ficha pública sin sesión) | Sin sesión |
| **Creador** | `/creator` (panel), `/creator/discover`, `/creator/requests`, `/creator/collaborations/[id]`, `/creator/timeline`, `/creator/post/[id]`, `/creator/insights`, `/creator/metrics`, `/creator/profile` | Rol `creator` |
| **Partner** | `/partner` (panel), `/partner/discover`, `/partner/requests`, `/partner/collaborations/[id]`, `/partner/insights`, `/partner/profile` | Rol `partner` |
| **Compartidas (con sesión)** | `/chat`, `/chat/index`, `/chat/[id]`, `/inbox`, `/favorites` | Cualquier rol |
| **Admin** | `/admin`, `/admin/login`, `/admin/users/[id]` | Sesión de admin propia (cookie), sin cuenta de Supabase |

Observaciones del inventario:
- `/creator/metrics` está enlazada en el menú (`ph:chart-line-up-fill`) pero las métricas de redes están aplazadas (`soon: true`). Hay que comprobarla en navegador (pendiente).
- No hay página `/cookies` ni `/aviso-legal` (ver documentación legal).

### B.2 API de servidor (46 endpoints Nitro)

| Grupo | Endpoints | Control de acceso (verificado en código) |
|---|---|---|
| `account/*` (3) | borrar cuenta, estado, retirar solicitud | Sesión + límite de uso |
| `admin/*` (26) | usuarios, reportes, equipo, auditoría, alertas, correo | Sesión de admin en todos |
| `analytics/me` | métricas propias | Sesión + límite |
| `discover/search` | búsqueda (incluye modo IA) | Sesión + límite |
| `ml/predict`, `ml/trends` | IA (apagada por flag, 403 con flag apagado) | Sesión + límite |
| `notifications/*` (4) | resumen por correo, alertas admin, baja | Cron con secreto, o token firmado |
| `stripe/*` (4) | checkout, pago de colaboración, cuenta de cobro, webhook | Sesión + límite; webhook con firma. Apagado por `PAYMENTS_ENABLED` |
| `auth/instagram/*` (3) | borrado de datos, desautorización, estado (Meta) | Firma de Meta / público |
| `public/profile/[role]/[id]` | ficha sin sesión | Límite por IP, lista cerrada de campos |
| `img.get` | optimizador de imágenes | **Sin sesión, sin límite** (ver T-02) |

### B.3 Base de datos
38 tablas en `public`, 40+ migraciones. 36 funciones `SECURITY DEFINER` ejecutables por `authenticated` (flujo de colaboraciones, chat, entregables, valoraciones). Buckets: `post-media` (público), `collab-files` (privado).

### B.4 Componentes compartidos relevantes (por carpetas, sin inspeccionar a fondo)
`components/ui` (botones, inputs, tarjetas), `layout` (TopBar, SideRail, PublicShell), `profile`, `collab`, `chat`, `discover`, `timeline`, `insights`, `admin`, `onboarding`, `legal`. Middleware global: `role-guard.global.ts`.

### B.5 Secciones pendientes de revisar
Todas las páginas en navegador (visual, funcional, responsive), todos los formularios, los 8 pasos de cada flujo y los casos límite de la sección 6 del encargo. Ver sección G.

---

## C. Problemas visuales

**Sin hallazgos registrados: la Fase 2 no se ha ejecutado.** No se afirma que no existan. Ver sección G.

---

## D. Problemas funcionales

### F-01 · Registro de cuentas falla con «Error sending confirmation email» · **P0** (mientras siga sin resolverse)
- **Página:** `/onboarding` (registro).
- **Pasos para reproducir:** crear una cuenta nueva con cualquier correo desde `localhost:3000`.
- **Resultado esperado:** la cuenta se crea y llega el correo de confirmación.
- **Resultado obtenido:** el servidor responde 500 y la interfaz muestra «Error sending confirmation email».
- **Evidencia (registros de Auth, 2026-11-16 11:04 UTC, dos intentos):** `error_code: unexpected_failure`, `535 5.7.8 Username and Password not accepted (BadCredentials)`, ruta `/signup`, `referer: http://localhost:3000/`. Supabase no pudo autenticarse con `smtp.gmail.com` usando la contraseña de aplicación guardada.
- **Causa probable:** se cambió la contraseña de la cuenta de Google (el panel de seguridad de Google muestra «Contraseña cambiada · 9:10»), lo que revoca las contraseñas de aplicación.
- **Estado:** se creó una contraseña de aplicación nueva, pero **no se ha comprobado que se haya aplicado** en Supabase ni en `.env`. Hay que repetir la prueba.
- **Solución:** actualizar la contraseña en *Authentication → Emails → SMTP Settings* y en `SMTP_PASS`.
- **Defecto añadido (P2):** el mensaje se enseña en inglés y sin explicación a la persona usuaria. Debería traducirse y ofrecer «inténtalo más tarde» o contacto.

### F-02 · Funciones sin comprobar
No hay más hallazgos funcionales porque la Fase 3 no se ha ejecutado. No se han probado formularios, validaciones, estados vacíos ni permisos por rol en la interfaz.

---

## E. Problemas técnicos y de seguridad

Todos los hallazgos de esta sección salen de **análisis estático y consultas de solo lectura**. Ninguno se ha explotado.

### T-01 · `npm test` no funciona: los 42 archivos fallan antes de ejecutar ninguna prueba · **P1**
- **Evidencia:** `Test Files 42 failed (42), Tests no tests`; error en todos: `TypeError: Cannot read properties of undefined (reading 'config')` y `Vitest failed to find the current suite`. **Falla también con el árbol limpio** (`git stash` de todos los cambios), así que no lo provoca ningún cambio reciente.
- **Impacto:** no hay ninguna red automática de seguridad; las reglas del proyecto (`npm test` antes de dar un cambio por bueno) no se pueden cumplir. `npm run typecheck` sí pasa.
- **Solución:** investigar la incompatibilidad de Vitest 5 con la versión de Vite o Node instalada, o un fallo en `node_modules` (reinstalar), y fijar versiones.

### T-02 · `/api/img` sin autenticación ni límite; origen derivado de la cabecera `Host`; caché de disco sin tope · **P2**
- **Evidencia:** `server/api/img.get.ts` no comprueba sesión ni aplica `enforceRateLimit`. Para rutas `/img/…` construye la URL a descargar con `getRequestURL(event).origin` (derivado de `Host`/`X-Forwarded-Host`) en `allowedImageSource`. El resultado se guarda en `.data/img-cache` con una clave que incluye ancho, alto y calidad.
- **Impacto real:**
  1. **Posible SSRF ciego:** con una cabecera `Host` manipulada, el servidor descargaría `https://<host elegido>/img/…`. Está acotado porque la ruta es siempre `/img/…` y solo se devuelve una imagen procesada; depende de si el hosting valida `Host`.
  2. **Agotamiento de disco:** cada combinación distinta de `w` (16–1600), `h` y `q` (40–90) genera un archivo permanente sin purga.
  3. **Consumo de CPU:** el redimensionado con `sharp` no tiene límite de peticiones.
- **Solución:** usar una URL base fija de configuración (`APP_URL`) en lugar de la cabecera de la petición; aplicar límite de uso por IP; cuantizar tamaños a un conjunto fijo de presets; podar la caché por tamaño o antigüedad.

### T-03 · Dependencia `nodemailer` con vulnerabilidad alta (9 vulnerabilidades en producción) · **P2**
- **Evidencia (`npm audit --omit=dev`):** 1 alta (`nodemailer`: inyección de comandos SMTP por CRLF y por `envelope.size`, más varias de análisis de direcciones y TLS), 1 moderada (`node-forge`, transitiva) y 7 bajas (`nuxt` y su cadena, `deepmerge`).
- **Impacto real:** limitado en CIBERAN porque los destinatarios salen de la base de datos y la configuración SMTP es fija, sin entrada libre del usuario en la envoltura del correo. Aun así, el correo de aviso incluye texto de otros usuarios y los destinatarios son correos registrados. No se ha probado la explotabilidad.
- **Solución:** actualizar `nodemailer` a la versión corregida (`npm audit` indica 10.6.0, cambio incompatible: revisar `server/utils/mailer.ts` y probar el envío de correo de prueba) y actualizar `nuxt` cuando haya parche.

### T-04 · Protección contra contraseñas filtradas desactivada · **P2**
- **Evidencia:** aviso `auth_leaked_password_protection` (WARN) del analizador de Supabase.
- **Impacto:** se aceptan contraseñas conocidas de filtraciones. La interfaz solo exige 8 caracteres.
- **Solución:** activarla en *Authentication → Providers* (puede requerir plan de pago de Supabase; comprobarlo) y subir la exigencia mínima de contraseña.

### T-05 · `anon` tiene privilegios de tabla en casi todo `public` · **P3**
- **Evidencia:** consulta a `has_table_privilege`: `anon` puede seleccionar y escribir en `profiles`, `messages`, `collaborations`, `posts`, `subscriptions`, `credit_ledger`, etc. Hoy **no es explotable**: todas tienen RLS y las políticas dependen de `auth.uid()` o de `current_*_id()`, que son nulos para `anon`.
- **Impacto:** defensa en profundidad inexistente: un error futuro en una política abriría lectura o escritura sin sesión.
- **Solución:** revocar a `anon` los privilegios en las tablas que no necesitan acceso público (la migración `column_privileges_hardening` ya lo hizo en algunas).

### T-06 · `authenticated` conserva privilegios de escritura en columnas de dinero y mensajes · **P3**
- **Evidencia:** `credit_ledger.amount` (insertar y actualizar), `subscriptions.plan_id` y `status` (insertar y actualizar), `messages.body` (insertar y actualizar). **Hoy está bloqueado solo porque esas tablas no tienen política de INSERT/UPDATE.**
- **Impacto:** una política añadida por error permitiría a cualquier usuario fijarse créditos o plan Pro.
- **Solución:** revocar esos privilegios de columna a `authenticated`; que solo escriban el servidor y las funciones.

### T-07 · 36 funciones `SECURITY DEFINER` ejecutables por usuarios con sesión; revisión incompleta · **P3 (pendiente de profundizar)**
- **Evidencia:** el analizador de Supabase las lista. Por heurística sobre el cuerpo: 6 funciones `get_public_*` y `profile_rating_summary` devuelven datos de cualquier id a cualquier usuario con sesión, sin comprobar identidad ni `public_profile_enabled`. Se espera por diseño (los usuarios con sesión ven todo), pero **no se ha verificado línea a línea ninguna de las 36**.
- **Pendiente:** revisar cada una para confirmar que valida rol y pertenencia (por ejemplo, que solo el partner de una colaboración pueda aceptarla o aprobar un entregable).
- **Nota:** `get_public_social_accounts` devuelve cuentas de redes de un creador aunque las métricas estén aplazadas.

### T-08 · Ficha pública activada por defecto e indexable · **P2**
- **Evidencia:** `profiles.public_profile_enabled default true`; la página `/profile/[role]/[id]` no envía `noindex`; `robots.txt` permite todo.
- **Impacto:** los datos de la ficha (nombre, foto, bio, ubicación, web) pueden aparecer en buscadores sin que la persona lo haya decidido.
- **Solución y detalle:** `docs/legal/PASO2-DISCREPANCIAS.md`, cambio 7.

### T-09 · Búsqueda con IA sin interruptor; envía datos de otros usuarios a un tercero · **P2**
- **Evidencia:** el botón «Con IA» se muestra siempre y `search.post.ts` llama a OpenRouter si hay `OPENROUTER_API_KEY`. Envía nombre, bio, categorías e id de hasta 16 perfiles de otros usuarios.
- **Solución:** `docs/legal/PASO2-DISCREPANCIAS.md`, cambio 0.

### T-10 · Límites de uso insuficientes en flujos que van directos a Supabase · **P2**
- **Evidencia:** el limitador (`server/utils/rate-limit.ts`) vive en memoria de un solo proceso y solo cubre los endpoints Nitro. El alta de cuentas, el envío de solicitudes de colaboración (`collaborations_insert_by_initiator`) y las denuncias se hacen contra Supabase sin limitador propio (anotado en `docs/PENDIENTE_MARIO.md`, R-03).
- **Impacto:** un usuario puede enviar solicitudes o denuncias masivas a cualquier creador, y llenar los correos de aviso. El límite de `admin/login` usa `X-Forwarded-For` (falsificable) con un tope global que permite a un atacante bloquear el acceso de admin.
- **Solución:** límites en base de datos o en un almacén compartido (por ejemplo, Redis); registrar la IP de confianza detrás del proxy.

### T-11 · Una sola base de datos para desarrollo, pruebas y producción · **P1 (proceso)**
- **Evidencia:** decisión documentada (`docs/15-cierre-lanzamiento-gratis.md`); los registros de Auth muestran peticiones desde `localhost:3000` contra el proyecto real.
- **Impacto:** cualquier prueba (incluida esta auditoría en navegador) escribe en datos reales; los tests de integración también. Impide hacer pruebas destructivas con seguridad.
- **Solución:** un proyecto de staging aparte antes del lanzamiento (existe un `staging-bootstrap.mjs`).

### T-12 · Endpoints de Meta/Instagram activos con las métricas aplazadas · **P3**
- **Evidencia:** `server/api/auth/instagram/{data-deletion,deauthorize,data-deletion-status}` siguen activos. `data-deletion-status` muestra «Hemos eliminado la cuenta de Instagram conectada…» para **cualquier** código con forma de UUID, sin consultar nada.
- **Impacto:** confirmación engañosa y código vivo que contradice la regla de «nada fuera de `_disabled` depende de métricas».
- **Solución:** mover a `_disabled` o responder honestamente; decidirlo junto con el equipo.

### T-13 · Control de rol en el cliente (informativo) · **sin gravedad**
- **Evidencia:** `role-guard.global.ts` redirige entre secciones, pero si no hay fila en `profiles` no bloquea (`if (!myRole) return`). La seguridad real depende de RLS y de los endpoints, que están bien (ver sección A).
- **Nota:** el guard es solo de experiencia de usuario; no se debe contar como barrera de seguridad.

### T-14 · Pendiente: análisis de rendimiento, hidratación, consola y peticiones fallidas
No se ha revisado en navegador ni se ha pasado el analizador de rendimiento de Supabase. No se han inspeccionado hidratación de Nuxt, errores de consola ni peticiones HTTP fallidas.

---

## F. Funcionalidades verificadas

| Qué | Cómo | Resultado |
|---|---|---|
| RLS activado en `public` | Consulta `pg_class.relrowsecurity` (38 tablas) | **Todas activas** |
| Tablas con RLS y sin política (`admin_audit_log`, `admin_members`, `discovery_searches`) | Analizador de Supabase y consulta a `pg_policies` | Acceso denegado a clientes; solo el servidor con clave de servicio. Correcto |
| Políticas de lectura abiertas | Consulta de `pg_policies` con `qual = true` | Solo `profiles`, `creators`, `partners`, `collaboration_ratings` y `trends` para `authenticated` (directorio público, esperado) |
| No se pueden cambiar `role`, `verified_at`, `status`, `paid_at` desde cliente | `has_column_privilege` | Sin privilegio de actualización |
| Escritura bloqueada en `credit_ledger`, `subscriptions`, `messages`, `conversations` | Consulta de políticas | Sin políticas de escritura: denegado (ver T-06) |
| Guardas de integridad | Triggers en `posts`, `collaborations`, `collaboration_deliverables` | Presentes (no ejecutados: ver G) |
| Autenticación en endpoints Nitro | Mapa de los 46 endpoints | Todos con control, salvo `img.get` y `data-deletion-status` (ver T-02, T-12) |
| Webhook de Stripe | Lectura de `webhook.post.ts` | Verifica la firma, responde 500 ante fallo de escritura (reintento) |
| Login de admin | Lectura de `login.post.ts` | Límite por IP y global, hash de contraseña, tiempo constante para correos inexistentes |
| `typecheck` | `npm run typecheck` | **Pasa** |
| Tests | `npm test` | **No ejecutable** (T-01) |

---

## G. Elementos pendientes (no comprobados)

**Requisitos para continuar:**
1. Una herramienta de navegador (por ejemplo, el navegador integrado o Chrome) para recorrer la app.
2. **Cuentas de prueba autorizadas** (un creador y un partner) y permiso expreso para escribir en la base compartida con datos de prueba. No se ha leído `.env`.
3. La aplicación en marcha (`npm run dev`) con SMTP funcionando, para poder registrar y entrar.

**Pendiente por fases:**
- **Fase 2 · Visual:** todas las páginas de Creador, Partner y compartidas: tipografía, color, espaciado, iconos, componentes, coherencia, desbordamientos; escritorio, tablet y móvil (390 px). Verificar especialmente la cabecera del perfil, que ha cambiado en `main`.
- **Fase 3 · Funcional:** navegación, enlaces, formularios, validaciones, modales, filtros, pestañas, edición y guardado, estados de carga, vacíos y error, permisos por rol en la interfaz.
- **Fase 4 · Técnica (parte dinámica):** consola, hidratación, peticiones fallidas, rendimiento, prueba real de que un usuario no accede a datos del otro rol, y pruebas de las 36 funciones RPC con las cuentas de prueba.
- **Fase 5 · Flujos completos:** los dos flujos del encargo (8 y 9 pasos) y los casos límite (colaboración en cada estado, oferta modificada, revisión, entregable, sesión caducada, error de conexión).
- **Fase 6:** consolidar el informe final cuando el resto esté hecho.

---

## H. Plan de corrección priorizado

| Prioridad | Qué | Agrupa |
|---|---|---|
| **P0** | Restablecer el envío de correo de Auth (contraseña SMTP) y comprobar el registro | F-01 |
| **P1** | Reparar el entorno de Vitest para recuperar `npm test` | T-01 |
| **P1** | Proyecto de Supabase de staging separado antes de más pruebas y del lanzamiento | T-11 |
| **P2** | Endurecer `/api/img` (URL base fija, límite, presets, poda de caché) | T-02 |
| **P2** | Actualizar `nodemailer` y revisar `nuxt` | T-03 |
| **P2** | Activar protección de contraseñas filtradas y subir la exigencia de contraseña | T-04 |
| **P2** | Privacidad: interruptor del modo IA y `noindex` / texto en la ficha pública | T-08, T-09 |
| **P2** | Límites de uso para solicitudes, denuncias y alta | T-10 |
| **P2** | Traducir y suavizar el mensaje de error del registro | F-01 |
| **P3** | Revocar privilegios de `anon` y de columnas sensibles | T-05, T-06 |
| **P3** | Revisar a fondo las 36 funciones `SECURITY DEFINER` | T-07 |
| **P3** | Limpiar los endpoints de Meta | T-12 |

**Orden sugerido:** P0 (hoy) → P1 → resto de P2 agrupando por causa (el grupo de privacidad y el de abuso de uso comparten arreglos) → P3.

**Próxima sesión:** con navegador y cuentas de prueba, ejecutar las fases 2, 3 y 5 por módulos (Creador, Partner, compartidas, admin), actualizando este documento al terminar cada bloque.
