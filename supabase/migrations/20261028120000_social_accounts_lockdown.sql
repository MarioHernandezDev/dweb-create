-- ============================================================================
-- FEEDMA — A-R11: `social_accounts` solo se escribe desde el servidor.
--
-- Hasta ahora un creador podía, con peticiones directas a Supabase, insertar
-- o editar sus propias filas (seguidores, tokens) y leer las columnas de
-- token. Eso permitía falsificar una red "verificada" (get_public_social_
-- accounts solo mira que el token no sea nulo) y cifras de seguidores.
--
-- Después de esta migración:
--   · el navegador NO puede insertar ni actualizar `social_accounts`
--     (solo escribe el servidor con service_role: callbacks OAuth y sync);
--   · el navegador solo puede LEER las columnas no sensibles;
--   · el borrado de la fila propia se mantiene hasta que A-R3 lo mueva a un
--     endpoint de servidor.
--
-- Las policies `social_accounts_select_self` y `social_accounts_delete_self`
-- se conservan: RLS sigue limitando a las filas propias.
-- Al ser una lista blanca, cualquier columna futura nace SIN acceso para el
-- navegador y hay que concederla de forma deliberada.
--
-- Propuesta y pruebas: docs/PROPUESTA_A-R11_SEGURIDAD_SOCIAL_ACCOUNTS.md y
-- tests/integration/social-accounts-rls.spec.ts.
--
-- ROLLBACK (estado anterior verificado con information_schema.column_privileges
-- el 2026-10-28: anon y authenticated tenían SELECT/INSERT/UPDATE/REFERENCES
-- en las 9 columnas):
--   begin;
--   grant all on public.social_accounts to anon, authenticated;
--   create policy "social_accounts_insert_self" on public.social_accounts for insert
--     with check (creator_id = public.current_creator_id());
--   create policy "social_accounts_update_self" on public.social_accounts for update
--     using (creator_id = public.current_creator_id());
--   commit;
-- ============================================================================
begin;

drop policy if exists "social_accounts_insert_self" on public.social_accounts;
drop policy if exists "social_accounts_update_self" on public.social_accounts;

revoke all on public.social_accounts from anon, authenticated;

grant select (id, creator_id, platform, handle, followers_count, connected_at)
  on public.social_accounts to authenticated;

grant delete on public.social_accounts to authenticated;

commit;
