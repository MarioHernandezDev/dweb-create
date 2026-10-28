-- ============================================================================
-- FEEDMA — M1 (A-R2): estado y trazabilidad de las cuentas sociales.
--
-- Hasta ahora `social_accounts` solo sabía "hay fila": no distinguía una
-- cuenta operativa de una con el token caducado o revocado, ni cuándo se
-- sincronizó por última vez, ni qué cuenta es en el proveedor. Esta migración
-- solo AÑADE columnas (nullable o con valor por defecto): no cambia ni borra
-- nada existente, y el código actual sigue funcionando sin tocarlo.
--
--   status               connected | expired | revoked | missing_permissions.
--                        Los fallos temporales (red, cuota) NO lo cambian.
--   last_error_code      código corto del último fallo (nunca mensajes
--                        crudos del proveedor ni tokens).
--   last_error_at        cuándo ocurrió.
--   last_synced_at       última sincronización CORRECTA.
--   last_sync_attempt_at último intento (para espaciar reintentos).
--   sync_lock_until      cerrojo contra ejecuciones simultáneas (A-R5).
--   external_account_id  id de la cuenta/canal en el proveedor. Permite que
--                        Meta localice la fila al desautorizar (A-R4) e
--                        impide conectar la misma cuenta a dos creadores.
--   is_verified          columna generada: true si hay token. Es lo que el
--                        navegador puede leer para saber si una cuenta es
--                        real SIN leer el token.
--
-- PERMISOS: tras A-R11 el navegador solo lee una lista blanca de columnas, así
-- que las columnas nuevas nacen SIN acceso. Aquí se concede SELECT solo de
-- `status`, `last_synced_at`, `last_error_code` e `is_verified`. NO se conceden
-- `last_error_at`, `last_sync_attempt_at`, `sync_lock_until` ni
-- `external_account_id`. No se toca ninguna policy ni se concede insert/update.
--
-- El código que usa estas columnas (callbacks OAuth, sync, pantallas) se
-- publica DESPUÉS de aplicar esta migración.
--
-- Propuesta: docs/PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md (M1).
-- Pruebas:   tests/integration/social-accounts-status-columns.spec.ts
--
-- ROLLBACK (solo pierde lo escrito en las columnas nuevas, nada anterior):
--   begin;
--   drop index if exists public.social_accounts_platform_external_account_id_key;
--   alter table public.social_accounts
--     drop column if exists is_verified,
--     drop column if exists external_account_id,
--     drop column if exists sync_lock_until,
--     drop column if exists last_sync_attempt_at,
--     drop column if exists last_synced_at,
--     drop column if exists last_error_at,
--     drop column if exists last_error_code,
--     drop column if exists status;
--   commit;
-- ============================================================================
begin;

alter table public.social_accounts
  add column status text not null default 'connected'
    check (status in ('connected', 'expired', 'revoked', 'missing_permissions')),
  add column last_error_code text,
  add column last_error_at timestamptz,
  add column last_synced_at timestamptz,
  add column last_sync_attempt_at timestamptz,
  add column sync_lock_until timestamptz,
  add column external_account_id text,
  add column is_verified boolean generated always as (access_token_encrypted is not null) stored;

-- La misma cuenta del proveedor no puede estar conectada a dos creadores.
-- Parcial: las filas sin id externo (antiguas o de demo) no cuentan.
create unique index social_accounts_platform_external_account_id_key
  on public.social_accounts (platform, external_account_id)
  where external_account_id is not null;

-- Lectura desde el navegador: solo lo que la interfaz necesita.
grant select (status, last_synced_at, last_error_code, is_verified)
  on public.social_accounts to authenticated;

commit;
