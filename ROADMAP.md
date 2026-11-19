# CIBERAN · ROADMAP vivo

*Creado 2026-11-06 a partir de `plan-imp.md`. Complementa `docs/HOJA_DE_RUTA.md` (visión y alcance de cada fase) y `docs/audit/` (auditorías previas). Este documento es el **estado real y la lista de trabajo**; se actualiza al cerrar cada bloque.*

Estados: Pendiente · En análisis · En diseño · En desarrollo · En pruebas · Completado · Bloqueado.

## 1. Estado general

- Stack: Nuxt 4 (Vue 3, Pinia, Tailwind 4) + Supabase (Auth, Postgres con RLS, Storage, Realtime) + Nitro (endpoints en `server/api`) + Stripe + OAuth Instagram/YouTube.
- Calidad base verificada hoy: `vue-tsc -b` sin errores · `vitest` 46 ficheros / 684 tests unitarios en verde · CI ya existe (`.github/workflows/ci.yml`: typecheck + unitarias + build).
- **Bloqueo principal (corregido 2026-11-09):** las 6 migraciones que figuraban como «preparadas sin aplicar» (`20261105100000` … `20261105140000` y `20261106100000`) **ya están aplicadas en la base compartida**: comprobado por huella contra el proyecto (30/30 funciones, índices, políticas, tablas, columnas y triggers presentes; bucket `post-media` con límites y sin política pública de lectura). Lo que ocurre es que `supabase_migrations` está **vacío** (se aplicaron con el script, que no registra). Queda solo subir los 6 commits de `main` a `origin/main` (push desde la máquina de Alex) y comprobar antes que Mario no ha empujado.

## 2. Auditoría inicial

Metodología: lectura del repositorio, ejecución de typecheck y tests, y contraste con las auditorías previas (`docs/audit/*`, `docs/PENDIENTES.md`). **No he podido verificar de punta a punta en navegador** los flujos marcados «no verificado»: eso requiere el Supabase local o una ventana sobre la compartida.

### Funcionalidades completas (con tests y/o verificación documentada)
Registro/alta con ficha · flujo de colaboración con estados y cronología · entregables con versión y guarda de aprobación · negociación por chat y ofertas sobre paquetes · Descubrir (filtros, orden, tarjeta) · perfil público rediseñado · Studio (tablero, calendario, lista) · Colaboraciones (tablero/lista/calendario/solicitudes, CSV) · valoraciones · guardados · webhook de Stripe idempotente · OAuth Instagram/YouTube con tokens cifrados · panel admin con límite de intentos de login.

### Funcionalidades incompletas
- Búsquedas guardadas: solo en `localStorage` (no sobreviven al cambio de dispositivo).
- Avisos: solo dentro de la app (sin email, push ni cron).
- Colaboración: sin adjuntos, sin documento del acuerdo, sin cancelación pactada, sin recordatorios de plazo.
- Estadísticas: solo seguidores salvo YouTube; Instagram sin insights (permiso de Meta pendiente).
- Páginas legales: existen `/privacidad` y `/terminos`; **falta revisión legal** y registro de aceptación con versión.

### Funcionalidades que presentan errores / riesgos funcionales
- Versión de migración duplicada heredada: `20261021160000_chat_packages_offers.sql` y `20261021160000_discovery_cover_photos.sql`. Ya aplicadas; **no se renombran**. Consecuencia: `supabase db push` contra la compartida es inviable sin `migration repair`. (Ahora un test impide nuevos duplicados.)
- Borrado de un creador con colaboraciones puede fallar por la FK (`R-07` en `docs/audit/06`).
- Aviso falso «nueva solicitud» al aceptar una oferta (`R-05`, comprobar si sigue abierto).

### Funcionalidades inexistentes
Email transaccional · push web · tareas programadas propias · 2FA · Google login · sesiones activas · exportar datos · equipos/organizaciones · campañas con aplicaciones · TikTok · feature flags · registro de auditoría de acciones de admin · i18n · tests E2E · monitorización de errores · staging.

