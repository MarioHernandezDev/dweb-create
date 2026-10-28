# Plan de trabajo en paralelo — FEEDMA

> Elaborado el 2026-10-28 sobre `main` (`dace066`). **Es una propuesta pendiente de aprobación: no se ha implementado nada.** Sustituye el reparto "publicaciones / onboarding" de la preparación anterior (los `TRABAJO_MARIO.md y TRABAJO_ALEX.md` de cada rama se han actualizado para reflejar este plan).
>
> **Cómo se ha hecho el inventario:** leyendo `docs/PENDIENTES.md`, `docs/10-ROADMAP-FUTURO.md`, los docs de OAuth, el esquema y las migraciones, y el código de `server/api/**`, `app/composables/**` y las páginas relevantes. **No se han ejecutado tests, build ni navegador en esta tarea** — todo lo marcado como "implementado" significa "hay código que lo hace", no "está verificado". Donde no he podido comprobar algo, se dice.

Nomenclatura: tareas de Mario = `M-…` (rama `feature/publicaciones-ux`); tareas del compañero = `C-…` (rama `feature/onboarding`). Prioridad = nivel 1–7 del orden pedido (1 seguridad/datos/pagos · 2 errores en flujos principales · 3 integraciones esenciales · 4 coherencia de estados/notificaciones · 5 usabilidad · 6 onboarding · 7 visual).

---

## A. Estado general de FEEDMA

Producto: marketplace creadores ↔ partners (marcas). Nuxt 4 + Supabase (un único proyecto remoto compartido, 31 migraciones) + Stripe (claves test) + OpenRouter (IA). Español únicamente.

| Área | Estado real (por lectura de código/docs) |
|---|---|
| Alta/login, roles `creator`/`partner`, guardas de ruta | Implementado; verificado en sesiones previas con cuentas demo. Acceso cruzado entre roles **nunca probado en navegador**. |
| Descubrimiento bidireccional con filtros + IA | Implementado (CHANGELOG 20). Roadmap dice "pendiente aplicar migración y probar en navegador" — **no he podido comprobar si se hizo**. |
| Colaboraciones: solicitud → oferta/contraoferta → aceptación, brief, términos, registro, valoraciones | Implementado; RPCs cubiertos por tests de integración. Clics reales de aceptar/rechazar oferta en chat **sin verificar**. |
| Chat, ofertas de paquete | Implementado. Hay `last_read_at` por conversación (contador de no leídos); **no hay** estado entregado/leído por mensaje. |
| Publicaciones (Tablero, edición, revisión del partner) | Rediseñado y verificado en navegador (CHANGELOG 49–52). Queda segunda vuelta y la decisión de si la aprobación es una puerta real. |
| Notificaciones | Implementado; falta agrupar duplicadas. |
| Pagos: suscripción Pro + pago de colaboración con Connect | Código completo, tests unitarios/webhook de idempotencia; **ningún pago probado de principio a fin, ni en test**. Sin portal de suscripción. |
| Redes sociales | OAuth **implementado** para Instagram y YouTube (tokens cifrados). Instagram **bloqueado** por la creación de la app de Meta. Solo se leen seguidores (+ detalle de canal de YouTube). TikTok/X/Facebook/LinkedIn: "Conectar" crea una fila **sin token** (marcador sin verificar). La tabla `metrics` existe pero **nada escribe en ella**. |
| Panel admin | Existe, **nunca auditado**. El login SÍ tiene límite de intentos (ver discrepancias). |
| Onboarding guiado | No existe. `app/pages/onboarding.vue` es el formulario de alta, no un tour. |
| Legal/RGPD | No existen páginas de privacidad/términos ni exportar/borrar datos. |
| CI/CD, entorno de pruebas separado | No hay (no existe `.github/`); decisión consciente de no tener Supabase de pruebas. |

---

## B. Inventario de tareas

Complejidad: B/M/A. "BD" = migración/RPC/RLS. Todas las tareas con BD requieren la confirmación descrita en la sección E **antes** de escribir la migración.

### B.1 Redes sociales — TODAS asignadas a Mario (`M-R*`)

