-- ============================================================================
-- FEEDMA — Fase 1 de la implementación de la auditoría: seguridad y dinero.
--
-- Cierra el hallazgo más grave de la auditoría (docs internos, no en este
-- repo): una oferta aceptada por chat (`respond_offer`) nunca creaba ni
-- actualizaba una fila en `collaborations`, que es la única tabla que sabe
-- cobrar (`server/api/stripe/pay-collaboration.post.ts`). Resultado: se
-- podía negociar y "cerrar" un trato entero por chat que nunca se podía
-- cobrar. También cierra un segundo hueco menos visible pero igual de real:
-- `collaborations_update_involved_parties` dejaba que cualquiera de las dos
-- partes reescribiera `budget_cents`/`status` a lo que quisiera con un
-- update directo — ni la cantidad ni el estado se validaban en el servidor.
--
-- Escrita para poder ejecutarse más de una vez sin reventar (misma
-- convención que el resto de migraciones de este proyecto).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. `collaborations.offer_id` — cuando una colaboración nace de una oferta
--    de chat aceptada, queda enlazada a esa oferta. `unique` (NULLs no
--    cuentan como duplicados en Postgres) es lo que hace world-safe el
--    `on conflict (offer_id) do nothing` de `respond_offer`: si por lo que
--    sea se llamara dos veces, nunca se duplica la colaboración.
-- ----------------------------------------------------------------------------
alter table public.collaborations add column if not exists offer_id uuid references public.offers(id) on delete set null;

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'collaborations_offer_id_unique'
    ) then
        alter table public.collaborations add constraint collaborations_offer_id_unique unique (offer_id);
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Cierra el update directo desde el cliente. A partir de aquí, cambiar
--    `collaborations` (aceptar, rechazar, marcar completada) pasa SIEMPRE
--    por una función `security definer` que valida de verdad quién eres,
--    en qué estado está la colaboración y si el importe que propones es uno
--    que de verdad se negoció (no uno inventado en el momento). El webhook
--    de Stripe sigue pudiendo escribir `paid_at`/`stripe_payment_intent_id`
--    porque usa la service_role, que no pasa por RLS.
-- ----------------------------------------------------------------------------
drop policy if exists "collaborations_update_involved_parties" on public.collaborations;

-- ----------------------------------------------------------------------------
-- 3. Aceptar/rechazar una solicitud de colaboración (el flujo de Descubrir +
--    NegotiationPanel.vue). El importe que se acepta tiene que ser EXACTAMENTE
--    la propuesta inicial o una contraoferta real ya registrada en
--    `collaboration_offers` — nunca un número que el cliente se haya
--    inventado en la petición.
-- ----------------------------------------------------------------------------
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
    where id = p_collaboration_id
    returning * into coll;

    return coll;
end;
$$;

grant execute on function public.accept_collaboration_request(uuid, integer) to authenticated;

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

    update public.collaborations set status = 'declined', updated_at = now() where id = p_collaboration_id
    returning * into coll;

    return coll;
end;
$$;

