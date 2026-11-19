# Fase 6 — Plan maestro de correcciones

> Fecha: 2026-11-03. Agrupa los hallazgos de las fases 0 a 4 ([00](00_PROJECT_MAP.md), [01](01_TECHNICAL_AUDIT.md), [02](02_SECURITY_AUDIT.md), [03](03_FUNCTIONAL_QA.md), [04](04_UX_AUDIT.md), [05](05_PENDING_WORK.md), [07](07_CRITICAL_FINDINGS_VALIDATION.md)).
> Orden de prioridad del encargo: seguridad → integridad de datos → pagos → errores funcionales → bloqueos de lanzamiento → UX → mejoras opcionales.
> **No se implementa nada de lo pendiente sin acordarlo.** Lo marcado como hecho se arregló durante la auditoría y está verificado.

## 0. Ya corregido durante la auditoría

| ID | Hallazgo | Arreglo | Verificación |
|---|---|---|---|
| H0-01 / T-01 | El typecheck no revisaba nada | `vue-tsc -b` en CI y 29 errores corregidos | CI en verde con typecheck real |
| H0-02 / T-02 | Webhook de Stripe roto con la API nueva | `stripe-webhook.ts`, 500 para reintentar, créditos idempotentes (`20261103150000`) | 11 tests unitarios y catálogo |
| H0-03 | Funciones internas ejecutables por `anon` | `20261103140000` | 23/23 de integración y catálogo |
| H0-08 | Borrado de `social_accounts` desde el navegador | `20261103130000` | 16/16 de integración |
| H0-17 | El trigger de alta no creaba la ficha | `20261103160000` | 2/2 de integración y siembra de demo |
| S-01…S-03 | Escritura de columnas protegidas y lectura del id de Stripe Connect | `20261103170000` (permisos por columna) | Catálogo y regresión completa en el navegador |
| H0-09 (parcial) | Contraseña de demo en el código | Se lee de `DEMO_PASSWORD` | `git grep` en el código |
| T-03 / S-12 | 21 vulnerabilidades de dependencias | Nuxt 4.6.4, vitest 5, `overrides` | `npm audit`: 7 bajas sin parche, sin llegar al servidor |
| T-04 | `nuxt dev` roto tras subir Nuxt | `@nuxt/cli` 4.0.2 | Reproducido antes y después |
| T-05 / F-01 / S-08 | `useSupabaseUser().value.id` es `undefined` (privacidad del chat y valoraciones) | `.sub` en 4 composables | Navegador y base |
| F-07 | Aviso falso de «saltarte la revisión» tras aprobar | Regla con la fase de origen | 4 tests y grabación |
| F-03 / R-12 | La predicción no se veía en la ficha tras crearla | `PostComposerSheet` actualiza la publicación compartida | Cuarta toma de la grabación |
| — | Límite de uso común a todos los usuarios | `user.sub` en `discover/search` y `ml/predict` | Revisión y typecheck |

## 1. Seguridad

### R-01 · Rotar la contraseña de las cuentas demo y quitarla de `login.vue` (H0-09)
- **Gravedad:** media · **Dependencias:** Mario (dueño de `app/pages/login.vue`).
- **Archivos:** `app/pages/login.vue`; cuentas demo en Supabase Auth; `.env` del equipo y secretos de CI si los tests de integración los usan.
- **Riesgos:** los tests de integración y los scripts de siembra usan esas cuentas, así que hay que actualizar `DEMO_PASSWORD` en todos los `.env` a la vez.
- **Aceptación:** `git grep` sobre `HEAD` no encuentra la contraseña antigua; iniciar sesión con ella falla; con la nueva funciona.
- **Pruebas:** suite de integración completa con la nueva `DEMO_PASSWORD`.

### R-02 · Canales privados para «escribiendo…» (H0-11)
- **Gravedad:** baja · **Dependencias:** ninguna (Realtime Authorization de Supabase).
- **Archivos:** `app/composables/useChat.ts` (canales `chat-typing-*` con `config: { private: true }`); migración nueva con política sobre `realtime.messages` (solo el destinatario recibe y solo un participante de la conversación envía).
- **Riesgos:** si la política está mal, el indicador deja de funcionar sin errores visibles.
- **Aceptación:** un tercero con sesión no puede suscribirse al canal de otro perfil; entre los dos participantes sigue funcionando.
- **Pruebas:** integración con tres usuarios (dos participantes y uno ajeno).

### R-03 · Límites de uso en un almacén compartido (S-09)
- **Gravedad:** media · **Dependencias:** Q3 (dónde se despliega); Mario es dueño de `server/utils/rate-limit.ts` (M-S1).
- **Archivos:** `server/utils/rate-limit.ts` y sus usos (`discover/search`, `ml/predict`, `admin/login`, `social/sync-all`).
- **Riesgos:** latencia extra por petición; cubos con nombres distintos según el entorno.
- **Aceptación:** con dos instancias, el límite total se respeta.
- **Pruebas:** unitarias del cubo y prueba de carga básica con dos procesos.

