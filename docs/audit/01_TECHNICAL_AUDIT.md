# Fase 1 — Auditoría técnica

> Fecha: 2026-11-03 · Rama: `main` (`26aab0e` + arreglos de esta fase sin commitear) · Alcance: código, build, CI, dependencias y calidad.
> Leyenda de estado: **Corregido** (cambio hecho y verificado) · **Pendiente** (con propuesta) · **Aceptado** (riesgo asumido y razonado).

## 1. Resumen

El proyecto compila, pasa 609 tests unitarios y despliega un build de producción limpio. Los problemas técnicos más serios estaban en el **proceso**: un typecheck que no revisaba nada y un webhook roto que ese typecheck ocultaba. Ambos están corregidos y verificados en CI, igual que las vulnerabilidades críticas, altas y moderadas de las dependencias.

Lo que queda pendiente es sobre todo deuda de mantenimiento:
- Código duplicado entre los dos roles.
- Código muerto.
- Falta de lint y de tests de componentes.
- Un tipo demasiado laxo (`JwtPayload`) que dejó pasar un fallo real.

## 2. Inventario

| Pieza | Cifra |
|---|---|
| Stack | Nuxt 4.6.4 · Vue 3.5.44 · Vite 8.3.5 · Nitro 2.13.6 · @nuxtjs/supabase 2 · Stripe 23 (API `2026-09-30.endive`) |
| Frontend | 27 páginas · 95 componentes · 50 composables · 27 utilidades · ~21.800 líneas |
| Servidor | 34 endpoints · 27 utilidades · ~5.100 líneas |
| Base de datos | 44 migraciones (~4.300 líneas SQL) · 28 tablas con RLS · 57 políticas · 32 funciones · 13 triggers |
| Tests | 36 ficheros unitarios (609 tests) · 20 ficheros de integración contra Supabase · ~5.800 líneas |
| CI | GitHub Actions (Node 24): `npm ci` → typecheck → tests unitarios → build |

## 3. Hallazgos

### T-01 · El typecheck no revisaba ningún archivo — **Corregido** (H0-01)
`vue-tsc --noEmit` con un `tsconfig.json` de tipo *solution* (solo `references`) revisaba 0 archivos y ocultaba 29 errores, entre ellos el del webhook (T-02).
- **Arreglo:** `npm run typecheck` = `vue-tsc -b --noEmit` en CI y en la documentación. Se corrigieron los 29 errores.
- **Prueba:** con un error a propósito, el comando viejo salía con 0 y el nuevo con 2. CI en verde con typecheck real.

### T-02 · Webhook de Stripe con la API nueva — **Corregido** (H0-02)
`invoice.subscription` y `subscription.current_period_end` ya no existen en la API que fija `stripe@23`. Además, el webhook respondía 200 ante errores, así que Stripe no reintentaba.
- **Arreglo:** [`server/utils/stripe-webhook.ts`](../../server/utils/stripe-webhook.ts) admite la forma nueva y la antigua. Un fallo devuelve 500 para que Stripe reintente, y los créditos son idempotentes por `stripe_invoice_id`.
- **Prueba:** 11 tests unitarios y migración `20261103150000` aplicada.

### T-03 · Vulnerabilidades de dependencias — **Corregido** (queda 1 aviso bajo **aceptado**)
| | Antes | Después |
|---|---|---|
| `npm audit` | 21 (2 críticas, 2 altas, 14 moderadas, 3 bajas) | 7 bajas, todas del mismo aviso |

Cambios:
- Nuxt 4.6.2 → 4.6.4.
- vitest 2.1.9 → 5.1.0 (solo desarrollo).
- `overrides` acotados: `glob` ^14.0.2 dentro de `@vercel/nft` y `minimatch` ^11.0.2 dentro de `readdir-glob`.

El aviso restante es `deepmerge` ≤4.3.1 (GHSA-gcqx-w48m-w2h4), que no tiene versión corregida publicada:
- Su única llamada es `deepMerge({}, defaults)` sobre una constante del plugin de Rollup, en tiempo de build.
- No llega a `.output/server`.

Revisar cuando salga 4.3.2.

### T-04 · Regresión de `nuxt dev` tras subir Nuxt — **Corregido**
Con Nuxt 4.6.4, `devServer.host` sin configurar se resuelve como `{}` y `@nuxt/cli` 4.0.1 fallaba con `options.hostname.toLowerCase is not a function`.
- **Arreglo:** `@nuxt/cli` 4.0.2 fijado en el lockfile.
- **Prueba:** reproducido antes y después del cambio.
- **Lección:** después de subir dependencias hay que arrancar también `nuxt dev`; build y tests no lo ejercitan.