### Problemas de arquitectura
- Una única base de datos compartida para desarrollo, pruebas de integración y producción (`H0-04`).
- Limitador de tasa en memoria (válido solo con un proceso; `R-03`).
- `partners.profile_id` 1:1 impide equipos (Fase 7; requiere propuesta técnica propia).
- Texto en castellano embebido en componentes (coste de i18n creciente).

### Problemas de seguridad
- Subidas de archivos: **bien en lo básico** — el bucket `post-media` limita a 8 MB y a JPEG/PNG/WebP, y las políticas restringen la escritura a la carpeta propia. Pendiente: el bucket es **público** (borradores visibles con la URL, `R-04`) y no hay validación de contenido real (solo MIME declarado).
- Contraseña de demo aún en `app/pages/login.vue` (`R-01`, dueño: Mario).
- Canales de «escribiendo…» sin Realtime Authorization (`R-02`).
- Avisos del linter de Supabase (2026-11-09) — **corregidos con `20261109100000_function_privileges_hardening.sql`, aplicada en la compartida el mismo día**: 11 funciones de trigger ya no son ejecutables por `anon`/`authenticated` (Postgres no comprueba EXECUTE al disparar el trigger; verificado: como `authenticated`, un UPDATE de un post real dispara `set_updated_at` sin ese permiso, dentro de una transacción abortada que no guardó nada); `has_active_collaboration_with` ya no es ejecutable por `anon`; fijado `search_path = public` en 4 funciones (avisos 4 → 0; ejecutables sin sesión 11 → 2). **Se dejan a propósito:** `current_creator_id()` y `current_partner_id()` (33 y 15 políticas RLS las evalúan, algunas para `anon`) y las RPC de la app para `authenticated` (comprueban `auth.uid()` dentro; el aviso es esperado). **Pendiente, no se puede por API:** activar «Leaked password protection» en el panel de Supabase (Auth); `discovery_searches` con RLS y sin políticas es intencionado (solo el servidor con service role). Test `migrations-rollback` en verde.
- Rendimiento (linter): 18 políticas RLS usan `auth.uid()` sin `(select ...)` (se reevalúa por fila), 17 claves foráneas sin índice y `profiles` con dos políticas SELECT permisivas. Irrelevante con 21 perfiles; a corregir antes de escalar.
- Endpoints con *service role*: existe patrón de comprobación del llamante, pero no hay revisión sistemática automatizada.
- Límites de uso: los 15 endpoints de `server/api` con sesión que no tenían límite ya lo tienen (ver tarea 1.6). Siguen fuera del servidor Nitro, y por tanto sin cubrir aquí, el registro, las propuestas y el chat: van directos a Supabase y sus límites viven en la base de datos (`20261103100000_chat_limits.sql`, ya aplicada). `GET /api/img` es público y sin límite por IP (cachea el resultado, solo acepta orígenes propios); queda como observación.

### Problemas de experiencia de usuario
Validado solo en Chrome (1280 px y 390 px). Sin pasada de accesibilidad con lector de pantalla. Estados vacíos/carga/error con estilos distintos por pantalla.

### Deuda técnica
- `vuedraggable` (3 usos: `PhaseBoard.vue`, `creator/profile.vue`, `partner/profile.vue`) arrastra `sortablejs` 1.14 y exige el compilador de plantillas. Sustituirlo exige tocar el tablero de Publicaciones y la reordenación de paquetes → **solo con verificación en navegador** (ver §6).
- 31 migraciones antiguas sin bloque ROLLBACK (no se reescriben; regla activa desde `20261105100000`).
- Tests de integración manuales y contra la base compartida.

### Riesgos antes del lanzamiento
1. Aplicar 5 migraciones sobre la compartida sin staging.
2. Sin monitorización: un error en producción no avisa a nadie.
3. Sin copia de seguridad restaurada y probada.
4. Política de pago de colaboraciones sin decidir (`docs/PENDIENTES.md` §6b).
5. Revisión legal/RGPD pendiente.

