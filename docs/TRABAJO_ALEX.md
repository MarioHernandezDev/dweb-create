# TRABAJO_ALEX — rama `feature/onboarding`

> Actualizado el 2026-10-28. Este documento es **solo lo que hace Alex**: todo lo que necesitas está aquí, sin tener que leer el de la otra persona. Sustituye al antiguo `PLAN_TRABAJO_PARALELO.md` (ya borrado). Reparto aprobado el 2026-10-28; **ninguna tarea está implementada todavía.**
>
> Nomenclatura: tareas de Mario = `M-…`, tareas de Alex = `C-…` (el prefijo `C-` viene del primer borrador, no se ha renombrado para no romper referencias). Prioridad 1–7: 1 seguridad/datos/pagos · 2 errores en flujos principales · 3 integraciones esenciales · 4 coherencia de estados/notificaciones · 5 usabilidad · 6 onboarding · 7 visual. Complejidad B/M/A = baja/media/alta. "BD" = migración/RPC/RLS.
> Todo se ha inventariado leyendo código y documentación; **no se ejecutaron tests, build ni navegador** al hacerlo, así que "implementado" significa "hay código", no "está verificado".
## 1. Objetivo general

Dejar FEEDMA listo para usuarios reales: pagos probados y con política de cobro decidida, páginas legales y borrado de datos, seguridad y límites de uso, flujos principales verificados con clics reales, notificaciones y chat coherentes, y una primera experiencia guiada para quien entra por primera vez.

## 2. Tareas asignadas — detalle
### Dinero (Stripe)

| ID | Tarea | Estado | Prio | Compl. | Depende de | BD | Criterio |
|---|---|---|---|---|---|---|---|
| C-D1 | Probar de verdad en modo test: suscripción Pro y pago de colaboración con Connect (Stripe CLI + onboarding de un creador demo) | Nunca probado | 1 | M | — | No | Ambos flujos completados en test; webhooks recibidos; resultado en CHANGELOG con lo que falló |
| C-D2 | Política de cuándo se puede pagar (hoy se permite al **aceptar**: `pay-collaboration.post.ts` y `payableStatuses` en `partner/requests.vue`) | Decisión + implementación pendientes | 1 | A | C-D1, Decisión Q2 | Probable: estados/hitos de pago, RPC, webhook — **zona protegida** | Política elegida, implementada servidor y UI, con tests |
| C-D3 | Portal de gestión de suscripción (cancelar, cambiar tarjeta) | **No existe** | 2 | M | C-D1 | No | Un creador Pro abre el portal desde su perfil |
| C-D4 | Aviso fiscal en el cobro (IRPF/autónomos), no como asesoría | No implementado | 5 | B | C-D2 | No | Texto visible en el momento del cobro |
| C-D5 | Packs mensuales/retainers (cobro recurrente) | **Backlog**, no empezar | 5 | A | C-D2, Q10 | Sí, grande | Diseño aprobado antes de código |
### Resto del proyecto