grant execute on function public.decline_collaboration_request(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Estado de entrega: una colaboración aceptada (o en curso) se puede
--    marcar como completada por cualquiera de las dos partes — hasta ahora
--    'in_progress'/'completed' existían en el esquema pero ningún camino de
--    código los escribía nunca.
-- ----------------------------------------------------------------------------
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

    update public.collaborations set status = 'completed', updated_at = now() where id = p_collaboration_id
    returning * into coll;

    return coll;
end;
$$;

grant execute on function public.mark_collaboration_completed(uuid) to authenticated;

-- Avisa a la otra parte cuando se marca como completada (redefinición
-- idempotente — añade la rama 'completed' a la que ya existía para
-- aceptada/rechazada, sin tocar esa).
create or replace function public.notify_collaboration_updated()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    partner_profile_id uuid;
    creator_profile_id uuid;
    target_profile_id uuid;
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

    if new.status is distinct from old.status and new.status = 'completed' then
        select profile_id into creator_profile_id from public.creators where id = new.creator_id;
        select profile_id into partner_profile_id from public.partners where id = new.partner_id;
        target_profile_id := case when auth.uid() = creator_profile_id then partner_profile_id else creator_profile_id end;
        perform public.notify(
            target_profile_id,
            'collaboration_completed',
            'Colaboración completada',
            'Se ha marcado la colaboración como completada.',
            case when auth.uid() = creator_profile_id then '/partner/profile' else '/creator/requests' end
        );
    end if;

    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. El fix cardinal: aceptar una oferta de chat ahora crea/actualiza una
--    colaboración cobrable. Solo cuando las dos partes implicadas son, de
--    verdad, un creador y un partner (un creador puede tener packages y
--    ofertar sobre los de otro creador — eso no es un trato que FEEDMA sepa
--    cobrar, y no se inventa una colaboración falsa para ese caso).
-- ----------------------------------------------------------------------------
create or replace function public.respond_offer(p_offer_id uuid, p_accept boolean)
returns public.offers
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    off public.offers;
    new_status text := case when p_accept then 'accepted' else 'declined' end;
    price_label text;
    from_creator_id uuid;
    from_partner_id uuid;
    to_creator_id uuid;
    to_partner_id uuid;
    resolved_creator_id uuid;
    resolved_partner_id uuid;
    resolved_initiated_by text;
    partner_profile_id uuid;
    pkg_title text;
    new_collab_id uuid;
begin
    select * into off from public.offers where id = p_offer_id and to_profile_id = me and status = 'pending';
    if off is null then
        raise exception 'Esta oferta no existe o ya no está pendiente.';
    end if;

    update public.offers set status = new_status, responded_at = now() where id = p_offer_id
    returning * into off;

    if p_accept then
        price_label := to_char(off.proposed_price_cents / 100.0, 'FM999999990.00') || ' €';
        insert into public.messages (conversation_id, sender_id, kind, body, offer_id)
        values (off.conversation_id, null, 'system', 'Oferta aceptada. Precio acordado: ' || price_label, off.id);
        update public.conversations set last_message_at = now() where id = off.conversation_id;
        perform public.notify(off.from_profile_id, 'offer_accepted', 'Oferta aceptada', 'Tu oferta de ' || price_label || ' ha sido aceptada.', '/chat/' || off.conversation_id);

        -- ¿Son un creador y un partner, en cualquier dirección? Solo ahí
        -- existe un camino real para cobrar (collaborations exige exactamente
        -- un creator_id y un partner_id).
        select id into from_creator_id from public.creators where profile_id = off.from_profile_id;
        select id into from_partner_id from public.partners where profile_id = off.from_profile_id;
        select id into to_creator_id from public.creators where profile_id = off.to_profile_id;
        select id into to_partner_id from public.partners where profile_id = off.to_profile_id;

        if from_creator_id is not null and to_partner_id is not null then
            resolved_creator_id := from_creator_id;
            resolved_partner_id := to_partner_id;
            resolved_initiated_by := 'creator';
            partner_profile_id := off.to_profile_id;
        elsif from_partner_id is not null and to_creator_id is not null then
            resolved_creator_id := to_creator_id;
            resolved_partner_id := from_partner_id;
            resolved_initiated_by := 'partner';
            partner_profile_id := off.from_profile_id;
        end if;

        if resolved_creator_id is not null and resolved_partner_id is not null then
            select title into pkg_title from public.packages where id = off.package_id;

            insert into public.collaborations (creator_id, partner_id, status, brief, budget_cents, initiated_by, offer_id)
            values (
                resolved_creator_id, resolved_partner_id, 'accepted',
                coalesce('Oferta aceptada por chat: ' || pkg_title, 'Oferta aceptada por chat'),
                off.proposed_price_cents, resolved_initiated_by, off.id
            )
            on conflict (offer_id) do nothing
            returning id into new_collab_id;

            if new_collab_id is not null and partner_profile_id is not null then
                perform public.notify(
                    partner_profile_id, 'collaboration_requested', 'Colaboración lista para pagar',
                    'La oferta aceptada ya es una colaboración — puedes pagarla desde tu perfil.', '/partner/profile'
                );
            end if;
        end if;
    else
        perform public.notify(off.from_profile_id, 'offer_declined', 'Oferta rechazada', 'Tu oferta ha sido rechazada.', '/chat/' || off.conversation_id);
    end if;

    return off;
end;
$$;

grant execute on function public.respond_offer(uuid, boolean) to authenticated;
