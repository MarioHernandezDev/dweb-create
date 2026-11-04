-- ============================================================================
-- Flujo de colaboraciones · Fase 1 (docs/audit/08_COLLABORATION_FLOW_AUDIT.md):
-- defectos confirmados que no dependen de ninguna decisión de producto.
--
--   C-04  La marca no recibía ningún aviso cuando el creador enviaba (o
--         reenviaba) una entrega a revisión: pasar a `ready_for_review` es un
--         update directo del creador sin trigger. Nuevo trigger
--         `on_post_review_requested`: avisa a la marca SOLO en la transición
--         (un update repetido al mismo estado no vuelve a avisar), solo para
--         publicaciones de una colaboración aceptada o en curso, y distingue
--         primer envío de reenvío tras cambios pedidos.
--   C-05  (F-02) Al aceptar una oferta del chat, `notify_collaboration_created`
--         avisaba al creador de una "Nueva solicitud de colaboración" que él
--         mismo acababa de aceptar. Las colaboraciones nacidas de una oferta ya
--         tienen sus avisos en `respond_offer`: aquí se saltan.
--   C-11  Los avisos de colaboración llevaban a la lista (`/…/requests`). Ahora
--         llevan a la colaboración concreta (`?collaboration=<id>`); las
--         páginas siguen aceptando la URL sin parámetro.
--   C-14  `notify_collaboration_updated` avisaba SIEMPRE al partner al aceptar
--         o rechazar una solicitud, también cuando quien aceptaba era el propio
--         partner (solicitud iniciada por el creador): el creador no se
--         enteraba. Ahora avisa a la otra parte (quien no hizo la acción).
--   C-09  `accept_collaboration_request`, `decline_collaboration_request` y
--         `mark_collaboration_completed` leían el estado y luego actualizaban
--         sin volver a comprobarlo: aceptar y rechazar a la vez podían pisarse.
--         El update exige ahora el estado de partida (mismo patrón que
--         `approve_post`) y si otra acción se adelantó, falla con el mismo error.
--
-- No toca pagos: `budget_cents`, `paid_at` y `stripe_*` no cambian; ni
-- `respond_offer` ni `submit_collaboration_rating` (sus enlaces se revisarán
-- en las fases 2 y 6, donde se redefinen igualmente).
--
-- Pruebas: tests/integration/collaboration-flow-phase1.spec.ts (contra Supabase
--          local), notification-links.spec.ts actualizado, y recorrido en navegador.
--
-- ROLLBACK:
--   begin;
--   drop trigger if exists on_post_review_requested on public.posts;
--   drop function if exists public.notify_post_review_requested();
--   -- y volver a ejecutar las definiciones anteriores de:
--   --   notify_collaboration_created            → 20261021150000_discovery_bidireccional.sql
--   --   notify_collaboration_updated            → 20261025190000_fix_notification_links.sql
--   --   notify_collaboration_offer_created      → 20261021140000_collaboration_offers_and_reports.sql
--   --   notify_collaboration_log_entry_created  → 20261025170000_collaboration_log.sql
--   --   accept/decline_collaboration_request, mark_collaboration_completed
--   --                                           → 20261025090000_phase1_security_payments.sql
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido (aplicada y probada
-- en el Supabase local).
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- C-04 · Aviso a la marca al enviar o reenviar una entrega a revisión.
-- ---------------------------------------------------------------------------
create or replace function public.notify_post_review_requested()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    partner_profile_id uuid;
    creator_name text;
    is_resubmission boolean;
