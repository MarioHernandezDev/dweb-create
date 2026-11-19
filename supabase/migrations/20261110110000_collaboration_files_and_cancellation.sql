-- ============================================================================
-- Colaboración: archivos compartidos y cancelación de común acuerdo
-- (docs/HOJA_DE_RUTA.md §3.1 y §3.5).
--
-- Qué hace:
--   · Archivos: bucket PRIVADO `collab-files` (10 MB, tipos de documento e imagen)
--     y tabla public.collaboration_files. Solo las dos partes de la colaboración
--     ven y descargan; sube quien participa mientras la colaboración está abierta
--     (solicitada, aceptada o en curso); borra solo quien subió el archivo.
--     Máximo 20 archivos por colaboración. Cada alta y baja queda en la cronología
--     (`file_added` / `file_removed`) y el alta avisa a la otra parte.
--   · Cancelación pactada: una parte la propone con motivo
--     (request_collaboration_cancel), la otra acepta o no
--     (respond_collaboration_cancel) y quien la propuso puede retirarla
--     (withdraw_collaboration_cancel). Solo en colaboraciones aceptadas o en curso
--     y SIN pago: no toca Stripe ni devuelve dinero. Estado nuevo `cancelled`.
--     Todo queda en la cronología y se avisa a la otra parte.
--
-- Solo añade (columnas, tablas, funciones, valores admitidos): el código anterior
-- sigue funcionando sin cambios.
--
-- ROLLBACK (manual; antes, comprobar que no hay colaboraciones `cancelled` ni
-- eventos de los tipos nuevos, o los CHECK antiguos no se podrán restaurar):
--   drop function if exists public.withdraw_collaboration_cancel(uuid);
--   drop function if exists public.respond_collaboration_cancel(uuid, boolean);
--   drop function if exists public.request_collaboration_cancel(uuid, text);
--   alter table public.collaborations drop column if exists cancel_requested_by,
--     drop column if exists cancel_requested_at, drop column if exists cancel_reason,
--     drop column if exists cancelled_at;
--   alter table public.collaborations drop constraint collaborations_status_check;
--   alter table public.collaborations add constraint collaborations_status_check
--     check (status in ('requested','accepted','in_progress','completed','declined'));
--   drop policy if exists "collab_files_storage_select" on storage.objects;
--   drop policy if exists "collab_files_storage_insert" on storage.objects;
--   drop policy if exists "collab_files_storage_delete" on storage.objects;
--   drop table if exists public.collaboration_files;
--   drop function if exists public.collaboration_files_events();
--   drop function if exists public.collaboration_files_guard();
--   drop function if exists public.collab_file_party(text, boolean);
--   -- vaciar y borrar el bucket `collab-files` desde el panel de Storage
--   -- y restaurar collaboration_events_kind_check sin los 6 tipos nuevos.
--
-- ESTADO: APLICADA el 2026-11-10 con el conector de Supabase (sin registrar en
-- supabase_migrations, igual que las anteriores). Probada en la misma transacción
-- con datos reales dentro de un bloque revertido: sin restos.
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- Cronología: tipos nuevos
-- ---------------------------------------------------------------------------
alter table public.collaboration_events drop constraint collaboration_events_kind_check;
alter table public.collaboration_events add constraint collaboration_events_kind_check check (kind in (
    'requested', 'accepted', 'declined', 'completed', 'counteroffer', 'deliverable_sent', 'changes_requested',
    'approved', 'deliverable_published', 'rated', 'note', 'deliverables_defined', 'deliverables_confirmed',
    'deliverable_assigned', 'deliverable_unassigned', 'approval_invalidated', 'deliverable_waived',
    'deliverable_accepted_without_approval', 'deliverable_reopened', 'edited_after_publish',
    'file_added', 'file_removed', 'cancel_requested', 'cancel_declined', 'cancel_withdrawn', 'cancelled'
));

