# CIBERAN — Fase 0: mapa del proyecto

| | |
|---|---|
| Fecha | 2026-11-03 |
| Rama | `feature/integracion-alex-mario` |
| Commit | `0ab25da` (Objetivo semanal: semana natural) |
| Encargo | `supabase/migrations/auditoria-completa.md` (Fase 0) |
| Método | Lectura de código, de las 39 migraciones y de la documentación; comandos de solo lectura |

**Qué NO se ha hecho en esta fase.** No se ha modificado código, configuración ni base de datos. No se han ejecutado typecheck completo, tests, build ni navegador (todo eso pertenece a la Fase 1). No se ha consultado la base de datos real. La única orden "de comprobación" ejecutada fue `npx vue-tsc --noEmit --listFiles`, que no escribe nada, para saber qué archivos revisa el typecheck (ver H0-01).

**Cómo leer los estados.** "Verificado (código)" significa leído en el código o en las migraciones. "Verificado (comando)" significa que lo confirma un comando ejecutado. "Según la documentación" significa que no se ha comprobado y se toma de `docs/`. "Hipótesis" es una sospecha con indicios que hay que confirmar en una fase posterior.

---

## 1. Resumen

CIBERAN es un marketplace de dos roles: **creador** (`creator`) y **partner** (marca). Es una sola aplicación Nuxt 4 con SSR. El servidor Nitro hace de backend propio (`server/api`) y se apoya en un único proyecto de Supabase (Postgres, Auth, Storage y Realtime), en Stripe (suscripción y Connect), en OpenRouter (IA) y en las API de YouTube e Instagram.

| Pieza | Cantidad | Comentario |
|---|---|---|
| Páginas Nuxt | 27 (+1 desactivada) | Sin carpeta `layouts/`: cada página monta `AppShell` |
| Componentes | 95 | 15 carpetas por dominio, auto-importados sin prefijo |
| Composables | 50 | Estado con `useState` de Nuxt; Pinia instalado pero sin uso |
| Utilidades cliente | 27 | Lógica pura (vistas, estados, formatos) |
| Endpoints servidor | 34 | admin, auth (OAuth), discover, ml, social, stripe |
| Utilidades servidor | 26 | Cifrado, OAuth, sync, YouTube, métricas, límites de uso |
| Migraciones SQL | 39 | 28 tablas vivas, 30 funciones, 14 triggers, 58 políticas RLS |
| Edge Functions | **0** | No existe `supabase/functions` |
| Tests unitarios | 35 archivos (~374 casos estáticos; ~599 con `it.each` según CHANGELOG) | Sin red |
| Tests de integración | 18 archivos `.spec.ts` (143 casos) + 1 script manual | **Contra el Supabase real compartido** |
| CI | 1 workflow (typecheck, unitarios, build) | **Su typecheck no comprueba ningún archivo** (H0-01) |

Las cinco señales más importantes de esta fase están en la §17. En resumen: el typecheck no revisa nada (verificado), el webhook de Stripe casi seguro no concede créditos (hipótesis fuerte), es posible que cualquier cliente pueda llamar a funciones `SECURITY DEFINER` como `notify()` (hipótesis que hay que comprobar contra la base), no hay ningún entorno aislado para pruebas ni demo, y `main` lleva diez días sin actualizarse.

---

## 2. Estado de Git

> **Corrección (2026-11-03, validación de hallazgos críticos).** Esta tabla se hizo sin `git fetch` y comparó con referencias remotas antiguas. Después del `fetch`: **`origin/main` = `HEAD` (`0ab25da`)**. Los "6 commits sin subir" ya están en GitHub, en `main`; solo la rama remota `feature/integracion-alex-mario` va 6 por detrás, y la `main` **local** es la desactualizada. La CI **sí** se ha ejecutado en GitHub (6 ejecuciones en `main` desde el 30/10, todas en verde). Ver `07_CRITICAL_FINDINGS_VALIDATION.md` (H0-06).

| Elemento | Estado (verificado por comando, sin `fetch`; ver corrección) |
|---|---|
| Rama actual | `feature/integracion-alex-mario` |
| Árbol de trabajo | Limpio salvo `supabase/migrations/auditoria-completa.md` (sin seguimiento: es el encargo de esta auditoría) |
| Frente a `main` | 82 commits por delante, 0 por detrás |
| Frente a `origin` | **6 commits locales sin subir** (los del 2026-11-03) |
| `main` | Último commit `dace066` (2026-10-24). No contiene nada del trabajo de redes, métricas, chat ni publicaciones posterior al 24/10 |
| Otras ramas | `feature/onboarding` (Mario, +8/−1), `feature/publicaciones-ux` (Alex, +8/−1), `feature/redes-r13-token-crypto` (+26), `fase0-usabilidad-prep` (ya en `main`) |
| Remoto | `github.com/MarioHernandezDev/dweb-create` |

La rama de integración contiene ya el trabajo de las dos personas (commit `34dfd5f`, "Integra la rama de Mario"). Las ramas individuales están por detrás de ella.

---

## 3. Documentación existente y fiabilidad

Regla del encargo: si el código y la documentación se contradicen, manda el código. Clasificación a fecha de hoy:

