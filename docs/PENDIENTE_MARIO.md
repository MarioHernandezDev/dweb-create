# Pendiente para terminar CIBERAN (lo que le toca a Mario)

> Escrito el 2026-11-04. Sustituye a `TRABAJO_ALEX.md` y `TRABAJO_MARIO.md` (borrados; siguen en el historial de git).
> **Fuera de este documento:** todo lo de métricas y redes sociales (OAuth, tokens, `metrics`, sincronización, Meta, rendimiento por publicación). Lo lleva Alex.
> Fuentes: `docs/audit/05_PENDING_WORK.md`, `docs/audit/06_REMEDIATION_ROADMAP.md`, `docs/audit/08_COLLABORATION_FLOW_AUDIT.md` y `docs/CHANGELOG.md`. Cada punto dice qué falta, no qué se cree que funciona: lo que no se ha verificado figura como no verificado.

## Reglas que siguen vigentes

- El proyecto de Supabase es **único y compartido** (desarrollo, tests y cuentas demo). Migraciones solo aditivas, avisar antes de aplicar y anotar cada una en el CHANGELOG. Alternativa segura para probar: Supabase local (`npx supabase@2 start`, necesita Docker).
- Stripe **solo en Test Mode** (`sk_test_`). Comprobar el prefijo de la clave antes de cada prueba. Ningún cobro real.
- Zonas protegidas (explicar impacto y confirmar antes de tocar): Stripe, RLS, esquema, RPC de seguridad (`respond_offer`, `accept_collaboration_request`, `approve_post`, `mark_collaboration_completed`…).
- No pegar secretos en comandos, commits ni documentos.
- Cada tarea termina con: typecheck (`npm run typecheck`), `npm test`, `npm run build`, interfaz vista en navegador a 390 px y escritorio, y entrada en el CHANGELOG con «Qué se cambió / Verificado / Sin verificar».

## 0. Cambio de marca (FEEDMA → CIBERAN)

El código y los documentos ya usan CIBERAN. Pendiente: logotipo y favicon nuevos, `panel-preview.png`, dominio real (la guía de instalación dice `ciberan.app`), y renombrar en servicios externos (Supabase y sus plantillas de correo, Stripe, apps de Meta y Google, repositorio). Las cuentas demo y de prueba siguen siendo `@feedma.test` porque existen en el Supabase compartido. Detalle en CHANGELOG Alex-60.

## 1. Antes de lanzar (bloqueantes)

| ID | Tarea | Qué falta exactamente |
|---|---|---|
| R-01 | Contraseña de las cuentas demo | Rotarla en Supabase Auth y quitarla de `app/pages/login.vue` (archivo de Mario). Actualizar `DEMO_PASSWORD` en todos los `.env` a la vez. Aceptación: `git grep` no encuentra la antigua en `HEAD` y entrar con ella falla. |
| R-08 | Proyecto de Supabase de producción separado | Hoy desarrollo, tests y demo comparten proyecto. Crear otro para producción sin cuentas demo ni datos de prueba y comprobar al arrancar que la URL de producción no es la de desarrollo. |
| R-17 / Q3 | Dónde se despliega y qué scheduler hay | Decisión de equipo. Bloquea el límite de uso compartido (R-03) y la lista de despliegue (R-19). |
| R-19 | Lista de despliegue | Casillas de `docs/audit/05_PENDING_WORK.md` §4, tras R-08 y Q3. |
| M-U4 / Q12 | Copias de seguridad | Decidir si se paga el plan de Supabase con PITR. Recomendado: antes del primer pago real. |

## 2. Pagos (Stripe, solo Test Mode)

| ID | Tarea | Qué falta |
|---|---|---|
| R-09 / M-D1 | Probar de verdad los pagos | Ejecutar el plan **S1–S9** de `docs/audit/05_PENDING_WORK.md` §1.3 con Stripe CLI: suscripción Pro, pago de colaboración con Connect (onboarding de un creador demo) y webhooks. Nunca se ha hecho de extremo a extremo. El webhook ya se corrigió (11 tests unitarios), pero **no se ha probado con Stripe real**. |
| M-D2 / Q2 | Política de cuándo se puede pagar | Decisión: hoy se permite pagar al **aceptar** (`pay-collaboration.post.ts`, `payableStatuses` en `partner/requests.vue`). Recomendado: señal + resto al aprobar la entrega; decidir tras M-D1. |
| R-10 / F-05 | Pagada → «en curso», y pago antes de completar | Hoy el webhook no pasa la colaboración a `in_progress` y se puede completar sin pagar. Cambiar `handleCollaborationPaid` y `mark_collaboration_completed` (exigir `paid_at`). Decidir qué hacer con las ya completadas sin pago. **Coordinar con la regla de «completar» de la Fase 4 del flujo de colaboraciones (§4 de este documento).** |
| R-11 | Pagos fallidos y reembolsos | `invoice.payment_failed` → aviso al creador; `charge.refunded` → anotarlo en la colaboración. Prueba con `stripe trigger`. |
| M-D3 | Portal de gestión de suscripción | No existe: cancelar o cambiar tarjeta desde el perfil del creador Pro. |
| M-D4 | Aviso fiscal en el cobro | Texto visible (IRPF/autónomos), no como asesoría. Depende de M-D2. |
| M-D5 / Q10 | Packs mensuales (retainers) | Backlog. No empezar antes de M-D2; diseño aprobado antes del código. |
| R-14 / F-06 | No cobrar créditos por la heurística | Decisión de producto y cambio en `server/api/ml/predict.post.ts`. |

