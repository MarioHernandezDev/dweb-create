# Arquitectura

Verificado leyendo `package.json`, `nuxt.config.ts`, carpetas y archivos clave. Lo no comprobado se marca **desconocido**.

## Stack

Nuxt 4 · Vue 3 · Tailwind 4 (`@tailwindcss/vite`) · Nitro (`server/api`) · `@nuxtjs/supabase` · `@supabase/supabase-js` · Stripe · nodemailer · `@nuxt/{image,fonts,icon}` (iconos Phosphor `ph:`) · GSAP · vuedraggable · `@sentry/nuxt` · vitest · vue-tsc. `@pinia/nuxt` está registrado pero no hay `defineStore` en `app/` (uso fuera de `app/`: desconocido).

## Estructura

```
app/
  pages/          rutas (file-based). creator/*, partner/*, profile/[role]/[id], chat/*, admin/*, login, onboarding, confirm, forgot-password, reset-password, privacidad, terminos, instalaciones
  components/     por dominio, SIN prefijo de carpeta (pathPrefix:false): ui, layout, collab, timeline, discover, chat, profile, charts, insights, ml, landing, install, legal, onboarding, brand, home
  composables/    useX.ts (57). Acceso a datos y estado: useMyRole, useMyCreator, useMyPartner, useCollab*, useDiscover, useNotifications, useChat…
  utils/          lógica pura de cliente y vistas (nav.ts, status.ts, collab-phase.ts, fees.ts, labels.ts, …)
  middleware/     role-guard.global.ts (único)
  assets/css/     sistema de diseño (ver design-system.md)
  types/index.ts  tipos compartidos
  _disabled/      código aplazado: NO se compila ni se importa
server/
  api/            endpoints Nitro: account, admin, analytics, auth/instagram (solo cumplimiento Meta), discover, ml, notifications, public/profile, stripe, img.get.ts
  utils/          lógica de servidor testeable (rate-limit*, admin-session, mail*, notification-email, payments-gate, public-profile, account-deletion, stripe*, token-crypto…)
  _disabled/      código aplazado
supabase/         migrations (64), templates (correos de Auth), config.toml
tests/unit        vitest sin red · tests/integration  contra Supabase real (manual) · tests/_disabled
scripts/          seeds, staging-bootstrap, apply-pending-migrations, build-auth-email-templates, design/, demo-video/
docs/             histórico y guías (ver roadmap.md); ROADMAP.md en la raíz es el estado vivo
```

Nitro **auto-importa** `server/utils/*` (los endpoints usan `enforceUserRateLimit`, `plans`… sin import). Nuxt auto-importa composables, utils de `app/` y componentes.

## Roles y navegación

- Roles: `creator` y `partner` (`app/types`, `app/utils/nav.ts`: `roleMeta`, items por rol). Nav creador: Hoy, Publicaciones, Descubrir, Colaboraciones, Resultados, Métricas de redes (`soon`). Nav partner: Inicio, Descubrir, Colaboraciones, Resultados. Común: Chat, Bandeja, Guardados, Perfil.
- `middleware/role-guard.global.ts`: un rol no entra en la sección del otro (redirige a su home); cachea `getUser()` 30 s.
- Texto de interfaz en castellano embebido en componentes (no hay i18n).

## Autenticación y permisos

- **Usuarios:** Supabase Auth (email+contraseña; Google tras `GOOGLE_AUTH_ENABLED`). `redirectOptions` en `nuxt.config.ts`: login `/login`, callback `/confirm`; rutas públicas en `exclude` (`/`, `/onboarding`, `/forgot-password`, `/reset-password`, `/instalaciones`, `/privacidad`, `/terminos`, `/admin*`, `/profile/*`). **Toda página nueva pública hay que añadirla ahí.**
- **Recuperación:** `/forgot-password` → correo → `/reset-password` (mínimo 8 caracteres).
- **Admin:** `/admin` con contraseña única (`ADMIN_PASSWORD`) y cookie sellada (`ADMIN_SESSION_SECRET`, `server/utils/admin-session.ts`); no usa cuentas de Supabase. Todo `/api/admin/*` exige esa sesión (lo vigila un test).
- **Datos:** RLS en Postgres; el cliente usa la clave anon con sesión. `service_role` solo en servidor (`serverSupabaseServiceRole`).
- **Patrón de endpoint con usuario:** `serverSupabaseUser(event)` → 401 si falta → `enforceUserRateLimit(event, '<política>', user.sub)` → validar cuerpo → comprobar propiedad a mano si usa service role. Políticas en `server/utils/rate-limit-policies.ts` (`payments`, `analytics`, `account`, `ml-trends`). El limitador es en memoria (válido con un solo proceso).

## Integraciones

| Servicio | Estado | Dónde |
|---|---|---|
| Supabase | activo, **una sola base compartida** | `.env` SUPABASE_* |
| Correo SMTP (Gmail, `info.ciberan@gmail.com`) | activo | `server/utils/mail*.ts`, `docs/16-EMAIL-SMTP.md`; avisos por correo vía `POST /api/notifications/email-dispatch` (cron externo con `SYNC_CRON_SECRET`; **programación aún no activada**) |
| Stripe (Pro, Connect, pago de colaboración) | **apagado** (`PAYMENTS_ENABLED`) | `server/api/stripe/*`, `server/utils/payments-gate.ts`; nunca probado con pago real |
| OpenRouter (sugerencias y puntuación IA) | **apagado** (`PREDICTIONS_ENABLED`) | `server/api/ml/predict.post.ts` |
| Meta/Google OAuth para métricas | **aplazado** | solo quedan los endpoints de cumplimiento de Meta (`auth/instagram/data-deletion*`, `deauthorize`) |
| Sentry | inerte salvo DSN | `sentry.*.config.ts` |
| `pg_cron` | recordatorios de plazo (`send_due_reminders`) | migración `20261109110000` |

## Variables de entorno

Lista y comentarios en `.env.example`. Interruptores (solo `'true'` enciende): `PAYMENTS_ENABLED`, `PREDICTIONS_ENABLED`, `GOOGLE_AUTH_ENABLED`. Correo: `SMTP_HOST/PORT/USER/PASS/FROM_EMAIL/FROM_NAME`, `APP_URL`. Si añades una variable: `.env.example` + `nuxt.config.ts` (`runtimeConfig`, pública solo si es segura para el navegador).

## Dependencias entre funcionalidades (las que importan)

- Colaboración ↔ chat (misma conversación y RPC), notificaciones (triggers SQL), entregables, archivos, eventos/cronología (tabla `collaboration_events`, inmutable), valoraciones, informes (`reports`).
- Perfil público ← `server/utils/public-profile.ts` (lista cerrada de campos) + interruptor por cuenta (`profiles.public_profile_enabled`, migración `20261112100000`).
- Eliminación de cuenta → `server/utils/account-deletion.ts` (inmediata sin historial; con historial queda solicitud para revisión).
- Notificaciones → preferencias → correo (`notification-email.ts`, `unsubscribe-token.ts`).