| Documento | Uso | Fiabilidad |
|---|---|---|
| `docs/CHANGELOG.md` (2 902 líneas, entradas 1–58 y Alex-1–48) | Registro cronológico con "Verificado / Sin verificar" | **Alta** como historial. Ojo: todas sus menciones a "`vue-tsc` limpio" quedan en entredicho (H0-01) |
| `PIPELINE_IMPLEMENTACION_CIBERAN_ALEX.md` (+ anexo del 28/10 y estados hasta el 03/11) | Plan y estado de las tareas A-R/A-P de Alex | Alta, actualizado el 03/11 |
| `docs/TRABAJO_ALEX.md` | Tareas de Alex y **registro de migraciones aplicadas** | Alta. Es la única fuente del estado de aplicación de las migraciones del 28/10 en adelante |
| `docs/TRABAJO_MARIO.md` | Tareas de Mario (M-*) y decisiones Q1–Q13 | Alta a 28/10. Registro de migraciones de Mario vacío |
| `docs/PENDIENTES.md` | Pendientes a 24/10 | Media: parte ya resuelta (CI, páginas legales, límite del login de admin) |
| `docs/CONTEXTO_PROYECTO_CIBERAN.md` | Análisis del 23/10 | Media: foto antigua (dice que no hay CI, 29 migraciones, 30 tests unitarios) |
| `docs/PROPUESTA_*.md`, `REQUISITO_A-R16`, `AUDITORIA_A-R9` | Diseño de cada tarea | Alta para la decisión que documentan |
| `CIBERAN_PRODUCT_ROADMAP.md` | Visión de producto (en forma de encargo) | Es un plan, no un estado |
| `CONTEXT.md` | Auditoría de usabilidad del 23/10 (21 hallazgos) | Histórica; sus fases 0–5 constan como hechas en el CHANGELOG |
| `PROJECT_OVERVIEW.md` | Resumen técnico del 23/10 | Media |
| `README.md` | Presentación | **Desactualizado** (lo dicen TRABAJO_ALEX y TRABAJO_MARIO) |
| `DESIGN.md` | Encargo del rediseño de Descubrir | Histórico, ya implementado |
| `docs/1-ARCHITECTURE.md` | Arquitectura inicial | **Desactualizado**: describe multi-tenant, FastAPI y shadcn-vue, que no existen |
| `docs/2-DATABASE-SCHEMA.md` | Porqué del esquema | Parcial: anterior a la mitad de las migraciones |
| `docs/3-ML-PIPELINE.md`, `4-ROADMAP-AND-TASKS.md` | Plan inicial | Histórico |
| `docs/5-FRONTEND-WORK-SPLIT.md` | Reparto inicial | Marcado como superado |
| `docs/6-SUPABASE-SETUP.md`, `7-STRIPE-SETUP.md`, `8-AI-SUGGESTIONS-SETUP.md` | Guías de puesta en marcha | Útiles; no revisadas contra el código en esta fase |
| `docs/9-INSTAGRAM-OAUTH-SETUP.md`, `10-YOUTUBE-OAUTH-SETUP.md` | Guías OAuth | Pendientes de actualizar (tarea A-R14) |
| `docs/10-ROADMAP-FUTURO.md` | Conversación de planificación del 21/10 | Histórico; dos documentos con prefijo `10-` |

Hay decisiones ya tomadas que esta auditoría **no vuelve a abrir**: Q3 (sin scheduler hasta decidir el despliegue), Q4 (redes sin OAuth como "Próximamente"), Q5 (Instagram bloqueado sin app de Meta), Q6 (la aprobación del partner es un aviso, no un bloqueo), Q8 (subramas y PR a `main`), un único proyecto de Supabase compartido para todo (decisión del 23/10) y el reparto Alex/Mario.

---

## 4. Arquitectura general

```
Navegador (Vue 3 + Nuxt 4, SSR + hidratación)
  │
  ├─ @nuxtjs/supabase (clave anon + sesión del usuario) ──► Supabase REST/RPC  (RLS = autorización)
  │      composables use*.ts: .from(tabla) / .rpc(función)         Realtime (chat)
  │                                                                Storage (bucket post-media)
  │
  └─ $fetch('/api/...') ──► Nitro (server/api)
                             ├─ serverSupabaseUser  → identifica al usuario
                             ├─ serverSupabaseServiceRole → escribe saltándose RLS (con comprobaciones propias)
                             ├─ Stripe (Checkout, Connect, webhook firmado)
                             ├─ Google OAuth + YouTube Data/Analytics API
                             ├─ Instagram Login API (graph.instagram.com)
                             └─ OpenRouter (LLM gratuito)

Panel /admin: contraseña propia + cookie sellada (h3 useSession); no usa Supabase Auth.
Sincronización programada: POST /api/social/sync-all con Bearer SYNC_CRON_SECRET; hoy no la llama nadie.
```

Hay dos caminos de escritura y no conviene confundirlos:

1. **Cliente → Supabase con RLS.** Es la mayoría: publicaciones, etiquetas, checklist, fichas, paquetes, favoritos. Las operaciones sensibles (aceptar, ofertar, aprobar, valorar, enviar mensajes) pasan por funciones `SECURITY DEFINER`, no por un `update` directo.
2. **Cliente → `/api` → `service_role`.** Se usa para pagos, OAuth, sincronización, vínculos de publicación, métricas, IA y admin. Aquí la autorización depende **del código del endpoint**, no de RLS.

---

## 5. Rutas de Nuxt

El control de acceso tiene dos capas. La primera es `@nuxtjs/supabase` con `redirectOptions`: exige sesión salvo en `/`, `/onboarding`, `/instalaciones`, `/privacidad`, `/terminos` y `/admin*`. La segunda es `app/middleware/role-guard.global.ts`: impide entrar en la sección del otro rol (`/creator/*` ⇄ `/partner/*`) leyendo el rol de `profiles`, y cachea `getUser()` durante 30 s. **Las rutas compartidas (`/chat`, `/inbox`, `/favorites`, `/profile/...`) no tienen restricción de rol, a propósito.** Ninguna página usa `definePageMeta`.

