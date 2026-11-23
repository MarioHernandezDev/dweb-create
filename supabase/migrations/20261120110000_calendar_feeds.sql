-- ============================================================================
-- Calendario suscribible: un enlace privado por persona (token) para que Google Calendar, Apple Calendar u Outlook
-- se suscriban a sus fechas de entrega. El token se sirve en `/api/calendar/<token>` (el servidor lo busca con la clave de
-- servicio y devuelve solo fechas y títulos). Se puede renovar: el enlace anterior deja de valer.
-- No toca nada existente: tabla nueva, solo lectura propia, y dos funciones para crear/renovar el token.
--
-- ROLLBACK (manual):
--   drop function if exists public.rotate_calendar_feed();
--   drop function if exists public.get_or_create_calendar_feed();
--   drop table if exists public.calendar_feeds;
-- ============================================================================
begin;

create table if not exists public.calendar_feeds (
    profile_id uuid primary key references public.profiles(id) on delete cascade,
    token uuid not null unique default gen_random_uuid(),
    created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;
drop policy if exists calendar_feeds_select_own on public.calendar_feeds;
create policy calendar_feeds_select_own on public.calendar_feeds for select to authenticated using (profile_id = auth.uid());

-- Nadie escribe directamente: solo las funciones de abajo.
revoke all on public.calendar_feeds from anon, authenticated;
grant select on public.calendar_feeds to authenticated;

create or replace function public.get_or_create_calendar_feed()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
    v_token uuid;
begin
    if auth.uid() is null then raise exception 'Inicia sesión para usar el calendario.'; end if;
    insert into public.calendar_feeds (profile_id) values (auth.uid()) on conflict (profile_id) do nothing;
    select token into v_token from public.calendar_feeds where profile_id = auth.uid();
    return v_token;
end;
$$;

create or replace function public.rotate_calendar_feed()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
    v_token uuid;
begin
    if auth.uid() is null then raise exception 'Inicia sesión para usar el calendario.'; end if;
    insert into public.calendar_feeds (profile_id) values (auth.uid())
    on conflict (profile_id) do update set token = gen_random_uuid(), created_at = now()
    returning token into v_token;
    return v_token;
end;
$$;

revoke execute on function public.get_or_create_calendar_feed() from public, anon;
revoke execute on function public.rotate_calendar_feed() from public, anon;
grant execute on function public.get_or_create_calendar_feed() to authenticated;
grant execute on function public.rotate_calendar_feed() to authenticated;

commit;
