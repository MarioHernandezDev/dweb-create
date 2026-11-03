-- ============================================================================
-- H0-08 — `social_accounts`: el navegador ya no puede borrar filas.
--
-- `20261028120000_social_accounts_lockdown.sql` dejó el DELETE propio "hasta que
-- A-R3 lo mueva a un endpoint de servidor". A-R3 ya está hecho: la interfaz
-- desconecta por `POST /api/social/disconnect`, que revoca el token en Google
-- ANTES de borrar y borra con service_role. Ningún código del cliente borra en
-- esta tabla (comprobado: `useMySocialAccounts.disconnect` usa el endpoint).
--
-- Con el permiso vivo, una petición directa a Supabase con la sesión del creador
-- borraba su fila sin revocar el acceso en Google, se saltaba el aviso de
-- "revocación no confirmada" y arrastraba en cascada `post_external_links` y
-- `social_account_snapshots` (histórico propio). Solo afecta a la propia cuenta.
--
-- Después de esta migración `authenticated` solo conserva el SELECT por columnas;
-- todo borrado pasa por el servidor (desconexión, y en el futuro M-L2).
--
-- Pruebas:   tests/integration/social-accounts-rls.spec.ts ("borrado solo desde
--            el servidor"): ANTES de aplicar falla; DESPUÉS pasa.
--
-- ROLLBACK:
--   begin;
--   grant delete on public.social_accounts to authenticated;
--   create policy "social_accounts_delete_self" on public.social_accounts for delete
--     using (creator_id = public.current_creator_id());
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA.
-- ============================================================================
begin;

drop policy if exists "social_accounts_delete_self" on public.social_accounts;

revoke delete on public.social_accounts from anon, authenticated;

commit;