### R-04 · Privacidad de la imagen de los borradores (S-10)
- **Gravedad:** baja · **Dependencias:** decisión de producto (¿son confidenciales los borradores?).
- **Archivos:** migración de un bucket privado nuevo; `useMyPosts.ts` (subida) y los componentes que muestran `media_url` (URL firmada).
- **Riesgos:** URL firmadas que caducan en vistas abiertas mucho tiempo.
- **Aceptación:** la imagen de una publicación sin publicar no se ve sin sesión.
- **Pruebas:** integración (anónimo frente a participante de la colaboración).

## 2. Integridad de datos

### R-05 · No avisar «nueva solicitud» de una colaboración nacida de una oferta (F-02 / S-11)
- **Gravedad:** media · **Dependencias:** ninguna.
- **Archivos:** migración nueva que redefine `notify_collaboration_created()` (si `new.offer_id is not null`, no avisar o usar el texto «Oferta aceptada: colaboración creada»).
- **Riesgos:** cambiar una función SECURITY DEFINER; mantener `set search_path` y los privilegios de `20261103140000`.
- **Aceptación:** al aceptar una oferta, el creador no recibe `collaboration_requested`; una solicitud normal desde Descubrir sí lo recibe.
- **Pruebas:** ampliar `offers.spec.ts` y `notification-links.spec.ts`.

### R-06 · Registro de migraciones (T-09, H0-05, H0-14)
- **Gravedad:** media · **Dependencias:** acuerdo del equipo sobre cómo se aplican.
- **Archivos:** `scripts/apply-pending-migrations.mjs` (o retirarlo); procedimiento en `supabase/README.md`.
- **Riesgos:** `supabase db push` contra un proyecto que no tiene registro intentaría aplicar las 44 migraciones. Hay que marcar antes como aplicadas las que ya lo están (`supabase migration repair`).
- **Aceptación:** `supabase migration list` coincide con la carpeta en la base compartida.
- **Pruebas:** `db reset --local` (44/44, ya pasa) y `migration list` en la compartida.

### R-07 · Borrado de un creador con colaboraciones (H0-10)
- **Gravedad:** media · **Dependencias:** Mario (M-L2, borrado de cuenta RGPD).
- **Archivos:** migración sobre la FK `collaborations.creator_id` (`not null` con `on delete set null` no puede funcionar); decidir entre `restrict` más anonimización o `cascade`.
- **Riesgos:** perder el historial de la marca si se usa `cascade`.
- **Aceptación:** borrar una cuenta de creador con colaboraciones termina sin error y con el resultado acordado.
- **Pruebas:** integración con una cuenta de prueba que tiene colaboraciones.

### R-08 · Proyecto de Supabase separado para producción (H0-04)
- **Gravedad:** alta para el lanzamiento · **Dependencias:** Q3; plan de Supabase.
- **Archivos:** ninguno de código; variables de entorno por entorno.
- **Riesgos:** desarrollo, tests y cuentas demo comparten hoy el único proyecto.
- **Aceptación:** producción sin cuentas demo ni datos de prueba; desarrollo y tests en otro proyecto o en el Supabase local, que ya funciona.
- **Pruebas:** comprobar en el arranque que la URL de producción no es la de desarrollo.

## 3. Pagos

### R-09 · Ejecutar el plan Stripe S1-S9 en Test Mode
- **Gravedad:** alta para activar los pagos · **Dependencias:** Stripe CLI; Mario lleva Stripe.
- **Archivos:** ninguno si todo pasa.
- **Riesgos:** usar por error claves `sk_live`. El plan exige comprobar el prefijo `sk_test_` antes de empezar.
- **Aceptación:** S1-S9 en verde ([05 §1.3](05_PENDING_WORK.md)).
- **Pruebas:** las propias S1-S9, más los 11 tests unitarios del webhook.

### R-10 · Colaboración pagada → «en curso», y pago obligatorio antes de completar (F-05)
- **Gravedad:** media · **Dependencias:** decisión de producto.
- **Archivos:** `server/api/stripe/webhook.post.ts` (`handleCollaborationPaid`: `status = 'in_progress'`); migración de `mark_collaboration_completed` (exigir `paid_at`).
- **Riesgos:** colaboraciones ya completadas sin pago; decidir si se migran.
- **Aceptación:** sin pagar no se puede completar; al pagar pasa a «en curso».
- **Pruebas:** integración de `mark_collaboration_completed` y S7 de Stripe.

### R-11 · Pagos fallidos y reembolsos
- **Gravedad:** media · **Dependencias:** R-09.
- **Archivos:** `webhook.post.ts` (`invoice.payment_failed` → aviso al creador; `charge.refunded` → anotar en la colaboración); quizá una columna `refunded_at`.
- **Riesgos:** estados de colaboración nuevos que la interfaz no conoce.
- **Aceptación:** un pago fallido de Pro avisa; un reembolso de una colaboración queda reflejado.
- **Pruebas:** `stripe trigger invoice.payment_failed` y `charge.refunded`.

