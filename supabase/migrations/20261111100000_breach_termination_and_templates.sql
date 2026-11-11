-- ============================================================================
-- Colaboración: terminar por incumplimiento, y plantillas de propuesta
-- (docs/HOJA_DE_RUTA.md §3.5 y §3.7).
--
-- Qué hace:
--   · terminate_collaboration_for_breach(id, motivo): cualquiera de las dos partes
--     puede dar por terminada una colaboración aceptada o en curso explicando el
--     incumplimiento (20–1000 caracteres). Estado nuevo `terminated`, con quién,
--     cuándo y por qué. Queda en la cronología, avisa a la otra parte y crea una
--     denuncia de tipo `breach` para que el equipo la vea en el panel de admin.
--     No mueve dinero ni toca Stripe. Anula una propuesta de cancelación pendiente.
--   · public.proposal_templates: plantillas reutilizables de propuesta (creador) e
--     invitación (marca). Privadas (RLS por dueño), máximo 15 por tipo.
--
-- Solo añade: el código anterior sigue funcionando sin cambios.
--
-- ROLLBACK (manual; antes, comprobar que no hay colaboraciones `terminated`,
-- eventos `terminated` ni denuncias `breach`):
--   drop table if exists public.proposal_templates;
--   drop function if exists public.proposal_templates_cap();
--   drop function if exists public.terminate_collaboration_for_breach(uuid, text);
--   alter table public.collaborations drop column if exists terminated_by,
--     drop column if exists terminated_at, drop column if exists termination_reason;
--   -- y restaurar collaborations_status_check, reports_reason_check y
--   -- collaboration_events_kind_check sin los valores nuevos.
--
-- ESTADO: APLICADA el 2026-11-11 con el conector de Supabase (sin registrar en
-- supabase_migrations, igual que las anteriores). Probada en la misma transacción
-- con datos reales dentro de un bloque revertido: sin restos.
-- ============================================================================
begin;

alter table public.collaboration_events drop constraint collaboration_events_kind_check;
alter table public.collaboration_events add constraint collaboration_events_kind_check check (kind in (
    'requested', 'accepted', 'declined', 'completed', 'counteroffer', 'deliverable_sent', 'changes_requested',
    'approved', 'deliverable_published', 'rated', 'note', 'deliverables_defined', 'deliverables_confirmed',
    'deliverable_assigned', 'deliverable_unassigned', 'approval_invalidated', 'deliverable_waived',
    'deliverable_accepted_without_approval', 'deliverable_reopened', 'edited_after_publish',
    'file_added', 'file_removed', 'cancel_requested', 'cancel_declined', 'cancel_withdrawn', 'cancelled', 'terminated'
));

alter table public.reports drop constraint reports_reason_check;
alter table public.reports add constraint reports_reason_check
    check (reason in ('spam', 'unrealistic_budget', 'inappropriate', 'other', 'breach'));

alter table public.collaborations
    add column if not exists terminated_by uuid references public.profiles(id) on delete set null,
    add column if not exists terminated_at timestamptz,
    add column if not exists termination_reason text check (termination_reason is null or char_length(termination_reason) <= 1000);

alter table public.collaborations drop constraint collaborations_status_check;
alter table public.collaborations add constraint collaborations_status_check
    check (status in ('requested', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled', 'terminated'));

create or replace function public.terminate_collaboration_for_breach(p_collaboration_id uuid, p_reason text)
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
        raise exception 'Solo se puede dar por terminada una colaboración aceptada o en curso.';
    end if;
    if char_length(reason) < 20 then
        raise exception 'Explica qué se ha incumplido (al menos 20 caracteres).';
    end if;
    if char_length(reason) > 1000 then
        raise exception 'El motivo no puede superar los 1000 caracteres.';
    end if;

    update public.collaborations
    set status = 'terminated', terminated_by = auth.uid(), terminated_at = now(), termination_reason = reason,
        cancel_requested_by = null, cancel_requested_at = null, cancel_reason = null, updated_at = now()
    where id = coll.id returning * into coll;

    perform public.collab_event_add(coll.id, 'terminated', auth.uid(), null, jsonb_build_object('reason', reason));
    -- Queda a la vista del equipo de CIBERAN en el panel de administración (Denuncias).
    insert into public.reports (collaboration_id, reporter_profile_id, reason, detail)
    values (coll.id, auth.uid(), 'breach', reason);

    select profile_id into creator_profile from public.creators where id = coll.creator_id;
    select profile_id into partner_profile from public.partners where id = coll.partner_id;
    perform public.notify(
        case when auth.uid() = creator_profile then partner_profile else creator_profile end,
        'collaboration_terminated', 'Colaboración terminada por incumplimiento', reason,
        case when auth.uid() = creator_profile then '/partner' else '/creator' end || '/collaborations/' || coll.id || '#respuesta'
    );
    return coll;
end;
$$;
revoke execute on function public.terminate_collaboration_for_breach(uuid, text) from public, anon;
grant execute on function public.terminate_collaboration_for_breach(uuid, text) to authenticated;

create table if not exists public.proposal_templates (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
    kind text not null check (kind in ('proposal', 'invite')),
    name text not null check (char_length(trim(name)) between 1 and 80),
    data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 8192),
    created_at timestamptz not null default now(),
    unique (profile_id, kind, name)
);

alter table public.proposal_templates enable row level security;
create policy "proposal_templates_select_own" on public.proposal_templates for select to authenticated
    using (profile_id = (select auth.uid()));
create policy "proposal_templates_insert_own" on public.proposal_templates for insert to authenticated
    with check (profile_id = (select auth.uid()));
create policy "proposal_templates_update_own" on public.proposal_templates for update to authenticated
    using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "proposal_templates_delete_own" on public.proposal_templates for delete to authenticated
    using (profile_id = (select auth.uid()));
revoke all on public.proposal_templates from anon;
revoke all on public.proposal_templates from authenticated;
grant select, delete on public.proposal_templates to authenticated;
grant insert (kind, name, data), update (data) on public.proposal_templates to authenticated;

create or replace function public.proposal_templates_cap()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if (select count(*) from public.proposal_templates where profile_id = new.profile_id and kind = new.kind) >= 15 then
        raise exception 'Ya tienes 15 plantillas. Borra alguna antes de guardar otra.';
    end if;
    return new;
end;
$$;
revoke execute on function public.proposal_templates_cap() from public, anon, authenticated;
create trigger proposal_templates_cap_trg before insert on public.proposal_templates
    for each row execute function public.proposal_templates_cap();

commit;
