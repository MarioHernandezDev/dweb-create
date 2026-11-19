-- ============================================================================
-- CIBERAN — biblioteca de archivos del creador (imágenes reutilizables).
-- Los archivos viven en el bucket público `post-media`, en la subcarpeta `<profile_id>/library/` (las políticas de
-- Storage ya limitan cada carpeta a su dueño); esta tabla guarda lo que el bucket no sabe: nombre, etiquetas y tamaño.
-- Privada por dueño (RLS), máximo 100 archivos por persona. Solo imágenes (JPG, PNG, WebP; 8 MB: lo que ya admite el
-- bucket). No cambia nada existente.
--
-- ROLLBACK (manual; antes borra los archivos de la biblioteca desde la app o con Storage):
--   drop table if exists public.media_library;
--   drop function if exists public.media_library_cap();
-- ============================================================================
begin;

create table if not exists public.media_library (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
    path text not null check (char_length(path) between 1 and 300),
    name text not null check (char_length(btrim(name)) between 1 and 120),
    mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
    size_bytes integer not null check (size_bytes > 0 and size_bytes <= 8388608),
    tags text[] not null default '{}' check (cardinality(tags) <= 8),
    created_at timestamptz not null default now(),
    unique (profile_id, path),
    check (path like profile_id::text || '/library/%')
);

create index if not exists media_library_profile_created_idx on public.media_library (profile_id, created_at desc);

alter table public.media_library enable row level security;
create policy "media_library_select_own" on public.media_library for select to authenticated
    using (profile_id = (select auth.uid()));
create policy "media_library_insert_own" on public.media_library for insert to authenticated
    with check (profile_id = (select auth.uid()));
create policy "media_library_update_own" on public.media_library for update to authenticated
    using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "media_library_delete_own" on public.media_library for delete to authenticated
    using (profile_id = (select auth.uid()));
revoke all on public.media_library from anon;
revoke all on public.media_library from authenticated;
grant select, delete on public.media_library to authenticated;
grant insert (path, name, mime, size_bytes, tags), update (name, tags) on public.media_library to authenticated;

create or replace function public.media_library_cap()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if (select count(*) from public.media_library where profile_id = new.profile_id) >= 100 then
        raise exception 'Tu biblioteca ya tiene 100 archivos. Borra alguno antes de subir otro.';
    end if;
    return new;
end;
$$;
revoke execute on function public.media_library_cap() from public, anon, authenticated;
create trigger media_library_cap_trg before insert on public.media_library
    for each row execute function public.media_library_cap();

commit;
