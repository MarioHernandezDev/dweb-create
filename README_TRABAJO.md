# README_TRABAJO — rama `feature/publicaciones-ux` (Mario)

> Actualizado el 2026-10-28. **Ninguna tarea está implementada todavía y el reparto está pendiente de aprobación.** La fuente común de planificación es [`docs/PLAN_TRABAJO_PARALELO.md`](docs/PLAN_TRABAJO_PARALELO.md): allí está el detalle de cada tarea (compl., dependencias, BD, criterio de terminado), las decisiones abiertas (Q1–Q13) y la matriz completa. Este archivo es la vista de **esta rama**.
>
> Cambio respecto a la versión anterior de este README: la rama ya no es solo "publicaciones". Pasa a ser la rama de **redes sociales + publicaciones**. Motivo: todas las tareas de redes sociales son de Mario por requisito. (Stripe/pagos estuvo asignado a esta rama en un primer borrador; el 2026-10-28 se pasó entero al compañero, ver su README.) El nombre de la rama ya no refleja su alcance (ver decisión Q8 del plan sobre subramas por tarea).

## 1. Objetivo general

Hacer que FEEDMA mida de verdad: (a) conexiones con redes sociales fiables, con tokens que se refrescan, métricas reales por publicación y cuentas que se pueden desconectar bien; (b) terminar la mejora de UX de las publicaciones.

## 2. Inventario de tareas asignadas (17)

**Redes sociales — todas, sin excepción**

| ID | Tarea | Compl. | Prio |
|---|---|---|---|
| M-R1 | Verificar OAuth de Instagram y YouTube de extremo a extremo | M | 3 |
| M-R2 | Ciclo de vida de tokens (refresco de Instagram, caducados/revocados, estado "Reconectar") | A | 3 |
| M-R3 | Desconexión completa (revocar token en el proveedor) | B–M | 3 |
| M-R4 | Endpoints de desautorización y borrado de datos exigidos por Meta | M | 3 |
| M-R5 | Sincronización programada + `last_synced_at` | A | 3 |
| M-R6 | Métricas de Instagram (alcance, interacciones) | A | 3 |
| M-R7 | Vincular publicación ↔ cuenta/contenido real (YouTube/Instagram) | A | 3 |
| M-R8 | Pipeline que escribe en la tabla `metrics` (hoy nada escribe) | A | 3 |
| M-R9 | Predicción de éxito basada en rendimiento real | A | 5 |
| M-R10 | TikTok/X/Facebook/LinkedIn: OAuth real o retirar el "Conectar" falso | B / A | 2 |
| M-R11 | El navegador no debe poder leer las columnas de tokens | B–M | 1 |
| M-R12 | Redes ↔ perfil público y Descubrir (métricas verificadas) | M | 5 |
| M-R13 | Tests de redes (cifrado, estado OAuth, RLS de `social_accounts`) | B–M | 2 |
| M-R14 | Actualizar docs 9 y 10 (OAuth) | B | 7 |
| M-R15 | Informe de resultados de colaboración para el partner | M–A | 5 |

**Publicaciones**: M-P1 segunda vuelta de UX (prio 5, M) · M-P2 aprobación del partner como puerta real (prio 4, M–A, **decisión Q6**).

## 3. Orden recomendado

1. **Fase 0**: resolver Q3, Q4, Q5, Q6, Q8; hacer `git merge main` en la rama.
2. **Fase 1** (no dependen del compañero ni de Meta): M-R2 → M-R13 → M-R10 → M-R11 (tras confirmación) → M-P1.
3. **Fase 2**: M-R3 · M-R8 → M-R7 · M-R1 si ya hay cuenta de Meta · M-R4 cuando el compañero haya publicado las páginas de privacidad (C-L1).
4. **Fase 3**: M-R6 · M-R5 (necesita Q3) · M-R9 · M-R12 · M-R15 · M-P2 · M-R14 al final.

## 4. Dependencias

- M-R2 → M-R3, M-R5 · M-R8 → M-R6, M-R7 → M-R9, M-R12, M-R15.
- **Con la otra rama**: C-L1 (privacidad/términos públicos) → M-R4. C-L2 (borrar cuenta) debe eliminar `social_accounts`/tokens: coordinar con M-R3. C-S1 es dueño de `server/utils/rate-limit.ts`, que M-R5/M-R2 usarán.
- Externas: M-R1, M-R4, M-R6 dependen de la app de Meta (cuenta de Facebook, posible App Review).

## 5. Archivos que puede modificar

**Propios (libertad):**
- Redes: `server/api/auth/{instagram,youtube}/**`, `server/api/social/**`, `server/utils/{token-crypto,oauth-state,youtube,account-identity}.ts`, `app/pages/creator/socials.vue`, `app/pages/creator/metrics/**`, `app/composables/useMySocialAccounts.ts`, `app/components/social/**` y `PlatformStatCard`, `docs/9-INSTAGRAM-OAUTH-SETUP.md`, `docs/10-YOUTUBE-OAUTH-SETUP.md`.
- Publicaciones: `app/pages/creator/timeline.vue`, `app/pages/creator/post/[id].vue`, `app/components/timeline/**`, `useMyPosts`, `usePartnerPosts`, `usePostRevisions`, `useChecklist`, `useLabels`, `usePostEditorPanel`.
- Pruebas: `tests/integration/` y `tests/unit/` relacionados con lo anterior.

## 6. Archivos compartidos que requieren coordinación