## 3. Legal, datos y seguridad

| ID | Tarea | Qué falta |
|---|---|---|
| M-L1 / R-18 | Páginas legales | Las páginas existen como plantilla. Faltan los datos reales en `app/utils/legal.ts` (mientras empiecen por `[POR COMPLETAR` se muestra el aviso de borrador), revisión por un gestor/abogado, política de devoluciones y proveedor de alojamiento. |
| M-L2 / Q13 | Exportar y borrar datos (RGPD) | Sin hacer. RPC o endpoint de exportación y de borrado (incluye `social_accounts` y tokens: coordinar con Alex). Antes: decidir qué se conserva por ley (pagos, facturas). Zona protegida, con test de integración y solo con cuentas de prueba. |
| R-07 | Borrar un creador con colaboraciones | Hoy falla: `collaborations.creator_id` es `not null` y no puede ser `set null`. Decidir entre `restrict` más anonimización o `cascade` (perdería el historial de la marca). Va con M-L2. |
| R-03 / M-S1 | Límites de uso compartidos | `server/utils/rate-limit.ts` es en memoria y no vale con varias instancias. Pasarlo a un almacén compartido (depende de Q3). Además no cubre el alta de cuentas, las solicitudes ni los reportes, que van directos a Supabase. |
| M-S2 | Panel de admin | Faltan: verlo a 390 px; decidir registro de acciones, límite de logins correctos, `grant-pro` frente a Stripe y proxy de confianza para `X-Forwarded-For`. |
| R-02 | «Escribiendo…» privado | Canales privados de Realtime con política sobre `realtime.messages`. Prueba de integración con tres usuarios (dos participantes y un ajeno). |
| R-04 | Imágenes de borradores | Decidir si son confidenciales; si lo son, bucket privado y URL firmadas. |
| R-06 | Registro de migraciones | `supabase migration list` no coincide con la carpeta en la base compartida. Marcar como aplicadas las que ya lo están (`supabase migration repair`) antes de usar `db push`, o retirar `scripts/apply-pending-migrations.mjs`. |

## 4. Flujo de colaboraciones (auditoría `docs/audit/08_COLLABORATION_FLOW_AUDIT.md`)

Decisiones D-1…D-9 aprobadas (las recomendaciones; D-9, cancelar una colaboración aceptada, queda fuera). **Lo que ya está hecho:**

- **Fase 1** (aplicada en la base compartida): avisos de revisión a la marca, enlaces `?collaboration=`, «Precio acordado», botón de chat, aceptar/rechazar/completar atómicos.
- **Fase 2** (código hecho y probado en local; **migración `20261104110000_collaboration_agreement_phase2.sql` sin aplicar en la base compartida**): copia del paquete contratado, brief «rellenar una vez» y «Completar el brief» para la marca.

**Qué falta:**

| Fase | Contenido | Nota |
|---|---|---|
| Aplicar Fase 2 | Aplicar la migración, comprobar con `npm run test:integration` y probar «Completar el brief» en navegador a 390 px | Móvil sin verificar |
| 3 | Cronología (`collaboration_events`, solo inserción) y componente de historial | Va antes de la Fase 4 para que todo quede registrado |
| 4 | Reglas de estado: vincular solo a colaboraciones aceptadas o en curso; completar con publicaciones sin aprobar pide confirmación y motivo (D-3b); aprobación obligatoria (D-4b); editar una aprobada la devuelve a «En producción» (D-5b) | Cambia el comportamiento actual. Coordinar con R-10 |
| 5 | Detalle como página propia `/{rol}/collaborations/[id]` (D-8a) | E2E de los dos roles y de un ajeno (404); 390, 768 y 1440 px |
| 6 | Valoraciones: revelado mutuo o a los 14 días; el aviso deja de llevar la nota (D-7) | |
| 7 | Regresión: el guion de demo como E2E contra el Supabase local; axe | Base: `scripts/demo-video/rec-run.mjs` |
| D-6 | Aceptar desde Descubrir abre el chat restringido | Aprobada; sin implementar |