| Ruta | Acceso | Qué es | Composables / endpoints principales |
|---|---|---|---|
| `/` | Público | Landing | componentes `landing/*` |
| `/instalaciones` | Público | Guía de instalación de la PWA | `install/*` |
| `/onboarding` | Público | **Alta de cuenta** (no es el tour) | `supabase.auth.signUp`, `resetAccountCaches` |
| `/login` | Público | Inicio de sesión | `signInWithPassword`, `useMyRole` |
| `/confirm` | Callback | Vuelta tras confirmar el email | `useMyRole` |
| `/privacidad`, `/terminos` | Público | Plantillas legales (datos por rellenar en `utils/legal.ts`) | — |
| `/creator` | Creador | "Hoy": resumen, objetivo semanal, entregas | `useMyPosts`, `useCollabRequests`, `useMySocialAccounts`, `useChat`, `useDiscover`, `usePackages` |
| `/creator/timeline` | Creador | "Publicaciones": Tablero y Lista | `useMyPosts`, `usePostActions`, `useCollabRequests` |
| `/creator/post/[id]` | Creador | Detalle y edición de una publicación | `usePostEditorPanel`, `/api/ml/history-context`, `/api/ml/predict` |
| `/creator/discover` | Creador | Buscar partners (filtros o IA) | `useDiscover` → `/api/discover/search` |
| `/creator/requests` | Creador | Colaboraciones: Pendientes / En curso / Historial; detalle con Brief / Calendario / Registro | `useCollabRequests`, `useChecklist`, `useMyPosts` |
| `/creator/metrics` | Creador | Métricas: resumen y Conexiones (conectar, desconectar, sincronizar) | `useMySocialAccounts`, `useSocialAccountActions` |
| `/creator/metrics/[platform]` | Creador | Panel de YouTube (periodos, vídeos, histórico) | `useYoutube*`, `/api/social/youtube-*` |
| `/creator/profile` | Creador | Perfil: ficha, paquetes, facturación (Pro y Stripe Connect), chat, cuenta | `useMyCreator`, `useMyBilling`, `useMyCredits`, `usePackages`, `useChatSettings`, `useOnboardingTour` |
| `/creator/socials` | — | Redirección 302 a `/creator/metrics` (`routeRules`) | — |
| `/partner` | Partner | "Inicio": resumen y "Tu calendario" | `useMyCollaborations`, `usePartnerPosts`, `useChat`, `useDiscover` |
| `/partner/discover` | Partner | Buscar creadores | `useDiscover` |
| `/partner/requests` | Partner | Colaboraciones; detalle con Brief / Calendario / **Rendimiento** / Registro; **botón de pago** | `useMyCollaborations` → `/api/stripe/pay-collaboration`, `usePartnerPosts` |
| `/partner/profile` | Partner | Perfil de empresa, paquetes y ajustes | `useMyPartner`, `usePackages`, `useChatSettings` |
| `/chat`, `/chat/[id]` | Con sesión | Chat a dos paneles (rutas anidadas, `pages/chat.vue` es el contenedor) | `useChat`, `usePackages`, `useOffers` |
| `/inbox` | Con sesión | Bandeja: Importantes / Actividad | `useNotifications` |
| `/favorites` | Con sesión | Perfiles guardados y comparación | `useSavedProfiles`, `usePublicProfile`, `useRatings` |
| `/profile/[role]/[id]` | Con sesión | Perfil público de creador o partner | `usePublicProfile` (RPC `get_public_social_accounts`), `useRatings`, `usePackages`, `useChat` |
| `/admin/login`, `/admin` | Contraseña propia | Panel: usuarios, actividad, analíticas, reportes, bloquear, regalar Pro | `/api/admin/*` |
| `app/_disabled/creator/trends.vue` | — | Tendencias, desactivada (fuera de `pages/`) | `useMyTrends` → `/api/ml/trends` |

`app/error.vue` es la página de error y 404 propia, en español.

---

## 6. Shell, navegación y componentes

- **Shell.** `app.vue` contiene `NuxtLoadingIndicator`, `LoadingOverlay` y `NuxtPage` con transición. `AppShell.vue` (importado por cada página privada) monta `SideRail` (escritorio), `TopBar`, `BottomTabBar` (móvil), y una sola vez `ConfirmDialogHost`, `ToastHost` y `OnboardingTour`. No existen layouts de Nuxt.
- **Navegación.** `app/utils/nav.ts` define `roleNav`: creador = Hoy · Publicaciones · Descubrir · Colaboraciones · Métricas; partner = Inicio · Descubrir · Colaboraciones. `secondaryNav` añade Chat · Bandeja · Guardados · Perfil. En móvil (Alex-43) la barra queda en Hoy · Publicaciones · Descubrir · Chat · Más.
- **Componentes por dominio** (`app/components`, auto-importados sin prefijo):

| Carpeta | Qué contiene |
|---|---|
| `ui/` (18) | Base: botones, tarjetas, `BottomSheet`, `ConfirmDialogHost`, `ToastHost`, `SkeletonBlock`, `EmptyState`, `SegmentedTabs`, subida de avatar y portada |
| `layout/` (5) | `AppShell`, `SideRail`, `TopBar`, `BottomTabBar`, `ProfileSearchBar` |
| `timeline/` (12) | `PhaseBoard` (Kanban con `vuedraggable`), `WeekBoard` (calendario semanal), hojas de crear, editar y detalle, filtros, lista, `PostReviewActions` |
| `chat/` (6) | Lista de conversaciones, compositor, burbujas, `OfferCard`, `ChatOfferSheet` |
| `collab/` (6) | `NegotiationPanel` (contraofertas), condiciones pactadas, registro, informe de rendimiento, valoraciones |
| `profile/` (9) | Cabecera, ficha, paquetes, barra de guardado, `PublicProfileView` |
| `youtube/` (12) | Panel de YouTube completo (A-R16/A-R17) |
| `charts/` (7) | Gráficas SVG propias (sin librería de gráficos) |
| `post/` (2) | Vínculo con contenido externo y métricas por publicación |
| `discover/`, `home/`, `ml/`, `social/`, `onboarding/`, `legal/`, `landing/`, `install/` | Lo que indica cada nombre |

**Sin uso en pantallas activas (verificado por búsqueda):** `charts/NetChangeBarChart.vue`, `profile/ProfileCompletionBar.vue`, `ml/TrendCard.vue` (solo en la página desactivada), `charts/WeeklyEngagementChart.vue` y la serie fija `engagementSeries` de `utils/mock-data.ts` (no se muestran en ninguna pantalla; las sugerencias genéricas `suggestionsForDraft` sí se usan y van marcadas como "Consejos generales").

---

## 7. Composables y estado

**El estado global se gestiona con `useState`.** Cada composable usa una clave única. `resetAccountCaches()` (en `useAccountCache.ts`) vacía la caché al cambiar de cuenta y se llama en login, alta y logout. `@pinia/nuxt` está cargado en `nuxt.config.ts` y declarado como dependencia, pero **no hay ningún `defineStore`** (verificado).

