# Contexto completo del proyecto FEEDMA

> Documento de análisis puro — no se ha modificado ningún archivo de código al generarlo. Fecha del análisis: 2026-10-23. Rama activa en el momento del análisis: `fase0-usabilidad-prep` (árbol de trabajo limpio, sin cambios sin commitear). Commit más reciente: `e519195`.
>
> Este documento es un **snapshot**. Antes de actuar sobre cualquier cosa que diga, comprueba el estado real del repositorio (`git log`, `git status`, los archivos citados) — el código manda siempre sobre este documento, nunca al revés.

---

## 1. Resumen general del proyecto

### 1.1 Qué es FEEDMA y qué problema resuelve

FEEDMA es un **marketplace de dos roles** entre **creadores de contenido** y **partners** (marcas/empresas que los contratan). Un partner contrata directamente a un creador para una colaboración de contenido (reels, posts, stories…); FEEDMA es el intermediario que:

- Pone en contacto a las dos partes (Descubrir, con filtros estructurados o búsqueda en lenguaje natural con IA).
- Gestiona la negociación (ofertas/contraofertas por chat) y la aceptación formal de una colaboración.
- Da seguimiento a las entregas (tablero tipo Kanban, calendario, checklist, revisiones).
- Cobra el pago del partner al creador a través de la plataforma, quedándose una comisión (Stripe Connect).
- Ofrece un plan de pago (FEEDMA Pro) al creador con créditos de predicción de éxito de contenido vía IA.

No es una red social: nada de lo que se "publica" en FEEDMA sale a Instagram/TikTok por sí mismo — es una herramienta de gestión del trabajo y el cobro entre las dos partes. Ver también la explicación dada al usuario durante esta sesión sobre "para qué sirve una publicación como creador" (es el entregable de una colaboración, no un post social).

### 1.2 Tecnologías, arquitectura y servicios externos

| Pieza | Tecnología | Notas |
|---|---|---|
| Framework | **Nuxt 4** (`^4.6.2`) sobre Vue 3 (`^3.5.44`) | SSR + cliente, Nitro como servidor. |
| Estilos | **Tailwind CSS v4** (`@tailwindcss/vite`) | CSS-first (`@theme` en `app/assets/css/main.css`), sin `tailwind.config.js` tradicional. |
| Estado | `useState` de Nuxt (no Pinia, aunque `@pinia/nuxt` está instalado) | Cada composable `useXxx()` gestiona su propio `useState` con clave única; `resetAccountCaches()` centraliza el vaciado al cambiar de cuenta. |
| Backend | **Supabase** (`@nuxtjs/supabase ^2.1.0`, `@supabase/supabase-js ^2.118.0`) | Postgres + Auth + Storage + RLS. Un único proyecto en la nube (ver §4.3 sobre el entorno de pruebas). |
| Pagos | **Stripe** (`stripe ^23.0.0`) | Dos flujos distintos: suscripción (FEEDMA Pro) y pago marketplace vía Stripe Connect — ver §3.5. |
| IA | **OpenRouter** (modelo gratuito, configurable por `OPENROUTER_MODEL`, actualmente `nvidia/nemotron-3.5-lightning:free`) | Usado en `/api/discover/search` (ranking de "Buscar con IA") y `/api/ml/predict` (predicción de éxito de contenido). Llamado directo por HTTP desde el servidor, sin servicio Python/FastAPI independiente (a diferencia de lo que describe `docs/1-ARCHITECTURE.md`, que es un documento de planificación inicial, no el estado real — ver §1.4). |
| Fuentes | `@nuxt/fonts` | Hanken Grotesk (texto), Sora (títulos, desde esta sesión), Snasm (solo el logotipo/wordmark "FEEDMA", fuente local en `app/assets/fonts`). |
| Imágenes | `@nuxt/image` (proveedores unsplash, ipx, imgix) | |
| Animación | GSAP + ScrollTrigger | Landing/instalaciones. |
| Drag & drop | `vuedraggable` | Tablero Kanban (`PhaseBoard.vue`). |
| Testing | Vitest (`^2.1.9`) + `vue-tsc` | Ver §6. |

### 1.3 Estructura de carpetas (real, no la propuesta de `1-ARCHITECTURE.md`)

```
dweb-create/
├── app/
│   ├── assets/css/main.css      # Design system: variables --color-*/--font-*, @theme de Tailwind v4
│   ├── assets/fonts/            # Snasm (local, @font-face manual)
│   ├── components/              # charts/ chat/ collab/ discover/ home/ install/ landing/ layout/ ml/ profile/ social/ timeline/ ui/
│   ├── composables/              # ~35 composables use*.ts (ver listado completo en §3.2)
│   ├── middleware/role-guard.global.ts
│   ├── pages/                    # admin/ chat/ creator/ partner/ profile/ + páginas sueltas (login, onboarding, inbox, favorites...)
│   └── utils/                    # categories, status, nav, ficha, notifications, mock-data, collaboration-terms, avatar...
├── server/
│   ├── api/                      # admin/ auth/ discover/ ml/ social/ stripe/
│   └── utils/                    # account-identity, admin-session, ml-heuristic, oauth-state, rate-limit, stripe-plans, stripe, token-crypto, youtube
├── supabase/migrations/          # 29 migraciones SQL, fuente de verdad del esquema (ver §3.3)
├── tests/
│   ├── unit/                     # 5 archivos, sin red, sin Supabase real
│   └── integration/               # 9 archivos .spec.ts (+ 1 script .mjs manual), contra Supabase real
├── scripts/                       # seed-demo-users, seed-discover-demo, cleanup-discover-demo, apply-pending-migrations
├── docs/                          # Esta documentación + las numeradas 1-10 (algunas desactualizadas, ver §1.4) + CHANGELOG.md
├── CONTEXT.md                     # Traspaso de la auditoría de usabilidad del 23 oct 2026 (ver §4)
├── DESIGN.md                      # Brief antiguo de rediseño de Descubrir, ya implementado — superado por CONTEXT.md, confirmado por el usuario en esta sesión
└── nuxt.config.ts
```

### 1.4 Aviso sobre la documentación existente en `docs/`

Los documentos numerados `1-ARCHITECTURE.md` y `2-DATABASE-SCHEMA.md` (y probablemente los demás `3-*` a `10-*`) son en buena parte **documentos de planificación inicial**, no una descripción fiel del estado actual:

- `1-ARCHITECTURE.md` describe un modelo multi-tenant por `organization_id`/`agency_id`, roles `owner/admin/editor/client_viewer`, un servicio de ML en Python/FastAPI separado, y `shadcn-vue` — **nada de esto existe en el código real**. El modelo real es dos roles simples (`creator`/`partner`), sin organizaciones, y el "motor de ML" es una llamada HTTP directa a OpenRouter desde una Server Route de Nitro (`server/api/ml/predict.post.ts`, `server/utils/ml-heuristic.ts`).
- `2-DATABASE-SCHEMA.md` está más cerca de la realidad y además dice explícitamente de sí mismo: *"el SQL de verdad vive en `supabase/migrations/` [...] si algo de aquí y el código no coinciden, manda el código"* — pero fue escrito antes de migraciones posteriores importantes (`offers`, `messages`, `packages`, `checklist_items`, `collaboration_log_entries`, `collaboration_ratings`, `saved_profiles`, `post_revision_notes`, condiciones pactadas, Stripe Connect) y no las menciona.
- `docs/CHANGELOG.md` es, en cambio, un registro **cronológico y fiable** de lo que de verdad se ha hecho sesión a sesión (48 entradas a fecha de este análisis) — es la mejor fuente para entender la evolución real, junto con `git log`.

