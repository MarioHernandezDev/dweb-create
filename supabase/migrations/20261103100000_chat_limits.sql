-- ============================================================================
-- A-R20h — Límites de longitud y de frecuencia en el chat.
--
-- Problema (auditoría A-R20, sección A.3): `send_text_message` y `create_offer`
-- no limitaban ni la longitud del texto ni la frecuencia. Son RPC llamados
-- directamente desde el navegador, así que tampoco pasan por `enforceRateLimit`
-- de Nitro. Un usuario autenticado podía llenar una conversación (y las ofertas
-- las puede abrir cualquiera, también con privacidad restringida).
--
-- Cambio (aprobado por Alex; Mario conforme):
--   * Mensaje de texto: 1–2000 caracteres. Máximo 30 mensajes por minuto y usuario.
--   * Mensaje de una oferta: hasta 500 caracteres. Máximo 20 ofertas por hora y usuario.
--   * Defensa en profundidad: restricciones CHECK `NOT VALID` en `messages.body` y
--     `offers.message` (solo se aplican a filas nuevas; no se revisan las ya
--     existentes, así que no pueden fallar por datos antiguos).
--   * Dos índices para que el recuento de frecuencia sea barato.
-- No cambia ninguna regla de negocio (privacidad, quién responde, mensajes de
-- sistema): solo se añaden rechazos con un mensaje claro. Los mensajes del
-- sistema que insertan otras funciones (`respond_offer`) son cortos y no pasan
-- por estos límites.
--
-- Pruebas:   tests/integration/chat-limits.spec.ts
--            (antes de aplicar deben fallar los de "rechazo"; después, pasar todos)
--
-- ROLLBACK (vuelve a las funciones y estructuras anteriores):
--   begin;
--   alter table public.messages drop constraint if exists messages_body_length;
--   alter table public.offers   drop constraint if exists offers_message_length;
--   drop index if exists public.idx_messages_sender_created;
--   drop index if exists public.idx_offers_from_created;
--   -- y volver a crear send_text_message / create_offer con las definiciones de
--   -- supabase/migrations/20261021160000_chat_packages_offers.sql
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA (la aplica Alex en el SQL Editor).
-- ============================================================================
begin;

create index if not exists idx_messages_sender_created on public.messages (sender_id, created_at desc);
create index if not exists idx_offers_from_created on public.offers (from_profile_id, created_at desc);

alter table public.messages
    add constraint messages_body_length check (body is null or char_length(body) <= 2000) not valid;
alter table public.offers
    add constraint offers_message_length check (message is null or char_length(message) <= 500) not valid;

create or replace function public.send_text_message(p_conversation_id uuid, p_body text)
returns public.messages
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    conv public.conversations;
    other_id uuid;
    other_privacy text;
    inserted public.messages;
begin
    if coalesce(trim(p_body), '') = '' then
        raise exception 'El mensaje no puede estar vacío.';
    end if;
    if char_length(p_body) > 2000 then
        raise exception 'El mensaje es demasiado largo (máximo 2000 caracteres).';
    end if;

    select * into conv from public.conversations where id = p_conversation_id;
    if conv is null or (me <> conv.participant_one_id and me <> conv.participant_two_id) then
        raise exception 'No perteneces a esta conversación.';
    end if;

    -- Frecuencia: 30 mensajes de texto por minuto y usuario.
    if (
        select count(*) from public.messages
        where sender_id = me and kind = 'text' and created_at > now() - interval '1 minute'
    ) >= 30 then
        raise exception 'Estás enviando mensajes demasiado rápido. Espera un momento.';
    end if;

    other_id := case when conv.participant_one_id = me then conv.participant_two_id else conv.participant_one_id end;
    select chat_privacy into other_privacy from public.profiles where id = other_id;

    if other_privacy = 'accepted_offers_only' and not public.has_accepted_offer_between(me, other_id) then
        raise exception 'Este usuario solo recibe mensajes de quien ya tenga una oferta aceptada con él.';
    end if;

    insert into public.messages (conversation_id, sender_id, kind, body)
    values (p_conversation_id, me, 'text', p_body)
    returning * into inserted;

    update public.conversations set last_message_at = inserted.created_at where id = p_conversation_id;

    return inserted;
end;
$$;

grant execute on function public.send_text_message(uuid, text) to authenticated;

create or replace function public.create_offer(p_package_id uuid, p_proposed_price_cents integer, p_message text default null)
returns public.offers
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    pkg public.packages;
    conv_id uuid;
    inserted public.offers;
    sender_name text;
begin
    if p_proposed_price_cents is null or p_proposed_price_cents <= 0 then
        raise exception 'El precio propuesto tiene que ser mayor que 0.';
    end if;
    if p_message is not null and char_length(p_message) > 500 then
        raise exception 'El mensaje de la oferta es demasiado largo (máximo 500 caracteres).';
    end if;

    select * into pkg from public.packages where id = p_package_id and active;
    if pkg is null then
        raise exception 'Ese paquete no existe o ya no está disponible.';
    end if;

    if pkg.profile_id = me then
        raise exception 'No puedes ofertar en tu propio paquete.';
    end if;

    -- Frecuencia: 20 ofertas por hora y usuario.
    if (
        select count(*) from public.offers
        where from_profile_id = me and created_at > now() - interval '1 hour'
    ) >= 20 then
        raise exception 'Has enviado demasiadas ofertas en poco tiempo. Inténtalo más tarde.';
    end if;

    conv_id := public._get_or_create_conversation(me, pkg.profile_id);

    insert into public.offers (package_id, conversation_id, from_profile_id, to_profile_id, proposed_price_cents, message)
    values (p_package_id, conv_id, me, pkg.profile_id, p_proposed_price_cents, p_message)
    returning * into inserted;

    insert into public.messages (conversation_id, sender_id, kind, body, offer_id)
    values (conv_id, me, 'offer', p_message, inserted.id);

    update public.conversations set last_message_at = inserted.created_at where id = conv_id;

    select coalesce(full_name, 'Alguien') into sender_name from public.profiles where id = me;
    perform public.notify(pkg.profile_id, 'offer_received', 'Nueva oferta recibida', coalesce(sender_name, 'Alguien') || ' te ha hecho una oferta sobre "' || pkg.title || '".', '/chat/' || conv_id);

    return inserted;
end;
$$;

grant execute on function public.create_offer(uuid, integer, text) to authenticated;

commit;