| ID | Tarea | Estado actual | Prio | Compl. | Depende de | BD | Criterio de terminado |
|---|---|---|---|---|---|---|---|
| M-R1 | Verificar de extremo a extremo la conexión OAuth de Instagram y YouTube (conectar, ver datos, reconectar) | YT: código + doc; el doc dice que el usuario lo conectó, **no verificado por mí**. IG: **bloqueado** (sin cuenta de Facebook/app de Meta) | 3 | M | Decisión Q5 | No | Conexión real de ambas redes con una cuenta de creador, vista en navegador; resultado en CHANGELOG |
| M-R2 | Ciclo de vida de tokens: refrescar el token de Instagram (dura ~60 días; hoy `token_expires_at` se guarda pero **nada lo refresca**), detectar token caducado/revocado en ambas redes y mostrar estado "Reconectar" en Redes/Métricas | **No implementado** (no estaba en PENDIENTES) | 3 | A | M-R1 (IG) | Probable: columnas `status`/`last_error`/`last_synced_at` en `social_accounts` | Un token caducado simulado produce estado "reconectar" visible, no un error genérico ni datos congelados |
| M-R3 | Desconexión completa: hoy "..." solo borra la fila, **no revoca el token en el proveedor**; pasar a endpoint de servidor que revoque (Google tiene revoke; Instagram: documentar la limitación) y confirme | Parcial (solo borra fila) | 3 | B–M | M-R2 | No (borrado ya permitido por RLS) | Tras desconectar, el token deja de ser válido en Google; la UI confirma antes |
| M-R4 | Endpoints de desautorización y borrado de datos que Meta exige para pasar de modo Desarrollo a público | **No implementado** | 3 | M | C-L1 (URL pública de privacidad), M-R1 | No (borra `social_accounts`) | Meta acepta la URL de borrado; borrar desde Meta elimina la fila y tokens |
| M-R5 | Sincronización programada (hoy solo botón manual "Actualizar") y `last_synced_at` | **No implementado**; no hay scheduler ni se sabe dónde se despliega | 3 | A | Decisión Q3 (hosting) | Posible columna (con M-R2) | Un job refresca todas las cuentas conectadas sin intervención, con límite de peticiones y registro de fallos |
| M-R6 | Métricas de Instagram: alcance e interacciones (insights) | El scope `instagram_business_manage_insights` ya se pide, pero el código **solo lee `followers_count`**; nombres de métricas "por verificar contra una app real" | 3 | A | M-R1, M-R8; posible App Review de Meta | Ver M-R8 | Datos reales de alcance/interacciones en pantalla, contrastados con la app de Instagram |
| M-R7 | Vincular cada publicación del Tablero con su contenido real (vídeo de YouTube / post de Instagram) y mostrar sus métricas | **No implementado**; `posts.platform` es solo texto, no apunta a una cuenta ni a un id externo | 3 | A | M-R8 | Sí: columna(s) en `posts` (p. ej. `social_account_id` + id/URL externo) o uso de `posts.metadata` — **decisión de esquema** | Una publicación ligada a un vídeo muestra sus vistas/likes reales |
| M-R8 | Definir y construir el pipeline que escribe en `metrics` (hoy la tabla existe y **nada escribe**): qué se guarda, histórico vs último valor, idempotencia, lectura segura por RLS | **No implementado** | 3 | A | Decisión de esquema | Sí: posible ajuste de `metrics` + RLS de lectura | Una sincronización escribe filas; el creador (y el partner de una colaboración, ver M-R15) puede leerlas, nadie más |
| M-R9 | Predicción de éxito basada en rendimiento real de publicaciones anteriores | Hoy: prompt a LLM + `ml-heuristic.ts`; PENDIENTES dice "solo heurística" — **revisar cuál es la lógica real antes de empezar** | 5 | A | M-R6/R7/R8 | No | La predicción usa histórico real cuando existe y lo dice en pantalla |
| M-R10 | TikTok, X, Facebook, LinkedIn: decidir entre OAuth real o retirar el "Conectar" falso (crea filas sin token que aparecen como "sin verificar") | Decisión pendiente | 2 | B (retirar) / A (implementar) | Decisión Q4 | Posible limpieza de filas sin token (criterio explícito antes de borrar) | La pantalla de Redes no ofrece conexiones que no sean reales |
| M-R11 | Que el navegador no pueda leer las columnas `access_token_encrypted`/`refresh_token_encrypted`: la policy `social_accounts_select_self` permite `select *` al dueño | Hallazgo nuevo (cifrado, riesgo bajo, pero innecesario) | 1 | B–M | — | **RLS/grants** (restringir columnas o vista) — requiere confirmación | `select access_token_encrypted` desde el navegador falla; Redes y perfil público siguen funcionando; test de integración |
| M-R12 | Redes ↔ perfiles: métricas verificadas en perfil público y en Descubrir (hoy RPC `get_public_social_accounts`; `discover/search` suma `followers_count`) | Parcial (seguidores) | 5 | M | M-R8 | Posible ajuste del RPC público | Un partner ve en el perfil de un creador cifras verificadas y su fecha |
| M-R13 | Tests de redes: no hay tests de `token-crypto`/`oauth-state` ni de RLS de `social_accounts` | **No existen** | 2 | B–M | — | No | Unit de cifrado/estado OAuth + integración de RLS; pasan |
| M-R14 | Actualizar `docs/9-…` y `docs/10-YOUTUBE-…` al estado final; corregir comentarios obsoletos | Parcial | 7 | B | Final de R1–R8 | No | Docs coinciden con el código |
| M-R15 | Informe de resultados de una colaboración para el partner (rendimiento de las publicaciones entregadas) | **Nueva, no documentada** | 5 | M–A | M-R7, M-R8 | Lectura RLS (con M-R8) | El partner de una colaboración ve el rendimiento de sus entregas |

