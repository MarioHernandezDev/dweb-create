-- ============================================================================
-- FEEDMA — Se elimina el rol Manager; "Influencer" pasa a llamarse
-- "Creador de contenido" (creator) y "Cliente" a "Partner" (partner).
--
-- Decisión de producto: un manager en la práctica sería un partner más (es
-- quien contrata/organiza trabajo), así que categorizarlo aparte no aportaba
-- nada — se centralizan las relaciones en dos roles: creator <-> partner.
-- Como todavía no hay usuarios reales en producción (la app no se ha
-- desplegado), esta migración hace el cambio de verdad: borra lo de manager
-- en vez de dejarlo en desuso.
--
-- La migración 20261021090000_roster_requests.sql (la tabla "unirse al
-- roster de un manager") se ha borrado del repo directamente — ya no tenía
-- ningún sentido sin managers. Los `drop ... if exists` de abajo limpian lo
-- que esa migración ya había creado en una base de datos donde se llegó a
-- aplicar; en una base de datos nueva (sin ese archivo) son no-ops seguros.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Limpieza de datos: la cuenta demo de manager y cualquier fila que
--    dependiera de ella. Se borra desde auth.users para que el cascade
--    (profiles -> managers, profiles -> subscriptions vía manager, etc.) se
--    encargue solo del resto.
-- ----------------------------------------------------------------------------
delete from auth.users where id in (select profile_id from public.managers);
delete from public.profiles where role = 'manager';

drop table if exists public.roster_requests cascade;
-- El DROP TABLE de arriba se lleva sus triggers, pero las funciones en sí
-- (de 20261021090000_roster_requests.sql y 20261021110000_notifications.sql)
-- no son "propiedad" de la tabla — quedarían huérfanas si no se borran aquí.
drop function if exists public.handle_roster_request_accepted();
drop function if exists public.notify_roster_request_created();

-- ----------------------------------------------------------------------------
-- 1. Políticas viejas fuera antes de tocar tablas/columnas de las que dependen.
-- ----------------------------------------------------------------------------
drop policy if exists "managers_select_public_directory" on public.managers;
drop policy if exists "managers_update_own" on public.managers;
drop policy if exists "managers_insert_own" on public.managers;
drop policy if exists "influencers_select_public_directory" on public.influencers;
drop policy if exists "influencers_update_self_or_manager" on public.influencers;
drop policy if exists "influencers_insert_own" on public.influencers;
drop policy if exists "brand_clients_select_own" on public.brand_clients;
drop policy if exists "brand_clients_update_own" on public.brand_clients;
drop policy if exists "brand_clients_insert_own" on public.brand_clients;
drop policy if exists "collaborations_select_own" on public.collaborations;
drop policy if exists "collaborations_insert_by_brand" on public.collaborations;
drop policy if exists "collaborations_update_involved_parties" on public.collaborations;
drop policy if exists "social_accounts_select_self_or_manager" on public.social_accounts;
drop policy if exists "social_accounts_insert_self" on public.social_accounts;
drop policy if exists "social_accounts_update_self" on public.social_accounts;
drop policy if exists "social_accounts_delete_self" on public.social_accounts;
drop policy if exists "posts_select_scoped" on public.posts;
drop policy if exists "posts_insert_self_or_manager" on public.posts;
drop policy if exists "posts_update_self_or_manager" on public.posts;
drop policy if exists "posts_delete_self_or_manager" on public.posts;
drop policy if exists "metrics_select_scoped" on public.metrics;
drop policy if exists "ml_predictions_select_scoped" on public.ml_predictions;
drop policy if exists "subscriptions_select_own" on public.subscriptions;
drop policy if exists "credit_ledger_select_scoped" on public.credit_ledger;

-- ----------------------------------------------------------------------------
-- 2. Funciones/triggers viejos que se recrean más abajo bajo los nombres nuevos.
-- ----------------------------------------------------------------------------
drop trigger if exists on_influencer_created on public.influencers;
drop function if exists public.grant_welcome_credits();
drop function if exists public.is_in_my_roster(uuid);
drop function if exists public.current_manager_id();
drop function if exists public.has_active_collaboration_with(uuid);
drop function if exists public.current_influencer_id();
drop function if exists public.current_brand_client_id();

-- ----------------------------------------------------------------------------
-- 3. Se quita todo lo de manager: columnas, constraints, la tabla.
-- ----------------------------------------------------------------------------
alter table public.collaborations drop constraint if exists collaboration_has_a_target;
alter table public.collaborations drop column if exists manager_id;
alter table public.subscriptions drop constraint if exists subscription_owner_is_exactly_one;
alter table public.subscriptions drop column if exists manager_id;
alter table public.influencers drop column if exists manager_id;
drop table if exists public.managers cascade;

-- ----------------------------------------------------------------------------
-- 4. Renombrado de tablas y columnas.
-- ----------------------------------------------------------------------------
alter table public.influencers rename to creators;
alter table public.brand_clients rename to partners;

alter table public.posts rename column influencer_id to creator_id;
alter table public.social_accounts rename column influencer_id to creator_id;
alter table public.collaborations rename column influencer_id to creator_id;
alter table public.collaborations rename column brand_client_id to partner_id;
alter table public.credit_ledger rename column influencer_id to creator_id;
alter table public.subscriptions rename column influencer_id to creator_id;
-- Era "exactamente uno de manager_id/influencer_id" (constraint ya tirada
-- arriba); sin manager, creator_id pasa a ser la única columna de dueño.
alter table public.subscriptions alter column creator_id set not null;

alter index if exists idx_collaborations_influencer_id rename to idx_collaborations_creator_id;
alter index if exists idx_collaborations_brand_client_id rename to idx_collaborations_partner_id;
alter index if exists idx_social_accounts_influencer_id rename to idx_social_accounts_creator_id;
alter index if exists idx_posts_influencer_id rename to idx_posts_creator_id;
alter index if exists idx_credit_ledger_influencer_id rename to idx_credit_ledger_creator_id;

-- Sin manager que asigne más tarde: una colaboración sin creador todavía no
-- tiene sentido (antes podía apuntar solo a un manager, en lo que repartía
-- el trabajo). Dato de demo/pre-lanzamiento, seguro de limpiar.
delete from public.collaborations where creator_id is null;
alter table public.collaborations alter column creator_id set not null;

-- ----------------------------------------------------------------------------
-- 5. profiles.role: solo 'creator'/'partner' a partir de ahora.
-- ----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'creator' where role = 'influencer';
update public.profiles set role = 'partner' where role = 'client';
alter table public.profiles add constraint profiles_role_check check (role in ('creator', 'partner'));

-- ----------------------------------------------------------------------------
-- 6. Funciones auxiliares (security definer), bajo los nombres nuevos.
-- ----------------------------------------------------------------------------
create or replace function public.current_creator_id()
returns uuid
language sql stable security definer set search_path = public
as $$
    select id from public.creators where profile_id = auth.uid();
$$;

create or replace function public.current_partner_id()
returns uuid
language sql stable security definer set search_path = public
as $$
    select id from public.partners where profile_id = auth.uid();
$$;

-- ¿Tengo (como partner) una colaboración activa con este creador? Evita que
-- un partner vea TODO el contenido del creador: solo lo atado a su colaboración.
create or replace function public.has_active_collaboration_with(target_creator_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.collaborations
        where creator_id = target_creator_id
        and partner_id = public.current_partner_id()
    );
$$;

-- ----------------------------------------------------------------------------
-- 7. RLS: mismas reglas de antes, ya sin la rama de manager, bajo los
--    nombres nuevos.
-- ----------------------------------------------------------------------------
create policy "creators_select_public_directory" on public.creators for select
    to authenticated using (true);

create policy "creators_update_own" on public.creators for update
    using (profile_id = auth.uid());

create policy "creators_insert_own" on public.creators for insert
    with check (profile_id = auth.uid());

create policy "partners_select_own" on public.partners for select
    using (
        profile_id = auth.uid()
        or id in (select partner_id from public.collaborations where creator_id = public.current_creator_id())
    );

create policy "partners_update_own" on public.partners for update
    using (profile_id = auth.uid());

create policy "partners_insert_own" on public.partners for insert
    with check (profile_id = auth.uid());

create policy "collaborations_select_own" on public.collaborations for select
    using (
        partner_id = public.current_partner_id()
        or creator_id = public.current_creator_id()
    );

create policy "collaborations_insert_by_partner" on public.collaborations for insert
    with check (partner_id = public.current_partner_id());

create policy "collaborations_update_involved_parties" on public.collaborations for update
    using (
        partner_id = public.current_partner_id()
        or creator_id = public.current_creator_id()
    );

create policy "social_accounts_select_self" on public.social_accounts for select
    using (creator_id = public.current_creator_id());

create policy "social_accounts_insert_self" on public.social_accounts for insert
    with check (creator_id = public.current_creator_id());

create policy "social_accounts_update_self" on public.social_accounts for update
    using (creator_id = public.current_creator_id());

create policy "social_accounts_delete_self" on public.social_accounts for delete
    using (creator_id = public.current_creator_id());

create policy "posts_select_scoped" on public.posts for select
    using (
        creator_id = public.current_creator_id()
        or (collaboration_id is not null and exists (
            select 1 from public.collaborations c
            where c.id = posts.collaboration_id
            and c.partner_id = public.current_partner_id()
        ))
    );

create policy "posts_insert_self" on public.posts for insert
    with check (creator_id = public.current_creator_id());

create policy "posts_update_self" on public.posts for update
    using (creator_id = public.current_creator_id());

create policy "posts_delete_self" on public.posts for delete
    using (creator_id = public.current_creator_id());

create policy "metrics_select_scoped" on public.metrics for select
    using (
        post_id in (
            select id from public.posts
            where creator_id = public.current_creator_id()
            or (collaboration_id is not null and exists (
                select 1 from public.collaborations c
                where c.id = posts.collaboration_id
                and c.partner_id = public.current_partner_id()
            ))
        )
    );

create policy "ml_predictions_select_scoped" on public.ml_predictions for select
    using (
        post_id in (select id from public.posts where creator_id = public.current_creator_id())
    );

create policy "subscriptions_select_own" on public.subscriptions for select
    using (creator_id = public.current_creator_id());

create policy "credit_ledger_select_scoped" on public.credit_ledger for select
    using (creator_id = public.current_creator_id());

-- ----------------------------------------------------------------------------
-- 8. handle_new_user(): sin rama de manager; solo crea `creators`/`partners`.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    user_role text := coalesce(new.raw_user_meta_data ->> 'role', 'creator');
    display_name text := coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', 'Sin nombre');
    detail text := new.raw_user_meta_data ->> 'detail';
begin
    insert into public.profiles (id, role, full_name)
    values (new.id, user_role, new.raw_user_meta_data ->> 'full_name');

    if user_role = 'creator' then
        insert into public.creators (profile_id, display_name, niche)
        values (new.id, display_name, detail);
    elsif user_role = 'partner' then
        insert into public.partners (profile_id, company_name, industry)
        values (new.id, display_name, detail);
    end if;

    perform public.notify(new.id, 'welcome', 'Bienvenido a FEEDMA', 'Tu cuenta se ha creado correctamente.', null);

    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. Regalo de créditos de bienvenida: el trigger vivía en `influencers`,
--    ahora vive en `creators`.
-- ----------------------------------------------------------------------------
create or replace function public.grant_welcome_credits()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    insert into public.credit_ledger (creator_id, amount, reason)
    values (new.id, 3, 'subscription_grant');
    return new;
end;
$$;

create trigger on_creator_created
    after insert on public.creators
    for each row execute function public.grant_welcome_credits();

-- ----------------------------------------------------------------------------
-- 10. approve_post / request_post_changes: ahora comprueban `partner_id`.
-- ----------------------------------------------------------------------------
create or replace function public.approve_post(target_post_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
    is_owner boolean;
begin
    select exists (
        select 1 from public.posts p
        join public.collaborations c on c.id = p.collaboration_id
        where p.id = target_post_id
        and c.partner_id = public.current_partner_id()
    ) into is_owner;

    if not is_owner then
        raise exception 'No tienes una colaboración activa sobre este post';
    end if;

    update public.posts
    set status = 'scheduled'
    where id = target_post_id
    and status = 'ready_for_review';
end;
$$;

create or replace function public.request_post_changes(target_post_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
    is_owner boolean;
begin
    select exists (
        select 1 from public.posts p
        join public.collaborations c on c.id = p.collaboration_id
        where p.id = target_post_id
        and c.partner_id = public.current_partner_id()
    ) into is_owner;

    if not is_owner then
        raise exception 'No tienes una colaboración activa sobre este post';
    end if;

    update public.posts
    set status = 'in_production'
    where id = target_post_id
    and status = 'ready_for_review';
end;
$$;

grant execute on function public.approve_post(uuid) to authenticated;
grant execute on function public.request_post_changes(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 11. Si 20261021110000_notifications.sql ya se aplicó (o se aplica en la
--     misma sesión que esta), sus triggers `on_collaboration_created`/
--     `on_collaboration_updated` siguen apuntando a estas funciones por
--     nombre — se redefinen aquí para los nombres de columna/tabla nuevos y
--     sin la rama de manager (ya no hay asignación posterior: `creator_id`
--     es obligatorio desde el alta de la colaboración).
-- ----------------------------------------------------------------------------
create or replace function public.notify_collaboration_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    partner_name text;
    target_profile_id uuid;
begin
    select company_name into partner_name from public.partners where id = new.partner_id;
    select profile_id into target_profile_id from public.creators where id = new.creator_id;

    perform public.notify(target_profile_id, 'collaboration_requested', 'Nueva solicitud de colaboración', coalesce(partner_name, 'Un partner') || ' quiere colaborar contigo.', '/creator/requests');
    return new;
end;
$$;

create or replace function public.notify_collaboration_updated()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    partner_profile_id uuid;
begin
    if new.status is distinct from old.status and old.status = 'requested' and new.status in ('accepted', 'declined') then
        select profile_id into partner_profile_id from public.partners where id = new.partner_id;
        perform public.notify(
            partner_profile_id,
            'collaboration_' || new.status,
            case when new.status = 'accepted' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
            case when new.status = 'accepted' then 'Tu colaboración ha sido aceptada.' else 'Tu colaboración ha sido rechazada.' end,
            '/partner'
        );
    end if;
    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 12. subscriptions.plan_id: fuera 'agency' (era el plan de manager).
-- ----------------------------------------------------------------------------
update public.subscriptions set plan_id = 'pro' where plan_id = 'agency';
alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions add constraint subscriptions_plan_id_check
    check (plan_id in ('free', 'starter', 'pro'));
