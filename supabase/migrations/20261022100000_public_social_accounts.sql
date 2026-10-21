-- ============================================================================
-- FEEDMA — Redes verificadas visibles en el perfil público.
--
-- `social_accounts` solo se podía leer uno mismo (`social_accounts_select_self`)
-- — con razón: guarda `access_token_encrypted`/`refresh_token_encrypted`, que
-- nunca deben salir de la fila del dueño. Pero el PARTNER que decide si le
-- hace una oferta a un creador necesita ver qué redes tiene conectadas de
-- verdad y cuántos seguidores — hoy esa señal de confianza no llega a
-- /profile/[role]/[id].
--
-- En vez de abrir el `select` de toda la tabla (expondría los tokens cifrados
-- a cualquier autenticado), una función `security definer` que solo devuelve
-- las columnas no sensibles — mismo criterio que el resto de escrituras/
-- lecturas sensibles de este proyecto (notify(), create_offer(), etc.).
--
-- Solo se devuelven filas VERIFICADAS de verdad (`access_token_encrypted` no
-- nulo), nunca las de "conectar" sin OAuth todavía (ver useMySocialAccounts.ts:
-- hoy eso solo es cierto para Instagram, el resto crea la fila a mano sin
-- token) — mostrar esas como si fueran una señal de confianza sería
-- precisamente lo contrario de lo que se busca aquí.
-- ============================================================================
create or replace function public.get_public_social_accounts(p_creator_id uuid)
returns table (platform text, handle text, followers_count bigint)
language sql
security definer
set search_path = public
stable
as $$
    select platform, handle, followers_count
    from public.social_accounts
    where creator_id = p_creator_id and access_token_encrypted is not null
    order by followers_count desc;
$$;

grant execute on function public.get_public_social_accounts(uuid) to authenticated;