### B.2 Dinero (`C-D*`) — Stripe es una sola pieza, un solo dueño: el compañero

| ID | Tarea | Estado | Prio | Compl. | Depende de | BD | Criterio |
|---|---|---|---|---|---|---|---|
| C-D1 | Probar de verdad en modo test: suscripción Pro y pago de colaboración con Connect (Stripe CLI + onboarding de un creador demo) | Nunca probado | 1 | M | — | No | Ambos flujos completados en test; webhooks recibidos; resultado en CHANGELOG con lo que falló |
| C-D2 | Política de cuándo se puede pagar (hoy se permite al **aceptar**: `pay-collaboration.post.ts` y `payableStatuses` en `partner/requests.vue`) | Decisión + implementación pendientes | 1 | A | C-D1, Decisión Q2 | Probable: estados/hitos de pago, RPC, webhook — **zona protegida** | Política elegida, implementada servidor y UI, con tests |
| C-D3 | Portal de gestión de suscripción (cancelar, cambiar tarjeta) | **No existe** | 2 | M | C-D1 | No | Un creador Pro abre el portal desde su perfil |
| C-D4 | Aviso fiscal en el cobro (IRPF/autónomos), no como asesoría | No implementado | 5 | B | C-D2 | No | Texto visible en el momento del cobro |
| C-D5 | Packs mensuales/retainers (cobro recurrente) | **Backlog**, no empezar | 5 | A | C-D2, Q10 | Sí, grande | Diseño aprobado antes de código |

### B.3 Publicaciones (`M-P*`)

| ID | Tarea | Estado | Prio | Compl. | Depende de | BD | Criterio |
|---|---|---|---|---|---|---|---|
| M-P1 | Segunda vuelta de UX de publicaciones (backlog del README anterior) | Primer pase hecho y verificado (CHANGELOG 49–52) | 5 | M | — | No | Criterios del README; verificado en navegador 390px y escritorio |
| M-P2 | Hacer de la aprobación del partner una puerta real (hoy el creador puede saltarse "Para revisar" con aviso) | Decisión pendiente | 4 | M–A | Q6 | **RLS/RPC sobre `posts`** | Decisión tomada; si sí: bloqueo en servidor + test de integración |

### B.4 Tareas del compañero (`C-*`)

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

### B.5 Backlog sin asignar a fecha (no empezar)
Moderación de contenido subido · motor de tendencias con IA (`app/_disabled/creator/trends.vue`, aparcado) · internacionalización (descartada).

---

## C. Matriz de responsabilidades

