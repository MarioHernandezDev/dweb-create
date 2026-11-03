# FEEDMA — Validación de hallazgos críticos

| | |
|---|---|
| Fecha | 2026-11-03 |
| Rama | `feature/integracion-alex-mario` (sobre `0ab25da`, cambios sin commit) |
| Origen | Hallazgos de `00_PROJECT_MAP.md` §17 |
| Alcance | H0-01, H0-02, H0-03, H0-08 y, además, la contraseña de demo (H0-09), los commits pendientes y la CI (H0-06) y el entorno aislado (H0-04) |

**Garantías de esta subfase.**

- **No se ha aplicado ninguna migración** a la base compartida y no se ha alterado ningún dato real.
- **Stripe solo en modo test y solo lectura**: no se ha creado ningún objeto ni hecho ningún cobro.
- Las comprobaciones de permisos contra la base real usaron la clave pública `anon`, sin sesión, y entradas que **no pueden escribir nada** según el cuerpo de cada función.
- Las migraciones nuevas se han probado en un **Postgres aislado en memoria** (PGlite) que no se conecta a nada.
- Ninguna clave ni URL se ha impreso en la salida de los comandos.

> **Actualización (2026-11-03, después de aplicar).** Alex aplicó las tres migraciones nuevas. Lo comprobado después:
>
> - **H0-03, verificado contra la base real para `anon`.** Repitiendo la sonda sin escritura, las **18 funciones revocadas dan `42501`**, y `current_creator_id`/`current_partner_id` siguen accesibles (las necesitan las políticas RLS).
> - **H0-02.** La columna `credit_ledger.stripe_invoice_id` existe en la base real. Como va en la misma transacción que el CHECK nuevo, la migración se aplicó entera.
> - **N-05.** Las 3 suscripciones de Stripe test del 20/10 están **canceladas** (autorizado por Alex; `livemode=false`; no tenían fila en FEEDMA). En Stripe test ya solo quedan `canceled: 3`.
> - ~~Pendiente de comprobar contra la base real: la parte `authenticated` de H0-03 y H0-08.~~ **Hecho con la auditoría de catálogo** (ver la segunda actualización).
>
> **Segunda actualización (2026-11-03, auditoría de catálogo por el Session pooler, transacción `READ ONLY`).** Ya funciona la conexión (N-03 resuelto: cadena del pooler en `.env`). Resultados:
>
> - **H0-03, verificado del todo.** `notify`, `_get_or_create_conversation` y `has_accepted_offer_between` solo los puede ejecutar `service_role`. Las 15 RPC de la app, solo `authenticated` y `service_role`. `PUBLIC` y `anon` no tienen permiso. Causa de fondo confirmada: los privilegios por defecto de `public` conceden `EXECUTE` a `anon` y `authenticated` en cada función nueva (`pg_default_acl`).
> - **H0-08, verificado.** `authenticated` no tiene DELETE, INSERT ni UPDATE sobre `social_accounts` ni puede leer los tokens. Solo hace `SELECT` sobre las 10 columnas no sensibles, y la única política es `social_accounts_select_self`.
> - **H0-02.** `subscriptions_status_check` tiene los 8 estados y existe `credit_ledger_stripe_invoice_id_key`. En `credit_ledger` no hay **ninguna** concesión de 20 créditos (11 de bienvenida de 3, 1 ajuste de admin): ninguna factura de Pro se procesó nunca.
> - **H0-14, estado del esquema.** Las **57 políticas vivas coinciden exactamente** con las migraciones (ninguna falta, ninguna sobra). Las 28 tablas tienen RLS. Los 13 triggers son los esperados. **31 de 32 funciones son idénticas a su última migración.** No existe `supabase_migrations.schema_migrations`: las migraciones se aplican a mano.
> - **H0-10, verificado.** `collaborations.creator_id` es la única FK `on delete set null` sobre una columna `NOT NULL`.
> - **Nuevo: H0-17 (CRÍTICO para el lanzamiento).** La función restante, `handle_new_user()`, es **la versión de `20261020180000_real_signup.sql`**, dos por detrás. Ver §4.9.
>
> **Tercera actualización (2026-11-03).** Alex aplicó `20261103160000`. Catálogo (solo lectura):
>
> - El `handle_new_user()` vivo es idéntico a la migración (`SECURITY DEFINER`, `search_path=public`, propietario `postgres`, que puede ejecutar `notify`).
> - El trigger `on_auth_user_created` está activo y existen las 9 columnas que usa.
> - Al repetir la auditoría entera: **32/32 funciones idénticas a su última migración**, 0 políticas que falten o sobren, 28/28 tablas con RLS y 13 triggers. **El esquema vivo está alineado con `supabase/migrations/`.**
> - Pendiente: el alta real (`signup-trigger.spec.ts` y `/onboarding` en navegador).
>
> **Cuarta actualización (2026-11-03): pruebas de aceptación contra la base real** (autorizadas por Alex):
>
> - `signup-trigger` **2/2**, `function-privileges` **23/23**, `social-accounts-rls` **16/16** y `offers` **4/4**. **H0-03, H0-08 y H0-17 quedan verificados también por comportamiento.**
> - Al revisar los restos apareció un defecto del test `offers.spec.ts`: dejaba una oferta aceptada por ejecución, porque desde R20i no se borra en cascada. Corregido; al repetirlo, 0 restos.
> - Sigue pendiente: el alta desde `/onboarding` en navegador y el circuito de Stripe (S1–S9).

**Cómo se distingue la evidencia:**

- **Código**: lo que dicen las migraciones o el código fuente.
- **Efectivo**: lo medido contra el proyecto real.
- **Aislado**: lo medido en PGlite.

---

## 1. Resumen ejecutivo