-- ---------------------------------------------------------------------------
-- Archivos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('collab-files', 'collab-files', false, 10485760, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do nothing;

-- ¿Quien llama participa en la colaboración cuyo id es la primera carpeta de la ruta?
-- Con p_open = true exige además que la colaboración siga abierta.
create or replace function public.collab_file_party(p_folder text, p_open boolean default false)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
    if p_folder is null or p_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return false;
    end if;
    return exists (
        select 1 from public.collaborations c
        where c.id = p_folder::uuid
          and (c.partner_id = public.current_partner_id() or c.creator_id = public.current_creator_id())
          and (not p_open or c.status in ('requested', 'accepted', 'in_progress'))
    );
end;
$$;
revoke execute on function public.collab_file_party(text, boolean) from public, anon;
grant execute on function public.collab_file_party(text, boolean) to authenticated;

create table if not exists public.collaboration_files (
    id uuid primary key default gen_random_uuid(),
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    uploader_profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
    path text not null unique,
    name text not null check (char_length(name) between 1 and 200),
    mime text not null,
    size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
    created_at timestamptz not null default now()
);
create index if not exists idx_collaboration_files_collab on public.collaboration_files (collaboration_id, created_at desc);
create index if not exists idx_collaboration_files_uploader on public.collaboration_files (uploader_profile_id);

alter table public.collaboration_files enable row level security;
create policy "collaboration_files_select_parties" on public.collaboration_files for select to authenticated
    using (public.collab_file_party(collaboration_id::text));
create policy "collaboration_files_insert_party" on public.collaboration_files for insert to authenticated
    with check (
        uploader_profile_id = (select auth.uid())
        and public.collab_file_party(collaboration_id::text, true)
        and path like collaboration_id::text || '/%'
    );
create policy "collaboration_files_delete_uploader" on public.collaboration_files for delete to authenticated
    using (uploader_profile_id = (select auth.uid()) and public.collab_file_party(collaboration_id::text, true));
revoke all on public.collaboration_files from anon;
revoke all on public.collaboration_files from authenticated;
grant select, delete on public.collaboration_files to authenticated;
grant insert (collaboration_id, path, name, mime, size_bytes) on public.collaboration_files to authenticated;

create or replace function public.collaboration_files_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if (select count(*) from public.collaboration_files where collaboration_id = new.collaboration_id) >= 20 then
        raise exception 'Esta colaboración ya tiene 20 archivos. Borra alguno antes de subir otro.';
    end if;
    return new;
end;
$$;
revoke execute on function public.collaboration_files_guard() from public, anon, authenticated;
create trigger collaboration_files_guard_trg before insert on public.collaboration_files
    for each row execute function public.collaboration_files_guard();

create or replace function public.collaboration_files_events()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    creator_profile uuid;
    partner_profile uuid;
    target uuid;
begin
    if tg_op = 'INSERT' then
        perform public.collab_event_add(new.collaboration_id, 'file_added', new.uploader_profile_id, null, jsonb_build_object('name', new.name));
        select * into coll from public.collaborations where id = new.collaboration_id;
        select profile_id into creator_profile from public.creators where id = coll.creator_id;
        select profile_id into partner_profile from public.partners where id = coll.partner_id;
        target := case when new.uploader_profile_id = creator_profile then partner_profile else creator_profile end;
        perform public.notify(
            target, 'collaboration_file_added', 'Archivo nuevo en una colaboración', new.name,
            case when target = creator_profile then '/creator' else '/partner' end || '/collaborations/' || new.collaboration_id || '#archivos'
        );
        return new;
    end if;
    -- Si se borra la colaboración entera (cascada), ya no hay cronología que anotar.
    if exists (select 1 from public.collaborations where id = old.collaboration_id) then
        perform public.collab_event_add(old.collaboration_id, 'file_removed', auth.uid(), null, jsonb_build_object('name', old.name));
    end if;
    return old;
end;
$$;
revoke execute on function public.collaboration_files_events() from public, anon, authenticated;
create trigger collaboration_files_events_trg after insert or delete on public.collaboration_files
    for each row execute function public.collaboration_files_events();

create policy "collab_files_storage_select" on storage.objects for select to authenticated
    using (bucket_id = 'collab-files' and public.collab_file_party((storage.foldername(name))[1]));
create policy "collab_files_storage_insert" on storage.objects for insert to authenticated
    with check (bucket_id = 'collab-files' and public.collab_file_party((storage.foldername(name))[1], true));
create policy "collab_files_storage_delete" on storage.objects for delete to authenticated
    using (bucket_id = 'collab-files' and owner_id = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Cancelación de común acuerdo
-- ---------------------------------------------------------------------------
alter table public.collaborations
    add column if not exists cancel_requested_by uuid references public.profiles(id) on delete set null,
    add column if not exists cancel_requested_at timestamptz,
    add column if not exists cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 1000),
    add column if not exists cancelled_at timestamptz;

alter table public.collaborations drop constraint collaborations_status_check;
alter table public.collaborations add constraint collaborations_status_check
    check (status in ('requested', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled'));

create or replace function public.request_collaboration_cancel(p_collaboration_id uuid, p_reason text)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    creator_profile uuid;
    partner_profile uuid;
    reason text := trim(coalesce(p_reason, ''));
begin
    select * into coll from public.collaborations where id = p_collaboration_id for update;
    if coll.id is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if coll.status not in ('accepted', 'in_progress') then
        raise exception 'Solo se puede cancelar una colaboración aceptada o en curso.';
    end if;
    if coll.paid_at is not null then
        raise exception 'Esta colaboración ya está pagada: no se puede cancelar desde aquí.';
    end if;
    if coll.cancel_requested_at is not null then
        raise exception 'Ya hay una propuesta de cancelación pendiente de respuesta.';
    end if;
    if char_length(reason) < 10 then
        raise exception 'Explica el motivo de la cancelación (al menos 10 caracteres).';
    end if;
    if char_length(reason) > 1000 then
        raise exception 'El motivo no puede superar los 1000 caracteres.';
    end if;

    update public.collaborations
    set cancel_requested_by = auth.uid(), cancel_requested_at = now(), cancel_reason = reason, updated_at = now()
    where id = coll.id returning * into coll;

    perform public.collab_event_add(coll.id, 'cancel_requested', auth.uid(), null, jsonb_build_object('reason', reason));
    select profile_id into creator_profile from public.creators where id = coll.creator_id;
    select profile_id into partner_profile from public.partners where id = coll.partner_id;
    perform public.notify(
        case when auth.uid() = creator_profile then partner_profile else creator_profile end,
        'collaboration_cancel_requested', 'Te proponen cancelar una colaboración', reason,
        case when auth.uid() = creator_profile then '/partner' else '/creator' end || '/collaborations/' || coll.id || '#respuesta'
    );
    return coll;
end;
$$;

create or replace function public.respond_collaboration_cancel(p_collaboration_id uuid, p_accept boolean)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    requester uuid;
    requester_is_creator boolean;
    reason text;
begin
    select * into coll from public.collaborations where id = p_collaboration_id for update;
    if coll.id is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if coll.cancel_requested_at is null or coll.status not in ('accepted', 'in_progress') then
        raise exception 'No hay ninguna propuesta de cancelación pendiente.';
    end if;
    if coll.cancel_requested_by is not distinct from auth.uid() then
        raise exception 'Tiene que responder la otra parte.';
    end if;
    requester := coll.cancel_requested_by;
    reason := coll.cancel_reason;
    requester_is_creator := exists (select 1 from public.creators where id = coll.creator_id and profile_id = requester);

    if p_accept then
        if coll.paid_at is not null then
            raise exception 'Esta colaboración ya está pagada: no se puede cancelar desde aquí.';
        end if;
        update public.collaborations
        set status = 'cancelled', cancelled_at = now(), cancel_requested_at = null, updated_at = now()
        where id = coll.id returning * into coll;
        perform public.collab_event_add(coll.id, 'cancelled', auth.uid(), null, jsonb_build_object('reason', reason));
        perform public.notify(requester, 'collaboration_cancelled', 'Colaboración cancelada',
            'La otra parte ha aceptado cancelar la colaboración.',
            case when requester_is_creator then '/creator' else '/partner' end || '/collaborations/' || coll.id);
    else
        update public.collaborations
        set cancel_requested_by = null, cancel_requested_at = null, cancel_reason = null, updated_at = now()
        where id = coll.id returning * into coll;
        perform public.collab_event_add(coll.id, 'cancel_declined', auth.uid(), null, '{}'::jsonb);
        perform public.notify(requester, 'collaboration_cancel_declined', 'No se cancela la colaboración',
            'La otra parte prefiere seguir adelante con la colaboración.',
            case when requester_is_creator then '/creator' else '/partner' end || '/collaborations/' || coll.id);
    end if;
    return coll;
end;
$$;

create or replace function public.withdraw_collaboration_cancel(p_collaboration_id uuid)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
begin
    select * into coll from public.collaborations where id = p_collaboration_id for update;
    if coll.id is null or coll.cancel_requested_at is null or coll.cancel_requested_by is distinct from auth.uid()
       or coll.status not in ('accepted', 'in_progress') then
        raise exception 'No tienes ninguna propuesta de cancelación pendiente en esta colaboración.';
    end if;
    update public.collaborations
    set cancel_requested_by = null, cancel_requested_at = null, cancel_reason = null, updated_at = now()
    where id = coll.id returning * into coll;
    perform public.collab_event_add(coll.id, 'cancel_withdrawn', auth.uid(), null, '{}'::jsonb);
    return coll;
end;
$$;

revoke execute on function public.request_collaboration_cancel(uuid, text) from public, anon;
revoke execute on function public.respond_collaboration_cancel(uuid, boolean) from public, anon;
revoke execute on function public.withdraw_collaboration_cancel(uuid) from public, anon;
grant execute on function public.request_collaboration_cancel(uuid, text) to authenticated;
grant execute on function public.respond_collaboration_cancel(uuid, boolean) to authenticated;
grant execute on function public.withdraw_collaboration_cancel(uuid) to authenticated;

commit;