El aviso «Entrega para revisar» solo está probado por integración, no en navegador.

## 5. Notificaciones, chat y flujos

| ID | Tarea | Qué falta |
|---|---|---|
| M-F1 | Clics reales de ofertas y solicitudes | Aceptar/rechazar oferta en el chat y solicitud→aceptación completa, con las dos cuentas demo. Escribe en datos compartidos: usar el Supabase local. La demo en vídeo (`docs/demo/`) ya recorre parte del flujo. |
| M-N3 / Q7 | `offer_id`: `set null` o `cascade` | Decisión (recomendado: mantener `set null`) y documentarla. |
| M-N2 | «Visto» en el chat | Probar el refresco con dos sesiones a la vez. El estado «entregado» no existe. |
| M-N1 | Avisos agrupados | Hecho; falta comprobar los ~25 avisos «Has iniciado sesión» que dejaron las pruebas en las cuentas demo. |

## 6. Interfaz, accesibilidad y onboarding

| ID | Tarea | Qué falta |
|---|---|---|
| R-21 | Desbordamientos en móvil (U-01, U-02) | Perfil del creador y tarjeta destacada: `scrollWidth == clientWidth` a 390 px en las 14 rutas. |
| R-22 | Contraste mínimo 4,5:1 (U-04) | axe sin `color-contrast`. |
| R-23 | Accesibilidad (U-05…U-08) | Tablero, «Datos clave» y regiones; axe sin incidencias graves en las 28 páginas. |
| R-24 | Botones de revisión en el calendario de la marca (U-03) | «Aprobar» y «Pedir cambios» enteros a 1280 px. |
| R-25 / Q4 | Texto de la portada (U-09) | Que solo prometa las redes que funcionan; depende de la decisión de Alex sobre TikTok, X, Facebook y LinkedIn. |
| R-13 | Avisos de hidratación (F-04) | `/partner`, `/partner/requests`, `/creator/profile`. |
| R-15 | «Hoy» en hora local (T-10) | `localDayIso` en el selector de fecha; unitaria con reloj simulado. |
| R-16 | Alta real desde `/onboarding` | Probar con una cuenta nueva: ficha, créditos y bienvenida. Q1 definitiva del tour (`localStorage` o columna). |
| M-U1 | Descubrir | Calidad de las explicaciones de la IA y filtros combinados. |
| M-U2 | Fotos y personalización del perfil | Sin hacer. |
| M-U3 | Lector de pantalla y navegadores | Sin hacer: necesita Safari, Firefox y tablet reales. |
| R-26 | Consistencia y legibilidad (U-10…U-14) | Revisión visual. |

## 7. Calidad e integración continua

- **M-F2:** el flujo `.github/workflows/ci.yml` corre typecheck, tests unitarios y build, pero **no se ha comprobado un PR real en GitHub**. Abrir uno de prueba.
- **R-29:** ESLint en CI y E2E con Playwright contra el Supabase local.
- **R-30:** helper `useMyUserId()` y regla de lint contra `useSupabaseUser().value.id` (el fallo F-01 era de ese tipo).
- **R-27 / R-28:** código duplicado entre roles, código muerto y Pinia si no se usa. Opcional.
- **R-31:** corregir en el CHANGELOG la frase sobre las suscripciones («canceladas») y mover el encargo `auditoria-completa.md` fuera de `supabase/migrations/`.
- **R-32:** Lighthouse y `prefers-reduced-motion` en la portada, antes del lanzamiento.

## 8. Estado de las migraciones (resumen)

Aplicadas en la base compartida hasta `20261104100000_collaboration_flow_phase1.sql`.
**Aplicadas en la base compartida** (confirmado por Alex y verificado con la huella del esquema el 04/11): `20261104110000_collaboration_agreement_phase2.sql`, `20261104120000_rename_brand_ciberan.sql` y `20261104130000_collaboration_events.sql`. **Fase 2, pendientes de aplicar tras revisión** (en este orden): `20261105100000_deliverables_snapshot_and_model.sql`, `20261105110000_post_versions_and_approval_guard.sql` y `20261105120000_deliverable_rpcs_and_close_rule.sql` (ver `docs/CHANGELOG.md`, Alex-68). El detalle de cada migración está en `docs/CHANGELOG.md`.

## 9. Orden sugerido

1. R-01 (contraseña), Q3 y Q2: son decisiones o cambios pequeños que desbloquean el resto.
2. Seguir con las fases 3 y 4 del flujo de colaboraciones.
3. R-09 (plan S1–S9) → R-10 → R-11 → M-D3.
4. M-L1 (datos reales) y M-L2 + R-07 (borrado de cuenta).
5. R-21…R-24 y R-25 (interfaz), M-U3.
6. R-08 y R-19 justo antes del lanzamiento.

La migración de la fase 2 ya está ejecutada.