| Área | Mario (`feature/publicaciones-ux`) | Alex (`feature/onboarding`) |
|---|---|---|
| Redes sociales (OAuth, tokens, métricas, sync, perfil↔redes) | **Todo** (M-R1…R15) | Nada |
| Stripe y pagos | Nada | **Todo** (C-D1…D5) |
| Publicaciones | M-P1, M-P2 | Nada |
| Legal/RGPD/seguridad transversal | M-R11 (tokens) | C-L1, C-L2, C-S1, C-S2, C-S3 |
| Verificación de flujos, CI | — | C-F1, C-F2 |
| Notificaciones, chat, estados de colaboración | — | C-N1, C-N2, C-N3 |
| Onboarding, descubrimiento, perfil, accesibilidad | — | C-O1, C-U1…U4 |

Carga: Mario 17 tareas (varias bloqueadas por terceros —Meta— o en backlog: R1/R4/R6), compañero 20 (C-D5 es backlog). Mario concentra las redes, que son pocas piezas grandes en archivos propios; el compañero tiene más tareas, algunas pequeñas. **Ver Q11** si se quiere mover algo.

Motivos de cambios respecto a la preparación anterior: (1) `feature/publicaciones-ux` pasa de "solo publicaciones" a redes + publicaciones, porque el usuario exige todas las redes; (2) `feature/onboarding` pasa de "solo tour" a todo el resto, incluido Stripe (pieza indivisible, asignada por decisión del usuario el 2026-10-28), porque la mayoría de lo pendiente no tiene relación con redes.

---

## D. Orden de ejecución

**Fase 0 — antes de escribir código (ambos):** resolver las decisiones Q1–Q13 que bloquean (sobre todo Q2, Q3, Q4, Q5); traer `main` a ambas ramas; acordar el protocolo de migraciones (sección E).

**Fase 1 — en paralelo, sin depender el uno del otro**
- Mario: M-R2 + M-R13 + M-R10 (no necesitan Meta), M-R11 (tras confirmación), M-P1.
- Compañero: C-L1 (publicar privacidad/términos **primero**), C-D1 (Stripe test), C-S3, C-F1, C-S2, C-F2, C-O1.

**Fase 2**
- Mario: M-R3, M-R8 → M-R7, M-R1 cuando haya cuenta de Meta, M-R4 cuando exista la URL de C-L1.
- Compañero: C-D2 (con los hallazgos de C-D1), C-L2, C-S1, C-N1, C-N3, C-U1.

**Fase 3**
- Mario: M-R6, M-R5 (tras Q3), M-R9, M-R12, M-R15, M-P2.
- Compañero: C-D3, C-D4, C-N2, C-U2, C-U3, C-U4.

**Cadenas de dependencia críticas:**
1. C-L1 → M-R4 (Meta exige URL de privacidad). *Única dependencia entre ramas con fecha.*
2. M-R2 → M-R3, M-R5 · M-R8 → M-R6, M-R7 → M-R9, M-R12, M-R15.
3. C-D1 → C-D2 → C-D4, C-D5.
4. C-L2 (borrar cuenta) debe borrar `social_accounts`: **coordinar con M-R3** el formato de borrado/revocación.
5. C-S1 (utilidad `rate-limit.ts`) y M-R5 (sync): el job de sync no debe pasar por el límite de usuario; Mario usa la utilidad, el compañero es dueño de ella.

---

## E. Cambios compartidos