## 3. Hoja de ruta priorizada

Detalle de alcance en `docs/HOJA_DE_RUTA.md`. Orden: Fase 1 (cimientos) → 2 (avisos) → 3 (colaboración) → 4 (descubrir) → 5 (Studio) → 6 (cuenta) → 7 (equipos, con propuesta previa) → 8 (integraciones) → 9 (admin) → 10 (escala).

## 4. Tareas

### Completadas
| Tarea | Qué se hizo | Cómo se verificó |
|---|---|---|
| Auditoría inicial | Este documento | Typecheck y `vitest` ejecutados; lectura de CI, migraciones, buckets, rate-limit |
| 1.6 Límites de uso por usuario en endpoints con sesión | `server/utils/rate-limit-policies.ts` (6 políticas con sus cifras) aplicado con una línea en 15 endpoints: sincronización y lecturas de YouTube/Instagram, desvincular, inicio de OAuth, los 3 de Stripe y tendencias. Test `tests/unit/rate-limit-policies.spec.ts` | 7 tests nuevos en verde; comprobado que el test falla si se quita el límite de un endpoint; suite completa 691/691 y `vue-tsc` sin errores nuevos (copia Linux). **No probado contra la app en marcha** |
| 2.1 Recordatorios de plazo como avisos internos (Fase 2, bloque 1) | Migración `20261109110000_due_reminders.sql`: `notifications.dedupe_key` + índice único, función interna `send_due_reminders()` y tarea `pg_cron` cada hora (minuto 5). Avisa solo de plazos **futuros** <48 h: solicitud `requested` que caduca (a quien debe responder) y contenido `idea`/`in_production` que vence (al creador). Iconos en `inbox.vue`; test `reminder-notification-types.spec.ts` | Probado en la base compartida dentro de una transacción abortada: con datos reales 0/0; con plazo cercano 1/1, destinatario, texto y enlace correctos; segunda ejecución 0 (sin duplicados); plazo lejano o vencido no genera nada; sin restos tras la prueba. Suite 695/695 y typecheck sin errores nuevos. **Pendiente confirmar la 1.ª ejecución real de cron (12:05 UTC)**. El primer aviso real saldrá el 12/11 por la solicitud que caduca el 14/11 |
| 1.3 Regla de ROLLBACK + versiones únicas en migraciones | `tests/unit/migrations-rollback.spec.ts`; corre en CI con `npm test` | El test detectó la versión duplicada heredada (ahora listada como excepción) y pasa en verde |
| Cuenta: búsquedas guardadas y preferencias de avisos (2026-11-10) | Migración `20261110100000_account_preferences.sql` (aplicada). Las búsquedas guardadas de Descubrir viven en la cuenta (las del navegador se suben solas la primera vez). «Tu perfil → Privacidad»: tarjeta «Avisos» para silenciar recordatorios, valoraciones, notas del registro e inicios de sesión (un trigger descarta el aviso al crearse; lo que pide acción no se puede silenciar) | Probado en la base compartida dentro de un bloque revertido: tope de 12, aislamiento entre usuarios, CHECK de tipos y silenciado; sin restos. Tests unitarios |
| Cuenta: descargar mis datos (2026-11-10) | «Tu perfil → Privacidad → Tus datos»: JSON con ficha, publicaciones, colaboraciones, mensajes enviados, avisos… leído con la sesión del usuario (RLS). Sin tokens ni datos de pago | Tests de `utils/data-export.ts`; typecheck |
| Colaboración: archivos y cancelación pactada (2026-11-10) | Migración `20261110110000_collaboration_files_and_cancellation.sql` (aplicada): bucket privado `collab-files`, tabla `collaboration_files`, estado `cancelled` y 3 RPC (proponer, responder, retirar). Página de colaboración: panel «Archivos», bloque «Proponer cancelar» y cronología/avisos nuevos | 20 comprobaciones en la base compartida dentro de un bloque revertido (permisos de cada parte y de un tercero, estados, eventos y avisos); sin restos. Tests unitarios |
| Colaboración: resumen del acuerdo y calendario (2026-11-10) | Botón «Resumen del acuerdo (imprimir o PDF)» con huella SHA-256 del contenido y «Añadir entregas al calendario» (.ics) en la página de colaboración y en la vista Calendario | Tests de `agreement-summary.ts` e `ics.ts` |
| 1.7 (parte) `BottomSheet` atrapa el foco con Tab | Tab y Mayús+Tab dan la vuelta dentro de la hoja | Revisión de código; pendiente pasada con lector de pantalla |
| Typecheck de Sentry | `@ts-expect-error` en `sendDefaultPii` (válida en runtime, falta en los tipos) | `vue-tsc -b` sin errores |
| Colaboración: chat integrado (2026-11-11) | Panel «Chat con …» en la página de colaboración: misma conversación 1 a 1 de Mensajes (mismas RPC y tiempo real), últimos 30 mensajes, respuestas rápidas y «Visto». La conversación no se crea por abrir la página, solo al enviar | Typecheck; **sin probar en navegador** |
| Colaboración: terminar por incumplimiento y plantillas (2026-11-11) | Migración `20261111100000_breach_termination_and_templates.sql` (aplicada): estado `terminated`, RPC con motivo, aviso a la otra parte y denuncia `breach` visible en admin; tabla `proposal_templates` y barra de plantillas en «Proponer» y «Contactar» | 12 comprobaciones en la base compartida dentro de un bloque revertido; sin restos. Tests unitarios |
| Acceso con Google preparado (2026-11-11) | Botón en `/login` tras `GOOGLE_AUTH_ENABLED` (apagado). Pasos y límite conocido (altas nuevas sin elegir rol) en `docs/13-INTEGRACIONES-PENDIENTES.md` | Test de que el botón queda oculto sin la variable |

