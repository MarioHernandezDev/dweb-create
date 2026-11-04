# Fase 5 — Pendientes conocidos

> Fecha: 2026-11-03. Análisis del código y la configuración actuales. **No se ha desplegado nada, ni se ha ejecutado ningún cobro, ni se ha tomado ninguna decisión que corresponda al equipo (Q3).**

## 1. Stripe y pagos

### 1.1 Cómo funciona hoy

| Pieza | Endpoint | Qué hace |
|---|---|---|
| Suscripción Pro (creador) | `POST /api/stripe/create-checkout-session` | Checkout en modo `subscription`. Reutiliza o crea el `customer` con `metadata.supabase_user_id`. Vuelve a `/creator/profile?checkout=success\|cancelled`. |
| Cuenta de cobro del creador | `POST /api/stripe/connect/account-link` | Crea una cuenta Connect *Standard* (con `service_role`) y devuelve el enlace de alta de Stripe. |
| Pago de una colaboración (marca) | `POST /api/stripe/pay-collaboration` | Checkout en modo `payment` con `application_fee_amount` (comisión de CIBERAN) y `transfer_data.destination` (cuenta del creador). Exige: colaboración aceptada, en curso o completada; sin pagar; con presupuesto; y creador con Connect verificado. Clave de idempotencia por colaboración y ventana de 5 minutos. |
| Webhook | `POST /api/stripe/webhook` | Firma verificada. Eventos: `checkout.session.completed` (alta de suscripción o colaboración pagada), `customer.subscription.updated/deleted`, `invoice.paid` (créditos) y `account.updated` (Connect verificado). |

### 1.2 Estado frente a lo que pide el encargo

| Aspecto | Estado |
|---|---|
| Creación de sesiones y Checkout | Implementado. Probado en Test Mode durante la validación: 3 suscripciones de prueba que no dejaron filas en la base por el fallo del webhook (H0-02), ya canceladas. |
| Webhooks y confirmación | **Corregido (H0-02):** la API `endive` lee la suscripción de `parent.subscription_details` y devuelve 500 ante fallos para que Stripe reintente. |
| Estados | `subscriptions.status` admite los 8 estados de Stripe (migración `20261103150000`). |
| Idempotencia | Créditos: índice único en `stripe_invoice_id`. Pago de colaboración: `update … where paid_at is null`. Checkout de colaboración: `idempotencyKey`. |
| Sincronización con colaboraciones | Al pagar se guardan `paid_at` y `stripe_payment_intent_id` y se avisa al creador, pero **el estado no pasa a `in_progress`**. Además, `mark_collaboration_completed` admite colaboraciones `accepted` **sin pagar** (F-05). |
| Reembolsos | **No implementados.** No se procesan `charge.refunded` ni `charge.dispute.created`. |
| Errores de cobro | No se procesa `invoice.payment_failed`. El estado `past_due` solo llega por `customer.subscription.updated`, sin aviso al usuario. |

### 1.3 Plan de pruebas en Stripe Test Mode