### Archivos con riesgo de conflicto
| Archivo | Quién lo toca | Regla |
|---|---|---|
| `app/pages/creator/index.vue`, `app/pages/partner/index.vue` | Mario (bloques de redes/entregas), compañero (si el tour ancla algo) | El tour se ancla en `AppShell.vue`; si hay que tocarlas, avisar y limitarse al bloque propio |
| `app/pages/creator/profile.vue`, `partner/profile.vue` | Compañero (C-D3 portal, bloque de facturación y C-U2, ficha); Mario no necesita tocarlos | Cada uno su bloque; avisar antes de mover secciones |
| `app/pages/partner/requests.vue`, `creator/requests.vue` | Mario (pestaña Calendario), compañero (botón de pago C-D2, C-F1/C-N3, resto del detalle) | Mismo patrón por pestañas/bloques |
| `app/types/index.ts`, `app/utils/status.ts`, `app/utils/nav.ts`, `app/utils/mock-data.ts` | Ambos | Solo añadir al final de su bloque; no reordenar ni renombrar |
| `app/components/layout/AppShell.vue` | Compañero (monta el tour) | Mario no lo toca |
| `server/utils/rate-limit.ts` | Compañero (dueño); Mario lo usa | — |
| `nuxt.config.ts` (`runtimeConfig`), `.env.example` | Ambos (variables nuevas de redes / CI) | Añadir líneas, no reordenar; **nunca** valores reales |
| `docs/CHANGELOG.md` | Ambos | Ambos añaden arriba → conflicto garantizado al fusionar. Prefijar el título con `[Mario]`/`[Compañero]` y, al resolver, conservar las dos entradas |
| `package.json` / `package-lock.json` | Ambos | Avisar antes de añadir dependencias; regenerar el lock al fusionar, no resolverlo a mano |

### Supabase: un solo proyecto remoto para las dos ramas
Una rama de Git **no aísla** la base de datos. Una migración aplicada desde una rama es visible al instante para la otra y para la rama `main`.

Reglas propuestas (acordarlas en la Fase 0):
1. **Solo migraciones aditivas** mientras haya dos ramas activas (añadir tablas/columnas nullable o con default). Nada de renombrar, borrar columnas ni endurecer RLS de forma que rompa el código de la otra rama; si hace falta, hacerlo en dos pasos (añadir → migrar código → retirar) con aviso.
2. **Avisar antes de aplicar** cualquier migración, RPC o policy: qué cambia, qué tablas toca, qué código de la otra rama podría verse afectado. Respuesta del otro antes de aplicar.
3. **Un solo ejecutor por migración y un registro** en la tabla de abajo (se rellena en el `TRABAJO_MARIO.md y TRABAJO_ALEX.md` de la rama que la aplica, no en este archivo, para no provocar conflictos).
4. Nombres de migración con marca de tiempo única; si dos coinciden, la segunda se renombra antes de fusionar (ya ocurrió: hay dos `20261021160000_*`).
5. **Las zonas protegidas** (Stripe, RLS, esquema, OAuth, RPCs de seguridad como `accept_collaboration_request`, `respond_offer`, `approve_post`) requieren explicar el impacto y recibir confirmación antes de tocar, igual que hasta ahora.
6. Tests de integración y cuentas demo: se escriben datos reales en el mismo proyecto y el límite de autenticación es compartido. Ejecutar `npm run test:integration` con moderación, y **avisar** si se va a lanzar justo antes de que el otro pruebe login. Limpiar residuos de prueba con criterio explícito.
7. `types: false`: los tipos de Supabase se escriben a mano; si se cambian columnas, actualizar el composable correspondiente en la misma rama.

### Tareas que necesitan BD (resumen)
| Tarea | Cambio | Dueño |
|---|---|---|
| M-R2 | columnas de estado/último sync en `social_accounts` | Mario |
| M-R7 / M-R8 | columnas en `posts` y/o ajuste de `metrics` + RLS de lectura | Mario |
| M-R11 | restringir lectura de columnas de tokens (RLS/grants) | Mario |
| C-D2 / C-D5 | estados/hitos de pago, posible RPC y webhook | Compañero |
| M-P2 | RLS/RPC de `posts` | Mario |
| C-L2 | RPC/endpoint de exportación y borrado | Compañero |
| C-N2 / C-N3 / C-N1 | columnas en `messages`, FKs `offer_id`, agrupación | Compañero |
| C-O1 | `profiles.onboarding_completed_at` (opcional) | Compañero |

Posible solapamiento: **`profiles`** (C-O1) y **`collaborations`** (C-D2, C-N3) los tocan tareas del mismo desarrollador (el compañero), así que se secuencian ellas mismas; aun así cualquier cambio ahí se anuncia antes, porque Mario lee ambas tablas (publicaciones, Descubrir).

---

## F. Riesgos