| Grupo | Composable → qué toca (verificado por búsqueda de `.from`, `.rpc` y `/api`) |
|---|---|
| Identidad | `useMyRole`, `useMyAvatar`, `useChatSettings` → `profiles`; `useMyCreator` → `creators` (+ Storage); `useMyPartner` → `partners` (+ Storage); `useMyProfileId`; `useLogout`; `useAccountCache` |
| Colaboraciones | `useCollabRequests` (creador) y `useMyCollaborations` (partner) → `collaborations` + RPC `accept_collaboration_request`, `decline_collaboration_request`, `mark_collaboration_completed`; el partner además usa `/api/stripe/pay-collaboration`. `useCollaborationOffers` → `collaboration_offers`. `useCollaborationLog` → `collaboration_log_entries`. `useCollaborationReport` → `posts`, `post_external_links`, `metrics` |
| Publicaciones | `useMyPosts` → `posts` (+ Storage; paginación de 300 en 300). `usePartnerPosts` → `posts`, `checklist_items` + RPC `approve_post`, `request_post_changes`. `usePostRevisions` → `post_revision_notes`, `partners`. `useChecklist`, `useLabels` (`labels`, `post_labels`). `usePostActions`, `usePostEditorPanel` (→ `/api/ml/predict`). `usePostExternalLink` (→ `/api/social/link-post`). `usePostMetrics` → `metrics` y `/api/social/post-metrics-refresh` |
| Chat y ofertas | `useChat` (604 líneas) → `conversations`, `messages`, `profiles`, `creators`, `partners` + RPC `get_or_create_conversation`, `send_text_message`, `mark_conversation_read`, `my_chat_unread_count` + Realtime. `useOffers` → `offers`, `packages` + RPC `create_offer`, `respond_offer`. `usePackages` → `packages` (+ Storage) |
| Descubrir y perfiles | `useDiscover` → `/api/discover/search`. `useProfileSearch` → `creators`, `partners`. `usePublicProfile` → `creators`, `partners`, `profiles` + RPC `get_public_social_accounts`. `useSavedProfiles` → `saved_profiles`. `useRatings` → `collaboration_ratings` + RPC `submit_collaboration_rating`, `profile_rating_summary`. `useReports` → `reports` |
| Redes y métricas | `useMySocialAccounts` → `social_accounts` (solo lectura) + `/api/auth/*/start`, `/api/social/{disconnect,instagram-sync,youtube-sync}`. `useSocialAccountActions`. `useAccountSnapshots` → `social_account_snapshots`. `useYoutubeAnalytics`, `useYoutubeVideos`, `useYoutubeVideoPerformance`, `useYoutubeVideoDetail` → `/api/social/youtube-*` |
| Pagos y créditos | `useMyBilling` → `creators`, `subscriptions` + `/api/stripe/{create-checkout-session,connect/account-link}`. `useMyCredits` → RPC `my_credit_balance` |
| Otros | `useNotifications` → `notifications`. `useMyTrends` → `/api/ml/trends` (solo la página desactivada). `useOnboardingTour` (`localStorage`). `useToast`, `useConfirm`, `useUnsavedChangesGuard`, `useCountUp`, `useGsap`, `useScrollReveal`, `useClipboard` |

---

## 8. Servidor (`server/api`, `server/utils`)

No hay `server/middleware`, `server/plugins` ni `server/routes`. Cada endpoint se autentica por su cuenta.

| Endpoint | Autenticación | Escribe / lee | Externo |
|---|---|---|---|
| `POST /api/discover/search` | usuario + límite 20/min | `creators`, `partners`, `discovery_searches` (service_role) | OpenRouter |
| `POST /api/ml/predict` | usuario + límite 10/min | `posts`, `ml_predictions`, `credit_ledger`, `creators` | OpenRouter |
| `GET /api/ml/history-context` | usuario + límite | `posts`, `metrics`, `creators` | — |
| `GET /api/ml/trends` | usuario | `trends`, `posts`, `creators` | OpenRouter (solo lo usa la página desactivada) |
| `GET /api/auth/{instagram,youtube}/start` | usuario (creador) | `creators` | Redirige al proveedor con `state` firmado |
| `GET /api/auth/{instagram,youtube}/callback` | `state` HMAC (10 min) | `social_accounts` (tokens cifrados) | Instagram / Google |
| `POST /api/social/{instagram,youtube}-sync` | usuario | `social_accounts` (+ snapshots y métricas) | Instagram / YouTube |
| `POST /api/social/disconnect` | usuario | Revoca en Google y borra la fila (service_role) | Google revoke |
| `POST·DELETE /api/social/link-post` | usuario (+ límite en POST) | `post_external_links` | Verifica con el proveedor |
| `POST /api/social/post-metrics-refresh` | usuario + límite | `metrics` | YouTube / Instagram |
| `GET /api/social/youtube-{analytics,channel-stats,videos,video-performance,video-detail}` | usuario | lee `social_accounts` | YouTube Data / Analytics |
| `POST /api/social/sync-all` | **Bearer `SYNC_CRON_SECRET`** (falla cerrado con 503) + límite por IP | `social_accounts` (cerrojo `sync_lock_until`) | Ambos |
| `POST /api/stripe/create-checkout-session` | usuario (creador) | `subscriptions` | Stripe Checkout (suscripción) |
| `POST /api/stripe/pay-collaboration` | usuario (partner dueño) | `collaborations`, `creators`, `partners` | Stripe Checkout (pago + Connect) |
| `POST /api/stripe/connect/account-link` | usuario (creador) | `creators` | Stripe Connect |
| `POST /api/stripe/webhook` | Firma `stripe-signature` | `subscriptions`, `collaborations.paid_at`, `credit_ledger`, `creators`, RPC `notify` | — |
| `POST /api/admin/login` | contraseña + límite (8/10 min por IP + tope global) | — | — |
| `GET /api/admin/{me,activity,analytics,discovery-analytics,reports,users}`, `POST /api/admin/users/[id]/{block,grant-pro}`, `POST /api/admin/logout` | `requireAdmin` (cookie sellada, 8 h) salvo `me`/`logout` | service_role | — |

**Utilidades del servidor relevantes:** `token-crypto` (AES-256-GCM), `oauth-state` (HMAC con la misma clave; reutilizable dentro de sus 10 minutos, limitación documentada en A-R13), `rate-limit` (en memoria; vale solo para una instancia), `social-errors` (clasifica los errores y oculta secretos en los logs), `social-sync`, `sync-batch` y `sync-lease` (sincronización), `token-revoke`, `youtube*`, `post-metrics*`, `account-snapshot`, `external-link`, `instagram-media`, `ml-heuristic`, `history-context`, `stripe` y `stripe-plans` (Pro a 19,99 €/mes con 20 créditos; comisión del 10 %), `admin-session`, `app-url`, `account-identity`.

---

## 9. Supabase

### 9.1 Tablas (28 vivas)

`managers` y `roster_requests` se borraron en `20261021120000`. `influencers` y `brand_clients` se renombraron a `creators` y `partners`.