### Pendientes / bloqueadas
| Id | Tarea | Estado | Depende de |
|---|---|---|---|
| 1.1 | Aplicar las migraciones a la compartida y hacer push | **Completado en lo de la base (ya estaban aplicadas); pendiente el push** | Verificado 2026-11-09 por huella con el conector de Supabase; no se aplicó nada. Push y comprobación de Mario: lo lanza Alex |
| 1.2 | Entorno de staging (segundo proyecto Supabase o local con semillas) | Pendiente | Coste externo → aprobación |
| 1.3b | CI: integración contra Supabase local en contenedor | Pendiente | 1.2 |
| 1.4 | Monitorización de errores (Sentry o similar) | Bloqueado | Servicio externo → aprobación |
| 1.5 | Copia de seguridad y restauración de prueba | Pendiente | Acceso al panel de Supabase |
| 1.6b | Revisión sistemática de endpoints con service role | En pruebas | Hecho: test que exige sesión + límite en todo endpoint con usuario y sesión de admin en todo `/admin/*`; leído a fondo `pay-collaboration` (propiedad, estado, presupuesto en servidor e idempotencia correctos). **Falta** revisar línea a línea la autorización por propiedad del resto |
| 1.7 | `vuedraggable` → Sortable directo; Safari/Firefox; accesibilidad | En análisis | Entorno para probar en navegador. Pasada estática hecha: imágenes con `alt`, botones de icono con `aria-label`, `BottomSheet` con Escape y retorno de foco. **Carencia detectada:** `BottomSheet` no atrapa el foco con Tab. No se cambia sin probar en navegador |
| 2.2 | Preferencias de aviso por usuario | En diseño | Pantalla nueva → mockup previo y tu aprobación (`plan-imp.md` §3) |
| 2.3 | Email transaccional y push web | Bloqueado | Servicio externo (proveedor de email, claves VAPID) → tu aprobación; la bandeja interna ya cubre lo básico |
| 3–10 | Resto de fases | Pendiente | Fase 1 y 2 |

