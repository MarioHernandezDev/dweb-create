# Funcionalidades: activas, apagadas, aplazadas

Estado a 2026-11-12. Si dudas de algo concreto, comprueba el código con una búsqueda; esta tabla puede quedarse atrás. Estado vivo y detallado: `ROADMAP.md` (raíz).

## Activas (con tests y/o verificación en navegador documentada)

| Área | Dónde mirar |
|---|---|
| Alta con ficha, términos con versión (`TermsGate`), recorrido guiado recordado en la cuenta | `pages/onboarding.vue`, `useAccountState`, `components/onboarding` |
| Login, confirmación de email, recuperación de contraseña | `pages/login.vue`, `confirm.vue`, `forgot-password.vue`, `reset-password.vue` |
| Publicaciones del creador (tablero por fases, calendario, lista, etiquetas, checklist, notas de revisión) | `pages/creator/timeline.vue`, `components/timeline`, `usePostActions`, `usePostRevisions` |
| Colaboración: solicitud, brief, entregables con versión y guarda de aprobación, acuerdo y resumen imprimible/.ics, archivos, cancelación pactada, terminación por incumplimiento, valoraciones, cronología, chat integrado, pestañas | `components/collab` (`CollabWorkspace.vue`), `useCollab*`, RPC de colaboración |
| Chat 1 a 1, ofertas sobre paquetes, plantillas de propuesta, límites de chat | `pages/chat*`, `components/chat`, `useChat`, `useOffers`, `usePackages` |
| Descubrir (filtros, IA de búsqueda, bidireccional, guardados, búsquedas guardadas en cuenta) | `components/discover`, `useDiscover`, `server/api/discover/search.post.ts` |
| Perfil propio y perfil público (sin sesión: lista cerrada de campos + interruptor) | `pages/*/profile.vue`, `pages/profile/[role]/[id].vue`, `server/utils/public-profile.ts` |
| Resultados dentro de CIBERAN (actividad propia, no métricas de redes) | `pages/*/insights.vue`, `components/insights`, `useCollabInsights`, `utils/insights-view.ts` |
| Avisos: bandeja interna, preferencias, recordatorios de plazo (pg_cron), correo (digest + baja con un clic) | `useNotifications`, `NotificationPreferences.vue`, `server/utils/notification-email.ts` |
| Cuenta: descargar datos, eliminar cuenta, privacidad del chat | `DataExportCard`, `DeleteAccountCard`, `server/api/account/*` |
| Admin: usuarios, verificación, bloqueo, reportes e incumplimientos, solicitudes de borrado, analítica, estado de correo | `pages/admin`, `server/api/admin/*`, `docs/14-OPERACIONES-ADMIN.md` |
| Páginas legales (`/privacidad`, `/terminos`) | requieren **revisión legal** y titular/CIF (marcadores `[POR COMPLETAR]`) |

## Apagadas por interruptor (código presente; no encender sin petición)

| Funcionalidad | Interruptor | Notas |
|---|---|---|
| Pagos: Pro, Stripe Connect, pago de colaboración, comisión | `PAYMENTS_ENABLED` | Nunca probado con un pago real. Política de cuándo se puede pagar, sin decidir |
| Predicción de éxito con IA y sugerencias | `PREDICTIONS_ENABLED` | Usa OpenRouter; `server/utils/payments-gate.ts` lo cierra en servidor |
| Acceso con Google | `GOOGLE_AUTH_ENABLED` | Límite conocido: altas nuevas sin elegir rol (`docs/13`) |

## Aplazadas (no forman parte de la app activa)

### Métricas de redes sociales — REGLA ESTRICTA
Futura fase, documentada en `docs/17-METRICAS-REDES-PROXIMAMENTE.md` y en el roadmap. Aisladas, no eliminadas:
- Código en `app/_disabled/social-metrics/`, `app/_disabled/creator/metrics/`, `server/_disabled/social-metrics/`, `tests/_disabled/social-metrics/` (Nuxt, Nitro y vitest no los cargan).
- Hoy `/creator/metrics` es solo una página «Próximamente» (`app/pages/creator/metrics.vue`) con etiqueta «Pronto» en la navegación (`soon: true` en `utils/nav.ts`).
- **Prohibido:** importar desde `_disabled`; mostrar seguidores, engagement, vistas o cualquier dato de redes en paneles, perfiles, Descubrir, colaboraciones, resúmenes, KPIs o gráficos; conectar OAuth de YouTube/Instagram; reactivar las políticas de rate-limit sociales; leer `social_accounts`, `metrics`, `social_account_snapshots` o `post_external_links` desde código activo; ofrecer «conectar cuenta».
- **Se mantiene (no es métrica):** el campo plataforma al planificar una publicación; los endpoints de Meta de borrado de datos/desautorización (cumplimiento); el export de datos personales (`utils/data-export.ts`, derecho del usuario); `token-crypto`/`token-revoke` usados al eliminar cuenta.
- Reactivarla es un proyecto explícito: pasos en `docs/17` §3. No se hace por arrastre desde otra tarea.

### Otras aplazadas o bloqueadas
- **Tendencias con IA** (UI): `app/_disabled/creator/trends.vue`; la IA no daba ideas suficientes. El endpoint `server/api/ml/trends.get.ts` y `useMyTrends` siguen existiendo; antes de tocarlos, comprueba quién los usa.
- **Instagram insights:** bloqueado por verificación de Meta (parte de métricas aplazadas).
- **Equipos/organizaciones y campañas con varios creadores** (Fase 7; `partners.profile_id` es 1:1; exige propuesta técnica previa), **push web, 2FA, sesiones activas, TikTok, feature flags generales, i18n.**
- **Staging** y **Sentry** (1.2, 1.4): bloqueados por coste/servicio externo → requieren aprobación.
- **Envío programado de correos:** `email-dispatch` existe, pero el cron no se activa hasta borrar los perfiles ficticios.

## Desconocido

Qué partes de la interfaz se han probado en Safari/Firefox/dispositivo real (solo Chrome 1280 y 390 px documentado); estado del flujo OAuth de Meta/Google (aplazado); cobertura exacta de tests de integración hoy (manuales).