| Tabla | Para qué | Quién escribe |
|---|---|---|
| `profiles` | Extiende `auth.users`; `role`, `chat_privacy`, `avatar_url` | Trigger de alta; el propio usuario actualiza |
| `creators`, `partners` | Fichas por rol; directorio público para usuarios con sesión | El propio usuario |
| `collaborations` | El "contrato": estado, presupuesto, pago, condiciones y brief congelados | Insert de quien inicia; cambios de estado solo por RPC; pago por webhook |
| `collaboration_offers` | Contraofertas (historial que solo crece) | Las partes |
| `collaboration_log_entries` | Registro compartido de incidencias | Las partes |
| `collaboration_ratings` | Valoración mutua tras `completed` | RPC |
| `posts` | Entregas (tablero); `collaboration_id` opcional; `published_at` por trigger | El creador dueño; el partner solo mediante RPC |
| `labels`, `post_labels`, `checklist_items` | Tablero tipo Trello | El creador (el partner ve el checklist) |
| `post_revision_notes` | Motivo de "pedir cambios" / "aprobar" | RPC |
| `packages` | Catálogo de lo que ofrece o busca cada perfil | El dueño |
| `conversations`, `messages`, `offers` | Chat 1 a 1 y ofertas sobre paquetes | Solo RPC |
| `notifications` | Bandeja | Triggers y `notify()` |
| `social_accounts` | Cuentas conectadas, tokens cifrados, estado de sync | **Solo el servidor** (desde `20261028120000`); el navegador puede leer ciertas columnas y **borrar** |
| `social_account_snapshots` | Acumulados diarios por cuenta | Servidor |
| `post_external_links` | Vínculo publicación ↔ vídeo o post real | Servidor |
| `metrics` | Métricas por publicación, una fila por día, nulables | Servidor |
| `ml_predictions`, `trends` | Predicción y tendencias | Servidor |
| `subscriptions`, `credit_ledger` | CIBERAN Pro y créditos | Webhook, triggers y admin |
| `saved_profiles` | Favoritos | El dueño |
| `reports` | Reportes confidenciales para el admin | Las partes insertan; nadie lee salvo service_role |
| `discovery_searches` | Registro de búsquedas | Solo service_role |

### 9.2 Políticas RLS (estado final reconstruido desde las migraciones)

RLS está activado en las 28 tablas. Matriz de las 58 políticas finales (S = select, I = insert, U = update, D = delete; "RPC" significa que la escritura solo pasa por funciones):

| Tabla | S | I | U | D |
|---|---|---|---|---|
| profiles | propio + directorio (auth) | trigger | propio | — |
| creators / partners | directorio (auth) | propio | propio | — |
| collaborations | partes | quien inicia | RPC | — |
| collaboration_offers / log_entries | partes | partes | — | — |
| collaboration_ratings | todos (auth) | RPC | — | — |
| posts | ámbito (dueño + partner de la colaboración) | propio (con check de colaboración, R21f) | propio (ídem) | propio |
| labels | propio | propio | propio | propio |
| post_labels | propio | propio | — | propio |
| checklist_items | ámbito | propio | propio | propio |
| post_revision_notes | implicados | RPC | — | — |
| packages | activos o propios (auth) | propio | propio | propio |
| conversations / messages / offers | participantes | RPC | RPC | — |
| notifications | propio | trigger/notify | propio (leído) | — |
| social_accounts | propio (permisos por columna, sin tokens) | servidor | servidor | **propio (`grant delete`)** |
| social_account_snapshots | propio | servidor | — | — |
| post_external_links / metrics / ml_predictions | ámbito | servidor | — | — |
| subscriptions / credit_ledger | propio / ámbito | servidor | servidor | — |
| trends | todos (auth) | servidor | — | — |
| saved_profiles | propio | propio | — | propio |
| reports | — | partes | — | — |
| discovery_searches | — | — | — | — |
| storage `post-media` | público | carpeta propia | carpeta propia | carpeta propia |

Este estado se ha reconstruido **leyendo las migraciones** (con un analizador que sigue los `drop/create policy` en orden). No se ha comparado con la base real. La Fase 2 debe contrastarlo con `pg_policies`.

### 9.3 Funciones

Todas las funciones `SECURITY DEFINER` fijan `set search_path = public` (verificado con grep).

| Tipo | Funciones |
|---|---|
| RPC del cliente (con `grant execute ... to authenticated`) | `get_or_create_conversation`, `send_text_message`, `create_offer`, `respond_offer`, `mark_conversation_read`, `my_chat_unread_count`, `accept_collaboration_request`, `decline_collaboration_request`, `mark_collaboration_completed`, `approve_post(uuid,text)`, `request_post_changes(uuid,text)`, `submit_collaboration_rating`, `profile_rating_summary`, `get_public_social_accounts`, `my_credit_balance` |
| Auxiliares `SECURITY DEFINER` **sin grant explícito** | `notify(...)`, `_get_or_create_conversation(a,b)`, `has_accepted_offer_between(a,b)`, `current_creator_id()`, `current_partner_id()` |
| Funciones de trigger | `handle_new_user`, `grant_welcome_credits`, `notify_user_login`, `notify_collaboration_created`, `notify_collaboration_updated`, `notify_collaboration_offer_created`, `notify_collaboration_log_entry_created`, `prevent_collaboration_terms_update`, `delete_pending_offers_of_package`, `set_post_published_at`, `set_updated_at` |

**Ninguna migración contiene `revoke execute`.** En Postgres, `EXECUTE` se concede a `PUBLIC` por defecto, y Supabase además lo concede a `anon` y `authenticated` en el esquema `public`. Ver H0-03.

### 9.4 Triggers (14)

`auth.users`: `on_auth_user_created` → `handle_new_user`; `on_auth_user_login` → `notify_user_login`. `creators`: `on_creator_created` → créditos de bienvenida. `collaborations`: `set_updated_at`, `on_collaboration_created`, `on_collaboration_updated`, `trg_collaborations_terms_immutable`. `collaboration_offers`: `on_collaboration_offer_created`. `collaboration_log_entries`: `trg_notify_collaboration_log_entry`. `posts`: `set_updated_at`, `posts_set_published_at`. `packages`: `packages_delete_pending_offers`. `subscriptions`: `set_updated_at`.

### 9.5 Storage, Realtime y extensiones

- **Storage.** Bucket `post-media`, público, 8 MB, JPEG/PNG/WebP. Se escribe en una carpeta por usuario. Lo usan las portadas, los avatares, los paquetes, las publicaciones y el seed.
- **Realtime.** `conversations`, `messages` y `offers` están en `supabase_realtime` con `replica identity full`. `useChat` se suscribe a canales globales de `INSERT` en mensajes y `UPDATE` en ofertas y conversaciones (filtrados por RLS), más canales `broadcast` `chat-typing-<profileId>` para "escribiendo…".
- **Extensiones.** Solo `pgcrypto`. **No hay `pg_cron` ni `pg_net`.**

### 9.6 Migraciones y su estado de aplicación