- **H0-01, confirmado y corregido.** El typecheck no revisaba nada desde siempre. El real encontró 30 errores: 29 de solo tipos (corregidos) y 1 fallo real, que es H0-02. Ahora la CI falla si hay un error de tipos.
- **H0-02, confirmado; corregido en código y con migración preparada.** FEEDMA Pro nunca habría concedido créditos. Al revisarlo salieron tres fallos más del webhook: respondía 200 aunque fallara la base, no era idempotente y la tabla rechaza 3 de los 8 estados de Stripe. Nunca ha causado daño en datos porque el circuito no se ha ejecutado nunca: no hay webhook registrado.
- **H0-03, confirmado con permisos efectivos; migración preparada.** Cualquiera con la clave pública del navegador, **sin cuenta**, puede ejecutar `notify()`: crear avisos para cualquier usuario con texto y enlace libres. También puede crear conversaciones entre terceros. Es el hallazgo de seguridad más grave de los cuatro.
- **H0-08, confirmado; migración preparada.** Impacto bajo (solo afecta a la propia cuenta), pero el permiso ya no tiene uso.
- **Nuevo, confirmado y corregido.** El límite de uso de Descubrir y de la predicción era **un único cupo para todos los usuarios** (`user.id` no existe en los claims del JWT).
- **Corrección de la Fase 0.** No hay commits sin subir a GitHub y la CI sí se ejecuta. Lo que fallaba era el paso de typecheck, que no comprobaba nada.
- **Contraseña de demo.** Retirada del código y la documentación salvo `login.vue` (de Mario). El repositorio es privado, pero la contraseña está en el historial: la única solución completa es rotarla.
- **Entorno aislado.** Hay una alternativa operativa ya probada (PGlite) para validar migraciones y permisos. Para pruebas de integración completas hace falta Supabase local con Docker (instalado, sin arrancar).

---

## 2. Tabla de hallazgos

| ID | Hallazgo | Estado anterior | Estado después de investigar | Evidencia | Solución | Prueba de aceptación | Estado final |
|---|---|---|---|---|---|---|---|
| H0-01 | El typecheck de CI y CHANGELOG no revisaba ningún archivo | Verificado (comando) | **Confirmado**. 30 errores reales ocultos | `vue-tsc --noEmit --listFiles` → 0 archivos. `vue-tsc -b --noEmit` → 30 errores. Con un error puesto a propósito: comando antiguo exit 0, nuevo exit 2 | `npm run typecheck` (`vue-tsc -b --noEmit`) en `package.json` y en la CI; 29 errores de solo tipos corregidos | `npm run typecheck` limpio y falla con un error en `app/` o `server/` | **Corregido** (local, sin commit) |
| H0-02 | El webhook lee `invoice.subscription`, que no existe | Hipótesis fuerte | **Confirmado** por el compilador, por los eventos reales de la cuenta y por un test unitario. Además: 200 ante fallos, sin idempotencia, CHECK de estados incompleto | TS2339 en `webhook.post.ts:135`; eventos `invoice.paid` reales (API endive) sin `subscription` en la raíz; 0 webhooks registrados; 3 suscripciones de test activas sin fila en la base | `server/utils/stripe-webhook.ts` + webhook con 500 y reintento + migración `20261103150000` (preparada) | Unitarios (11) ✔; aislado ✔; extremo a extremo con Stripe CLI (§4.2.6) pendiente | **Corregido en código; migración aplicada (columna comprobada); E2E pendiente** |
| H0-03 | Funciones `SECURITY DEFINER` ejecutables por cualquiera | Hipótesis | **Confirmado (efectivo)**. `anon` ejecuta las 20 funciones revisadas, incluida `notify()` | Sonda anon: `notify` → 204, `_get_or_create_conversation` → llega al INSERT (23502), resto → excepción propia de la función; ninguna 42501. Código: ningún `revoke execute` | Migración `20261103140000` (preparada) | Aislado ✔ (antes/después y `create_offer` sin regresión); `function-privileges.spec.ts` contra la base real tras aplicar | **Aplicada; verificada para `anon` (18/18 dan 42501); falta la parte `authenticated`** |
| H0-08 | El navegador puede borrar `social_accounts` | Verificado (código) | **Confirmado**: test de integración del 28/10 (Alex-10) + migración. Impacto bajo | `grant delete … to authenticated` + `social_accounts_delete_self`; el cliente ya no lo usa (A-R3) | Migración `20261103130000` (preparada) + test actualizado | Aislado ✔ ("permission denied"); `social-accounts-rls.spec.ts` tras aplicar | **Aplicada (según Alex); falta verificarla contra la base real** |
| N-01 (nuevo) | Límite de uso compartido por todos los usuarios en `discover/search` y `ml/predict` | — | **Confirmado (código + tipo de la librería)** | `serverSupabaseUser` devuelve claims (`getClaims`); `JwtPayload` tiene `[key: string]: any` y no tiene `id` → clave `…:undefined` | `user.sub` | Lectura de código; los demás endpoints ya usaban `sub` | **Corregido** |
| H0-09 | Contraseña de demo escrita en el repositorio | Verificado (código) | **Confirmado**: 9 archivos + historial desde el 19/10; la del `.env` es la misma; repositorio **privado** | `git grep`, `git log -S`, `gh repo view` → `PRIVATE` | Leída de `DEMO_PASSWORD`; retirada de seeds, `.env.example` y docs. **Falta** `login.vue` y la rotación | `git grep` solo da `login.vue`; `.output` limpio | **Parcial** (falta Mario + rotación) |
| H0-06 | 6 commits sin subir; `main` parada; CI nunca ejecutada | Verificado (sin `fetch`) | **Falso**: `origin/main` = `HEAD`; CI en verde desde el 30/10 | `git fetch` + `git rev-list`; `gh run list` (6 ejecuciones) | Ninguna; actualizar la `main` local cuando se quiera | — | **Corregido el diagnóstico** |
| CI | Estado real de la CI | "Nunca ejecutada" (TRABAJO_MARIO) | **Se ejecuta en cada push a `main` y en PR**; typecheck vacío; no corre en ramas sin PR | `gh run view` (pasos en verde) | Typecheck real (H0-01) | Siguiente push: el paso Typecheck debe tardar >10 s y revisar archivos | **Corregido (local)** |
| H0-04 | No hay entorno aislado | Verificado | **Confirmado**, con dos vías viables | Docker 29.2 instalado sin arrancar; 219 GB libres; PGlite probado | PGlite para migraciones y permisos (ya usable); Supabase local para integración | §4.8 | **Propuesto; necesita decisión** |
| N-02 (nuevo) | `creators_insert_own` no comprueba el rol: un partner puede crearse una ficha de creador | — | Confirmado (código) | Política `with check (profile_id = auth.uid())`; `profile_id` único | Exigir `role = 'creator'` en la política (y lo mismo en partners) | Test de integración de rol cruzado | **Pendiente** (BAJO) |
| N-03 (nuevo) | Conexión directa a Postgres imposible desde este equipo | — | Confirmado | Host `db.<ref>` solo con AAAA; IPv6 `ENETUNREACH` | Usar la cadena del *Session pooler* (IPv4) | Script de catálogo §4.3 ejecutado | **Resuelto** (pooler en `.env`; auditoría ejecutada) |
| **H0-17 (nuevo)** | El trigger de alta `handle_new_user()` vivo es una versión antigua: **las altas nuevas quedan sin ficha** | — | **Confirmado** (catálogo + reproducido en aislado) | Cuerpo vivo idéntico a `20261020180000`, distinto de `20261021120000`; 0 avisos `welcome` en la base; en PGlite: alta sin ficha, sin créditos ni aviso, y sin rol el alta falla | Migración `20261103160000_restore_handle_new_user.sql` (preparada) | Aislado ✔; `signup-trigger.spec.ts` contra la base real tras aplicar; alta real desde `/onboarding` en navegador | **Aplicada y verificada en el catálogo** (cuerpo idéntico, trigger activo, columnas presentes); falta el alta real |

