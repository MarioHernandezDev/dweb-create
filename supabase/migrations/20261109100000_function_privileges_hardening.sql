-- ============================================================================
-- Endurecimiento de funciones (avisos del linter de Supabase, 2026-11-09).
--
-- Aditiva y sin pérdida de datos. Solo cambia permisos EXECUTE y fija el
-- search_path de 4 funciones. No toca datos ni definiciones.
--
-- 1) Funciones de TRIGGER (11): estaban ejecutables por anon/authenticated vía
--    /rest/v1/rpc/<nombre>. No se pueden invocar como RPC de forma útil y
--    Postgres solo comprueba EXECUTE al CREAR el trigger, no al dispararlo
--    (las collab_* ya funcionan sin ese permiso en este mismo proyecto).
-- 2) has_active_collaboration_with(uuid): ninguna política ni el código la usan;
--    se retira a anon/PUBLIC y se deja a authenticated.
-- 3) search_path fijo = public en collaborations_set_expiry, set_post_published_at,
--    set_updated_at y audience_is_valid (aviso function_search_path_mutable).
--    Sus cuerpos solo usan funciones/operadores de pg_catalog.
--
-- NO se tocan (a propósito):
--   · current_creator_id() / current_partner_id(): las evalúan políticas RLS
--     (también para anon) y solo devuelven el id de quien llama.
--   · Las RPC de la app (authenticated): comprueban auth.uid() dentro del
--     cuerpo; el aviso «authenticated puede ejecutar SECURITY DEFINER» es
--     esperado en una app que las usa desde el cliente.
--
-- ROLLBACK (vuelve al estado medido el 2026-11-09):
--   begin;
--   grant execute on function
--       public.collaborations_set_expiry(), public.delete_pending_offers_of_package(),
--       public.grant_welcome_credits(), public.handle_new_user(),
--       public.notify_collaboration_created(), public.notify_collaboration_log_entry_created(),
--       public.notify_collaboration_offer_created(), public.notify_collaboration_updated(),
--       public.notify_user_login(), public.set_post_published_at(), public.set_updated_at()
--       to public, anon, authenticated;
--   grant execute on function public.has_active_collaboration_with(uuid) to public, anon;
--   alter function public.collaborations_set_expiry() reset search_path;
--   alter function public.set_post_published_at() reset search_path;
--   alter function public.set_updated_at() reset search_path;
--   alter function public.audience_is_valid(jsonb) reset search_path;
--   commit;
--
-- ESTADO: APLICADA el 2026-11-09 (con el conector de Supabase, sin registrar en
-- supabase_migrations, igual que las anteriores).
-- ============================================================================
begin;

revoke execute on function
    public.collaborations_set_expiry(),
    public.delete_pending_offers_of_package(),
    public.grant_welcome_credits(),
    public.handle_new_user(),
    public.notify_collaboration_created(),
    public.notify_collaboration_log_entry_created(),
    public.notify_collaboration_offer_created(),
    public.notify_collaboration_updated(),
    public.notify_user_login(),
    public.set_post_published_at(),
    public.set_updated_at()
  from public, anon, authenticated;

revoke execute on function public.has_active_collaboration_with(uuid) from public, anon;

alter function public.collaborations_set_expiry() set search_path = public;
alter function public.set_post_published_at() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.audience_is_valid(jsonb) set search_path = public;

commit;