- Hay 39 archivos `.sql`. Dos comparten marca de tiempo (`20261021160000_chat_packages_offers.sql` y `20261021160000_discovery_cover_photos.sql`; ya documentado).
- **Aplicación.** Se hace a mano en el SQL Editor, o con `scripts/apply-pending-migrations.mjs`, que **no funcionaría hoy** (H0-05). No se usa `supabase db push` ni hay tabla de control documentada.
- **Registro formal.** Solo las 8 migraciones del 2026-10-28 en adelante están registradas como aplicadas y verificadas (`docs/TRABAJO_ALEX.md`). Las 31 anteriores **no tienen registro formal**; hay indicios indirectos de que están aplicadas (tests de integración en verde según el CHANGELOG), pero `TRABAJO_MARIO.md` ya dudaba de `20261021150000`. Pendiente de comprobar contra la base (Fase 2).
- `supabase/config.toml` existe (proyecto local `dweb-create`, Postgres 17), pero no hay CLI de Supabase instalada (§15).

---

## 10. Edge Functions

**No hay ninguna** (no existe `supabase/functions`; búsqueda verificada). Toda la lógica de servidor está en Nitro. Las partes del encargo que hablan de "Edge Functions" se aplicarán a `server/api`.

---

## 11. Stripe

| Flujo | Archivos | Camino |
|---|---|---|
| Suscripción CIBERAN Pro (solo creadores) | `create-checkout-session.post.ts`, `useMyBilling.ts`, `stripe-plans.ts` | Checkout `subscription` con `price_data` en línea → webhook `checkout.session.completed` (guarda `subscriptions`) → `invoice.paid` (concede 20 créditos) → `customer.subscription.updated/deleted` |
| Pago de colaboración (partner → creador) | `pay-collaboration.post.ts`, `useMyCollaborations.ts`, botón en `partner/requests.vue` | Checkout `payment` con `application_fee_amount` 10 % y `transfer_data.destination` → webhook marca `paid_at` (idempotente con `.is('paid_at', null)`) y avisa al creador |
| Onboarding de Connect (creador) | `connect/account-link.post.ts` | Account Link → webhook `account.updated` actualiza `stripe_connect_onboarded` |

- Las claves de `.env` son de **test** (`sk_test_`, `pk_test_`; comprobado solo el prefijo). `stripe@23.0.0` fija la API `2026-09-30.endive`. No hay `apiVersion` en el código.
- **No existen** portal de cliente, reembolsos, gestión de `charge.refunded` ni `payment_intent.payment_failed`, ni tabla de eventos procesados (la idempotencia depende de cada handler).
- El pago se permite en los estados `accepted`, `in_progress` y `completed` (política M-D2 sin decidir).
- Según la documentación, **ningún flujo se ha probado de principio a fin**, ni siquiera en modo test. Stripe CLI no está instalada.
- Hipótesis H0-02 sobre `invoice.subscription`: ver §17.

---

## 12. Integraciones de redes sociales

| Red | Estado en el código | Detalle |
|---|---|---|
| YouTube | OAuth real (Google) | Scopes `youtube.readonly` + `yt-analytics.readonly`, `access_type=offline`, `prompt=consent`. Refresco del token en cada llamada. Revocación al desconectar. Panel completo (A-R16/A-R17). Según la documentación, verificado con una cuenta real en parte; el camino feliz completo sigue pendiente |
| Instagram | OAuth real (Instagram Login API) | Scopes `instagram_business_basic,instagram_business_manage_insights`, token largo (60 días) y renovación en la sync. **Bloqueado por Meta (Q5)**: hace falta un túnel HTTPS (`APP_URL`, ngrok instalado). Las métricas por publicación están marcadas en el código como "SIN VERIFICAR con una cuenta real" |
| TikTok, X, Facebook, LinkedIn | "Próximamente" (A-R10, Q4) | No se pueden conectar; `VERIFIED_SOCIAL_PLATFORMS = ['instagram','youtube']` |

Los tokens se cifran con AES-256-GCM (`SOCIAL_TOKEN_ENCRYPTION_KEY`, que también firma el `state` del OAuth). El navegador no puede leer las columnas de tokens (permisos por columna, A-R11). La sincronización programada (`sync-all`) existe, pero **no la invoca nadie** (Q3) y su secreto no está configurado (H0-07).

---

## 13. IA (OpenRouter)

La IA se llama por HTTP desde `discover/search.post.ts` (ranking "Buscar con IA"), `ml/predict.post.ts` (sugerencias y una parte del score) y `ml/trends.get.ts` (desactivado). El modelo es gratuito y configurable (`OPENROUTER_MODEL`); el catálogo gratuito ya ha cambiado dos veces. El score de predicción es **heurístico**: el histórico real solo se muestra como contexto cuando hay muestra suficiente (A-R9). Sin clave, la app funciona sin IA.

---

## 14. Pruebas y CI

| Tipo | Dónde | Cómo | Advertencias |
|---|---|---|---|
| Unitarias | `tests/unit` (35) | `npm test -- --run` (Vitest, Node, sin red) | Solo lógica pura de `app/utils` y `server/utils`. **No hay tests de componentes ni de endpoints** |
| Integración | `tests/integration` (18 + `supabase-setup.ts`, `chat-fixture.ts`) | `npm run test:integration` (secuencial) | Escriben y borran datos en el **proyecto real compartido**. Inician sesión con las cuentas demo, cuya contraseña está fija en el código (H0-09), y comparten el límite de autenticación de Supabase. Cubren RLS, RPC, chat, ofertas, colaboraciones, publicaciones y redes |
| Manual | `tests/integration/webhook-idempotency.mjs` | Firma un evento de Stripe y lo envía dos veces a `localhost` | Necesita una colaboración real sin pagar |
| Navegador | Fuera del repositorio | Chrome por CDP (según el CHANGELOG Alex-41…48) | Los scripts de navegador **no están en el repositorio**: no se pueden reproducir |
| CI | `.github/workflows/ci.yml` | `npm ci` → `npx vue-tsc --noEmit` → unitarios → build (Node 24) | El typecheck no comprueba nada (H0-01). Según la documentación, **nunca se ha visto ejecutarse en GitHub** |
| Lint | — | **No existe** (ni ESLint ni Prettier) | El encargo pide lint: no disponible |

---

## 15. Entorno y herramientas (para las fases 1, 7 y 9)