---

## 3. Severidad orientativa

| ID | Gravedad | Motivo |
|---|---|---|
| H0-17 | **CRÍTICO** (lanzamiento) | Ninguna cuenta nueva creada desde `/onboarding` podría usar la app: sin ficha no hay perfil público, publicaciones ni presencia en Descubrir. Hoy sin daño en datos (no ha habido altas desde el 23/10) |
| H0-03 | **ALTO** | Sin autenticación se pueden inyectar avisos con enlaces a cualquier usuario: phishing dentro de la app. Los id de perfil se obtienen con una cuenta gratuita (el directorio de `profiles` es legible para cualquier usuario con sesión) |
| H0-02 | **ALTO** (pagos) | Quien pagara Pro no recibiría créditos y los fallos se callarían. Sin dinero real todavía |
| H0-01 | **ALTO** (proceso) | Todo "typecheck limpio" anterior carece de valor; ocultaba H0-02 |
| N-01 | **MEDIO** | Un usuario agota la IA de Descubrir y de predicción para todos durante un minuto |
| H0-09 | **MEDIO** | Repositorio privado; grave si este proyecto se despliega o el repositorio se publica sin rotar |
| H0-08 | **BAJO** | Solo afecta a la propia cuenta del creador |
| N-02 | **BAJO** | Confusión de roles y un perfil de creador falso en Descubrir |

---

## 4. Detalle por hallazgo

### 4.1 H0-01 — Typecheck

1. **Problema.** El `tsconfig.json` raíz es de tipo "solution" (`files: []` + `references` a `.nuxt/tsconfig.{app,server,shared,node}.json`). Sin `-b`, `vue-tsc --noEmit` compila la lista vacía y termina en verde.
2. **Evidencia.**
   - `npx vue-tsc --noEmit --listFiles` imprime 0 líneas.
   - `npx vue-tsc -b --noEmit` da **35 líneas de error, 30 errores únicos**: los del servidor salen dos veces porque `server/` entra en dos proyectos.
   - Con `export const x: number = 'texto'` en `app/utils` y en `server/utils`: el comando nuevo falla con exit 2 en los dos sitios; el antiguo pasa con exit 0.
3. **Estado.** Confirmado.
4. **Impacto.** Ningún typecheck registrado en el CHANGELOG ni en la CI desde el inicio tenía valor. Errores ocultos:

   | Tipo | Archivos | Efecto en ejecución |
   |---|---|---|
   | Acceso por índice posiblemente `undefined` (`noUncheckedIndexedAccess`) | `useChat.ts` (9), `BottomTabBar.vue`, `SideRail.vue`, `usePackages.ts`, `admin/analytics.get.ts` | Ninguno: ya estaban protegidos en ejecución |
   | Tipos demasiado estrechos o casts | `PhaseBoard.vue`, `PostEditSheet.vue`, `post/[id].vue`, `YoutubeDashboard.vue`, `metrics/index.vue`, `profile/[role]/[id].vue`, `grant-pro.post.ts`, `predict.post.ts` | Ninguno |
   | `Retry-After` como string (h3 espera número) | `sync-all.post.ts` (2) | Ninguno (la cabecera se enviaba igual) |
   | `invoice.subscription` no existe | `webhook.post.ts` | **Fallo real → H0-02** |

