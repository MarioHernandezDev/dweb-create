-- ============================================================================
-- Cuenta: búsquedas guardadas en la cuenta y preferencias de avisos.
--
-- Qué hace:
--   · public.saved_searches: las búsquedas guardadas de Descubrir dejan de vivir
--     solo en el navegador (localStorage) y pasan a la cuenta. RLS: cada usuario
--     solo ve, crea y borra las suyas. Máximo 12 por usuario y tipo (un trigger
--     borra las más antiguas al superar el tope).
--   · public.notification_preferences: tipos de aviso que el usuario ha silenciado.
--     Solo se pueden silenciar tipos que no piden ninguna acción (inicios de sesión,
--     recordatorios de plazo, valoraciones, notas del registro): lo impide un CHECK.
--   · Trigger BEFORE INSERT en notifications: descarta el aviso si su tipo está
--     silenciado por el destinatario. Cubre todos los caminos (notify() y las
--     inserciones directas de send_due_reminders()).
--
-- ROLLBACK (manual):
--   drop trigger if exists notifications_respect_preferences on public.notifications;
--   drop function if exists public.notifications_respect_preferences();
--   drop table if exists public.notification_preferences;
--   drop trigger if exists saved_searches_cap_trg on public.saved_searches;
--   drop function if exists public.saved_searches_cap();
--   drop table if exists public.saved_searches;
--
-- ESTADO: APLICADA el 2026-11-10 con el conector de Supabase (sin registrar en
-- supabase_migrations, igual que las anteriores). Probada en la misma transacción
-- con datos reales dentro de un bloque revertido: sin restos.
-- ============================================================================
begin;

create table if not exists public.saved_searches (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
    kind text not null check (kind in ('creator', 'partner')),
    label text not null check (char_length(label) between 1 and 160),
    state jsonb not null check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 8192),
    created_at timestamptz not null default now()
);
create index if not exists idx_saved_searches_owner on public.saved_searches (profile_id, kind, created_at desc);

alter table public.saved_searches enable row level security;
create policy "saved_searches_select_own" on public.saved_searches for select to authenticated
    using (profile_id = (select auth.uid()));
create policy "saved_searches_insert_own" on public.saved_searches for insert to authenticated
    with check (profile_id = (select auth.uid()));
create policy "saved_searches_delete_own" on public.saved_searches for delete to authenticated
    using (profile_id = (select auth.uid()));
revoke all on public.saved_searches from anon;
grant select, insert, delete on public.saved_searches to authenticated;

create or replace function public.saved_searches_cap()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    delete from public.saved_searches s
    where s.profile_id = new.profile_id and s.kind = new.kind
      and s.id not in (
          select id from public.saved_searches
          where profile_id = new.profile_id and kind = new.kind
          order by created_at desc, id desc limit 12
      );
    return null;
end;
$$;
revoke execute on function public.saved_searches_cap() from public, anon, authenticated;
drop trigger if exists saved_searches_cap_trg on public.saved_searches;
create trigger saved_searches_cap_trg after insert on public.saved_searches
    for each row execute function public.saved_searches_cap();

create table if not exists public.notification_preferences (
    profile_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
    muted_types text[] not null default '{}'
        check (muted_types <@ array['login', 'collaboration_expiring', 'post_due_soon', 'rating_received', 'collaboration_incident_logged']::text[]),
    updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy "notification_preferences_select_own" on public.notification_preferences for select to authenticated
    using (profile_id = (select auth.uid()));
create policy "notification_preferences_insert_own" on public.notification_preferences for insert to authenticated
    with check (profile_id = (select auth.uid()));
create policy "notification_preferences_update_own" on public.notification_preferences for update to authenticated
    using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
revoke all on public.notification_preferences from anon;
grant select, insert, update on public.notification_preferences to authenticated;

create or replace function public.notifications_respect_preferences()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if exists (
        select 1 from public.notification_preferences p
        where p.profile_id = new.profile_id and new.type = any (p.muted_types)
    ) then
        return null;
    end if;
    return new;
end;
$$;
revoke execute on function public.notifications_respect_preferences() from public, anon, authenticated;
drop trigger if exists notifications_respect_preferences on public.notifications;
create trigger notifications_respect_preferences before insert on public.notifications
    for each row execute function public.notifications_respect_preferences();

commit;