begin
    if new.collaboration_id is null or new.status <> 'ready_for_review' then
        return new;
    end if;
    -- Solo en la transición: un update que ya partía de "Para revisar" no avisa otra vez.
    if tg_op = 'UPDATE' and old.status = 'ready_for_review' then
        return new;
    end if;

    select * into coll from public.collaborations where id = new.collaboration_id;
    if coll.id is null or coll.status not in ('accepted', 'in_progress') then
        return new;
    end if;

    select profile_id into partner_profile_id from public.partners where id = coll.partner_id;
    select display_name into creator_name from public.creators where id = new.creator_id;
    is_resubmission := exists (
        select 1 from public.post_revision_notes where post_id = new.id and kind = 'changes_requested'
    );

    perform public.notify(
        partner_profile_id,
        'post_review_requested',
        case when is_resubmission then 'Nueva versión para revisar' else 'Entrega para revisar' end,
        coalesce(creator_name, 'El creador')
            || case when is_resubmission then ' ha corregido «' else ' ha enviado «' end
            || new.title || '» a revisión.',
        '/partner/requests?collaboration=' || coll.id || '&post=' || new.id
    );
    return new;
end;
$$;
revoke execute on function public.notify_post_review_requested() from public, anon, authenticated;

drop trigger if exists on_post_review_requested on public.posts;
create trigger on_post_review_requested
    after insert or update of status on public.posts
    for each row execute function public.notify_post_review_requested();

-- ---------------------------------------------------------------------------
-- C-05 + C-11 · Alta de colaboración.
-- ---------------------------------------------------------------------------
create or replace function public.notify_collaboration_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    partner_name text;
    creator_name text;
    target_profile_id uuid;
begin
    -- Nacida de una oferta aceptada en el chat: `respond_offer` ya avisa a las dos partes.
    if new.offer_id is not null then
        return new;
    end if;

    if new.initiated_by = 'creator' then
        select profile_id, company_name into target_profile_id, partner_name from public.partners where id = new.partner_id;
        select display_name into creator_name from public.creators where id = new.creator_id;
        perform public.notify(target_profile_id, 'collaboration_requested', 'Nueva propuesta de colaboración', coalesce(creator_name, 'Un creador de contenido') || ' quiere colaborar contigo.', '/partner/requests?collaboration=' || new.id);
    else
        select profile_id into target_profile_id from public.creators where id = new.creator_id;
        select company_name into partner_name from public.partners where id = new.partner_id;
        perform public.notify(target_profile_id, 'collaboration_requested', 'Nueva solicitud de colaboración', coalesce(partner_name, 'Un partner') || ' quiere colaborar contigo.', '/creator/requests?collaboration=' || new.id);
    end if;
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- C-14 + C-11 · Cambios de estado de la colaboración.
-- ---------------------------------------------------------------------------
create or replace function public.notify_collaboration_updated()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    partner_profile_id uuid;
    creator_profile_id uuid;
    target_profile_id uuid;
    target_is_creator boolean;
begin
    if new.status is distinct from old.status and old.status = 'requested' and new.status in ('accepted', 'declined') then
        select profile_id into creator_profile_id from public.creators where id = new.creator_id;
        select profile_id into partner_profile_id from public.partners where id = new.partner_id;
        -- Se avisa a quien NO hizo la acción. Sin sesión (service_role), a quien inició la solicitud.
        target_is_creator := case
            when auth.uid() is null then new.initiated_by = 'creator'
            else auth.uid() is distinct from creator_profile_id
        end;
        target_profile_id := case when target_is_creator then creator_profile_id else partner_profile_id end;
        perform public.notify(
            target_profile_id,
            'collaboration_' || new.status,
            case when new.status = 'accepted' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
            case when new.status = 'accepted' then 'Tu colaboración ha sido aceptada.' else 'Tu colaboración ha sido rechazada.' end,
            case when target_is_creator then '/creator/requests' else '/partner/requests' end || '?collaboration=' || new.id
        );
    end if;

    if new.status is distinct from old.status and new.status = 'completed' then
        select profile_id into creator_profile_id from public.creators where id = new.creator_id;
        select profile_id into partner_profile_id from public.partners where id = new.partner_id;
        target_profile_id := case when auth.uid() = creator_profile_id then partner_profile_id else creator_profile_id end;
        perform public.notify(
            target_profile_id,
            'collaboration_completed',
            'Colaboración completada',
            'Se ha marcado la colaboración como completada.',
            case when auth.uid() = creator_profile_id then '/partner/requests' else '/creator/requests' end || '?collaboration=' || new.id
        );
    end if;

    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- C-11 · Contraofertas y apuntes del registro: enlace a la colaboración.