5. **Solución aplicada.**
   - Script `typecheck` (`vue-tsc -b --noEmit`) en `package.json`.
   - La CI usa `npm run typecheck`, con un comentario que explica el porqué del `-b`.
   - Los 29 errores de solo tipos se han corregido con el cambio mínimo y equivalente en ejecución (guardas, anotaciones, `Readonly<Ref<number>>`).
   - El comando se ha actualizado en `PIPELINE_IMPLEMENTACION_FEEDMA_ALEX.md` y `docs/TRABAJO_ALEX.md`.
   - `docs/TRABAJO_MARIO.md`, `CONTEXTO_PROYECTO_FEEDMA.md` y `DESIGN.md` **siguen citando el comando antiguo**; los dos primeros son de Mario o históricos y no los he tocado.
6. **Pruebas.**
   - `npm run typecheck` → limpio, exit 0. La prueba del error a propósito está descrita arriba.
   - `npm test -- --run` → 36 archivos, **609 tests OK**.
   - `npm run build` → OK.
   - En local hizo falta `npx nuxt prepare` para que los tipos de Nitro incluyeran el archivo nuevo de `server/utils`. En la CI ya lo hace el `postinstall`.
7. **Pendiente.**
   - `tests/unit` y `tests/integration` **no entran en ningún proyecto de tsconfig**: los tests no se comprueban con tipos. Hace falta un `tests/tsconfig.json` (propuesto para la Fase 1).
   - El build avisa de auto-imports duplicados (`hasActiveFilters`, `formatCompactNumber`, `OfferStatus`), anteriores a estos cambios.
   - Node 24 en la CI frente a Node 22 en local; no hay `engines` ni `.nvmrc`.

### 4.2 H0-02 — Webhook de Stripe

1. **Problema.** `handleInvoicePaid` hacía `const subscriptionId = invoice.subscription`. Desde la API 2025-03-31 ese campo está en `invoice.parent.subscription_details.subscription`. Con `undefined`, la función salía al principio y **no concedía créditos**.
2. **Evidencia.** Todo en Stripe modo test, solo lectura, con un script que aborta si la clave no es `sk_test_`:
   - `stripe@23.0.0` fija la API `2026-09-30.endive`. La interfaz `Invoice` instalada no tiene `subscription`, y el compilador lo confirma (TS2339).
   - Los **30 últimos eventos de la cuenta** se generaron con `2026-09-30.endive`. En sus eventos de factura reales, `'subscription' in invoice === false` y `parent.subscription_details` está presente.
   - **0 webhooks registrados** en la cuenta. 8 checkout sessions, 3 customers, 1 cuenta Connect sin completar (`details_submitted=false`).
   - **3 suscripciones activas creadas el 20/10** con 3 facturas pagadas, y **0 filas** en `public.subscriptions` para ellas: el webhook nunca recibió esos eventos. `public.subscriptions` tiene 1 fila en total, sin id de Stripe.
3. **Estado.** **Confirmado** en código, en el formato real de los eventos y en un test unitario. El efecto en datos reales no se ha podido observar porque el circuito nunca se ha ejecutado.
4. **Impacto y problemas adicionales encontrados al revisar el webhook:**
   - Los créditos de Pro no se conceden nunca.
   - Cualquier error de escritura se registraba con `console.error` y se respondía **200**: Stripe no reintentaba y el estado se desfasaba en silencio.
   - `invoice.paid` **no era idempotente**: una entrega repetida (Stripe la documenta como posible) habría duplicado los créditos.
   - Si `invoice.paid` llegaba antes que `checkout.session.completed`, la recarga se perdía (el comentario lo daba por "aceptable").
   - El CHECK de `subscriptions.status` admite 5 de los 8 estados de Stripe: `unpaid`, `incomplete_expired` y `paused` fallaban.
   - `new Date(undefined * 1000).toISOString()` lanzaba `RangeError` si un evento venía con el formato antiguo.
5. **Solución.**
   - `server/utils/stripe-webhook.ts` (lógica pura): `subscriptionIdFromInvoice` (formato actual y antiguo), `currentPeriodEndIso` (devuelve `null` en vez de lanzar) e `isAlreadyRecorded` (23505).
   - `webhook.post.ts` usa `failAndRetry()`: un 500 con registro cuando falla una escritura o cuando la suscripción aún no está guardada.
   - Los créditos se insertan con `stripe_invoice_id`; si el registro ya existía, se responde 200.
   - El aviso al creador de "Te han pagado" sigue sin cortar el webhook si falla (el pago ya está registrado).
   - Migración **`20261103150000_billing_webhook_idempotency.sql` (preparada, NO aplicada)**: `credit_ledger.stripe_invoice_id` + índice único parcial, y el CHECK de estados con los 8 valores.
   - **Orden de despliegue.** Hasta aplicar la migración, `invoice.paid` responde 500 y Stripe reintenta hasta 3 días: no se pierde ni se duplica nada. Antes del cambio, los créditos no se concedían nunca.
6. **Pruebas.**
   - `tests/unit/stripe-webhook.spec.ts`: 11 casos. Incluyen el formato real `endive` y la demostración de que la lectura antigua daba `undefined`.
   - En el entorno aislado: la factura duplicada se rechaza con clave única y `unpaid` se acepta.
   - **Plan en Stripe Test Mode (por ejecutar)**: §4.2.6.
7. **Dependencias externas.**
   - Stripe CLI (no instalada) y autorización para aplicar la migración.
   - Coordinar con Mario, porque Stripe es su zona (`TRABAJO_MARIO` M-D1).
   - Decidir qué hacer con las **3 suscripciones de test activas del 20/10**: siguen renovándose en modo test sin contrapartida en FEEDMA. Recomiendo cancelarlas en el dashboard de test; no lo he hecho.