**Recomendación para quien continúe**: para entender el esquema o la arquitectura, confiar en `supabase/migrations/*.sql` y en el código, no en los documentos `1-*`/`2-*`. Para entender qué se decidió y por qué, usar `docs/CHANGELOG.md` y `git log`.

### 1.5 Cómo se ejecuta localmente

```bash
npm install
npm run dev              # servidor de desarrollo (Nuxt), por defecto puerto 3000
npm run build             # build de producción (Nitro)
npm run preview           # sirve el build de producción
```

Variables de entorno necesarias en `.env` (nombres, sin valores — ver §3.6 para el detalle de cada una). El proyecto **no tiene un entorno de pruebas de Supabase separado**: todo (desarrollo manual, cuentas demo, tests de integración) apunta al mismo proyecto en la nube — ver §4.3, es una decisión explícita y reciente del usuario, no un descuido.

---

## 2. Funcionalidades implementadas

### 2.1 Lo que puede hacer un **creador de contenido**

| Funcionalidad | Estado |
|---|---|
| Alta de cuenta, login, cierre de sesión | ✅ Verificado — incluye accesos demo (dev-only desde esta sesión) |
| Ficha pública (bio, categorías, tarifa, tipo de marcas que busca) | ✅ Verificado |
| Conectar redes sociales (Instagram, YouTube — OAuth real) | ⚠️ Implementado, **no verificado en esta sesión** (requiere apps externas configuradas; sin ellas da un error claro, no un flujo roto) |
| Métricas por red conectada | ⚠️ Implementado, depende de la conexión real de redes — no probado de extremo a extremo |
| Tablero Kanban de publicaciones (Idea → En producción → Para revisar → Programado → Publicado), con etiquetas, checklist y límite de WIP | ✅ Verificado por tests de integración; aspecto visual no confirmado en navegador real |
| Calendario ("Tu calendario") acotado a una colaboración, dentro de su hoja de detalle | ✅ Verificado por tests; solo lectura ahí, edición sigue siendo desde el tablero |
| Descubrir partners (filtros estructurados o búsqueda con IA), contactar/proponer | ✅ Verificado — incluye el fix de IA de esta sesión (ver §4) |
| Guardar favoritos desde Descubrir | ✅ Verificado |
| Recibir y responder solicitudes de colaboración, negociar por contraoferta | ✅ Verificado por tests de integración (RLS + RPCs) |
| Chat 1 a 1, ofertas de paquetes dentro del chat | ✅ Verificado por tests; UI no confirmada en navegador |
| Condiciones pactadas de una colaboración (revisiones incluidas, exclusividad, derechos de uso, alcance) y "brief" estructurado (objetivo, público, tono) | ✅ Verificado — se fijan una vez y quedan congeladas por un trigger de base de datos |
| Registro de incidencias y cambios acordados, compartido con el partner | ✅ Verificado |
| Marcar una colaboración como completada | ✅ Verificado |
| Cobrar un pago de partner (vía Stripe Connect) | ⚠️ Implementado y con lógica de servidor probada por idempotencia (`tests/integration/webhook-idempotency.mjs`, manual) — **nunca probado con un pago real de principio a fin** |
| Valorar mutuamente al partner tras completar | ✅ Verificado |
| Solicitar revisiones a su propio contenido (recibir "cambios pedidos" con nota) | ✅ Verificado |
| Bandeja de notificaciones (Importantes/Actividad, desde esta sesión) | ✅ Verificado el código y la consulta contra datos reales; aspecto visual no confirmado |
| Suscripción FEEDMA Pro (créditos de predicción) | ⚠️ Implementado (checkout, webhook, créditos), **no probado con un cobro real** |
| Predicción de éxito de contenido (IA) | ⚠️ Implementado, consume créditos — no verificado en esta sesión si el score es razonable en casos reales |
| Cerrar sesión desde Más/SideRail en 1-2 toques | ✅ Verificado (código), añadido esta sesión |

### 2.2 Lo que puede hacer un **partner**

Simétrico al creador en casi todo, con estas particularidades:

| Funcionalidad | Estado |
|---|---|
| Ficha pública (bio, categorías que busca, presupuesto, tipo de creador) | ✅ Verificado |
| Descubrir creadores (filtros o IA), contactar | ✅ Verificado (mismo fix de IA que el lado creador) |
| Iniciar una solicitud de colaboración con presupuesto, condiciones y brief estructurado | ✅ Verificado |
| Pagar una colaboración aceptada (Stripe Connect, comisión del 10% para FEEDMA) | ⚠️ Implementado, nunca probado con un pago real |
| Aprobar o pedir cambios a una entrega del creador | ✅ Verificado por tests (`approve_post`/`request_post_changes`, con nota de revisión) |
| Ver el checklist de progreso de un entregable (solo lectura) | ✅ Verificado |
| Marcar colaboración como completada, valorar al creador | ✅ Verificado |
| Reportar una solicitud como spam/no seria (confidencial, solo lo ve el admin) | ⚠️ Implementado (`reports`, migración `20261021140000`), no verificado en esta sesión |

### 2.3 Funciones compartidas / transversales

- **Chat** (`/chat`, `/chat/[id]`): conversaciones 1 a 1, mensajes de oferta y de sistema, indicador de escritura. RLS probado; interfaz no confirmada visualmente.
- **Bandeja de entrada** (`/inbox`): separada en Importantes/Actividad desde esta sesión.
- **Perfil público** (`/profile/[role]/[id]`).
- **Panel de administración** (`/admin`, autenticación propia por contraseña, no usa cuentas de Supabase): usuarios, actividad, analíticas de Descubrir, reportes, bloquear/regalar Pro a un usuario. No cubierto por la auditoría de usabilidad ni por los tests de integración revisados en esta sesión.

### 2.4 Lo que es simulado, incompleto o deliberadamente fuera de alcance

- **No existe un segundo entorno de Supabase** para pruebas — ver §4.3, decisión explícita del usuario en esta sesión ("esta Supabase sea la de pruebas, y cuando esté todo listo, clonar a una vacía para datos reales").
- **El motor de IA de Descubrir y de predicción de éxito usa un modelo gratuito de OpenRouter**, no un modelo propio entrenado — correcto y documentado, no es un engaño, pero hay que saberlo al leer cualquier "score" o "motivo" que ofrezca.
- **El admin no usa Supabase Auth** — contraseña propia + sesión firmada (`server/utils/admin-session.ts`), fuera del sistema de roles creator/partner.
- Instagram/YouTube OAuth: implementado pero depende de credenciales de apps externas que pueden no estar configuradas en todos los entornos — en ese caso da un error explícito, no un flujo roto en silencio (según comentarios del propio `.env`).

---

## 3. Estado técnico actual

### 3.1 Rutas y páginas principales