| ID | Tarea | Estado | Prio | Compl. | Depende de | BD | Criterio |
|---|---|---|---|---|---|---|---|
| C-L1 | Páginas de privacidad y términos (públicas, enlazadas en landing/registro) | **No existen** | 1 | B–M | — | No | Rutas públicas accesibles sin login. **Publicarlas pronto: desbloquea M-R4** |
| C-L2 | RGPD: exportar y borrar los datos de una persona (incluye borrar sus `social_accounts`/tokens, colaboraciones, pagos…) | **No existe** | 1 | A | C-L1, Q13 | Sí: RPC/endpoint de borrado y exportación — **zona protegida** | Una cuenta de prueba se exporta y se borra completa sin dejar huérfanos; test de integración |
| C-S1 | Rate limiting general (alta de cuentas, solicitudes, reportes). Existe `server/utils/rate-limit.ts` (en memoria, 1 proceso) usado solo por el login de admin | Parcial | 1 | M | Q3 (si hay varias instancias) | No | Los endpoints sensibles devuelven 429; documentado el límite del enfoque en memoria |
| C-S2 | Auditoría y revisión del panel de administración | **Nunca revisado** | 1 | M | — | No (solo lectura salvo hallazgos) | Informe de hallazgos + arreglos verificados en navegador |
| C-S3 | Probar en navegador el acceso cruzado entre roles (creador ↛ `/partner/*`, partner ↛ `/creator/*`, anónimo ↛ ambos) | Nunca probado | 1 | B | — | No | Matriz probada; fallos corregidos |
| C-F1 | Verificar con clics reales: aceptar/rechazar oferta en el chat; aprobar/pedir cambios (fuera del Calendario); solicitud→aceptación completa | Solo probado por RPC | 2 | M | — | No | Cada flujo ejecutado en navegador con ambas cuentas demo; resultado en CHANGELOG |
| C-F2 | CI/CD básico (GitHub Actions: `vue-tsc` + tests unitarios + build; integración **solo manual**, por el proyecto compartido) | **No existe** | 2 | B | — | No | El workflow corre en un PR de prueba |
| C-N1 | Notificaciones: agrupar solicitudes duplicadas | Pendiente (hallazgo #2) | 4 | M | — | Posible | Varias notificaciones iguales se muestran agrupadas |
| C-N2 | Chat: estado entregado/leído **por mensaje** | Parcial (hay `last_read_at` por conversación) | 4 | M | Q9 | Sí: columnas en `messages` o derivar de `last_read_at` (la opción sin esquema se evalúa primero) | El emisor ve "leído" con fiabilidad |
| C-N3 | Coherencia de estados de colaboración y limpieza de `offer_id` (`on delete set null` vs `cascade`) | Decisión pendiente | 4 | M | Q7 | Sí si se cambia la FK | Decisión tomada y documentada |
| C-O1 | Onboarding guiado (tour distinto para creador y partner, saltable, no repetitivo) | Sin código | 6 | M–A | Q1 | Opcional: `profiles.onboarding_completed_at` | Sección "criterios" del README |
| C-U1 | Descubrimiento: probar en navegador lo ya construido (CHANGELOG 20) y pulir | Verificación pendiente | 5 | M | — | No (migración ya existente: comprobar si está aplicada) | Filtros, IA y ambas direcciones verificados |
| C-U2 | Perfil: gestión de fotos/personalización | Documentado en roadmap | 5 | M | — | No | Perfil editable y verificado |
| C-U3 | Accesibilidad con lector de pantalla y prueba en Safari/Firefox/tablet | Pendiente | 5 | M | — | No | Informe + arreglos |
| C-U4 | Backups de Supabase (el plan gratuito no tiene PITR) | Decisión operativa | 1 | B | Q12 | No | Decisión tomada |
## 3. Orden recomendado

1. **Fase 0**: resolver Q1, Q3, Q7, Q8, Q9; `git merge main` en la rama.
2. **Fase 1**: **C-L1 primero** (la otra rama lo necesita), luego C-D1 (Stripe en test), C-S3 → C-F1 → C-S2 → C-F2; C-O1 puede avanzar en paralelo (diseño primero).
3. **Fase 2**: C-D2 (con lo aprendido en C-D1) · C-L2 · C-S1 · C-N1 · C-N3 · C-U1.
4. **Fase 3**: C-D3 · C-D4 · C-N2 · C-U2 · C-U3 · C-U4.

El onboarding es prio 6 por el orden pedido, pero no depende de nada: puede construirse en paralelo con la Fase 1 si prefieres, siempre que el diseño (pasos, contenido, saltar/volver a ver, persistencia) se revise antes de escribir código.

## 4. Dependencias

- C-D1 → C-D2 → C-D4, C-D5. Externo: C-D1 necesita Stripe CLI y el onboarding Connect de un creador demo.
- C-D2 y C-N3 tocan `collaborations`: hacerlos en secuencia.
- C-L1 → M-R4 (Meta exige URL pública de privacidad). Dependencia entre ramas con fecha.
- C-L2 debe borrar también `social_accounts`/tokens: coordinar con **M-R3** (revocación en el proveedor).
- C-L2 ← Q13 (qué se conserva por obligación legal: pagos/facturas).
- C-F1/C-S3 deberían hacerse **antes** que C-N1/C-N3 para partir de un estado conocido.
- C-S1: `server/utils/rate-limit.ts` es tuyo; la otra rama lo usará para endpoints de redes. Hoy es en memoria y solo vale para una instancia (Q3).
- C-O1 ← Q1 (dónde se guarda el progreso).

## 5. Archivos que puede modificar

**Propios (libertad):**
- Dinero: `server/api/stripe/**`, `server/utils/stripe*.ts`, `app/composables/useMyBilling.ts`, `docs/7-STRIPE-SETUP.md`, botón de pago de `partner/requests.vue`.
- Nuevos: `app/components/onboarding/**`, `app/composables/useOnboardingTour.ts`, páginas legales (`app/pages/privacidad.vue`, `app/pages/terminos.vue` — rutas por confirmar), `.github/workflows/**`.
- Existentes: `app/pages/admin/**` y `server/api/admin/**`, `app/pages/chat/**`, `app/components/chat/**`, `app/composables/{useChat,useChatSettings,useNotifications,useDiscover,useProfileSearch}.ts`, `app/components/collab/**`, `app/pages/{creator,partner}/discover.vue`, `app/pages/inbox.vue`, `server/api/discover/**`, `server/utils/rate-limit.ts`, landing y `app/pages/{login,onboarding,confirm}.vue` y `role-guard.global.ts` (con cuidado: afectan a cada alta).

**Aviso importante sobre `app/pages/onboarding.vue`:** es el formulario de **alta de cuenta**, no el tour. El tour empieza después del primer login. Punto de anclaje recomendado para el tour: `app/components/layout/AppShell.vue`, igual que `ConfirmDialogHost.vue` (un componente montado una vez que decide solo si mostrarse), en vez de editar `creator/index.vue`/`partner/index.vue`.

## 6. Archivos compartidos que requieren coordinación

Ver también las secciones 6 y 11. Los que más te afectan:
- `app/components/layout/AppShell.vue`: **eres su único editor previsto** (punto de montaje del tour).
- `creator/index.vue` y `partner/index.vue`: evítalos; si el tour necesita anclas concretas, avisa antes (la otra rama trabaja en esos bloques).
- `creator/profile.vue` / `partner/profile.vue`: tuyos la ficha, las fotos (C-U2) y el bloque de facturación (C-D3).
- `creator/requests.vue` / `partner/requests.vue`: tuyo el detalle de colaboración y el botón de pago; la pestaña Calendario es de la otra rama.
- `app/types/index.ts`, `status.ts`, `nav.ts`, `mock-data.ts`: solo añadir al final de tu bloque.
- `nuxt.config.ts`, `.env.example`, `package.json`, `docs/CHANGELOG.md` (título con prefijo `[Compañero]`).
- `server/api/discover/search.post.ts` usa `social_accounts.followers_count`: no cambies esa consulta sin avisar a Mario.

## 7. Cambios de Supabase que podrían hacer falta

Todos requieren explicar el impacto y confirmar **antes** de escribir la migración, y deben ser aditivos:

| Tarea | Cambio previsto |
|---|---|
| C-D2 / C-D5 | estados/hitos de pago, posible RPC y cambios en el webhook de Stripe — **zona más sensible**, confirmar antes |
| C-O1 | opcional: `profiles.onboarding_completed_at` (patrón de `chat_privacy`/`avatar_url`). `profiles` la lee casi toda la app: impacto amplio. Alternativa sin esquema: `localStorage` (Q1) |
| C-L2 | RPC/endpoint de exportación y de borrado — **zona protegida**, con test de integración |
| C-N1 | posible agrupación en consulta o columna en `notifications` |
| C-N2 | derivar de `last_read_at` primero; columnas en `messages` solo si no basta (Q9) |
| C-N3 | cambio de FK `offer_id` (`set null`→`cascade`) solo si se decide (Q7) |
| C-F1/C-S3 | ninguno (solo lectura y pruebas) |

El proyecto de Supabase es **único y compartido**: una migración aplicada desde aquí afecta ya a la otra rama. Registra cada migración en la sección final de este archivo.

## 8. Pruebas y criterios de aceptación

Comandos: `npx vue-tsc --noEmit` · `npm test -- --run` · `npm run build` · `npm run test:integration` (solo si tocas datos/RLS/RPC, mesurando el límite de autenticación).

Criterios por tarea: tabla de la sección 2. Transversales (sección 12): typecheck/tests/build limpios; interfaz vista en navegador real a 390px y escritorio; CHANGELOG con "Qué se cambió / Verificado de verdad / Sin verificar".

Específicos de esta rama:
- **Stripe**: solo claves `sk_test_`; comprobar `.env` antes de cada prueba. Ningún pago real. No tocar Stripe/RPC de pago sin explicar impacto y confirmar.
- **Onboarding**: probar con cuentas **nuevas** creadas por `/onboarding`, no con las demo (`creator@feedma.test`/`partner@feedma.test`: las usa la otra rama); borrar las de prueba al terminar. Saltar el tour debe dejarlo cerrado en el siguiente login, no solo en esa pestaña. Nunca debe bloquear la app ni reaparecer en cada inicio de sesión.
- **Verificaciones (C-F1, C-S3)**: documentar en el CHANGELOG qué se pulsó, con qué cuenta y qué ocurrió, también los fallos.
- **C-L2**: probar el borrado solo con cuentas de prueba creadas para ello.
- Rate limit de Supabase Auth: "Request rate limit reached" es un límite, no un fallo de tu código; espera.

## 9. Fuera de tu responsabilidad

Todo lo relacionado con redes sociales (OAuth, tokens, métricas, sincronización, perfil↔redes, `social_accounts`, `metrics`) y el rediseño de publicaciones (Tablero, edición, revisión). Son de `feature/publicaciones-ux`.

## 10. Integración y prevención de conflictos

1. `git fetch origin` y `git merge main` en la rama antes de cada sesión.
2. Commits pequeños, `git add` de archivos concretos, sin secretos.
3. Avisar a Mario antes de: tocar un archivo de la sección 6, aplicar migración/RPC/policy, añadir dependencias, lanzar `test:integration`.
4. Prohibido: `git push --force`, `git reset --hard`, `git clean -fd` y fusionar esta rama con `feature/publicaciones-ux`.
5. Cuando una tarea cumpla sus criterios: PR hacia `main`. Tras fusionar la primera de las dos ramas, la otra hace `git merge main` y re-verifica los archivos compartidos.
6. Comandos útiles: `git branch --show-current` · `git diff main...feature/onboarding --stat` · `git log main..feature/onboarding --oneline`.

## 11. Reglas de Supabase compartidas con Mario


Reglas propuestas (acordarlas en la Fase 0):
1. **Solo migraciones aditivas** mientras haya dos ramas activas (añadir tablas/columnas nullable o con default). Nada de renombrar, borrar columnas ni endurecer RLS de forma que rompa el código de la otra rama; si hace falta, hacerlo en dos pasos (añadir → migrar código → retirar) con aviso.
2. **Avisar antes de aplicar** cualquier migración, RPC o policy: qué cambia, qué tablas toca, qué código de la otra rama podría verse afectado. Respuesta del otro antes de aplicar.
3. **Un solo ejecutor por migración y un registro** en la sección "Registro de migraciones" del final de este documento (cada uno anota las suyas en su propio archivo, para no provocar conflictos).
4. Nombres de migración con marca de tiempo única; si dos coinciden, la segunda se renombra antes de fusionar (ya ocurrió: hay dos `20261021160000_*`).
5. **Las zonas protegidas** (Stripe, RLS, esquema, OAuth, RPCs de seguridad como `accept_collaboration_request`, `respond_offer`, `approve_post`) requieren explicar el impacto y recibir confirmación antes de tocar, igual que hasta ahora.
6. Tests de integración y cuentas demo: se escriben datos reales en el mismo proyecto y el límite de autenticación es compartido. Ejecutar `npm run test:integration` con moderación, y **avisar** si se va a lanzar justo antes de que el otro pruebe login. Limpiar residuos de prueba con criterio explícito.
7. `types: false`: los tipos de Supabase se escriben a mano; si se cambian columnas, actualizar el composable correspondiente en la misma rama.

## 12. Criterios de finalización (valen para toda tarea)

1. `npx vue-tsc --noEmit`, `npm test -- --run` y `npm run build` limpios.
2. `npm run test:integration` si se tocaron datos/RLS/RPC (respetando el límite de autenticación).
3. Cambios de interfaz **vistos en un navegador real** (390px y escritorio) con cuenta demo o cuenta nueva según el caso. Que compile no basta.
4. Entrada en `docs/CHANGELOG.md` con "Qué se cambió / Verificado de verdad / Sin verificar".
5. Si hay migración: documentada, aprobada por el otro y registrada antes de aplicarse.
6. Integración: PR hacia `main`; antes, `git merge main` en la rama y repetir 1–3 tras resolver conflictos. Tras fusionar la primera rama, la segunda se actualiza con `main` y se re-verifican los flujos de los archivos compartidos de la sección 6. No se fusionan las dos ramas entre sí.
7. Una tarea no pasa a "hecha" por existir código: debe constar qué se probó y cómo.

## 13. Decisiones pendientes que te afectan

| # | Pregunta | Bloquea | Mi recomendación |
|---|---|---|---|
| Q1 | Progreso del tour: columna `profiles.onboarding_completed_at` o `localStorage` | C-O1 | `localStorage` en la primera versión; columna después si molesta |
| Q2 | Política de pago: por hitos, todo al final, o señal + resto | C-D2, C-D5 | Señal + resto al aprobar la entrega; decidir tras C-D1 |
| Q3 | ¿Dónde se despliega y qué scheduler hay (cron del host, Supabase pg_cron, GitHub Actions)? | M-R5, C-S1 | Decidir antes de diseñar sync; sin respuesta, M-R5 queda en espera |
| Q7 | `offer_id` en cascade o set null | C-N3 | Mantener set null |
| Q8 | Estrategia de ramas: ¿trabajar en las ramas actuales o crear subramas por tarea (`feature/redes-*`, `feature/pagos-*`)? El nombre `feature/publicaciones-ux` ya no refleja su alcance | Todo | Subramas cortas por tarea, creadas desde la rama actual; PR a `main` |
| Q9 | Entregado/leído por mensaje: ¿se acepta una columna nueva o se deriva de `last_read_at`? | C-N2 | Derivar primero; columna solo si no basta |
| Q10 | Packs recurrentes: ¿antes o después de estabilizar redes y pagos? | C-D5 | Después de C-D2 |
| Q11 | ¿Aceptáis el reparto o se mueve algo para equilibrar (p. ej. mover M-P1 a otra persona o dejar C-D5 fuera)? | — | Mantenerlo; revisar tras la Fase 1 |
| Q12 | Backups: ¿plan de pago de Supabase ahora o al tener usuarios reales? | C-U4 | Antes del primer pago real |
| Q13 | Al borrar una cuenta, ¿qué se conserva por obligación legal (pagos, facturas)? | C-L2 | Consultar con un gestor antes de implementar |
## 14. Relación con `docs/PENDIENTES.md`

| Punto de PENDIENTES | Estado según el código | Tarea |
|---|---|---|
| §1 Pagos nunca probados | Pendiente (confirmado: no hay evidencia de lo contrario) | C-D1 |
| §1 Sin portal de suscripción | Confirmado: no hay ninguna referencia a portal de facturación en `app`/`server` | C-D3 |
| §3 Aceptar/rechazar oferta, aprobar/pedir cambios con clics | Pendiente de verificar | C-F1 |
| §3 Acceso cruzado entre roles | Pendiente de verificar | C-S3 |
| §4 Admin sin revisar | Pendiente | C-S2 |
| §5 Safari/Firefox/lector de pantalla | Pendiente | C-U3 |
| §6 Sin CI/CD | Confirmado (no existe `.github/`) | C-F2 |
| §6 Sin páginas legales | Confirmado | C-L1, C-L2 |
| §6b Política de pago | Confirmado en `pay-collaboration.post.ts` (acepta `accepted`, `in_progress`, `completed`) | C-D2 |
| §6b Rate limiting general | Confirmado: `checkRateLimit` solo se usa en el login de admin | C-S1 |
| §7 Agrupar solicitudes duplicadas | Pendiente | C-N1 |
| §7 Entregado/leído en chat | **Parcial**: existe `last_read_at` por conversación (no por mensaje) | C-N2 |
| §7 `offer_id` set null vs cascade | Decisión pendiente | C-N3 |
| §7 Onboarding / publicaciones segunda vuelta | Pendiente | C-O1 / M-P1 |
| **§6b "login de admin sin límite de intentos"** | **DISCREPANCIA — ya está implementado**: `server/api/admin/login.post.ts` limita 8 intentos/10 min por IP con `checkRateLimit`, y hay `tests/unit/rate-limit.spec.ts`. No verificado en navegador; limitación: en memoria y por IP | — (actualizar PENDIENTES y `10-ROADMAP-FUTURO.md`) |
Otras discrepancias detectadas (no están en PENDIENTES):

- `docs/10-ROADMAP-FUTURO.md` sitúa `payableStatuses` en `partner/profile.vue`; está en `partner/requests.vue`. El mismo doc dice que el login de admin no tiene límite (ya lo tiene) y hay dos documentos con prefijo `10-`.
- Falta confirmar si la migración de Discovery (`20261021150000`) está aplicada en el proyecto real.
## 15. Qué hace la otra persona

Mario lleva todas las redes sociales (OAuth, tokens, métricas, sincronización, `social_accounts`, `metrics`) y las publicaciones (Tablero, edición, revisión). **Lo tuyo que le bloquea: C-L1 (privacidad y términos públicos) → su M-R4 (Meta lo exige).** Tu C-L2 (borrar cuenta) debe borrar también `social_accounts`/tokens: coordínalo con su M-R3. Tú eres dueño de `server/utils/rate-limit.ts`, que él usará.
---

## Anexo — diseño previsto del onboarding (heredado del README anterior)

- Contenido: bienvenida breve, recorrido por los apartados principales, una primera acción recomendada por rol, posibilidad de saltarlo y de volver a verlo. Recorridos distintos para creador y partner.
- `app/utils/nav.ts` (`roleMeta`) ya tiene `label`/`description`/`home`/`icon` por rol, útil como punto de partida para los textos.
- `app/pages/confirm.vue` es donde aterriza alguien tras confirmar el email: sitio natural para decidir "primera vez", pero cambiarlo afecta a cada alta; compártelo antes.
- Anclar el tour a elementos estables (rutas de navegación, landmarks con `aria-label`), no a la estructura interna de pantallas que cambian en la otra rama.
- Diseñar y revisar con Mario antes de construir, tal como pidió el usuario. No debe aparecer en cada login ni bloquear la app.
- `README.md` raíz y `docs/5-FRONTEND-WORK-SPLIT.md` están desactualizados; para el estado real usa `docs/CHANGELOG.md`, `docs/CONTEXTO_PROYECTO_FEEDMA.md`, `docs/PENDIENTES.md` y este documento.

## Registro de migraciones aplicadas desde esta rama

| Fecha | Archivo | Qué cambia | Aprobada por |
|---|---|---|---|
| — | — | (ninguna todavía) | — |
