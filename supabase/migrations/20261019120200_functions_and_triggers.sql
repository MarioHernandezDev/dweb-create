-- ============================================================================
-- FEEDMA — Funciones y triggers de soporte
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Crear el profile automáticamente al registrarse (auth.users -> profiles).
-- El rol elegido en el formulario de registro viaja en los metadatos del
-- signUp() de Supabase (raw_user_meta_data ->> 'role').
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    insert into public.profiles (id, role, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'role', 'influencer'),
        new.raw_user_meta_data ->> 'full_name'
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- updated_at automático en las tablas que lo tienen.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_updated_at before update on public.collaborations
    for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.posts
    for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.subscriptions
    for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Aprobar / pedir cambios en un post, para la marca.
--
-- A propósito NO le damos a brand_clients un UPDATE directo sobre `posts`
-- (eso le dejaría tocar título, caption, fecha... cualquier columna). En su
-- lugar, estas dos funciones son la ÚNICA puerta que tiene una marca para
-- mover el estado de un post, y comprueban por dentro que: 1) el post
-- pertenece a una colaboración suya, y 2) el post está realmente esperando
-- su revisión antes de dejar que lo muevan.
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
        and c.brand_client_id = public.current_brand_client_id()
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
        and c.brand_client_id = public.current_brand_client_id()
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