| Zona | Rutas |
|---|---|
| Público | `/`, `/onboarding`, `/login`, `/instalaciones`, `/confirm` (callback de email) |
| Creador | `/creator` (Hoy), `/creator/timeline` (Tablero), `/creator/discover`, `/creator/requests` (Colaboraciones), `/creator/profile`, `/creator/socials`, `/creator/metrics`, `/creator/metrics/[platform]`, `/creator/post/[id]` |
| Partner | `/partner` (Inicio), `/partner/discover`, `/partner/requests`, `/partner/profile` |
| Compartidas | `/chat`, `/chat/[id]`, `/inbox`, `/favorites`, `/profile/[role]/[id]` |
| Admin | `/admin`, `/admin/login` (no usa Supabase Auth) |

Control de acceso: `app/middleware/role-guard.global.ts` exige sesión (delegado en parte a `@nuxtjs/supabase`'s `redirectOptions`) y bloquea cruzar de sección (`/creator/*` ⇄ `/partner/*`) según el rol real guardado en `profiles`. Cachea el resultado de `getUser()` 30s para no repetir la llamada de red en cada clic (ver comentario en el propio archivo — arregló un problema de lentitud real, documentado en el CHANGELOG).

### 3.2 Composables relevantes (`app/composables/`)

Agrupados por tema (35 en total):

- **Identidad/cuenta**: `useMyRole`, `useMyCreator`, `useMyPartner`, `useMyProfileId`, `useMyAvatar`, `useLogout`, `useAccountCache` (`resetAccountCaches()`, el punto único de vaciado de caché al cambiar de cuenta — **cualquier `useState` nuevo ligado a la cuenta debe añadirse aquí**).
- **Colaboraciones**: `useCollabRequests` (lado creador), `useMyCollaborations` (lado partner), `useCollaborationOffers`, `useCollaborationLog`. Ambas exponen ahora (desde esta sesión) `activeCount`/`pendingCount` con la misma definición compartida (`app/utils/status.ts`: `isActiveCollaborationStatus`, `isUnresolvedCollaborationStatus`).
- **Contenido**: `useMyPosts`, `usePartnerPosts`, `usePostRevisions`, `useChecklist`, `useLabels`, `usePackages`.
- **Descubrir**: `useDiscover` (con caché de consultas de IA repetidas y cancelación por `AbortController`, desde esta sesión), `useProfileSearch`, `usePublicProfile`, `useSavedProfiles`.
- **Chat**: `useChat`, `useChatSettings`, `useOffers`.
- **Notificaciones**: `useNotifications` (desde esta sesión, dos listas separadas `important`/`activity`, ver §4).
- **Otros**: `useRatings`, `useReports`, `useMyCredits`, `useMyBilling`, `useMyTrends`, `useMySocialAccounts`, `useConfirm` (diálogo de confirmación global), `useUnsavedChangesGuard`, `useGsap`, `useScrollReveal`, `useClipboard`.

### 3.3 Base de datos (Supabase/Postgres) — 29 migraciones

Tablas principales (consultar las migraciones citadas para el DDL exacto y las policies RLS completas — es la fuente de verdad):

| Tabla | Migración de origen | Para qué sirve |
|---|---|---|
| `profiles` | inicial | Extiende `auth.users`; guarda `role` (`creator`\|`partner`) |
| `creators` / `partners` | inicial, renombradas en `20261021120000` | Fichas de cada rol; directorios públicos de solo lectura para "Descubrir" |
| `collaborations` | inicial, muy ampliada después | El "contrato" del marketplace. Columnas clave: `status` (`requested`\|`accepted`\|`in_progress`\|`completed`\|`declined`), `initiated_by`, `budget_cents`, `paid_at`, `stripe_payment_intent_id`, condiciones pactadas (`scope_notes`, `revisions_included`, `exclusivity`, `usage_rights`) y brief estructurado (`campaign_goal`, `target_audience`, `tone`) |
| `posts` | inicial | Entregas del tablero; `collaboration_id` opcional |
| `social_accounts` | inicial | Redes conectadas, tokens cifrados |
| `metrics`, `ml_predictions`, `trends` | inicial | Sin policy de insert/update para el cliente — solo servidor |
| `subscriptions`, `credit_ledger` | `20261020150000`/`20261020160000` | Plan de pago y créditos de IA |
| `notifications` | `20261021110000` | Bandeja; solo la escriben triggers `security definer` |
| `discovery_searches` | `20261021150000` | Log de cada búsqueda en Descubrir, solo `service_role` |
| `packages`, `conversations`, `messages`, `offers` | `20261021160000` | Catálogo de lo que ofrece/necesita un perfil; chat 1 a 1; ofertas sobre paquetes reales |
| `collaboration_offers`, `reports` | `20261021140000` | Contraofertas (historial append-only) y reportes confidenciales al admin |
| `labels`, `post_labels`, `checklist_items` | `20261024090000` | Tablero "tipo Trello" — exclusivo del creador dueño |
| `collaboration_ratings` | `20261025120000` | Valoración mutua, solo sobre colaboraciones `completed`, una por persona, inmutable |
| `saved_profiles` | `20261025130000` | Favoritos de Descubrir |
| `post_revision_notes` | `20261025140000` | Motivo real al "pedir cambios" a una entrega |
| `collaboration_log_entries` | `20261025170000` | Registro compartido de incidencias/cambios acordados (distinto de `reports`, que es confidencial) |

**Funciones/RPCs de seguridad relevantes** (en vez de `update` directo del cliente): `accept_collaboration_request`, `decline_collaboration_request`, `mark_collaboration_completed`, `create_offer`, `respond_offer`, `approve_post`, `request_post_changes`, `submit_collaboration_rating`, `my_credit_balance`, `notify(...)`.

**Trigger de inmutabilidad**: `prevent_collaboration_terms_update()` — las 7 columnas de condiciones/brief se fijan una vez y no se pueden tocar después, ni siquiera con `service_role` (probado explícitamente en tests).

**Precaución documentada repetidamente en el propio código**: `respond_offer()`/`create_offer()` insertan mensajes de chat reales con `offer_id`, y **`messages.offer_id` y `collaborations.offer_id` son `on delete set null`, no `cascade`** — esto causó fugas de datos de test reales en esta misma sesión (ver §4.3). Cualquier función nueva que relacione una fila "efímera" (de test) con `offers` debe tenerlo en cuenta explícitamente.

### 3.4 Endpoints de servidor (`server/api/`)

| Ruta | Qué hace |
|---|---|
| `POST /api/discover/search` | Motor único de Descubrir (filtros y/o IA), usado por ambos roles — la dirección se decide por la ficha de quien llama, nunca por un parámetro del cliente |
| `POST /api/ml/predict`, `GET /api/ml/trends` | Predicción de éxito de contenido (heurística + LLM) y tendencias |
| `POST /api/stripe/create-checkout-session` | Suscripción FEEDMA Pro |
| `POST /api/stripe/pay-collaboration` | Pago marketplace (Stripe Connect, destino al creador, comisión para FEEDMA) |
| `POST /api/stripe/webhook` | Único sitio que escribe `subscriptions`/`paid_at`/`stripe_connect_onboarded` — firma verificada, idempotente |
| `POST /api/stripe/connect/account-link` | Onboarding de Stripe Connect para el creador |
| `GET/POST /api/auth/instagram/*`, `/api/auth/youtube/*` | OAuth de redes sociales |
| `POST /api/social/instagram-sync`, `/api/social/youtube-sync`, `GET /api/social/youtube-channel-stats` | Sincronización de métricas |
| `GET/POST /api/admin/*` | Panel de admin (auth propia, no Supabase) |

### 3.5 Pagos — dos flujos distintos, no confundir

1. **Suscripción (FEEDMA Pro, 19,99 €/mes, 20 créditos/mes)**: `create-checkout-session` → Stripe Checkout en modo `subscription` → webhook `checkout.session.completed` guarda la suscripción → `invoice.paid` concede créditos (incluida la primera vez, para que alta y renovaciones comparta un único camino de código).
2. **Pago marketplace (partner paga al creador)**: `pay-collaboration` → Checkout en modo `payment` con `application_fee_amount` (10%, `MARKETPLACE_FEE_RATE` en `server/utils/stripe-plans.ts`) y `transfer_data.destination` a la cuenta Stripe Connect del creador → webhook marca `paid_at` de forma idempotente (`.is('paid_at', null)` como guarda) y notifica al creador. Requiere que el creador tenga `stripe_connect_onboarded = true`; si no, el endpoint rechaza el pago con un mensaje explícito.

Ninguno de los dos flujos se ha probado con un pago real en esta sesión ni, hasta donde se puede verificar, en sesiones anteriores — solo con el script manual `tests/integration/webhook-idempotency.mjs` (idempotencia del webhook, firmando un evento de verdad pero sin pasar por el Checkout real de Stripe).

### 3.6 Variables de entorno (solo nombres, sin valores)

| Variable | Para qué sirve |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Conexión a Supabase (cliente y servidor) |
| `SUPABASE_DB_URL` | Conexión directa a Postgres, solo para `scripts/apply-pending-migrations.mjs` cuando el SQL Editor del dashboard falla |
| `DEMO_PASSWORD` | Contraseña compartida de las cuentas demo creadas por `npm run db:seed-users` |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Proveedor de IA (Descubrir y predicción de éxito) — sin clave, la app sigue funcionando sin IA real |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagos |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` | OAuth de Instagram |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` | OAuth de YouTube |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Cifra los tokens de redes sociales guardados en base de datos |
| `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` | Panel de administración (no usa Supabase Auth) |

### 3.7 Comandos

```bash
npm run dev / build / preview          # desarrollo / build / servir build
npx vue-tsc --noEmit                   # typecheck
npm test -- --run                      # unitarios (Vitest, sin red)
npm run test:integration               # integración (Vitest, contra Supabase real — ver §6 sobre el límite de autenticación)
npm run db:seed-users                  # crea las cuentas demo (creator@feedma.test, partner@feedma.test)
npm run db:seed-discover               # pobla perfiles de ejemplo para Descubrir
npm run db:cleanup-discover-demo       # limpia esos perfiles de ejemplo
node scripts/apply-pending-migrations.mjs   # aplica migraciones vía conexión directa (solo si el SQL Editor del dashboard falla)
```

No hay un comando de despliegue propio en `package.json` — no se ha podido verificar si hay un pipeline de CI/CD configurado fuera del repo (GitHub Actions, Vercel, etc.); no se encontró ningún archivo `.github/workflows/` en la raíz durante este análisis.

---

## 4. Auditoría de usabilidad y problemas detectados

Esta sección combina: (a) los 21 hallazgos + 2 adicionales (N1, N2) de una auditoría de usabilidad en navegador hecha el 23 de octubre de 2026 por otra sesión de Claude (documentada en `CONTEXT.md`, en la raíz del repo — léelo entero para el detalle completo, no se repite aquí), y (b) lo que esta sesión ha verificado, corregido o descubierto al investigarlos. **Ningún hallazgo se da por cerrado sin haberlo verificado en código o datos reales** — donde no se pudo verificar, se dice explícitamente.

### 4.1 Hallazgos de prioridad alta (#1 a #6)

| # | Hallazgo | Estado | Notas |
|---|---|---|---|
| #1 | Contadores de colaboraciones incoherentes entre creador y partner | ✅ **Resuelto** | La causa real no era un error de cálculo: era una fuga de datos de test (ver §4.3) que había llenado `collaborations` de filas huérfanas. Además, se unificó la definición ("activa"/"pendiente") en `utils/status.ts`, usada por los dos composables — antes cada página reimplementaba su propio filtro inline. Test de integración nuevo que compara los dos roles sobre el mismo dato (`tests/integration/collaboration-counters.spec.ts`). |
| #2 | Bandeja de notificaciones saturada (un aviso por login, sin separar importante de actividad) | ✅ **Resuelto** | `useNotifications` ahora carga dos listas separadas (importantes/actividad); el contador del badge solo cuenta importantes. Se descubrió un bug más grave al investigar: con `limit(30)` en una sola lista, un aluvión de logins podía desplazar un aviso real (solicitud, oferta) fuera de la ventana visible sin que nadie lo notara. "Agrupar solicitudes duplicadas" (la otra parte de #2) **se dejó sin hacer**, a la espera de ver si seguía siendo un problema real una vez limpiados los datos de test. |
| #3 | Residuos de pruebas automáticas mezclados con datos reales (chat, paquetes, perfiles) | ✅ **Resuelto en gran parte, no al 100%** | Causa raíz: tres columnas `on delete set null` en vez de `cascade` (`messages.offer_id` ×2 casos distintos, `collaborations.offer_id`) dejaban filas huérfanas permanentes cada vez que corría el test de ofertas. Corregido el código del test y limpiados ~36 mensajes y 19 colaboraciones huérfanas. **Queda sin decidir** un grupo de colaboraciones ambiguas (dos paquetes "Reel de lanzamiento 7505/7823", un clúster que parece un script de seed de demo, dos filas de 32 € sin origen claro) — no se tocaron por falta de un criterio tan explícito como el resto. Ver §4.3 para el detalle completo. |
| #4 | Accesos demo visibles en producción | ✅ **Resuelto** | Las credenciales demo ya no viajan en el bundle de producción (antes `v-if` solo ocultaba el botón, pero las cadenas de email/contraseña seguían en el JS servido). Verificado con un build real y `grep`. |
| #5 | Cerrar sesión enterrado; "Ajustes" y el avatar llevaban a la misma ruta con dos nombres distintos | ✅ **Resuelto** | Cerrar sesión añadido a "Más" (móvil) y SideRail (escritorio), a 1-2 toques. Unificado el nombre a "Perfil" en los dos sitios. |
| #6 | Búsqueda con IA lenta (30-58s) y sin efecto visible (no reordenaba, sin motivo) | ✅ **Resuelto — causa real encontrada y corregida** | El modelo gratuito de OpenRouter (`nemotron-3.5-lightning`, "reasoning") agotaba todo `max_tokens` "pensando" y nunca escribía el JSON de respuesta (`finish_reason: "length"`, `content: null`) — confirmado probándolo en real contra los 11 creadores de demo con la consulta exacta del informe. `reasoning: { enabled: false }` lo arregla: de 57,7s a 9,6s, con el ranking real aplicado. También: botón de cancelar, recuento visible de resultados, caché de consultas repetidas. Las peticiones duplicadas (SSR + cliente en la carga inicial) se identificaron pero **no se corrigieron** — el `useDiscover` usa `ref` normal, no `useState`, así que la búsqueda inicial se repite una vez en servidor y otra al hidratar; de bajo impacto porque esa carga inicial siempre es modo "filtros" (sin coste de IA), pero sigue siendo trabajo pendiente. |

### 4.2 Hallazgos de prioridad media (#7 a #17, N1, N2)

| # | Hallazgo | Estado |
|---|---|---|
| #7 | Contactar no avisaba de una solicitud ya pendiente | ✅ Resuelto (aviso "Pendiente de respuesta" en la tarjeta + botón desactivado). **Solo en la interfaz** — no hay ninguna restricción en la base de datos que impida el insert directo; si se quiere cerrar también ahí, es un cambio de esquema aparte, a confirmar antes. |
| #8 | Cifra de audiencia sin unidad | ✅ Resuelto ("X seguidores") |
| #9 | Perfiles incompletos en Descubrir (sin bio, sin rango) | ✅ Resuelto parcialmente — se eligió mostrar "Ficha en construcción" en vez de excluir esos perfiles de Descubrir (la otra opción que ofrecía el informe); no se tocó el criterio de qué aparece o no |
| #10 | Filtro del Tablero con la misma contraparte repetida muchas veces | ✅ Resuelto — en gran parte era la misma fuga de datos de #3 (23 repeticiones reales, no un bug de agrupación); además, cada opción ahora muestra presupuesto+estado, no solo el nombre |
| #11 | Métricas y Redes no coinciden (listas de redes distintas) | ⏳ **Pendiente**, no abordado todavía (Fase 5 del plan de `CONTEXT.md`) |
| #12 | Métricas vacías sin vista previa de ejemplo | ⏳ Pendiente |
| #13 | Créditos de predicción sin explicar coste/renovación | ⏳ Pendiente |
| #14 | Barra de ficha (71%/43%) sin detalle de qué falta | ⏳ Pendiente |
| #15 | Tablero largo en móvil (columnas vacías no colapsan) | ⏳ Pendiente |
| #16 | Chat con poca altura útil, sin estado de entregado/leído | ⏳ Pendiente — el estado de entregado/leído puede exigir cambio de datos, se recomienda tratarlo aparte |
| #17 | Oferta sin precio, sin mensaje de validación | ⏳ Pendiente |
| N1 | Contador "Solicitudes pendientes" del partner no coincidía con "Pendientes" de Colaboraciones | ✅ Resuelto — no era un fallo, eran dos definiciones distintas (direccional vs. total) con el mismo nombre. Renombrado a "Por responder" el direccional. |
| N2 | "Mensajes sin leer" del partner mostraba el nombre de su propia cuenta en vez del de la otra parte | ✅ Resuelto — `resetAccountCaches()` no vaciaba `useChat()`. Nota: el canal de Realtime (`realtimeStarted`) **no se resetea a propósito** para no duplicar la suscripción — queda como hallazgo relacionado, no corregido, documentado en `useChat.ts`. |

### 4.3 Hallazgo adicional, encontrado por esta sesión al investigar #1/#3/#10: fuga de datos de test triple

No estaba en el informe original tal cual, pero es la causa real detrás de varios hallazgos de arriba. Resumen:

1. `messages.offer_id` es `on delete set null` — tanto el mensaje de **sistema** que inserta `respond_offer()` como el mensaje de **oferta** que inserta `create_offer()` quedaban huérfanos (visibles para siempre en el chat real) cada vez que el test de integración de ofertas limpiaba su paquete de prueba.
2. `collaborations.offer_id` tiene el mismo problema — cada ejecución del test dejaba una `collaboration` real y permanente (111,11 €, `status = 'accepted'`), sin que el propio test lo detectara (solo comprueba que hay una collaboration para ESA oferta, no que no sobren de ejecuciones anteriores).
3. Limpiados: ~36 mensajes huérfanos y 19 colaboraciones huérfanas confirmadas (criterio explícito: precio exacto de test, `offer_id` ya nulo). **No tocado**: un grupo de colaboraciones ambiguas (ver tabla de #3) y una colaboración de 567 € que coincide con un valor de referencia que el propio informe de auditoría registró antes de cambiar nada (se dejó explícitamente intacta).
4. **Esta fuga puede seguir ocurriendo** si se vuelve a ejecutar la suite de integración contra este mismo proyecto — el código ya está corregido (captura y borra las tres filas huérfanas explícitamente), pero la causa de fondo (no hay cascade en esas dos columnas) sigue en el esquema. Si se quisiera un arreglo a nivel de esquema (cambiar a `on delete cascade`), **es un cambio de esquema que debe confirmarse antes de aplicar**, no se ha hecho en esta sesión.

### 4.4 Entorno de pruebas (pregunta abierta 2 de `CONTEXT.md`) — decisión tomada

El informe original preguntaba si el entorno de pruebas debía ser un segundo proyecto de Supabase o uno local. **Decisión del usuario en esta sesión**: ninguno de los dos, por ahora — se sigue usando este mismo proyecto de Supabase tanto para el uso manual como para los tests automáticos, y más adelante, cuando esté todo listo, se clonará el esquema a un proyecto nuevo y vacío para datos reales. Esto significa que:

- Los tests de integración **siguen escribiendo y limpiando datos reales** contra el proyecto compartido en cada ejecución.
- El ruido de notificaciones de login y la posibilidad de fugas de datos de test **son un riesgo estructural mientras esto no cambie**, no un bug puntual — por eso la separación Importantes/Actividad de notificaciones (#2) es más una mitigación que una solución de raíz.
- **Cuidado real detectado en esta sesión**: ejecutar `npm run test:integration` muchas veces seguidas (como ha pasado en esta misma sesión, varias veces) agota el límite de autenticación de Supabase para las cuentas demo ("Request rate limit reached") y hace fallar la suite entera con errores que no son del código — ver §6.

### 4.5 Preguntas abiertas de `CONTEXT.md` — estado

| # | Pregunta | Estado |
|---|---|---|
| 1 | Qué fuente concreta usar para los títulos | ✅ Resuelta con el usuario: Sora, solo para títulos (no para texto/botones/enlaces) |
| 2 | Entorno de pruebas: ¿segundo proyecto o local? | ✅ Resuelta (ninguno de los dos, por ahora — ver §4.4) |
| 3 | ¿Accesos demo también en producción? | ✅ Resuelta: solo en desarrollo |
| 4 | Definición exacta de "colaboración activa"/"entrega próxima"/"solicitud pendiente" | ⚠️ **Resuelta de hecho en el código** (`isActiveCollaborationStatus`/`isUnresolvedCollaborationStatus` en `utils/status.ts`), pero **nunca se confirmó explícitamente con el usuario** que esa definición sea la que quiere a largo plazo — lo escrito en código parte de lo que ya existía, no de una decisión de producto nueva. |
| 5 | ¿Se pueden borrar los datos de prueba actuales? | ⚠️ **Parcialmente resuelta por la práctica** (se han borrado residuos claramente identificables, con criterio explícito cada vez), pero el grupo ambiguo de §4.3 sigue sin una respuesta explícita del usuario, y la pregunta de fondo ("¿hay datos reales mezclados?") no se ha podido confirmar del todo. |

---

## 5. Historial de cambios y decisiones

### 5.1 Decisiones cerradas (no deben revertirse sin pedirlo explícitamente)

- No tocar Stripe, las políticas de RLS de Supabase ni el esquema de datos salvo que una tarea lo exija explícitamente — y si lo exige, parar y confirmar antes de aplicar.
- No tocar el login/OAuth social existente.
- Preservar la identidad visual de FEEDMA (paleta morada de marca, Snasm solo para el logotipo, Hanken Grotesk para texto, Sora para títulos desde esta sesión).
- El entorno de pruebas sigue siendo el mismo proyecto de Supabase que el uso manual, por ahora (ver §4.4) — no crear un segundo proyecto sin que el usuario lo pida.
- Los accesos demo (`creator@feedma.test`/`partner@feedma.test`) son solo de desarrollo (`import.meta.dev`), nunca en producción.
- Las condiciones pactadas y el brief estructurado de una colaboración se fijan una vez y quedan congelados — no se renegocian ni se editan después de creados.
- Un partner nunca tiene `update` directo sobre `posts` ni sobre los estados de `collaborations` — todo pasa por RPCs que validan en el servidor.

### 5.2 Reorganización de navegación (ya implementada, no repetir)

Hecha en 3 fases, antes de la auditoría de usabilidad de `CONTEXT.md` (commit `7649da5` y anteriores, documentado en `docs/CHANGELOG.md` entradas 30-34):

1. Renombrados de menú ("Solicitudes" → "Colaboraciones", "Calendario" → "Inicio" en partner) y accesos secundarios nuevos (Chat/Bandeja/Guardados/Perfil, antes sin acceso desde ningún menú).
2. Detalle de colaboración en dos niveles: Nivel 1 fijo (quién, estado, acción del momento) + pestañas Brief/Calendario/Registro.
3. Pagar/completar/valorar movidos de la pestaña "Colaboraciones" de Ajustes (retirada) a `*/requests.vue`, que ya cubría todos los casos.

Desde esta sesión, además: la ruta `/*/profile` se llama "Perfil" en todos los sitios que enlazan a ella (antes era "Ajustes" en un sitio y "Tu perfil" en otro).

### 5.3 Cambios de esta sesión (cronológicos, ver `docs/CHANGELOG.md` para el detalle completo con verificación de cada uno)

Fase 0 a Fase 4 del plan de `CONTEXT.md`, en orden: entorno y datos (#3/#4), notificaciones y coherencia (#1/#2/#10/N1/N2), navegación y tipografía (#5 y fuente), Descubrir con IA (#6/#7/#8/#9) — y después, cuatro rondas de ajuste fino sobre la interfaz de Descubrir pedidas directamente por el usuario tras probarlo (botón grisáceo mientras busca, un solo botón de "Filtros", exclusividad entre Filtros e IA como pestañas al estilo GIFs/Stickers de WhatsApp — **no como botones bloqueados**, corregido dos veces hasta dar con el patrón correcto). Todo commiteado en la rama `fase0-usabilidad-prep`, **nunca pusheado a GitHub** (no se ha pedido).

**Fase 5 de `CONTEXT.md` (hallazgos #11 a #21, prioridad media/baja) no se ha empezado todavía.**

### 5.4 Qué no debe alterarse sin autorización explícita (recopilado)

- Las policies de RLS y las RPCs de seguridad existentes (`accept_collaboration_request`, `respond_offer`, `approve_post`, etc.) — cambiarlas sin entender el impacto puede reabrir el hallazgo de seguridad que cerró `20261025090000_phase1_security_payments.sql` (un `update` directo permitía falsear el presupuesto/estado de una colaboración).
- El trigger de inmutabilidad de condiciones pactadas (`prevent_collaboration_terms_update`).
- Los dos flujos de Stripe (suscripción y marketplace) — no están probados con dinero real, así que cualquier cambio ahí debe ir acompañado de una explicación clara del impacto antes de aplicarse.
- El criterio de "on delete set null" en `messages.offer_id`/`collaborations.offer_id` es a propósito a nivel conceptual (una oferta borrada no debería borrar el historial del chat) — el problema no es la columna, es que ningún código de limpieza la tenía en cuenta. Cambiarla a cascade sería un cambio de esquema real, no una corrección menor.

---

## 6. Pruebas y fiabilidad

### 6.1 Qué pruebas existen

- **Unitarias** (`npm test -- --run`, Vitest, sin red ni Supabase real): `tests/unit/ficha.spec.ts`, `ml-heuristic.spec.ts`, `rate-limit.spec.ts`, `ratings.spec.ts`, `stripe-plans.spec.ts` — 30 tests en total.
- **Integración** (`npm run test:integration`, Vitest, contra el proyecto Supabase real, autenticado como las cuentas demo): `checklist-visibility`, `collaboration-counters`, `collaboration-log`, `collaboration-terms`, `collaborations-rls`, `notification-links`, `offers`, `post-revisions`, `ratings`, `saved-profiles` — 62 tests en total. Prueban RLS, RPCs `security definer` y permisos reales, no una simulación.
- **Script manual** `tests/integration/webhook-idempotency.mjs` — firma un evento real de Stripe y lo manda dos veces al servidor de desarrollo en marcha, para comprobar que el webhook no cobra dos veces. No se ejecuta solo con `npm test`, hay que lanzarlo a mano con un `collaborationId` real sin pagar.

### 6.2 Resultados más recientes conocidos (verificados en esta sesión, no inventados)

- `npx vue-tsc --noEmit`: **limpio**, última vez confirmado tras el commit `e519195`.
- `npm test -- --run`: **30/30**, última vez confirmado tras el commit `e519195`.
- `npm run build`: **limpio**, última vez confirmado tras el commit `e519195`.
- `npm run test:integration`: el último run limpio confirmado fue **62/62** (varias veces durante la sesión, tras cada incremento de Fase 1-4). **Una ejecución posterior, hecha específicamente para escribir este documento, mostró 6 y luego 12 tests fallidos** — pero el motivo en todos los casos fue `"Request rate limit reached"` al autenticar las cuentas demo, no un fallo de código: Supabase limita cuántos inicios de sesión por contraseña se pueden hacer en una ventana de tiempo, y esta sesión ha autenticado las cuentas demo decenas de veces hoy (cada test de integración abre su propia sesión). **Esto es una limitación real y actual del entorno de pruebas compartido (ver §4.4), no una regresión** — pero significa que el número "62/62" no se puede reproducir de forma fiable ejecutando la suite muchas veces seguidas en poco tiempo. Quien continúe debería esperar unos minutos entre ejecuciones completas de la suite, o investigar si se puede cachear la sesión de las cuentas demo entre archivos de test (no se ha hecho).
- Como consecuencia indirecta de tanta autenticación repetida, la tabla `notifications` de las cuentas demo tiene en este momento **1141 filas** (la mayoría, avisos de login) y `collaborations` tiene **19** — cifras mucho más altas que las de referencia del informe original, confirmando una vez más que el ruido de datos de test es continuo mientras no haya un entorno separado.

### 6.3 Qué se ha probado realmente en navegador, y con qué límites

**Ninguna herramienta de navegador ha estado disponible durante esta sesión de trabajo.** Todo lo verificado se ha hecho por una combinación de:

- Lectura directa del código.
- Consultas reales contra Supabase vía `service_role` o sesiones de las cuentas demo (Node, fuera del navegador).
- Llamadas HTTP reales a OpenRouter con datos reales de la base de datos (para el fix de IA de Descubrir).
- Un intento de servir el build de producción y comprobar el HTML/CSS generado por `curl` (confirmó que las fuentes se cargan correctamente) — no sustituye a abrir la app en un navegador real.

La auditoría de usabilidad original (`CONTEXT.md`) sí se hizo con un navegador integrado, pero solo en formato móvil (443-611 px), en modo desarrollo, y en un único recorrido — no cubre escritorio/tablet, rendimiento real de producción, ni una auditoría de accesibilidad con lector de pantalla de verdad (solo lectura del árbol de accesibilidad).

**Ningún cambio de interfaz de esta sesión (más de 15 commits) se ha visto en un navegador real.** Esto incluye explícitamente los ajustes de Descubrir pedidos directamente por el usuario en esta misma sesión (botón grisáceo, pestañas de Filtros/IA) — se implementaron según la descripción dada, verificados por tipos/tests/build, pero no se ha confirmado el aspecto final.

### 6.4 Casos críticos NO probados (explícito, para no dar una falsa sensación de cobertura)

- **Ningún pago real** (ni suscripción ni marketplace) de principio a fin con Stripe Checkout real.
- **Aceptar/rechazar una oferta desde la interfaz real** (solo probado vía RPC directo en los tests de integración, no haciendo clic en los botones reales).
- **Aprobar una entrega o pedir cambios desde la interfaz real** (mismo caso — probado por RPC, no por clic).
- **Acceso cruzado entre roles** (un creador intentando abrir `/partner/*` o viceversa) — el middleware existe y parece correcto por lectura de código, pero no se ha ejecutado la prueba de humo que el propio `CONTEXT.md` pide explícitamente para esto.
- **Conectar una red social real** (Instagram/YouTube OAuth de principio a fin).
- El menú "Más" del partner en móvil (abrir la hoja, pulsar un destino) — nunca se abrió ni en la auditoría original ni en esta sesión.
- El panel de administración (`/admin`) no se ha tocado ni revisado en esta sesión.

### 6.5 Riesgos de regresión para futuras modificaciones

- Cualquier cambio en `collaborations` (columnas, estados, triggers) puede afectar a la vez: contadores del dashboard, el filtro del Tablero, Descubrir (excluir pendientes), notificaciones, y los dos flujos de Stripe. Tocar esta tabla sin correr `npm run test:integration` completo es arriesgado.
- Cualquier cambio en `useAccountCache.ts` / `resetAccountCaches()` debe revisarse junto a **todos** los composables que usan `useState` ligado a la cuenta — olvidar añadir uno nuevo ahí reproduce exactamente el bug N2 ya corregido una vez.
- Cambios en `search.post.ts` (Descubrir/IA) deben volver a probarse contra OpenRouter real, no solo por tipos — el bug de #6 era invisible al typecheck y a los tests existentes (ninguno cubría el contenido real de la respuesta del LLM).
- Ejecutar la suite de integración repetidamente en poco tiempo puede autobloquearse por el límite de autenticación de Supabase (ver §6.2) — no interpretar esos fallos como regresiones sin comprobar el mensaje de error primero.

---

## 7. Hoja de ruta

### 7.1 Crítico — datos, seguridad y pagos

1. **Decidir qué hacer con el grupo ambiguo de colaboraciones de prueba** (§4.3) — antes de seguir limpiando datos, o de confiar en los contadores para una demo real.
2. **Probar al menos un pago real de cada flujo** (suscripción y marketplace) en un entorno controlado — es la zona de mayor riesgo real (dinero) y la menos probada.
3. **Confirmar con el usuario la pregunta abierta 4** (definición exacta de "activa"/"pendiente") — ya está implementada de hecho, pero conviene que sea una decisión consciente, no heredada.
4. Decidir si se quiere migrar `messages.offer_id`/`collaborations.offer_id` de `on delete set null` a `cascade`, o mantener la limpieza explícita en cada test — es un cambio de esquema, requiere confirmación antes de aplicarse.

### 7.2 Fiabilidad y coherencia funcional

5. Terminar #2 (agrupar solicitudes duplicadas) una vez los datos estén más estables.
6. Corregir la petición duplicada de SSR+cliente en la carga inicial de Descubrir (useDiscover usando `ref` en vez de `useState`) — bajo impacto pero queda documentado como pendiente.
7. Probar de verdad el acceso cruzado entre roles (prueba de humo que pide `CONTEXT.md`).
8. Probar de verdad, haciendo clic en la interfaz real (no por RPC), los flujos de aceptar/rechazar oferta y aprobar/pedir cambios a una entrega.

### 7.3 Rendimiento

9. Vigilar el coste/latencia de las llamadas a OpenRouter ahora que son mucho más rápidas (9-10s) — confirmar que se mantiene así con más candidatos o con el modelo gratuito cambiando de comportamiento (son modelos gratuitos, pueden cambiar sin aviso).
10. Revisar si el límite de autenticación de Supabase es un problema real más allá de los tests (por ejemplo, si varias personas probando la app a la vez agotan el mismo límite).

### 7.4 Usabilidad y diseño — Fase 5 de `CONTEXT.md`, no empezada

11. #11 Unificar las redes mencionadas en Métricas con las de Redes.
12. #12 Vista previa de Métricas con datos de ejemplo.
13. #13 Explicar el coste/renovación de los créditos de predicción.
14. #14 Listar qué campos faltan en la barra de ficha (71%/43%).
15. #15 Colapsar columnas vacías del Tablero en móvil.
16. #16 Ocultar la barra inferior dentro del chat (el estado de entregado/leído puede exigir cambio de datos — tratar aparte).
17. #17 Mensaje de validación junto al precio de una oferta vacía.

### 7.5 Accesibilidad y mejoras secundarias

18. #18 `aria-label` en botones de icono sin nombre; confirmar con una auditoría de accesibilidad real (Lighthouse/axe), no solo lectura del árbol.
19. #19 Traducir errores de autenticación de Supabase al español.
20. #20 Página 404 propia, con la marca.
21. #21 Pulido de landing ("Instalaciones", línea decorativa del hero, captura real del panel).

### 7.6 Dependencias entre fases

- 7.1 y 7.2 deberían ir antes que 7.4/7.5 — no tiene sentido pulir visualmente pantallas cuyos datos de base todavía pueden estar contaminados por fugas de test.
- Antes de abordar cualquier punto de 7.1 que toque `collaborations`/`offers`/`messages`, correr `npm run test:integration` completo primero como línea base (con margen de varios minutos desde la última ejecución, para no chocar con el límite de autenticación).
- Antes de abordar 7.4/7.5 (Fase 5), confirmar que el build y el aspecto visual de los cambios de Descubrir de esta sesión se han revisado en un navegador real — nadie lo ha hecho todavía.

---

## 8. CONTEXTO PARA EL SIGUIENTE CHAT DE CLAUDE

Copia esta sección entera en una conversación nueva para continuar sin perder contexto.

```
Estoy continuando el trabajo sobre FEEDMA, un marketplace Nuxt 4 + Supabase + Stripe
entre creadores de contenido y partners (marcas). Antes de cambiar nada:

1. Lee docs/CONTEXTO_PROYECTO_FEEDMA.md completo — es un análisis detallado del estado
   del proyecto a fecha 2026-10-23, commit e519195, rama fase0-usabilidad-prep.
   Es un snapshot: antes de fiarte de cualquier dato concreto (contadores, números de
   filas, resultados de tests), vuelve a comprobarlo contra el código/datos reales.
2. Lee CONTEXT.md (raíz del repo) — es el traspaso original de la auditoría de
   usabilidad (21 hallazgos + N1/N2) que se ha estado resolviendo fase a fase.
   DESIGN.md (raíz) está SUPERADO por CONTEXT.md — no lo sigas, ya está implementado.
3. Lee docs/CHANGELOG.md (empieza por las entradas más recientes, están arriba) para
   el detalle exacto de cada cambio hecho hasta ahora, con lo que se verificó de
   verdad y lo que no.
4. Haz `git log --oneline -20` y `git status` para confirmar en qué commit/rama estás
   de verdad — este documento puede haberse quedado desactualizado si ha pasado
   trabajo entre su creación y que lo leas.

Reglas que debes seguir, acordadas con el usuario a lo largo de esta sesión:

- NO modifiques Stripe, las policies de RLS de Supabase, el esquema de datos, el
  login/OAuth social, ni ninguna RPC de seguridad existente (accept_collaboration_
  request, respond_offer, approve_post, etc.) sin explicar primero el impacto exacto
  y esperar confirmación — aunque parezca un cambio menor.
- NO borres datos de producción/prueba sin identificar primero su origen con un
  criterio explícito (nombre, precio exacto, patrón reconocible) y sin confirmar que
  es seguro — en esta sesión se limpiaron residuos de test identificados con
  cuidado, pero quedó un grupo ambiguo sin tocar a propósito (ver §4.3 del análisis).
- Trabaja por fases pequeñas y verificables: cada cambio debe pasar
  `npx vue-tsc --noEmit`, `npm test -- --run`, y si toca datos/RLS/RPCs,
  `npm run test:integration` — y debe quedar documentado en docs/CHANGELOG.md
  (nueva entrada arriba, con "Qué se cambió / Verificado de verdad / Sin verificar").
- OJO con `npm run test:integration`: Supabase tiene un límite de autenticación por
  contraseña, y ejecutar la suite muchas veces seguidas en poco tiempo lo agota,
  dando fallos "Request rate limit reached" que NO son del código. Si ves eso,
  espera unos minutos y repite antes de asumir una regresión real.
- No hay entorno de pruebas de Supabase separado: todo (uso manual, cuentas demo,
  tests de integración) va contra el mismo proyecto en la nube — decisión explícita
  del usuario, no un descuido. Esto significa que los tests dejan y limpian datos
  reales en cada ejecución; cualquier test nuevo debe limpiar explícitamente lo que
  crea (packages, messages, collaborations — ver el comentario largo en
  tests/integration/offers.spec.ts sobre por qué `on delete set null` obliga a
  borrar a mano en vez de confiar en cascada).
- No hay herramienta de navegador disponible en Claude Code en esta sesión — ningún
  cambio de interfaz se ha visto renderizado de verdad. Si tienes acceso a un
  navegador (MCP, Playwright, etc.), es el primer sitio donde conviene invertir
  tiempo antes de seguir añadiendo cambios visuales a ciegas.
- El plan de hallazgos pendiente es la "Fase 5" de CONTEXT.md (hallazgos #11 a #21,
  prioridad media/baja: Métricas/Redes, créditos de predicción, barra de ficha,
  Tablero en móvil, chat, validación de oferta, accesibilidad, 404, landing) — no
  se ha empezado todavía. Es un buen punto de partida si no hay nada más urgente.
- Antes de esa Fase 5, hay pendientes de más impacto real: probar al menos un pago
  real de cada flujo de Stripe, decidir qué hacer con el grupo ambiguo de
  colaboraciones de prueba, y confirmar con el usuario la definición exacta de
  "colaboración activa"/"pendiente" que ya está en el código pero nunca se acordó
  explícitamente como decisión de producto.

Pregunta al usuario, no asumas, si:
- Vas a borrar cualquier dato cuyo origen no puedas identificar con un criterio
  explícito.
- Vas a tocar RLS, RPCs de seguridad, Stripe o el esquema de datos.
- No está claro si algo pedido es una fase nueva o una continuación de una ya en
  marcha (CONTEXT.md tiene fases numeradas 0-5; sigue ese orden salvo que el
  usuario pida explícitamente otra cosa).
```

---

## Resumen para el usuario (fuera de la sección anterior, para esta conversación)

### Hallazgos más importantes de este análisis

1. **La fuga de datos de test (§4.3) es más grande de lo que parecía** incluso después de las correcciones de esta sesión: entre el momento de cerrar la Fase 4 y escribir este documento, las notificaciones de las cuentas demo pasaron de 404 a **1141 filas** solo por las pruebas repetidas de esta sesión — confirma que el ruido de datos de test es continuo mientras se siga usando el mismo proyecto de Supabase para todo.
2. **Hay un límite real de autenticación de Supabase** que puede hacer fallar `npm run test:integration` sin que sea un bug — ya pasó dos veces en esta sesión y ha vuelto a pasar al preparar este documento. Vale la pena saberlo antes de asustarse con una "regresión" que no lo es.
3. **Ningún cambio de interfaz de toda la sesión (más de 15 commits) se ha visto nunca en un navegador real** — todo está verificado por tipos, tests y lectura de código, pero el aspecto visual final (incluidos los ajustes de Descubrir que pediste tú directamente) sigue sin confirmación visual.
4. Los documentos `docs/1-ARCHITECTURE.md` y, en menor medida, `docs/2-DATABASE-SCHEMA.md` están desactualizados respecto al código real — no son fiables para entender el estado actual, aunque sí son interesantes como planificación original.

### Qué no he podido verificar

- Si existe algún pipeline de CI/CD fuera del repo (no se encontró `.github/workflows/`).
- El comportamiento real de los pagos de Stripe (nunca probados con dinero real en esta sesión ni, hasta donde se puede comprobar, antes).
- El aspecto visual de absolutamente nada de lo cambiado en esta sesión larga (sin herramienta de navegador disponible).
- El origen exacto del grupo ambiguo de colaboraciones de prueba (§4.3) — se decidió no tocarlas, no se investigó más a fondo quién/qué las creó.
- Si el panel de administración (`/admin`) tiene algún problema — no se ha revisado en esta sesión.

### Cómo usar la sección 8

Copia el bloque de código que empieza en "Estoy continuando el trabajo sobre FEEDMA..." (dentro de la sección **8. CONTEXTO PARA EL SIGUIENTE CHAT DE CLAUDE**) y pégalo como primer mensaje en una conversación nueva de Claude Code en este mismo repositorio. Te recomiendo pegarlo tal cual, sin resumirlo más — está escrito para que la siguiente sesión sepa exactamente qué leer primero y qué reglas no romper, no para que lo interprete por ti.