-- ---------------------------------------------------------------------------
create or replace function public.notify_collaboration_offer_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    target_profile_id uuid;
    target_link text;
    proposer_name text;
begin
    if new.proposed_by = 'creator' then
        select p.profile_id, cr.display_name into target_profile_id, proposer_name
        from public.collaborations c
        join public.partners p on p.id = c.partner_id
        join public.creators cr on cr.id = c.creator_id
        where c.id = new.collaboration_id;
        target_link := '/partner/requests?collaboration=' || new.collaboration_id;
    else
        select cr.profile_id, p.company_name into target_profile_id, proposer_name
        from public.collaborations c
        join public.creators cr on cr.id = c.creator_id
        join public.partners p on p.id = c.partner_id
        where c.id = new.collaboration_id;
        target_link := '/creator/requests?collaboration=' || new.collaboration_id;
    end if;

    perform public.notify(
        target_profile_id,
        'collaboration_countered',
        'Nueva contraoferta',
        coalesce(proposer_name, 'La otra parte') || ' ha propuesto un nuevo presupuesto.',
        target_link
    );
    return new;
end;
$$;

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
            case when new.author_profile_id = creator_profile_id then '/partner/requests' else '/creator/requests' end || '?collaboration=' || new.collaboration_id
        );
    end if;
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- C-09 · Transiciones atómicas (el update exige el estado de partida).
-- ---------------------------------------------------------------------------
create or replace function public.accept_collaboration_request(p_collaboration_id uuid, p_agreed_budget_cents integer default null)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    valid_amount boolean;
begin
    select * into coll from public.collaborations where id = p_collaboration_id;
    if coll is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if coll.status <> 'requested' then
        raise exception 'Esta colaboración ya no está pendiente.';
    end if;
    if p_agreed_budget_cents is not null then
        valid_amount := p_agreed_budget_cents = coll.budget_cents
            or exists (
                select 1 from public.collaboration_offers
                where collaboration_id = p_collaboration_id and budget_cents = p_agreed_budget_cents
            );
        if not valid_amount then
            raise exception 'Ese importe no coincide con ninguna propuesta real de esta negociación.';
        end if;
    end if;
    update public.collaborations
    set status = 'accepted',
        budget_cents = coalesce(p_agreed_budget_cents, budget_cents),
        updated_at = now()
    where id = p_collaboration_id and status = 'requested'
    returning * into coll;
    if not found then
        raise exception 'Esta colaboración ya no está pendiente.';
    end if;
    return coll;
end;
$$;

create or replace function public.decline_collaboration_request(p_collaboration_id uuid)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
begin
    select * into coll from public.collaborations where id = p_collaboration_id;
    if coll is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if coll.status <> 'requested' then
        raise exception 'Esta colaboración ya no está pendiente.';
    end if;
    update public.collaborations set status = 'declined', updated_at = now()
    where id = p_collaboration_id and status = 'requested'
    returning * into coll;
    if not found then
        raise exception 'Esta colaboración ya no está pendiente.';
    end if;
    return coll;
end;
$$;

create or replace function public.mark_collaboration_completed(p_collaboration_id uuid)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
begin
    select * into coll from public.collaborations where id = p_collaboration_id;
    if coll is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if coll.status not in ('accepted', 'in_progress') then
        raise exception 'Solo se puede completar una colaboración aceptada o en curso.';
    end if;
    update public.collaborations set status = 'completed', updated_at = now()
    where id = p_collaboration_id and status in ('accepted', 'in_progress')
    returning * into coll;
    if not found then
        raise exception 'Solo se puede completar una colaboración aceptada o en curso.';
    end if;
    return coll;
end;
$$;

commit;