Ver sección E del plan. Los que más te afectan:
- `app/pages/creator/index.vue` y `partner/index.vue` (tus bloques de redes y entregas; el tour del compañero se ancla en `AppShell.vue`, no ahí).
- `app/pages/creator/profile.vue`: normalmente no necesitas tocarlo (facturación y ficha son del compañero).
- `app/pages/partner/requests.vue` y `creator/requests.vue` (solo tu pestaña Calendario; el botón de pago y el resto del detalle son del compañero).
- `app/types/index.ts`, `app/utils/status.ts`, `nav.ts`, `mock-data.ts` (`platformMeta` y `VERIFIED_SOCIAL_PLATFORMS` son tuyos; solo añadir al final de tu bloque).
- `nuxt.config.ts` / `.env.example` (variables de redes: añadir líneas, **nunca valores reales**), `docs/CHANGELOG.md` (título con prefijo `[Mario]`), `package.json`.
- Server: `server/api/discover/search.post.ts` suma `followers_count` de `social_accounts` — si cambias esa tabla, avisa al compañero (C-U1).

## 7. Cambios de Supabase que podrían hacer falta

Todos requieren explicar el impacto y confirmar **antes** de escribir la migración (zonas protegidas), y deben ser aditivos (ver plan, sección E):

| Tarea | Cambio previsto |
|---|---|
| M-R2 / M-R5 | columnas de estado, último error y último sync en `social_accounts` |
| M-R7 / M-R8 | columna(s) en `posts` (cuenta + id/URL externo) o uso de `posts.metadata`; ajuste de `metrics` y su RLS de lectura |
| M-R11 | restringir la lectura de `access_token_encrypted`/`refresh_token_encrypted` (grants por columna o vista) — cambia una policy existente |
| M-R4 | endpoint que borra datos; sin cambio de esquema |
| M-R12 | posible ajuste de `get_public_social_accounts` (RPC existente) |
| M-P2 | RLS/RPC sobre `posts` |

Recordatorio: el proyecto de Supabase es **único y compartido**; una migración aplicada desde esta rama afecta ya a la otra. Registra aquí (al final de este archivo, sección "Registro de migraciones") cada migración que apliques: fecha, archivo, qué cambia, quién la aprobó.

## 8. Pruebas y criterios de aceptación

Comandos reales: `npx vue-tsc --noEmit` · `npm test -- --run` · `npm run build` · `npm run test:integration` (solo si tocas datos/RLS/RPC; mesura el límite de autenticación compartido).

Criterios de cada tarea: ver tabla del plan (sección B). Criterios transversales (sección G del plan): typecheck/tests/build limpios; interfaz vista en navegador real a 390px y escritorio; entrada en `docs/CHANGELOG.md` con "Qué se cambió / Verificado de verdad / Sin verificar"; no declarar nada verificado sin haberlo probado.

Específicos de esta rama:
- Redes: no pegar tokens, secretos ni `.env` en commits, issues ni documentos.
- Cuentas demo compartidas (`creator@feedma.test`, `partner@feedma.test`): limpiar lo que crees en las pruebas, con criterio explícito.

## 9. Fuera de tu responsabilidad

Stripe y pagos (suscripción, Connect, política de cobro, packs recurrentes), onboarding/tour, legal y RGPD, rate limiting general, panel de admin, CI/CD, verificación con clics de los flujos de colaboración y oferta, acceso cruzado entre roles, notificaciones, estados de chat, descubrimiento (salvo el dato de seguidores), perfil/fotos, accesibilidad y backups. Son de `feature/onboarding` (ver su README y la matriz del plan).

## 10. Integración y prevención de conflictos

1. `git fetch origin` y `git merge main` en la rama antes de cada sesión; resolver conflictos leyendo ambos lados.
2. Commits pequeños, `git add` de archivos concretos, nunca `git add -A` a ciegas ni secretos.
3. Avisar al compañero antes de: tocar un archivo de la sección 6, aplicar cualquier migración/RPC/policy, añadir dependencias, o lanzar `test:integration` justo antes de que él pruebe login.
4. Prohibido: `git push --force`, `git reset --hard`, `git clean -fd` y fusionar esta rama con `feature/onboarding`.
5. Cuando una tarea cumpla sus criterios: PR hacia `main` (o desde la subrama de tarea hacia `main`). Tras fusionar la primera de las dos ramas, la otra hace `git merge main` y re-verifica los archivos compartidos.
6. Comandos útiles: `git branch --show-current` · `git diff main...feature/publicaciones-ux --stat` · `git log main..feature/publicaciones-ux --oneline`.

---

## Anexo — alcance y riesgos heredados del README anterior (publicaciones)

- El Tablero y el detalle de publicación ya se rediseñaron (CHANGELOG 49, 50 y 52): antes de proponer una mejora, comprueba si ya está hecha.
- `PhaseBoard.vue` sincroniza `board` con `posts` a mano alrededor de `vuedraggable`: si lo tocas, prueba arrastrando de verdad. El selector de fase de cada card es la única vía en móvil para columnas colapsadas; no lo rompas.
- No conviertas el aviso de saltarse la revisión en un bloqueo sin cerrar antes Q6 (es un cambio de permisos, no de interfaz).
- Los textos de contexto no deben repetir lo que ya dice el estado.
- Si creas publicaciones de prueba contra el proyecto compartido, bórralas al terminar.
- `README.md` raíz y `docs/5-FRONTEND-WORK-SPLIT.md` están desactualizados; para el estado real usa `docs/CHANGELOG.md`, `docs/CONTEXTO_PROYECTO_FEEDMA.md`, `docs/PENDIENTES.md` y el plan.

## Registro de migraciones aplicadas desde esta rama

| Fecha | Archivo | Qué cambia | Aprobada por |
|---|---|---|---|
| — | — | (ninguna todavía) | — |