## 4. Errores funcionales

| ID | Tarea | Gravedad | Archivos | Aceptación | Pruebas |
|---|---|---|---|---|---|
| R-13 | F-04: avisos de hidratación | Baja | `/partner`, `/partner/requests`, `/creator/profile` (fechas relativas o datos solo del cliente) | Sin «Hydration mismatch» en consola | Recorrido de demo con registro de consola |
| R-14 | F-06: no cobrar créditos por la heurística (o avisar antes) | Media · decisión | `server/api/ml/predict.post.ts` | Decisión aplicada y visible en el texto del botón | Unitaria de `predict` con y sin IA |
| R-15 | T-10: «hoy» en hora local para el selector de fecha | Baja | `app/utils` (`localDayIso`), `PostComposerSheet.vue`, `creator/post/[id].vue` | A las 00:30 en Madrid no se puede elegir ayer | Unitaria con reloj simulado |
| R-16 | Alta real desde `/onboarding` en el navegador | Media | — | Cuenta nueva con ficha, créditos y bienvenida | Añadirla al E2E (Supabase local) |

## 5. Bloqueos de lanzamiento

| ID | Tarea | Depende de | Aceptación |
|---|---|---|---|
| R-17 | Decidir Q3 (hosting y scheduler) y activar `sync-all` cada 6 h con `SYNC_CRON_SECRET` | Equipo | Ejecuciones registradas; alerta si no hay ninguna en 24 h |
| R-18 | Datos legales reales en `app/utils/legal.ts` (M-L1) y A-R4 (borrado de datos de Meta) | Mario; app de Meta (Q5) | Meta acepta las URL; borrar desde Meta elimina la fila y los tokens |
| R-19 | Configuración de despliegue y lista de comprobación de [05 §4](05_PENDING_WORK.md) | R-08, R-17 | Todas las casillas marcadas |
| R-20 | A-R12: nueva firma de `get_public_social_accounts` (fecha y verificación) | Acuerdo con Mario (función compartida) | Perfil y Descubrir muestran la fecha de actualización |

## 6. UX (de [04](04_UX_AUDIT.md))

| ID | Tarea | Gravedad | Aceptación |
|---|---|---|---|
| R-21 | U-01 y U-02: desbordamientos en el móvil (perfil del creador, tarjeta destacada) | Alta / media | `scrollWidth == clientWidth` a 390 px en las 14 rutas |
| R-22 | U-04: contraste mínimo de 4,5:1 | Alta | axe sin `color-contrast` |
| R-23 | U-05 a U-08: accesibilidad del tablero, de «Datos clave» y de las regiones | Media | axe sin incidencias graves en las 28 páginas |
| R-24 | U-03: botones de revisión en el calendario de la marca | Media | «Aprobar» y «Pedir cambios» enteros a 1280 px |
| R-25 | U-09: el texto de la portada solo promete las redes que funcionan | Media | Coincide con Q4 |
| R-26 | U-10 a U-14: consistencia y legibilidad | Baja | Revisión visual |

**Prueba de regresión para todo el bloque:** `ux-capture` (capturas a 3 tamaños más axe), que se puede convertir en un job de CI contra el Supabase local.

## 7. Mejoras opcionales

| ID | Tarea | Notas |
|---|---|---|
| R-27 | T-06: un componente común para las páginas duplicadas entre roles (Descubrir primero: 86 % idéntica) | Reduce arreglos dobles |
| R-28 | T-07: borrar código muerto, renombrar los *auto-imports* duplicados y quitar Pinia si no se usa | Elimina los 3 avisos del build |
| R-29 | T-08: ESLint en CI y E2E con Playwright contra el Supabase local, reutilizando el guion de la demo (17 pasos) | El trabajo de la Fase 7 sirve de base |
| R-30 | T-05 (seguimiento): helper `useMyUserId()` y regla de lint contra `useSupabaseUser().value.id` | Evita que vuelva el fallo F-01 |
| R-31 | T-11 y H0-16: corregir el CHANGELOG («canceladas») y mover el encargo fuera de `supabase/migrations/` | Archivo del equipo |
| R-32 | T-12: Lighthouse sobre el build de demo y `prefers-reduced-motion` en la portada | Antes del lanzamiento |

## 8. Orden recomendado

1. **Esta semana, sin dependencias:** R-05, R-21, R-22, R-24, R-25 y R-02. Son acotadas y se prueban con lo que ya existe (integración, `ux-capture`, E2E local).
2. **Con Mario:** R-01, R-20, R-07 y R-03.
3. **Con decisión del equipo:** Q3 → R-17, R-08 y R-19; F-05 → R-10; F-06 → R-14; Q4 → R-25.
4. **Antes de activar los pagos:** R-09 → R-11.
5. **Continuo:** R-29, para que los recorridos de esta auditoría queden como tests.
