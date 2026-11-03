-- ============================================================================
-- H0-03 — Permisos EXECUTE de las funciones SECURITY DEFINER.
--
-- Ninguna migración revocaba EXECUTE: Postgres lo concede a PUBLIC al crear una
-- función y Supabase lo concede además a `anon` y `authenticated` en `public`.
-- Comprobado el 2026-11-03 contra el proyecto real con la clave anon (sin sesión)
-- y entradas que no escriben nada: las 20 funciones de abajo se EJECUTAN como
-- `anon` (ninguna devolvió 42501). Ver docs/audit/07_CRITICAL_FINDINGS_VALIDATION.md.
--
-- Lo grave son las tres funciones internas, que no comprueban quién llama:
--   · notify(...)                    inserta un aviso para CUALQUIER perfil, con
--                                    título, texto y enlace libres (el comentario
--                                    de 20261021110000 dice que nadie debía poder).
--   · _get_or_create_conversation    crea conversaciones entre dos perfiles
--                                    cualesquiera, saltándose `chat_privacy`.
--   · has_accepted_offer_between     revela si dos perfiles han cerrado una oferta.
-- Solo las llaman otras funciones SECURITY DEFINER (que se ejecutan como su
-- propietario, al que esto no afecta) y el webhook de Stripe con service_role.
--
-- Las RPC del cliente ya rechazan a `anon` dentro de su cuerpo (auth.uid() nulo),
-- pero no tiene sentido exponérselas: se retira `anon`/PUBLIC y se deja
-- `authenticated` (lo que la app usa).
--
-- NO se tocan `current_creator_id()`/`current_partner_id()`: las evalúan las
-- políticas RLS (también para `anon`) y solo devuelven el id de quien llama.
-- NO se tocan las funciones de trigger (no se pueden invocar por RPC).
--
-- `create or replace function` conserva estos permisos; un `drop function` +
-- `create` NO (vuelve a los privilegios por defecto): quien lo haga debe repetir
-- el revoke. Cambiar los privilegios por defecto del esquema es otra decisión.
--
-- Pruebas:   tests/integration/function-privileges.spec.ts: ANTES de aplicar
--            fallan los de "anon no puede"; DESPUÉS pasan todos.
--
-- ROLLBACK (vuelve al estado medido el 2026-11-03):
--   begin;
--   grant execute on function public.notify(uuid, text, text, text, text) to public;
--   grant execute on function public._get_or_create_conversation(uuid, uuid) to public;
--   grant execute on function public.has_accepted_offer_between(uuid, uuid) to public;
--   -- y para cada RPC de la segunda lista: grant execute on function ... to public;
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA.
-- ============================================================================
begin;

-- 1. Funciones internas: solo para otras funciones (propietario) y service_role.
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.notify(uuid, text, text, text, text) to service_role;

revoke execute on function public._get_or_create_conversation(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.has_accepted_offer_between(uuid, uuid) from public, anon, authenticated;

-- 2. RPC del cliente: solo usuarios con sesión.
revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
revoke execute on function public.send_text_message(uuid, text) from public, anon;
revoke execute on function public.create_offer(uuid, integer, text) from public, anon;
revoke execute on function public.respond_offer(uuid, boolean) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.my_chat_unread_count() from public, anon;
revoke execute on function public.accept_collaboration_request(uuid, integer) from public, anon;
revoke execute on function public.decline_collaboration_request(uuid) from public, anon;
revoke execute on function public.mark_collaboration_completed(uuid) from public, anon;
revoke execute on function public.approve_post(uuid, text) from public, anon;
revoke execute on function public.request_post_changes(uuid, text) from public, anon;
revoke execute on function public.submit_collaboration_rating(uuid, integer, text) from public, anon;
revoke execute on function public.profile_rating_summary(uuid) from public, anon;
revoke execute on function public.get_public_social_accounts(uuid) from public, anon;
revoke execute on function public.my_credit_balance() from public, anon;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.send_text_message(uuid, text) to authenticated;
grant execute on function public.create_offer(uuid, integer, text) to authenticated;
grant execute on function public.respond_offer(uuid, boolean) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_chat_unread_count() to authenticated;
grant execute on function public.accept_collaboration_request(uuid, integer) to authenticated;
grant execute on function public.decline_collaboration_request(uuid) to authenticated;
grant execute on function public.mark_collaboration_completed(uuid) to authenticated;
grant execute on function public.approve_post(uuid, text) to authenticated;
grant execute on function public.request_post_changes(uuid, text) to authenticated;
grant execute on function public.submit_collaboration_rating(uuid, integer, text) to authenticated;
grant execute on function public.profile_rating_summary(uuid) to authenticated;
grant execute on function public.get_public_social_accounts(uuid) to authenticated;
grant execute on function public.my_credit_balance() to authenticated;

commit;