#### 4.2.6 Plan de prueba completa en Stripe Test Mode

Requisitos:

- Stripe CLI con `stripe login` en modo test.
- La migración `20261103150000` aplicada (o, mejor, un Supabase local, §4.8).
- `npm run dev`, y en otra consola `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Su `whsec_…` va a `STRIPE_WEBHOOK_SECRET` en `.env` (sin commitear).
- La CLI usa la versión por defecto de la cuenta (`endive`), la misma que el código.

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| S1 | Alta de Pro | Creador demo → Perfil → Facturación → Suscribirse → tarjeta `4242 4242 4242 4242` | `checkout.session.completed` → fila en `subscriptions` (`active`, `current_period_end` relleno); `invoice.paid` → +20 en `credit_ledger` con `stripe_invoice_id`; el saldo de la interfaz sube 20 |
| S2 | Reentrega | `stripe events resend <evt de invoice.paid>` | 200; **sin fila nueva** en `credit_ledger` |
| S3 | Orden invertido | Reenviar `invoice.paid` de una suscripción sin fila (por ejemplo, una de las del 20/10) | 500; Stripe lo reintenta; nada escrito |
| S4 | Pago fallido | Suscribirse con `4000 0000 0000 0341` | `customer.subscription.updated` con `incomplete`/`past_due` guardado; sin créditos |
| S5 | Cancelación | Cancelar la suscripción en el dashboard de test | `customer.subscription.deleted` → `status = canceled` |
| S6 | Estado nuevo | Suscripción que pase a `unpaid` (reloj de test de Stripe) | Se guarda `unpaid` (antes fallaba el CHECK) |
| S7 | Connect | Creador → "Cobrar pagos" → completar el onboarding con datos de prueba | `account.updated` → `stripe_connect_onboarded = true` |
| S8 | Pago de colaboración | Partner paga una colaboración aceptada | `paid_at` y `stripe_payment_intent_id` guardados; un solo aviso "Te han pagado"; al reenviar el evento no cambia nada |
| S9 | Firma | POST sin `stripe-signature` o con el cuerpo alterado | 400; nada escrito |

Limpieza: si se prueba contra el Supabase compartido, borrar solo las filas con los id de Stripe de la prueba, con autorización explícita.

### 4.3 H0-03 — Permisos EXECUTE

1. **Problema.** Postgres concede `EXECUTE` a `PUBLIC` al crear una función, y Supabase además a `anon` y `authenticated` en `public`. Ninguna migración lo revoca. Tres funciones internas no comprueban quién las llama.
2. **Evidencia.**

   **Según el código** (migraciones): todas las funciones `SECURITY DEFINER` fijan `search_path = public`. Las RPC de la app tienen `grant … to authenticated` explícito. `notify`, `_get_or_create_conversation`, `has_accepted_offer_between`, `current_creator_id` y `current_partner_id` no tienen ningún grant, así que dependen del permiso por defecto. No hay ningún `revoke`. Nota: `notify` no aparece en ninguna política (comprobado).

   **Efectivo** (proyecto real, clave anon, sin sesión). Las entradas no pueden escribir; un `42501` habría significado "sin permiso":

   | Función | Respuesta | Lectura |
   |---|---|---|
   | `notify(null, …)` | **204** | **Ejecutada** (con un perfil real habría insertado el aviso) |
   | `_get_or_create_conversation(null, null)` | 400 23502 (`participant_one_id` not null) | **Ejecutada hasta el INSERT** |
   | `has_accepted_offer_between` | 200 `false` | Ejecutada (fuga de información) |
   | `current_creator_id`, `current_partner_id`, `my_credit_balance`, `my_chat_unread_count`, `get_public_social_accounts`, `profile_rating_summary` | 200 | Ejecutadas (devuelven vacío para anon) |
   | `get_or_create_conversation`, `send_text_message`, `create_offer`, `respond_offer`, `mark_conversation_read`, `accept/decline_collaboration_request`, `mark_collaboration_completed`, `approve_post`, `request_post_changes`, `submit_collaboration_rating` | 400 P0001 con la excepción propia de la función | Ejecutadas; **su cuerpo rechaza a anon** (`auth.uid()` nulo o id inexistente) |

   Tablas como `anon`: `SELECT` permitido (0 filas por RLS) en 12 de 13 tablas probadas; `social_accounts` → 42501 (A-R11). RLS es la única barrera; es el modelo por defecto de Supabase y por eso aquí es informativo.

   **Aislado** (PGlite, mismos privilegios por defecto que Supabase): reproduce exactamente lo anterior antes de la migración, y el resultado esperado después (§4.7).
3. **Estado.** **Confirmado con permisos efectivos.** Por seguridad no se ha ejecutado `notify` con un perfil real; el efecto de inserción se deduce del cuerpo de la función, que se limita a `insert into notifications`.
4. **Impacto.**
   - **`notify`**: cualquiera crea avisos para cualquier perfil, con `type`, título, texto y **enlace** libres. Basta la clave anon, que viaja en el navegador por diseño. Los id de perfil se obtienen con una cuenta gratuita. Permite phishing dentro de la app, suplantar avisos de pago y llenar la bandeja de ruido.
   - **`_get_or_create_conversation`**: crea conversaciones vacías entre dos perfiles cualesquiera. Se salta la comprobación de `chat_privacy` de `get_or_create_conversation`, aunque enviar mensajes sigue protegido por `send_text_message`.
   - **`has_accepted_offer_between`**: revela relaciones comerciales entre terceros.
   - Las RPC de la app con `anon`: sin impacto (las rechaza su cuerpo), pero sobra exponerlas.
5. **Solución.** Migración **`20261103140000_function_execute_privileges.sql` (preparada, NO aplicada)**:
   - Las internas pierden el permiso para `PUBLIC`, `anon` y `authenticated`; `notify` se concede a `service_role` (lo usa el webhook).
   - Las 15 RPC de la app pierden `PUBLIC` y `anon`; `authenticated` se mantiene.
   - **No se tocan** `current_creator_id` y `current_partner_id` (las usan muchas políticas RLS, que se evalúan también para anon) ni las funciones de trigger.
   - Rollback documentado en la propia migración.
   - Advertencia: un `drop function` + `create` futuro devuelve los permisos por defecto. Endurecer los privilegios por defecto del esquema es una decisión aparte, porque afecta a las migraciones de los dos.
6. **Pruebas.**
   - **Aislado ✔**:
     - Antes: `anon_notify = auth_notify = anon_getconv = true`.
     - Después: `false` para `anon` y `authenticated`, `true` para `service_role`.
     - "permission denied" para `anon` y `authenticated` en `notify`; `authenticated` en `_get_or_create_conversation`.
     - **`create_offer` del partner funciona y crea la conversación y el aviso por dentro** (sin regresión).
   - **Contra la base real, tras aplicar:** `tests/integration/function-privileges.spec.ts` (nuevo, con `RUN_SOCIAL_ACCOUNTS_RLS=1`). Antes de aplicar deben fallar los de "anon no puede" y "authenticated no puede llamar a las internas"; después deben pasar todos. Hay que repetir los tests de chat, ofertas, colaboraciones y revisiones como regresión.
7. **Dependencias.**
   - Aprobación para aplicar (zona protegida, Supabase compartido) y aviso a Mario.
   - **Comparar los cuerpos de las funciones vivas con las migraciones** exige la conexión al catálogo (N-03). El script ya está preparado y lo hace en solo lectura.

### 4.4 H0-08 — Borrado de `social_accounts` desde el navegador

1. **Problema.** `20261028120000` dejó `grant delete … to authenticated` y la política `social_accounts_delete_self` "hasta que A-R3 lo mueva a un endpoint de servidor". A-R3 está hecho (Alex-14).
2. **Evidencia.**
   - **Código**: el grant y la política siguen; `useMySocialAccounts.disconnect` solo usa `POST /api/social/disconnect`, que borra con `service_role`.
   - **Efectivo** (28/10, Alex-10): el test "el dueño puede borrar su fila" pasaba.
   - **Aislado**: antes `auth_delete_social = true`; después, "permission denied for table social_accounts".
3. **Estado.** Confirmado.
4. **Impacto: bajo, solo afecta a la propia cuenta.** Una petición directa borra la fila **sin revocar** el acceso en Google y sin el aviso de "revocación no confirmada". Arrastra en cascada `post_external_links` y `social_account_snapshots` (se pierde el histórico propio) y deja `metrics.social_account_id` a NULL. Otro usuario no puede hacerlo.
5. **Solución.** Migración **`20261103130000_social_accounts_server_only_delete.sql` (preparada, NO aplicada)**: quita la política y revoca `DELETE` a `anon` y `authenticated`.
6. **Pruebas.** `social-accounts-rls.spec.ts`: el test pasa a "el dueño NO puede borrar su fila con una petición directa". Antes de aplicar falla; después pasa. Se mantiene "otro creador no puede borrar". Regresión: desconectar YouTube desde Métricas > Conexiones en el navegador.
7. **Dependencias.** Aprobación para aplicar. El futuro borrado de cuenta (M-L2, de Mario) debe ir por servidor; no se ve afectado.

### 4.5 H0-09 — Contraseña de las cuentas demo

1. **Problema.** La contraseña compartida de las cuentas demo (`creator@`, `partner@` y 18 del seed de Descubrir, todas `@feedma.test`) estaba escrita en el código.
2. **Evidencia.**
   - `git grep` la encontraba en 9 archivos: `tests/integration/supabase-setup.ts`, los dos seeds (como valor por defecto), `.env.example`, `app/pages/login.vue`, `README.md`, `docs/6-SUPABASE-SETUP.md` y el CHANGELOG (3 veces).
   - `git log -S` encuentra 6 commits desde el 19/10.
   - La del `.env` es **la misma** (comparado sin imprimirla).
   - `gh repo view` → **repositorio privado**.
   - El build de producción **no** la contiene (corrección #4 vigente, comprobado en `.output`).
   - El propio `.env.example` decía: "si algún valor de aquí abajo acaba en un commit, considéralo filtrado y regenera".
3. **Estado.** Confirmado.
4. **Impacto.** Hoy, medio-bajo (repositorio privado; cuentas de prueba en el proyecto de pruebas). Será alto si este proyecto de Supabase se despliega para la demo pública, se usa como producción o el repositorio se hace público: cualquiera podría entrar como esas 20 cuentas.
5. **Solución aplicada.**
   - `supabase-setup.ts` lee `DEMO_PASSWORD` del entorno (sin él, los tests de sesión se saltan con un mensaje claro).
   - Los seeds exigen `DEMO_PASSWORD`.
   - `.env.example` queda sin valor.
   - README, guía de Supabase y CHANGELOG, redactados.
   - **Pendiente**:
     - (a) `login.vue` (archivo de Mario). Propuesta: leerla de `runtimeConfig.public.demoPassword`, definida solo con `NODE_ENV=development`.
     - (b) **Rotar la contraseña** de las cuentas demo. Altera datos de autenticación reales y obliga a actualizar el `.env` de los dos: necesita tu decisión y la de Mario.
     - (c) Para la demo pública, cuentas nuevas en un entorno aislado.
6. **Pruebas.** `git grep` ya solo la encuentra en `login.vue`. Tras rotarla: los tests de integración deben iniciar sesión con el `.env` nuevo, y la contraseña antigua debe fallar al iniciar sesión.
7. **Dependencias.** Mario (login.vue) y la decisión de rotar.

### 4.6 H0-06 — Commits pendientes y CI (corrección de la Fase 0)

- **Diagnóstico de la Fase 0, erróneo.** Comparé contra referencias remotas sin `git fetch`. Tras el `fetch`:
  - `origin/main` = `HEAD` = `0ab25da`, así que los 6 commits **ya están en GitHub**.
  - `origin/feature/integracion-alex-mario` va 6 por detrás de la local; subir la rama solo la igualaría con `main`.
  - La `main` local está 82 commits por detrás de `origin/main`; se arregla con un *fast-forward* local.
  - **No he hecho push ni he tocado ramas.**
- **CI real.**
  - Workflow `CI` activo.
  - 6 ejecuciones en push a `main` (30/10 ×2, 03/11 ×4), **todas en verde**: `npm ci` → Typecheck (`npx vue-tsc --noEmit`, vacío) → unitarios → build.
  - Solo se dispara con push a `main` y en PR (no hay ningún PR abierto ni cerrado); las ramas sin PR no ejecutan CI.
  - Con el cambio de H0-01, el próximo push ejecutará el typecheck real.
  - `TRABAJO_MARIO.md` (M-F2: "no ejecutado en GitHub") está desactualizado; no lo he editado.

### 4.7 Entorno aislado ya probado: PGlite

Un Postgres en WASM, en memoria, que no se conecta a nada (script en el scratchpad de la sesión). Sobre unos stubs mínimos de Supabase:

- Roles `anon`, `authenticated` y `service_role` con los privilegios por defecto de Supabase.
- `auth.users` y `auth.uid()` leído de `request.jwt.claim.sub`.
- `storage.buckets` y `storage.objects`, y `storage.foldername()`.
- La publicación `supabase_realtime`.

Resultados:

- **Las 39 migraciones existentes + las 3 nuevas se aplican desde cero sin errores**, en orden de nombre (incluidas las dos con la misma marca de tiempo).
- El trigger real `handle_new_user` crea los perfiles de creador y partner.
- `create_offer` funciona como un partner con sesión simulada.

**Límites.** No es Supabase: no hay PostgREST, Realtime ni Auth reales, ni los planes de Supabase. Sirve para validar migraciones, RLS, grants y RPC de forma barata y repetible. Propuesta: llevarlo al repositorio como `npm run test:db`. Añade la dependencia de desarrollo `@electric-sql/pglite`; hay que avisar antes de añadir dependencias.

### 4.8 H0-04 — Entorno aislado de pruebas e integración

| Opción | Qué da | Coste | Bloqueo |
|---|---|---|---|
| A. PGlite (§4.7) | Migraciones, RLS, grants y RPC en segundos, también en CI | Bajo; ya probado | Añadir la dependencia |
| B. Supabase local (`npx supabase start` + `db reset`) | Supabase completo: Auth, PostgREST, Realtime y Storage. Permite tests de integración y Stripe sin tocar datos compartidos | Varios GB de imágenes Docker; seeds locales; un `.env` aparte para tests | **Arrancar Docker Desktop** (instalado, sin arrancar) y tu visto bueno |
| C. Segundo proyecto en la nube | Lo más parecido a producción | Requiere cuenta y configuración; en el plan gratuito, límite de proyectos | Decisión de equipo (va contra la decisión del 23/10) |

Recomendación: **A ya**, para la CI de migraciones; **B** para la Fase 3 (QA funcional), Stripe y la demo (Fase 7), porque cumple "no contamines producción".

### 4.9 H0-17 — `handle_new_user()` regresado a una versión antigua

1. **Problema.** La función del trigger `on_auth_user_created` (se ejecuta en cada alta) no es la de la última migración que la define (`20261021120000`, sección 8). Es la de `20261020180000_real_signup.sql`: roles `influencer`/`manager`/`client`, inserciones en tablas que ya no existen y sin aviso de bienvenida.
2. **Evidencia.**
   - **Catálogo** (solo lectura): el cuerpo vivo, normalizado, es idéntico al de `20261020180000` y distinto de `20261019120200`, `20261021110000` y `20261021120000`.
   - `grant_welcome_credits()` y `has_active_collaboration_with()`, definidas en la misma `20261021120000`, **sí** coinciden con ella. Por tanto esa migración se aplicó, y la versión antigua de `handle_new_user` se volvió a ejecutar después. No hay registro de migraciones en la base que permita saber cuándo.
   - **Datos** (recuentos): las 21 cuentas tienen ficha y la última alta es del 23/10; hay 0 avisos `welcome` en toda la base.
   - **Aislado** (PGlite, reproduciendo el estado vivo): un alta `creator` o `partner` deja el perfil sin ficha, con 0 créditos y 0 avisos; un alta sin rol falla con `profiles_role_check`.
3. **Estado.** Confirmado.
4. **Impacto.** **Crítico para el lanzamiento y para la demo.** Una cuenta nueva no tiene ficha, la app no la crea por su cuenta (`useMyCreator`/`useMyPartner` no insertan), y sin ficha no puede editar su perfil ni crear publicaciones, y no aparece en Descubrir. No había salido antes porque nadie ha probado un alta real desde `/onboarding` (M-O1 pendiente); las cuentas demo las crean los seeds.
5. **Solución.** Migración **`20261103160000_restore_handle_new_user.sql` (preparada, NO aplicada)**: repite literalmente la definición de `20261021120000`.
6. **Pruebas.**
   - **Aislado ✔**: tras la migración, el creador tiene ficha, 3 créditos y 1 aviso; el partner, ficha y 1 aviso; sin rol, el alta se crea como creador. Todo ello con `notify()` ya revocado para los roles de la API, porque la función la llama como propietaria.
   - **Contra la base real, tras aplicar**: `tests/integration/signup-trigger.spec.ts` (crea 2 cuentas `@feedma.test` con la Admin API y las borra).
   - **En navegador**: un alta real desde `/onboarding` con confirmación de email.
7. **Prevención.** Volver a ejecutar una migración antigua pisa funciones sin avisar. Recomendación: llevar el registro de lo aplicado en la base (`supabase db push` o una tabla propia) y, antes de aplicar a mano, comparar con el catálogo. El script `db-readonly-audit.mjs` lo hace en solo lectura; propongo pasarlo al repositorio.

---

## 5. Otros hallazgos registrados durante la validación

- **N-02 (BAJO).** `creators_insert_own` y `partners_insert_own` no comprueban `profiles.role`: un partner puede crearse una ficha de creador (aparecería en Descubrir como creador). Solución: añadir `and exists (select 1 from profiles where id = auth.uid() and role = 'creator')`. Necesita una migración.
- **N-03 (bloqueo).** El host directo de Postgres solo tiene IPv6 y este equipo no tiene salida IPv6 (`ENETUNREACH`). `scripts/apply-pending-migrations.mjs` tampoco funcionaría aquí, además de que le falta el paquete `pg`. Para la auditoría del catálogo hace falta la cadena del *Session pooler* de Supabase en `.env`. El script `db-readonly-audit.mjs` está listo y solo lee: funciones, cuerpos frente a migraciones, políticas, grants, triggers, FKs con `set null` sobre `NOT NULL` y estado de las migraciones.
- **N-04 (informativo).** `/creator/metrics?instagram=error&reason=<texto>` muestra el texto de la URL como aviso. Vue lo escapa (no hay XSS), pero permite enlaces con mensajes falsos. Es de bajo riesgo.
- **N-05 (informativo, resuelto).** Había 3 suscripciones de Stripe test activas desde el 20/10 sin contrapartida en FEEDMA (§4.2). **Canceladas el 2026-11-03** con autorización de Alex.

---

## 6. Orden de implementación recomendado

> **Actualizado tras la auditoría de catálogo.** Los pasos 2, 3 y 4 ya están aplicados y verificados en la base (salvo el circuito con Stripe CLI). Lo primero ahora es **aplicar `20261103160000` (H0-17)** y ejecutar `signup-trigger.spec.ts`.

1. **Subir a una rama y revisar los cambios locales** de esta subfase. Están sin commit, y no hacen falta migraciones para el typecheck real, N-01, el webhook ni la contraseña de demo. La CI pasará a tener un typecheck real.
2. **Aplicar `20261103140000` (H0-03)**, la de más impacto en seguridad. Antes, avisar a Mario. Después, ejecutar `function-privileges.spec.ts` y la regresión de chat, ofertas, colaboraciones y revisiones.
3. **Aplicar `20261103130000` (H0-08)** y `social-accounts-rls.spec.ts`. En el navegador: desconectar YouTube desde Métricas.
4. **Aplicar `20261103150000` (H0-02)** junto con el código del webhook. Después, ejecutar el plan S1–S9 con Stripe CLI, a ser posible en un Supabase local, y cancelar las 3 suscripciones de test huérfanas.
5. **Rotar la contraseña de demo** y retirarla de `login.vue` (Mario).
6. **Entorno aislado:** PGlite en el repositorio (`test:db`, también en la CI) y Supabase local para integración y demo.
7. Conseguir la cadena del pooler (N-03) y completar la auditoría del catálogo real (cuerpos de funciones, políticas y estado de las migraciones, H0-14).
8. Hacer N-02 y el `tsconfig` de tests (Fase 1).

---

## 7. Qué se ha ejecutado

| Comando o script | Resultado |
|---|---|
| `npx vue-tsc --noEmit --listFiles` | 0 archivos |
| `npx vue-tsc -b --noEmit` (antes de corregir) | 35 líneas de error, 30 errores únicos |
| `npm run typecheck` (después) | exit 0; con un error a propósito, exit 2 (el comando antiguo daba exit 0) |
| `npm test -- --run` | 36 archivos, 609 tests OK |
| `npm run build` | OK; `.output` sin la contraseña de demo |
| Stripe test, solo lectura | API `endive` en todos los eventos; `invoice.subscription` ausente en los eventos reales; 0 webhooks; 3 suscripciones sin fila en la base |
| Sonda `anon` contra el proyecto real (no-op) | 20/20 funciones ejecutables por anon |
| Cruce Stripe ↔ base (GET con service_role, solo recuentos) | 0 filas para las 3 suscripciones; 1 fila en `subscriptions` en total |
| PGlite: 42 migraciones desde cero + comprobaciones | Todo OK (§4.3, §4.4 y §4.7) |
| `git fetch` + `gh run list/view` + `gh repo view` | §4.5 y §4.6 |
| Conexión directa a Postgres | Imposible (solo IPv6) |

No se ha ejecutado: `npm run test:integration` (escribe en la base compartida y no está autorizado), ningún flujo en navegador ni ningún checkout de Stripe.

---

## 8. Requisito añadido para la Fase 8 (vídeo)

Pedido el 2026-11-03: el vídeo tendrá **pequeñas introducciones con título entre módulos**, por ejemplo «Descubre creadores», «Negocia colaboraciones» o «Gestiona tus proyectos». Se incorporarán al storyboard como tarjetas de título por bloque, ajustadas a las funcionalidades verificadas. La grabación y los datos de demo siguen en pausa hasta cerrar esta validación.