| Herramienta | Estado (verificado) |
|---|---|
| Node / npm | v22.23.2 / 11.20.0 (la CI usa Node 24) |
| Nuxt / Vue / supabase-js / stripe | 4.6.2 / 3.5.44 / 2.118.0 / 23.0.0 |
| Git / GitHub CLI | Disponibles |
| Chrome y Edge | Instalados (sirven para automatizar el navegador) |
| Playwright | **No instalado** (añadirlo es una dependencia nueva y hay que coordinarlo) |
| FFmpeg / ffprobe | **No instalados** |
| Stripe CLI | **No instalada** |
| Supabase CLI | No instalada; se podría usar con `npx supabase` |
| Docker | 29.2.0 instalado: **permitiría un Supabase local aislado** para la demo y las pruebas |
| ngrok | En el PATH (túnel HTTPS para Meta) |
| `pg` (para `apply-pending-migrations.mjs`) | **No instalado ni declarado** |

**Variables de entorno.** Solo se han comprobado nombres y si tienen valor; no se ha leído ningún valor. `.env.example` declara 20 variables. En `.env` están definidas todas salvo **`SYNC_CRON_SECRET`**. `.env` contiene además `SUPABASE_DB_URL`, que **no figura en `.env.example`**. `INSTAGRAM_APP_ID` y `INSTAGRAM_APP_SECRET` aparecen definidas (el anexo del pipeline del 28/10 decía que estaban vacías). Las claves de Stripe son de test.

---

## 16. Módulos del encargo frente al código real

El encargo enumera módulos. Esta es su correspondencia real, para no auditar ni grabar en la demo algo que no existe:

| Módulo del encargo | Qué existe de verdad |
|---|---|
| CREATOR · Dashboard | `/creator` ("Hoy") |
| Perfil público | `/profile/[role]/[id]`, editable desde `/creator/profile` |
| Gestión de publicaciones / Tablero de trabajo | `/creator/timeline` (Tablero + Lista) y `/creator/post/[id]` |
| Calendario | **No hay calendario independiente del creador.** Existe `WeekBoard` en la pestaña "Calendario" del detalle de cada colaboración, y "Tu calendario" en el Inicio del partner |
| Métricas de redes | `/creator/metrics` y `/creator/metrics/youtube`. Instagram, sin verificar |
| Descubrimiento de oportunidades | `/creator/discover` (buscar partners). **No hay "campañas abiertas" ni oportunidades publicadas** (el roadmap las da por no empezadas) |
| Chat | `/chat` |
| Recepción y negociación de ofertas | Ofertas sobre paquetes en el chat + contraofertas (`NegotiationPanel`) en Colaboraciones |
| Gestión de colaboraciones | `/creator/requests` |
| **CIBERAN Studio** | **No es una pantalla ni un módulo.** Es un concepto del roadmap (§5, "Fase C") que se ha construido por piezas dentro del detalle de colaboración: brief estructurado, condiciones pactadas, Calendario, checklist visible para el partner, revisiones con nota y Registro. No aparece con ese nombre en ninguna parte de la interfaz |
| PARTNER · Dashboard | `/partner` ("Inicio") |
| Perfil de empresa | `/partner/profile` |
| Descubrimiento, búsqueda y filtros | `/partner/discover` (filtros o IA) |
| Envío y negociación de ofertas | Igual que en el creador |
| Gestión de colaboraciones | `/partner/requests` (con pago y aprobación de entregas) |
| **Seguimiento de campañas** | **No hay entidad "campaña".** La campaña es la colaboración (brief con `campaign_goal`). El seguimiento está en Calendario, checklist y la pestaña "Rendimiento" (A-R15) |
| Solicitudes de revisión / aprobaciones | `ready_for_review` → RPC `approve_post` / `request_post_changes` con nota; la aprobación es un aviso, no un bloqueo (Q6) |
| Notificaciones | `/inbox` + triggers |
| Configuración | Pestañas de `/{rol}/profile`; no hay página de ajustes aparte |
| (No listado en el encargo) | Panel `/admin`, CIBERAN Pro y créditos, predicción de éxito, favoritos y comparación, valoraciones, reportes, recorrido de bienvenida |

---

## 17. Hallazgos de la Fase 0

Son señales encontradas al hacer el mapa. **No sustituyen** a las auditorías de las fases 1 a 5, donde se clasificarán con gravedad definitiva. Cada una indica su estado de verificación.

