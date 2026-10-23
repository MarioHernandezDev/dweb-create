-- ============================================================================
-- FEEDMA — corrige tres enlaces de notificación que quedaron apuntando a
-- `/partner/profile` (pestaña "Colaboraciones", retirada en esta misma
-- sesión tras moverse su contenido a /partner/requests — ver Fase 3 de la
-- reorganización de navegación) o, en un caso, directamente cruzados.
--
-- 1. notify_collaboration_updated(): al marcar una colaboración como
--    completada, el aviso al partner apuntaba a /partner/profile.
-- 2. respond_offer(): al aceptar una oferta de chat y crearse una
--    colaboración cobrable, el aviso "ya puedes pagarla" apuntaba a
--    /partner/profile.
-- 3. submit_collaboration_rating(): BUG PREEXISTENTE, no relacionado con la
--    reorganización — los enlaces estaban cruzados: cuando valoraba el
--    partner, el aviso al CREADOR (el que recibe la valoración) apuntaba a
--    '/partner/profile' (una ruta que un creador no puede ni abrir); cuando
--    valoraba el creador, el aviso al PARTNER apuntaba a '/creator/requests'.
--    Corregido: el enlace de cada aviso apunta siempre a la ruta de QUIEN
--    LO RECIBE (`ratee_profile`), no a la del rol de quien valora.
--
-- Escrita para poder ejecutarse más de una vez sin reventar (misma
-- convención que el resto de migraciones de este proyecto).
-- ============================================================================

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
            '/partner/requests'
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
            case when auth.uid() = creator_profile_id then '/partner/requests' else '/creator/requests' end
        );
    end if;

    return new;
end;
$$;

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
                    'La oferta aceptada ya es una colaboración — puedes pagarla desde tus colaboraciones.', '/partner/requests'
                );
            end if;
        end if;
    else
        perform public.notify(off.from_profile_id, 'offer_declined', 'Oferta rechazada', 'Tu oferta ha sido rechazada.', '/chat/' || off.conversation_id);
    end if;

    return off;
end;
$$;

create or replace function public.submit_collaboration_rating(p_collaboration_id uuid, p_stars integer, p_comment text default null)
returns public.collaboration_ratings
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    coll public.collaborations;
    rater_profile uuid;
    ratee_profile uuid;
    notify_link text;
    result public.collaboration_ratings;
begin
    if p_stars < 1 or p_stars > 5 then
        raise exception 'La valoración tiene que ser de 1 a 5 estrellas.';
    end if;

    select * into coll from public.collaborations where id = p_collaboration_id;
    if coll is null then
        raise exception 'Esta colaboración no existe.';
    end if;
    if coll.status <> 'completed' then
        raise exception 'Solo se puede valorar una colaboración ya completada.';
    end if;

    -- El enlace del aviso es siempre la ruta de QUIEN LO RECIBE
    -- (`ratee_profile`) — antes estaban cruzados: el creador (ratee cuando
    -- valora el partner) recibía un enlace a '/partner/profile', y el
    -- partner (ratee cuando valora el creador) recibía '/creator/requests'.
    if coll.creator_id = public.current_creator_id() then
        select profile_id into rater_profile from public.creators where id = coll.creator_id;
        select profile_id into ratee_profile from public.partners where id = coll.partner_id;
        notify_link := '/partner/requests';
    elsif coll.partner_id = public.current_partner_id() then
        select profile_id into rater_profile from public.partners where id = coll.partner_id;
        select profile_id into ratee_profile from public.creators where id = coll.creator_id;
        notify_link := '/creator/requests';
    else
        raise exception 'No tienes permiso sobre esta colaboración.';
    end if;

    if exists (select 1 from public.collaboration_ratings where collaboration_id = p_collaboration_id and rater_profile_id = me) then
        raise exception 'Ya has valorado esta colaboración.';
    end if;

    insert into public.collaboration_ratings (collaboration_id, rater_profile_id, ratee_profile_id, stars, comment)
    values (p_collaboration_id, rater_profile, ratee_profile, p_stars, nullif(trim(coalesce(p_comment, '')), ''))
    returning * into result;

    perform public.notify(
        ratee_profile, 'rating_received', 'Has recibido una valoración',
        p_stars || ' / 5 estrellas tras completar una colaboración.', notify_link
    );

    return result;
end;
$$;
