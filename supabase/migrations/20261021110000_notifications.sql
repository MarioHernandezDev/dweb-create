-- ============================================================================
-- NOTIFICATIONS — bandeja de entrada del usuario (icono junto al perfil).
--
-- De momento son avisos de un solo sentido (el sistema avisa al usuario):
-- inicio de sesión, alta de cuenta, solicitudes de colaboración y de
-- plantilla. Nada de esto lo escribe el cliente directamente — siempre a
-- través de `public.notify()`, llamada desde triggers (security definer),
-- igual que el resto de automatismos del esquema. Un chat entre usuarios o
-- un puente a email son posibles ampliaciones futuras sobre esta misma tabla.
-- ============================================================================

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    title text not null,
    body text,
    link text,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_notifications_profile_id on public.notifications(profile_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications for select
    using (profile_id = auth.uid());

-- Solo para marcar como leída — sin policy de insert para "authenticated"
-- a propósito, así nadie puede fabricarse avisos propios; solo los triggers
-- (security definer) escriben aquí.
create policy "notifications_update_own" on public.notifications for update
    using (profile_id = auth.uid());

create or replace function public.notify(p_profile_id uuid, p_type text, p_title text, p_body text default null, p_link text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
    if p_profile_id is null then
        return;
    end if;
    insert into public.notifications (profile_id, type, title, body, link)
    values (p_profile_id, p_type, p_title, p_body, p_link);
end;
$$;

-- ----------------------------------------------------------------------------
-- Alta de cuenta: se añade el aviso de bienvenida a `handle_new_user()`
-- (redefinida entera porque CREATE OR REPLACE sustituye el cuerpo completo —
-- el resto del cuerpo es idéntico al de 20261020180000_real_signup.sql).
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    user_role text := coalesce(new.raw_user_meta_data ->> 'role', 'influencer');
    display_name text := coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', 'Sin nombre');
    detail text := new.raw_user_meta_data ->> 'detail';
begin
    insert into public.profiles (id, role, full_name)
    values (new.id, user_role, new.raw_user_meta_data ->> 'full_name');

    if user_role = 'influencer' then
        insert into public.influencers (profile_id, display_name, niche)
        values (new.id, display_name, detail);
    elsif user_role = 'manager' then
        insert into public.managers (profile_id, agency_name, focus)
        values (new.id, display_name, detail);
    elsif user_role = 'client' then
        insert into public.brand_clients (profile_id, company_name, industry)
        values (new.id, display_name, detail);
    end if;

    perform public.notify(new.id, 'welcome', 'Bienvenido a FEEDMA', 'Tu cuenta se ha creado correctamente.', null);

    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Inicio de sesión: Supabase actualiza `auth.users.last_sign_in_at` en cada
-- inicio real (password, magic link, confirmación de email) — NO en un
-- refresco de token, así que esto no se dispara en cada recarga de página.
-- ----------------------------------------------------------------------------
create or replace function public.notify_user_login()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if new.last_sign_in_at is distinct from old.last_sign_in_at then
        perform public.notify(new.id, 'login', 'Has iniciado sesión', 'Nuevo acceso a tu cuenta de FEEDMA.', null);
    end if;
    return new;
end;
$$;

create trigger on_auth_user_login
    after update on auth.users
    for each row execute function public.notify_user_login();

-- ----------------------------------------------------------------------------
-- Colaboraciones: avisa al destinatario cuando llega una solicitud nueva, y
-- a la marca cuando le responden. Si un manager asigna la colaboración a
-- alguien de su plantilla, ese influencer recibe aviso aparte.
-- ----------------------------------------------------------------------------
create or replace function public.notify_collaboration_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    brand_name text;
    target_profile_id uuid;
    target_link text;
begin
    select company_name into brand_name from public.brand_clients where id = new.brand_client_id;

    if new.influencer_id is not null then
        select profile_id into target_profile_id from public.influencers where id = new.influencer_id;
        target_link := '/creator/requests';
    elsif new.manager_id is not null then
        select profile_id into target_profile_id from public.managers where id = new.manager_id;
        target_link := '/manager/requests';
    end if;

    perform public.notify(target_profile_id, 'collaboration_requested', 'Nueva solicitud de colaboración', coalesce(brand_name, 'Una marca') || ' quiere colaborar contigo.', target_link);
    return new;
end;
$$;

create trigger on_collaboration_created
    after insert on public.collaborations
    for each row execute function public.notify_collaboration_created();

create or replace function public.notify_collaboration_updated()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    brand_profile_id uuid;
    influencer_profile_id uuid;
begin
    if new.status is distinct from old.status and old.status = 'requested' and new.status in ('accepted', 'declined') then
        select profile_id into brand_profile_id from public.brand_clients where id = new.brand_client_id;
        perform public.notify(
            brand_profile_id,
            'collaboration_' || new.status,
            case when new.status = 'accepted' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
            case when new.status = 'accepted' then 'Tu colaboración ha sido aceptada.' else 'Tu colaboración ha sido rechazada.' end,
            '/client'
        );
    end if;

    if new.influencer_id is not null and old.influencer_id is null then
        select profile_id into influencer_profile_id from public.influencers where id = new.influencer_id;
        perform public.notify(influencer_profile_id, 'collaboration_assigned', 'Nueva colaboración asignada', 'Tu agencia te ha asignado una colaboración.', '/creator/requests');
    end if;

    return new;
end;
$$;

create trigger on_collaboration_updated
    after update on public.collaborations
    for each row execute function public.notify_collaboration_updated();

-- ----------------------------------------------------------------------------
-- Solicitudes de plantilla: avisa al manager cuando llega una, y al
-- influencer cuando le responden. `handle_roster_request_accepted` (de
-- 20261021090000_roster_requests.sql) se redefine entera: antes solo movía
-- `manager_id` al aceptar, ahora también avisa en ambos sentidos.
-- ----------------------------------------------------------------------------
create or replace function public.notify_roster_request_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    manager_profile_id uuid;
    influencer_name text;
begin
    select profile_id into manager_profile_id from public.managers where id = new.manager_id;
    select display_name into influencer_name from public.influencers where id = new.influencer_id;
    perform public.notify(manager_profile_id, 'roster_requested', 'Nueva solicitud de plantilla', coalesce(influencer_name, 'Un influencer') || ' quiere unirse a tu agencia.', '/manager/roster-requests');
    return new;
end;
$$;

create trigger on_roster_request_created
    after insert on public.roster_requests
    for each row execute function public.notify_roster_request_created();

create or replace function public.handle_roster_request_accepted()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    influencer_profile_id uuid;
    manager_name text;
begin
    if new.status is distinct from old.status and new.status in ('accepted', 'declined') then
        if new.status = 'accepted' then
            update public.influencers set manager_id = new.manager_id where id = new.influencer_id;
        end if;

        select profile_id into influencer_profile_id from public.influencers where id = new.influencer_id;
        select agency_name into manager_name from public.managers where id = new.manager_id;
        perform public.notify(
            influencer_profile_id,
            'roster_' || new.status,
            case when new.status = 'accepted' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
            case when new.status = 'accepted' then coalesce(manager_name, 'La agencia') || ' te ha aceptado en su plantilla.' else coalesce(manager_name, 'La agencia') || ' ha rechazado tu solicitud.' end,
            '/creator/discover'
        );
    end if;
    return new;
end;
$$;