| ID | Hallazgo | Estado | Fase |
|---|---|---|---|
| **H0-01** | `npx vue-tsc --noEmit`, el comando de CI y de todas las entradas del CHANGELOG, **no comprueba ningún archivo**: `--listFiles` devuelve 0 líneas. El `tsconfig.json` raíz es de tipo "solution" (`files: []` + `references`), y sin `-b` no compila las referencias. Por tanto, **ningún "vue-tsc limpio" registrado hasta hoy garantiza nada**. Encaja con lo que dice Alex-48 ("error 500 que `vue-tsc` no detectó"). Lo que no se sabe es cuántos errores aparecerán al hacer el typecheck real (`vue-tsc -b --noEmit` o `nuxi typecheck`) | **Verificado (comando)** | 1 |
| **H0-02** | `webhook.post.ts` lee `invoice.subscription`. En la API que fija `stripe@23` (`2026-09-30.endive`), la interfaz `Invoice` **ya no tiene ese campo** (está en `invoice.parent.subscription_details.subscription`). Si es así, `handleInvoicePaid` sale al principio y **CIBERAN Pro nunca concede créditos**. El typecheck lo habría detectado si funcionara (H0-01) | Tipos verificados; comportamiento **hipótesis fuerte** (hay que probarlo en Stripe Test Mode) | 5 |
| **H0-03** | `notify(p_profile_id, …)` es `SECURITY DEFINER`, no comprueba quién la llama y no tiene `revoke execute`. Si los privilegios por defecto siguen activos, cualquier cliente (incluso `anon`) podría crear avisos para cualquier usuario con el enlace que quiera, justo lo contrario de lo que dice el comentario de la migración. Lo mismo podría pasar con `_get_or_create_conversation(a,b)` (crear conversaciones entre terceros, saltándose la privacidad del chat) y con las funciones de lectura auxiliares | **Hipótesis**: hay que consultar los privilegios (`has_function_privilege`) en la base, **sin llamar a las funciones** | 2 (prioritaria) |
| **H0-04** | No hay ningún entorno aislado: desarrollo, tests de integración y cuentas demo comparten un solo proyecto de Supabase (decisión del 23/10). Esto condiciona las fases 3, 5 y 7 (datos de demo sin contaminar). Docker está disponible para un Supabase local | Verificado (documentación + entorno) | 3, 7 |
| **H0-05** | `scripts/apply-pending-migrations.mjs` importa `pg`, que no está en `package.json` ni en `node_modules`: fallaría al ejecutarse. Aplicar migraciones depende de copiarlas a mano en el SQL Editor | Verificado (código + `node_modules`) | 1 |
| **H0-06** | ~~`main` lleva sin actualizarse desde el 24/10 y hay 6 commits sin subir; CI nunca ha corrido en GitHub~~ **Corregido en 07:** era un error por no haber hecho `fetch`. `origin/main` = `HEAD`; la CI corre en GitHub desde el 30/10. Sigue en pie: la `main` local está desactualizada, la rama remota de integración va 6 commits por detrás, y la CI usa Node 24 frente a Node 22 en local | Corregido | 1 |
| **H0-07** | `SYNC_CRON_SECRET` no está en `.env`, así que `sync-all` responde 503 por diseño. Además `SUPABASE_DB_URL` no está documentada en `.env.example` | Verificado (nombres, sin valores) | 5 |
| **H0-08** | El navegador conserva `grant delete` y la política `social_accounts_delete_self` sobre `social_accounts`, aunque la interfaz ya desconecta por `/api/social/disconnect`. Un cliente podría borrar la fila **sin revocar** el token en Google. Es el "pendiente conocido" del encargo | Verificado (código y migraciones) | 2 |
| **H0-09** | La contraseña de las cuentas demo está escrita en el código (`tests/integration/supabase-setup.ts`; valor por defecto en `scripts/seed-demo-users.mjs`) y el repositorio está en GitHub. El riesgo depende de si el proyecto actual acaba siendo producción | Verificado (código) | 2 |
| **H0-10** | `collaborations.creator_id` es `NOT NULL`, pero su FK es `on delete set null`, así que borrar un creador con colaboraciones **falla**. Ya está anotado en el script de limpieza. Afecta al borrado de cuenta (RGPD, M-L2) | Verificado (migraciones) | 2, 3 |
| **H0-11** | Los canales de "escribiendo…" (`broadcast` `chat-typing-<id>`) no parecen tener autorización: cualquiera que conozca un `profileId` podría escucharlos o falsear el indicador | Hipótesis (falta revisar la configuración de Realtime) | 2 |
| **H0-12** | Código muerto: 3 componentes sin uso, `WeeklyEngagementChart` y `engagementSeries` (datos fijos) sin pantalla, `/api/ml/trends` y `useMyTrends` solo para la página desactivada, y Pinia instalado sin ningún store | Verificado (búsqueda) | 1 |
| **H0-13** | No hay lint ni tests de componentes o endpoints. Los scripts de navegador de las verificaciones del CHANGELOG no están en el repositorio | Verificado | 1 |
| **H0-14** | Solo 8 de las 39 migraciones tienen registro formal de aplicación | Verificado (documentación) | 2 |
| **H0-15** | Discrepancias entre documentación y código: el CHANGELOG Alex-47 habla de colaboraciones "canceladas", pero ese estado no existe (`requested/accepted/in_progress/completed/declined`). El anexo del pipeline dice que las credenciales de Instagram están vacías y ahora están definidas. `CONTEXTO_PROYECTO_CIBERAN.md` dice que no hay CI y ya existe. "CIBERAN Studio" y "campañas" aparecen en el encargo como módulos y no lo son (§16) | Verificado | Documentar |
| **H0-16** | El encargo (`auditoria-completa.md`) está dentro de `supabase/migrations/`, que debería contener solo SQL. No rompe nada hoy, pero conviene moverlo a `docs/audit/`. **No se ha movido** (es un archivo tuyo) | Verificado | — |

---

## 18. Bloqueos y dependencias externas ya identificadas

| Necesidad | Para qué fase | Qué hace falta exactamente |
|---|---|---|
| Permiso para ejecutar los tests de integración | 1 | Escriben en el Supabase compartido y gastan el límite de autenticación: hay que avisar a Mario del momento |
| Permiso para consultas de solo lectura al catálogo de Postgres (`pg_policies`, `pg_proc`, `has_function_privilege`, `information_schema`) | 2 | Un script local que lea `SUPABASE_DB_URL` de `.env` sin imprimirla y solo haga `SELECT` al catálogo. Necesita `pg` (instalarlo en local sin guardarlo en `package.json`, o usar `npx`) |
| Stripe CLI (`stripe listen`) y una cuenta Connect de test completada | 5 | Instalar Stripe CLI; completar el onboarding de Connect de prueba de un creador demo |
| App de Meta y cuenta de Facebook | 3, 5 | Sin ellas, Instagram queda bloqueado (Q5) |
| Entorno aislado para la demo | 7 | Elegir entre: (a) Supabase local con Docker + `npx supabase`, (b) un segundo proyecto en la nube o (c) seguir en el compartido con datos identificados. Es una decisión tuya |
| Playwright y FFmpeg | 9 | Instalar ambos (dependencia nueva o global); la grabación es imposible sin ellos |
| Síntesis de voz en español | 9 | No hay herramienta de TTS en el entorno; habrá que dejar la narración escrita o usar un servicio externo |
| Decisión Q3 (despliegue y scheduler) | 5 | Sigue abierta; no se inventará |

---

## 19. Siguiente fase propuesta: Fase 1 (auditoría técnica)

Plan, sin ejecutar todavía:

1. **Typecheck real** con `npx vue-tsc -b --noEmit` (o `npx nuxi typecheck`). Se registrarán los errores tal cual, sin corregir nada para "pasar" (regla del encargo). Prevemos que saldrán errores, empezando por el de H0-02.
2. **Tests unitarios** (`npm test -- --run`) y **build** (`npm run build`). Ninguno escribe en datos.
3. **Tests de integración** (`npm run test:integration`): **solo con tu autorización** y avisando a Mario, porque escriben en la base compartida.
4. Revisión estática de arquitectura, composables, consultas Supabase, errores, validaciones, rendimiento (consultas duplicadas en SSR, `useChat` con canales globales), hidratación, dependencias (`npm outdated`, `npm audit`, que solo leen), duplicación y accesibilidad estática.
5. Lint: no existe. Se documentará la carencia y se propondrá una configuración, sin añadirla sin permiso.
6. Entregable: `docs/audit/01_TECHNICAL_AUDIT.md`.

**Decisiones que necesito antes de la Fase 1:**

- ¿Autorizas ejecutar `npm run test:integration` contra el Supabase compartido (y has avisado a Mario), o lo dejo fuera de la Fase 1?
- Para la Fase 2, ¿autorizas consultas **de solo lectura** al catálogo de la base real (H0-03, H0-14)? Es la única forma de confirmar los privilegios reales sin llamar a las funciones.
