-- ============================================================================
-- FEEDMA — "registro de incidencias y cambios acordados": distinto de
-- `reports` (20261021140000), que es un aviso CONFIDENCIAL al admin (spam,
-- presupuesto poco serio) sin visibilidad para la otra parte. Esto es un
-- historial COMPARTIDO entre las dos partes de una colaboración — algo
-- salió mal (incidencia) o acordaron algo por otro medio (llamada, chat) y
-- quieren dejarlo por escrito (cambio acordado). Puramente informativo: una
-- entrada "cambio acordado" no mueve ninguna fecha ni cambia ningún dato de
-- la colaboración por sí sola — es solo constancia escrita.
--
-- Append-only, mismo criterio que post_revision_notes/collaboration_offers:
-- sin policy de update/delete para el cliente. A diferencia de las 4
-- columnas de "condiciones pactadas" (20261025150000, que SÍ llevan un
-- trigger porque esas columnas se actualizan legítimamente por otras vías),
-- aquí no hay ningún update/delete legítimo de ninguna fila entera, así que
-- la ausencia de policy ya es protección completa para "authenticated". Se
-- deja a propósito que `service_role` sí pueda borrar vía cascada si se
-- borra la colaboración entera (igual que post_revision_notes) — necesario
-- para que la limpieza de datos de prueba siga funcionando.
--
-- Escrita para poder ejecutarse más de una vez sin reventar (misma
-- convención que el resto de migraciones de este proyecto).
-- ============================================================================

drop table if exists public.collaboration_log_entries cascade;

create table public.collaboration_log_entries (
    id uuid primary key default gen_random_uuid(),
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    author_profile_id uuid not null references public.profiles(id) on delete cascade,
    kind text not null check (kind in ('incident', 'agreed_change')),
    detail text not null check (char_length(detail) <= 1000) check (char_length(trim(detail)) > 0),
    -- Contador real de inserción (no decorativo): `created_at` puede
    -- coincidir entre dos filas si se insertan muy rápido (tests
    -- automatizados) — `seq` es el segundo criterio de orden, estable de
    -- verdad, a diferencia de `id` (uuid aleatorio, no refleja inserción).
    seq bigint generated always as identity,
    created_at timestamptz not null default now()
);

create index idx_collaboration_log_entries_collaboration_id on public.collaboration_log_entries(collaboration_id, created_at, seq);

alter table public.collaboration_log_entries enable row level security;

create policy "collaboration_log_entries_select_parties" on public.collaboration_log_entries for select
    using (
        exists (
            select 1 from public.collaborations c
            where c.id = collaboration_log_entries.collaboration_id
            and (c.creator_id = public.current_creator_id() or c.partner_id = public.current_partner_id())
        )
    );

-- Nadie puede suplantar `author_profile_id` (tiene que ser literalmente
-- quien hace la petición) ni asociar una entrada a una colaboración de la
-- que no forma parte. Sin RPC: a diferencia de post_revision_notes, no hay
-- ninguna transición de estado que proteger atómicamente, un `with check`
-- directo es suficiente y más simple.
create policy "collaboration_log_entries_insert_parties" on public.collaboration_log_entries for insert
    with check (
        author_profile_id = auth.uid()
        and exists (
            select 1 from public.collaborations c
            where c.id = collaboration_log_entries.collaboration_id
            and (c.creator_id = public.current_creator_id() or c.partner_id = public.current_partner_id())
        )
    );

-- ----------------------------------------------------------------------------
-- Aviso EXCLUSIVO a la otra parte, nunca a quien escribe — una sola llamada
-- a notify() por insert, nunca duplicada. Mismo patrón que
-- notify_collaboration_offer_created (20261021140000).
-- ----------------------------------------------------------------------------
create or replace function public.notify_collaboration_log_entry_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    creator_profile_id uuid;
    partner_profile_id uuid;
    target_profile_id uuid;
begin
    select * into coll from public.collaborations where id = new.collaboration_id;
    select profile_id into creator_profile_id from public.creators where id = coll.creator_id;
    select profile_id into partner_profile_id from public.partners where id = coll.partner_id;

    target_profile_id := case when new.author_profile_id = creator_profile_id then partner_profile_id else creator_profile_id end;

    if target_profile_id is not null and target_profile_id is distinct from new.author_profile_id then
        perform public.notify(
            target_profile_id,
            case when new.kind = 'incident' then 'collaboration_incident_logged' else 'collaboration_change_logged' end,
            case when new.kind = 'incident' then 'Incidencia registrada' else 'Cambio acordado registrado' end,
            new.detail,
            case when new.author_profile_id = creator_profile_id then '/partner/requests' else '/creator/requests' end
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_collaboration_log_entry on public.collaboration_log_entries;

create trigger trg_notify_collaboration_log_entry
    after insert on public.collaboration_log_entries
    for each row execute function public.notify_collaboration_log_entry_created();