- **Conflictos de código:** páginas mixtas (`creator/index.vue`, `profile.vue`, `requests.vue`) y archivos de utilidades compartidas; CHANGELOG. Mitigación: sección E, ramas cortas, `git merge main` frecuente en cada rama (no entre ellas).
- **Esquema:** migración de una rama que rompe a la otra (la BD es única). Mitigación: solo aditivas + aviso.
- **Seguridad:** tokens de redes (M-R11); borrado de cuenta que deje tokens vivos en el proveedor (M-R3 + C-L2); rate limit en memoria insuficiente si se despliega en varias instancias; panel de admin sin auditar; pagos permitidos antes de que exista la entrega.
- **Dinero:** probar Stripe solo con claves `sk_test_`; antes de cualquier prueba, comprobar que `.env` no tiene claves de producción.
- **Externos:** App Review de Meta puede tardar semanas y exige privacidad/borrado de datos; la API de X es de pago; TikTok exige aprobación de app. Plan: no depender de ellos para cerrar el resto.
- **Regresiones funcionales:** la rama de Mario toca modelo `posts` y `social_accounts` (M-R7/R8) que lee el Tablero (M-P1): ambas son de Mario, así que se secuencian ellas mismas.
- **Datos de prueba mezclados con reales:** precedente ya documentado; borrar solo con criterio explícito.
- **Carga desequilibrada:** ver Q11.

---

## G. Criterios de finalización (válidos para toda tarea)

1. `npx vue-tsc --noEmit`, `npm test -- --run` y `npm run build` limpios.
2. `npm run test:integration` si se tocaron datos/RLS/RPC (respetando el límite de autenticación).
3. Cambios de interfaz **vistos en un navegador real** (390px y escritorio) con cuenta demo o cuenta nueva según el caso. Que compile no basta.
4. Entrada en `docs/CHANGELOG.md` con "Qué se cambió / Verificado de verdad / Sin verificar".
5. Si hay migración: documentada, aprobada por el otro y registrada antes de aplicarse.
6. Integración: PR hacia `main`; antes, `git merge main` en la rama y repetir 1–3 tras resolver conflictos. Tras fusionar la primera rama, la segunda se actualiza con `main` y se re-verifican los flujos de los archivos compartidos de la sección E. No se fusionan las dos ramas entre sí.
7. Una tarea no pasa a "hecha" por existir código: debe constar qué se probó y cómo.

---

## H. Relación con `docs/PENDIENTES.md`

| Punto de PENDIENTES | Estado según el código | Tarea |
|---|---|---|
| §1 Pagos nunca probados | Pendiente (confirmado: no hay evidencia de lo contrario) | C-D1 |
| §1 Sin portal de suscripción | Confirmado: no hay ninguna referencia a portal de facturación en `app`/`server` | C-D3 |
| §2 Métricas solo seguidores | Confirmado (`creator/metrics/index.vue`). **Añadido:** la tabla `metrics` nunca se escribe | M-R6/R7/R8 |
| §2 "Predicción basada en heurística" | **Por revisar**: `predict.post.ts` construye un prompt para un LLM además de `ml-heuristic.ts` | M-R9 |
| §3 Aceptar/rechazar oferta, aprobar/pedir cambios con clics | Pendiente de verificar | C-F1 |
| §3 Acceso cruzado entre roles | Pendiente de verificar | C-S3 |
| §3 OAuth Instagram/YouTube de extremo a extremo | Pendiente de verificar; IG bloqueado | M-R1 |
| §4 Admin sin revisar | Pendiente | C-S2 |
| §5 Safari/Firefox/lector de pantalla | Pendiente | C-U3 |
| §6 Sin CI/CD | Confirmado (no existe `.github/`) | C-F2 |
| §6 Sin Supabase de pruebas | Decisión tomada, sin cambios | — (Sección E) |
| §6 Sin páginas legales | Confirmado | C-L1, C-L2 |
| §6b Política de pago | Confirmado en `pay-collaboration.post.ts` (acepta `accepted`, `in_progress`, `completed`) | C-D2 |
| **§6b "login de admin sin límite de intentos"** | **DISCREPANCIA — ya está implementado**: `server/api/admin/login.post.ts` limita 8 intentos/10 min por IP con `checkRateLimit`, y hay `tests/unit/rate-limit.spec.ts`. No verificado en navegador; limitación: en memoria y por IP | — (actualizar PENDIENTES y `10-ROADMAP-FUTURO.md`) |
| §6b Rate limiting general | Confirmado: `checkRateLimit` solo se usa en el login de admin | C-S1 |
| §7 Agrupar solicitudes duplicadas | Pendiente | C-N1 |
| §7 Entregado/leído en chat | **Parcial**: existe `last_read_at` por conversación (no por mensaje) | C-N2 |
| §7 `offer_id` set null vs cascade | Decisión pendiente | C-N3 |
| §7 Aprobación no es puerta real | Decisión pendiente | M-P2 |
| §7 Onboarding / publicaciones segunda vuelta | Pendiente | C-O1 / M-P1 |