### T-05 · `useSupabaseUser()` devuelve *claims*, no un `User` — **Corregido**
Con @nuxtjs/supabase 2, `useSupabaseUser()` es un `JwtPayload`: el id del usuario está en `sub`. Como `JwtPayload` admite cualquier propiedad, `user.value.id` compila y vale `undefined`. Efectos reales encontrados en la QA:
- `useChatSettings.setChatPrivacy`: la privacidad del chat **no se guardaba nunca** y no avisaba.
- `useRatings`: «tus valoraciones» fallaban con HTTP 400 (`rater_profile_id=eq.undefined`), y una colaboración ya valorada volvía a pedir valoración.
- `useMyProfileId` y `useMyAvatar`: funcionaban de rebote, gracias a la salida de emergencia `getUser()`.

**Arreglo:** `.sub` en los 4 composables, verificado en el navegador. El servidor ya se corrigió en la validación (`user.sub` en `discover/search` y `ml/predict`).
**Propuesta:** un helper `useMyUserId()` único y una regla de lint que prohíba `useSupabaseUser().value.id`.

### T-06 · Código duplicado entre roles — **Pendiente**
`creator/discover.vue` y `partner/discover.vue` comparten **216 de 252** líneas sustanciales (el 86 %). Pasa lo mismo, en menor grado, con `requests.vue` y `profile.vue`, y con `useMyCreator`/`useMyPartner`. Cada arreglo hay que hacerlo dos veces; ya pasó con la privacidad del chat, que se repite en las dos páginas de perfil.
**Propuesta:** un componente `DiscoverPage` con el rol como prop, empezando por Descubrir. Esfuerzo medio.

### T-07 · Código muerto e importaciones duplicadas — **Pendiente** (H0-12)
- 3 componentes sin uso.
- `WeeklyEngagementChart` y `engagementSeries`, con datos fijos y sin pantalla.
- `/api/ml/trends` y `useMyTrends`, solo para una página desactivada.
- Pinia instalado sin ningún *store*.
- El build avisa de 3 *auto-imports* duplicados: `OfferStatus`, `formatCompactNumber` y `hasActiveFilters` existen en dos sitios y Nuxt ignora uno.

**Propuesta:** borrarlos o renombrarlos; quitar `@pinia/nuxt` y `pinia` si no se van a usar. Esfuerzo bajo.

### T-08 · Sin lint ni tests de componentes o endpoints — **Pendiente** (H0-13)
Los tests unitarios cubren utilidades puras y los de integración cubren la base de datos. No hay ESLint, ni tests de componentes, ni de endpoints, ni E2E.

**Propuesta:**
1. ESLint con `@nuxt/eslint` en CI.
2. Convertir el ensayo de la demo (Playwright, 17 pasos) en un E2E contra el Supabase local.

Esfuerzo medio. El E2E reaprovecha el trabajo de la Fase 7.

### T-09 · Herramientas de migración — **Pendiente** (H0-05, H0-14)
- `scripts/apply-pending-migrations.mjs` importa `pg`, que no está instalado.
- No hay registro de migraciones en la base: se aplican a mano en el SQL Editor.

**Mitigado** con la auditoría de catálogo de la validación: 32/32 funciones y 57/57 políticas coinciden con las migraciones, y `supabase db reset --local` aplica las 44 desde cero sin errores.
**Propuesta:** aplicar con `supabase db push` (que registra lo aplicado) o añadir `pg` como dependencia de desarrollo.

### T-10 · Fechas en UTC en el cliente — **Pendiente** (bajo)
`todayIso = new Date().toISOString().slice(0, 10)` (en `creator/post/[id].vue` y `PostComposerSheet.vue`) da el día en UTC. En Madrid, entre las 00:00 y la 01:00 o 02:00 según el horario, el selector de fecha de entrega permite elegir ayer. En el servidor, los snapshots por día UTC son intencionados y están documentados.
**Propuesta:** una función `localDayIso()` en `app/utils`.

### T-11 · Discrepancias entre documentación y código — **Pendiente** (H0-15, H0-16)
- El CHANGELOG habla de colaboraciones «canceladas», un estado que no existe.
- El encargo de la auditoría vive dentro de `supabase/migrations/`, que solo debería tener SQL.

**Propuesta:** corregir la entrada del CHANGELOG y mover el encargo a `docs/audit/`. Es un archivo del equipo, así que no lo he movido.

### T-12 · Rendimiento del build — **Aceptado**
- `.output` ocupa 33,6 MB, la mayoría binarios de `sharp` para `@nuxt/image`.
- El build tarda unos 52 s.
- No se ha medido el rendimiento en ejecución: Lighthouse y Web Vitals quedan fuera de esta auditoría.

**Propuesta:** medir con Lighthouse sobre el build de demo antes del lanzamiento.

## 4. Verificación de esta fase

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | 0 errores (revisa de verdad: `-b`) |
| `npm test -- --run` | 36 ficheros, 609 tests en verde (vitest 5) |
| `npm run build` | Correcto; mismos 11 avisos que antes (importaciones duplicadas y tiempos de plugins) |
| `npm audit` | 7 bajas (un único aviso sin parche) |
| CI en `main` | Verde (`26aab0e`): `npm ci`, typecheck, tests y build |
| `nuxt dev` | Arranca (HTTP 200) con `@nuxt/cli` 4.0.2 |
| Migraciones | 44/44 se aplican desde cero en Supabase local |