## 5. Decisiones técnicas
- **Métricas de redes sociales: aplazadas a una fase futura (2026-11-12).** Definidas en `docs/17-METRICAS-REDES-PROXIMAMENTE.md`; código aislado en carpetas `_disabled`, sin dependencias en ninguna sección activa; `/creator/metrics` es una página «Próximamente». No reactivar sin petición expresa.
- No se renombra ninguna migración ya aplicada, aunque el sello esté duplicado.
- ROLLBACK obligatorio en migraciones desde `20261105100000`, forzado por test.
- No se simulan integraciones sin credenciales.
- Tareas programadas con `pg_cron` (gratis, dentro de Postgres) en lugar de un servicio externo. Ojo: `drop extension pg_cron` borra todas sus tareas.
- Los recordatorios solo avisan: no cambian estados ni caducan nada solos (la falta de respuesta no es aceptación).
- Las horas de los textos de aviso se muestran en `Europe/Madrid`.

## 6. Problemas detectados hoy
1. `20261021160000` duplicada (ver arriba).
2. `docs/HOJA_DE_RUTA.md` dice «sin CI»: ya existe CI (typecheck + unitarias + build); lo que falta es la parte de integración.
3. `vue-tsc` falla en `sentry.client.config.ts` y `sentry.server.config.ts` (archivos sin commitear): la opción `sendDefaultPii` no existe en los tipos de la versión instalada de `@sentry/nuxt`. Sentry (1.4) sigue bloqueado por coste; hay que decidirlo antes de commitear esos archivos.
4. Entorno de trabajo: el shell de Claude no llega a Postgres ni a GitHub. La base se consulta con el conector de Supabase (solo lectura hasta ahora); `git fetch`/`push` los lanza Alex.
5. `supabase/migrations/auditoria-completa.md` es un documento dentro de la carpeta de migraciones; conviene moverlo a `docs/audit/` para no confundir a la CLI.

## 6 bis. Sesión 2026-11-11 (tarde): cierre de producto para el lanzamiento gratis
Estrategia vigente: terminar el producto → preparar el lanzamiento → lanzar gratis → monetizar después. Las 21 cuentas actuales son de prueba.

| Hecho | Dónde |
|---|---|
| Pruebas en navegador (escritorio y móvil) de archivos, cancelación, incumplimiento, chat, plantillas, avisos, búsquedas y descarga de datos; 7 fallos corregidos | commit `b47b6d5` |
| Perfil público sin sesión con lista cerrada de campos e interruptor por cuenta | `server/api/public/profile`, `server/utils/public-profile.ts`, migración `20261112100000` |
| Modo lanzamiento gratis: `PAYMENTS_ENABLED` apaga Pro, pagos y comisión en interfaz y servidor | `useLaunchMode`, `server/utils/payments-gate.ts` |
| Términos con versión (casilla en el alta + aviso al entrar) y recorrido recordado en la cuenta | `TermsGate`, `useAccountState`, migración `20261112110000` |
| Eliminación de cuenta (inmediata sin historial; solicitud con historial) | `server/api/account/delete.*`, `DeleteAccountCard` |
| Colaboración en pestañas (Resumen, Entregables, Acuerdo y archivos, Chat, Actividad) | `CollabWorkspace.vue` |
| Revisión de reportes e incumplimientos en el panel de admin; permisos de `reports` cerrados | migración `20261112120000`, `docs/14-OPERACIONES-ADMIN.md` |
| Script de staging con seguros contra producción | `scripts/staging-bootstrap.mjs`, `docs/12` |

Pendiente de verificar en navegador (el panel del navegador dejó de estar visible a mitad de sesión): pestañas de la colaboración, alta con casilla de términos, tarjeta de eliminar cuenta y panel de admin. El borrado real de una cuenta no se ha ejecutado nunca.

## 7. Próximos pasos
1. **Push de `main`** (lo lanza Alex): `git fetch`, comprobar que Mario no ha empujado, y `git push`. No hay migraciones que aplicar.
2. Decidir staging (1.2) y Sentry (1.4): ambos generan coste.
3. Mientras tanto, sin tocar la base: límites de uso (1.6) y accesibilidad (1.7).