Requisitos: claves `sk_test`/`pk_test`, Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`) y el entorno aislado o la base compartida con cuentas de prueba. **Nunca claves `sk_live`.**

| # | Caso | Tarjeta o acción | Resultado esperado |
|---|---|---|---|
| S1 | Suscripción Pro correcta | `4242 4242 4242 4242` | Fila `subscriptions` `active` + `current_period_end`; `invoice.paid` → +20 créditos una sola vez |
| S2 | Reenvío del mismo `invoice.paid` | `stripe events resend <id>` | Sin créditos duplicados (índice único) y respuesta 200 |
| S3 | Pago rechazado | `4000 0000 0000 0002` | Checkout muestra el error; no hay fila `active` |
| S4 | Autenticación 3DS | `4000 0025 0000 3155` | Tras el reto, igual que S1 |
| S5 | Cancelación desde el portal o la API | `stripe subscriptions cancel` | `customer.subscription.deleted` → estado `canceled` |
| S6 | Connect del creador | Alta Standard de prueba | `account.updated` → `stripe_connect_onboarded = true` |
| S7 | Pago de colaboración | `4242…` en el Checkout de la marca | `paid_at` y `payment_intent`; aviso al creador; comisión y transferencia visibles en el panel de Stripe |
| S8 | Doble pago de la misma colaboración | Dos Checkouts seguidos | El segundo lo rechaza `pay-collaboration` («ya está pagada») o lo ignora el webhook |
| S9 | Fallo de la base durante el webhook | Simulado en local | Respuesta 500 y Stripe reintenta; sin estado a medias |

### 1.4 Propuestas
1. Al pagar, pasar la colaboración a `in_progress` y exigir el pago para completarla (decisión de producto, F-05).
2. Procesar `invoice.payment_failed` (avisar al creador) y `charge.refunded` (anotar el reembolso en la colaboración).
3. Ejecutar S1-S9 antes de activar los pagos para usuarios reales.

## 2. A-R4 y A-R12 (dependencias con Mario)

| Tarea | Qué es | Depende de | Estado de la dependencia | Qué se puede avanzar ya |
|---|---|---|---|---|
| **A-R4** | Endpoints de desautorización y borrado de datos que Meta exige para salir del modo Desarrollo | **M-L1** (URL pública de privacidad) y A-R1 / Q5 (app de Meta) | M-L1 **existe como plantilla** desde el 28/10 (`/privacidad`, `/terminos`), pero `app/utils/legal.ts` tiene datos por rellenar (responsable, contacto) y necesita revisión legal. Meta exige una política real. | El endpoint de borrado (firma `signed_request`, borrar `social_accounts` y tokens, URL de estado) se puede programar y probar con tests. Solo su **registro en Meta** espera a que M-L1 tenga datos reales. |
| **A-R12** | Métricas verificadas y su fecha en el perfil público y en Descubrir | **La función compartida `get_public_social_accounts`** (la usan el perfil de Mario y Descubrir) y A-R8 | La función devuelve `platform, handle, followers_count` solo de cuentas con token. Añadir `last_synced_at` o `is_verified` cambia su firma y afecta a las dos ramas. | Proponer la nueva firma a Mario y acordarla. Mientras tanto, la parte de presentación no toca la función. |

## 3. Planificador de sincronización (A-R5 / Q3)

**Funcionamiento actual:**
- `POST /api/social/sync-all` existe y está protegido con `Authorization: Bearer <SYNC_CRON_SECRET>`, comparado en tiempo constante y con límite de intentos fallidos por IP (5 cada 10 minutos).
- Procesa lotes (`SYNC_BATCH_SIZE`) con una reserva por cuenta (`sync_lock_until`) para que dos ejecuciones no choquen.
- **Sin el secreto responde 503 por diseño. Nadie lo llama:** no hay scheduler, ni `pg_cron`, ni workflow programado. Las métricas solo avanzan al conectar, al pulsar «Actualizar» o al vincular una publicación.

**Decisión pendiente (Q3, del equipo):** dónde se despliega y qué scheduler se usa. **No se decide aquí.** Las tres opciones que recoge `TRABAJO_ALEX.md` son:

| Opción | Ventajas | Inconvenientes |
|---|---|---|
| Cron del hosting (p. ej. Vercel Cron) | Vive junto a la app | Depende de elegir host |
| Supabase `pg_cron` + `pg_net` | Ya hay Supabase; no depende del host | El secreto vive en la base; peticiones HTTP salientes desde Postgres |
| GitHub Actions programado | Gratis, visible en el repo | Mínimo cada 5 minutos, retrasos ocasionales, secreto en GitHub |

**Diseño recomendado, sea cual sea la opción:**
- **Seguridad:** secreto aleatorio de 32 bytes, solo en el scheduler y en el servidor, y rotable.
- **Frecuencia:** cada 6 horas para seguidores. Las APIs de Instagram y YouTube tienen cuota y las cifras cambian despacio.
- **Reintentos:** espera creciente por cuenta (15 min → 1 h → 6 h) y marcar `expired`/`revoked` sin reintentar cuando el proveedor lo indique (ya existen `last_error_code` y `status`).
- **Observabilidad:** que el endpoint devuelva el recuento de correctas, fallidas y omitidas; registrarlo y alertar si fallan más de N seguidas o si no hay ejecución en 24 h.

## 4. Despliegue

**Estado:** no hay configuración de despliegue. No hay preset de Nitro (se compila para `node-server`), ni `Dockerfile`, ni fichero de host, ni cron. Solo existe CI.

| Área | Qué hace falta |
|---|---|
| Variables de entorno | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`/`_MODEL`, `INSTAGRAM_*` (3), `YOUTUBE_*` (3), `SOCIAL_TOKEN_ENCRYPTION_KEY`, `SYNC_CRON_SECRET`, `APP_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`. No pertenecen al servidor: `SUPABASE_DB_URL` (solo scripts) y `DEMO_PASSWORD`. |
| Dominios y HTTPS | Dominio propio con HTTPS (lo exige el OAuth de Meta). URIs de redirección de Instagram y YouTube y `APP_URL` con ese dominio. URL de sitio y redirecciones en Supabase Auth. |
| Supabase | Proyecto de **producción separado** del de desarrollo y pruebas (hoy solo hay uno, H0-04). Migraciones con `supabase db push`, que deja registro. Copias automáticas (PITR según el plan). |
| Stripe | Cuenta en modo real, webhook apuntando al dominio con sus eventos, Connect configurado y comisión revisada. Pasar antes S1-S9 en Test Mode. |
| Cron | Según Q3 (sección 3). |
| Build | `npm ci && npm run build`. Los binarios de `sharp` deben coincidir con la arquitectura del host (aviso del build). Node 22.12 o superior. |
| Logs y monitorización | Agregar los logs del servidor (ya escriben `console.error` con prefijos). Alertas de errores 5xx del webhook y de `sync-all`. Monitor de disponibilidad. |
| Límites de uso | Pasar los contadores en memoria a un almacén compartido si hay varias instancias (S-09). Configurar el proxy de confianza para `X-Forwarded-For`. |

### Lista de comprobación para el lanzamiento
- [ ] Q3 decidida y scheduler configurado con `SYNC_CRON_SECRET`.
- [ ] Proyecto de Supabase de producción creado y las 44 migraciones aplicadas con registro.
- [ ] Contraseña de las cuentas demo rotada y fuera de `login.vue` (H0-09); cuentas demo fuera de producción.
- [ ] Stripe S1-S9 en verde en Test Mode; webhook de producción con los eventos y el secreto correctos.
- [ ] Datos legales rellenados en `app/utils/legal.ts` y revisados (M-L1); A-R4 registrado en Meta.
- [ ] Decisiones de producto F-05 (pago antes de completar) y F-06 (créditos por la heurística).
- [ ] F-02 corregido (aviso engañoso al aceptar una oferta).
- [ ] Límites de uso compartidos (S-09) y canales de «escribiendo…» privados (H0-11).
- [ ] Lighthouse y accesibilidad pasados en las páginas principales (Fase 4).
- [ ] Copias de seguridad comprobadas: restaurar una en un proyecto de prueba.
