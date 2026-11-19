# Base de datos (Supabase / Postgres)

Fuente de verdad: `supabase/migrations/` (64 archivos) y el esquema real de la base. `docs/2-DATABASE-SCHEMA.md` es histórico (octubre) y no recoge las últimas fases. Para el estado de una tabla concreta, busca en las migraciones: `grep -ln "<tabla>" supabase/migrations/*.sql`.

**Una sola base compartida** para desarrollo, pruebas y producción (decisión vigente). Hoy hay 21 cuentas ficticias de prueba. Nada destructivo contra datos reales sin permiso expreso.

## Tablas por dominio (existentes en migraciones)

- **Identidad:** `profiles` (incluye `public_profile_enabled`), `creators`, `partners` (renombradas desde `influencers`/`brand_clients`; `managers` eliminada), `saved_profiles`, `saved_searches`, `notification_preferences`, `proposal_templates`, `account_deletion_requests`.
- **Publicaciones:** `posts`, `labels`, `post_labels`, `checklist_items`, `post_revision_notes`; `posts.content_version` y `published_version` los calcula un trigger (guarda de aprobación, migración `20261105110000`): no se escriben a mano.
- **Colaboración:** `collaborations`, `collaboration_deliverables`, `collaboration_deliverable_decisions`, `collaboration_events` (cronología, inmutable), `collaboration_log_entries`, `collaboration_files`, `collaboration_ratings`, `collaboration_offers`.
- **Mensajería y ofertas:** `conversations`, `messages`, `offers`, `packages`.
- **Avisos:** `notifications` (con `dedupe_key`).
- **Descubrir:** `discovery_searches`; señales de confianza en `partners` (`verified_at` solo la concede el admin, `collaboration_types`; migración `20261105130000`).
- **Facturación (apagada):** `subscriptions`, `credit_ledger`, idempotencia de webhook (`20261103150000`).
- **Moderación:** `reports` (+ revisión: `open/reviewing/resolved/dismissed`).
- **IA:** `ml_predictions`, `trends`.
- **Aplazadas (existen, sin uso en la app activa):** `social_accounts`, `social_account_snapshots`, `metrics`, `post_external_links`. **No las borres ni las modifiques** (ver features.md).

## Seguridad

- **RLS activado en todas las tablas.** El cliente no escribe en `ml_predictions`, `subscriptions`, `notifications`, `discovery_searches` ni `metrics`: solo el servidor (service role) o RPC.
- `posts`: un partner solo ve los posts ligados a una colaboración suya y **no tiene UPDATE directo**; aprueba o pide cambios por RPC (`approve_post`, `request_post_changes`).
- Helpers de identidad: `current_creator_id()`, `current_partner_id()`, `has_active_collaboration_with()`. Quedan `current_influencer_id`/`current_manager_id`/`current_brand_client_id` heredadas: no las uses en código nuevo; antes de borrarlas, `grep` en políticas.
- Privilegios de funciones endurecidos (`20261103140000`, `20261109100000`): al crear una función nueva, **revoca `EXECUTE` a `public`/`anon`** y concede solo a quien lo necesite. Hay un aviso conocido de `anon` ejecutando `current_*_id`, aceptado conscientemente.
- Permisos por columna endurecidos (`20261103170000`); tablas con permisos cerrados a propósito (p. ej. `reports`, `20261112120000`).

## RPC de negocio (la lógica de estado vive aquí)

Colaboración: `accept_collaboration_request`, `decline_collaboration_request`, `complete_collaboration_brief`, `define_deliverables`, `confirm_deliverables`, `assign_deliverable`/`unassign_deliverable`, `resolve_deliverable`, `reopen_deliverable`, `mark_collaboration_completed`, `request_collaboration_cancel`/`respond_…`/`withdraw_…`, `terminate_collaboration_for_breach`, `submit_collaboration_rating`. Chat/ofertas: `get_or_create_conversation`, `send_text_message`, `create_offer`, `respond_offer`, `mark_conversation_read`, `my_chat_unread_count`. Cuenta: `accept_terms`, `my_credit_balance`, `grant_welcome_credits`. Público: `get_public_*`. Interno: `send_due_reminders` (pg_cron). Los estados y transiciones válidos están en estas funciones y en triggers de guarda (`*_guard`); **no los reimplementes en cliente**.

## Storage

| Bucket | Acceso | Notas |
|---|---|---|
| `post-media` | público | 8 MB, JPEG/PNG/WebP; escritura solo en la carpeta propia. Borradores visibles por URL (riesgo conocido) |
| `collab-files` | privado | archivos de colaboración |

## Reglas de migración

1. Archivo nuevo `supabase/migrations/<AAAAMMDDHHMMSS>_<nombre>.sql`, versión **única** y posterior a la última (`ls supabase/migrations | tail -3`).
2. **Incluye bloque `ROLLBACK`** en comentario (obligatorio desde `20261105100000`; lo comprueba `tests/unit/migrations-rollback.spec.ts`).
3. No destructiva: `add column if not exists`, `create … if not exists`, sin `drop` de datos. Nunca renombres una migración ya aplicada (hay una versión duplicada heredada, `20261021160000`, listada como excepción en el test).
4. RLS en cada tabla nueva y revocar `EXECUTE` en funciones nuevas.
5. No hay migración pendiente de aplicar a fecha de la última sesión; **aplicar migraciones a la base real solo con permiso** (`scripts/apply-pending-migrations.mjs` o el conector de Supabase). El shell de Claude puede no llegar a Postgres.
6. Si cambias el esquema: actualiza tipos/consultas afectados (no hay tipos generados: `types: false`) y añade test.

## Desconocido

Cobertura exacta de RLS por tabla (los tests de integración cubren las fases recientes); índices faltantes en claves foráneas (el linter de Supabase marcó 17); estado actual de la base real más allá de lo anotado en `ROADMAP.md`.