**Otras discrepancias detectadas (no están en PENDIENTES):**
- `docs/10-ROADMAP-FUTURO.md` sitúa `payableStatuses` en `partner/profile.vue`; está en `partner/requests.vue`. El mismo doc dice que el login de admin no tiene límite (ya lo tiene) y hay dos documentos con prefijo `10-`.
- El esquema inicial y `docs/2-DATABASE-SCHEMA.md` hablan de `influencers`/`manager`; la migración `20261021120000` los renombró a `creators`/`partner`. No he revisado si el doc está actualizado.
- Doc 9 y el comentario de `useMySocialAccounts.ts` describen el estado de YouTube de forma inconsistente (uno dice "sin OAuth todavía").
- Nada en PENDIENTES cubre: refresco de tokens de Instagram, revocación al desconectar, callbacks de Meta, tabla `metrics` sin uso, filas falsas de TikTok/X, lectura de columnas de tokens por el navegador.
- Falta confirmar si la migración de Discovery (`20261021150000`) está aplicada en el proyecto real.

---

## I. Decisiones necesarias antes de empezar

| # | Pregunta | Bloquea | Mi recomendación |
|---|---|---|---|
| Q1 | Progreso del tour: columna `profiles.onboarding_completed_at` o `localStorage` | C-O1 | `localStorage` en la primera versión; columna después si molesta |
| Q2 | Política de pago: por hitos, todo al final, o señal + resto | C-D2, C-D5 | Señal + resto al aprobar la entrega; decidir tras C-D1 |
| Q3 | ¿Dónde se despliega y qué scheduler hay (cron del host, Supabase pg_cron, GitHub Actions)? | M-R5, C-S1 | Decidir antes de diseñar sync; sin respuesta, M-R5 queda en espera |
| Q4 | TikTok/X/Facebook/LinkedIn: ¿OAuth real o retirar el "Conectar" falso? | M-R10 | Retirar ahora (Instagram/YouTube solo); reabrir cuando haya demanda |
| Q5 | ¿Hay ya cuenta de Facebook/app de Meta disponible? | M-R1, M-R4, M-R6 | Si no, tratar Instagram como bloqueado y avanzar el resto |
| Q6 | ¿La aprobación del partner debe ser un bloqueo real (cambio de RLS)? | M-P2 | No por ahora; mantener el aviso |
| Q7 | `offer_id` en cascade o set null | C-N3 | Mantener set null |
| Q8 | Estrategia de ramas: ¿trabajar en las ramas actuales o crear subramas por tarea (`feature/redes-*`, `feature/pagos-*`)? El nombre `feature/publicaciones-ux` ya no refleja su alcance | Todo | Subramas cortas por tarea, creadas desde la rama actual; PR a `main` |
| Q9 | Entregado/leído por mensaje: ¿se acepta una columna nueva o se deriva de `last_read_at`? | C-N2 | Derivar primero; columna solo si no basta |
| Q10 | Packs recurrentes: ¿antes o después de estabilizar redes y pagos? | C-D5 | Después de C-D2 |
| Q11 | ¿Aceptáis el reparto o se mueve algo para equilibrar (p. ej. mover M-P1 a otra persona o dejar C-D5 fuera)? | — | Mantenerlo; revisar tras la Fase 1 |
| Q12 | Backups: ¿plan de pago de Supabase ahora o al tener usuarios reales? | C-U4 | Antes del primer pago real |
| Q13 | Al borrar una cuenta, ¿qué se conserva por obligación legal (pagos, facturas)? | C-L2 | Consultar con un gestor antes de implementar |
