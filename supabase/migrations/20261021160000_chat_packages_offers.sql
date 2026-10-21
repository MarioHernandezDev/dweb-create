-- ============================================================================
-- FEEDMA — Chat entre perfiles, paquetes y ofertas.
--
-- Hasta ahora `notifications` era de un solo sentido (el sistema avisa, nunca
-- el usuario escribe) y no existía ningún catálogo de "paquetes" (lo que un
-- creador ofrece o lo que un partner necesita). Esta migración añade las dos
-- piezas y las conecta:
--
-- 1. `packages` — catálogo de un perfil, da igual el rol: un creador publica
--    lo que hace ("1 Reel + 3 Stories"), un partner publica lo que necesita
--    ("busco 2 Reels de lanzamiento, presupuesto 500€"). Mismo modelo de
--    datos para los dos — el copy de la UI decide cómo se presenta.
-- 2. `conversations`/`messages` — chat 1 a 1 entre dos profiles.
-- 3. `offers` — una oferta SIEMPRE referencia un paquete real existente del
--    destinatario (no se pueden inventar ofertas sobre paquetes que no
--    existen), con un precio propuesto negociable y un mensaje opcional.
--
-- Decisión de diseño clave: casi todas las escrituras de chat/ofertas pasan
-- por funciones `security definer` (como ya hace `public.notify()` o
-- `approve_post()`), no por policies de insert para "authenticated". Esto es
-- lo que de verdad impide "inventar" una oferta o un mensaje de sistema: la
-- única puerta de entrada es una función que ya ha validado todo.
--
-- Mandar una OFERTA nunca está bloqueado por la configuración de privacidad
-- de chat del destinatario — es precisamente el mecanismo para desbloquear el
-- chat de texto libre con alguien restrictivo. Lo que esa configuración
-- bloquea es el mensaje de texto libre (`send_text_message`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. profiles: privacidad de chat + lectura pública (nombre/avatar/privacidad
--    no son datos sensibles — ya es lo mismo que `creators`/`partners`).
-- ----------------------------------------------------------------------------
alter table public.profiles
    add column if not exists chat_privacy text not null default 'everyone'
    check (chat_privacy in ('everyone', 'accepted_offers_only'));

create policy "profiles_select_public_directory" on public.profiles for select
    to authenticated using (true);

-- ----------------------------------------------------------------------------
-- 1. PACKAGES
-- ----------------------------------------------------------------------------
create table public.packages (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text,
    price_cents integer not null check (price_cents > 0),
    deliverables text[] not null default '{}'::text[],
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_packages_profile_id on public.packages(profile_id);

alter table public.packages enable row level security;

create policy "packages_select_active_or_own" on public.packages for select
    to authenticated using (active or profile_id = auth.uid());

create policy "packages_insert_own" on public.packages for insert
    with check (profile_id = auth.uid());

create policy "packages_update_own" on public.packages for update
    using (profile_id = auth.uid());

create policy "packages_delete_own" on public.packages for delete
    using (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. CONVERSATIONS / MESSAGES
--
-- `participant_one_id` siempre guarda el uuid menor del par (lo normaliza
-- `_get_or_create_conversation`, nunca el cliente) — así `unique` sobre el
-- par funciona sin importar quién inició el chat.
-- ----------------------------------------------------------------------------
create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    participant_one_id uuid not null references public.profiles(id) on delete cascade,
    participant_two_id uuid not null references public.profiles(id) on delete cascade,
    participant_one_last_read_at timestamptz,
    participant_two_last_read_at timestamptz,
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    constraint conversations_distinct_participants check (participant_one_id <> participant_two_id),
    constraint conversations_unique_pair unique (participant_one_id, participant_two_id)
);

create index idx_conversations_participant_one on public.conversations(participant_one_id);
create index idx_conversations_participant_two on public.conversations(participant_two_id);

alter table public.conversations enable row level security;

-- Solo select para "authenticated" — crear/actualizar una conversación pasa
-- siempre por las funciones de la sección 4, nunca por insert/update directo.
create policy "conversations_select_participant" on public.conversations for select
    using (auth.uid() = participant_one_id or auth.uid() = participant_two_id);

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid references public.profiles(id) on delete set null,
    kind text not null default 'text' check (kind in ('text', 'system', 'offer')),
    body text,
    offer_id uuid,
    created_at timestamptz not null default now()
);

create index idx_messages_conversation_id on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

-- Solo select — todo insert pasa por send_text_message/create_offer/respond_offer.
create policy "messages_select_participant" on public.messages for select
    using (
        exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id
            and (auth.uid() = c.participant_one_id or auth.uid() = c.participant_two_id)
        )
    );

-- ----------------------------------------------------------------------------
-- 3. OFFERS
-- ----------------------------------------------------------------------------
create table public.offers (
    id uuid primary key default gen_random_uuid(),
    package_id uuid not null references public.packages(id) on delete cascade,
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    from_profile_id uuid not null references public.profiles(id) on delete cascade,
    to_profile_id uuid not null references public.profiles(id) on delete cascade,
    proposed_price_cents integer not null check (proposed_price_cents > 0),
    message text,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    responded_at timestamptz,
    created_at timestamptz not null default now(),
    constraint offers_distinct_profiles check (from_profile_id <> to_profile_id)
);

create index idx_offers_conversation_id on public.offers(conversation_id);
create index idx_offers_to_profile_id on public.offers(to_profile_id);

alter table public.offers enable row level security;

-- Solo select — todo insert/update pasa por create_offer/respond_offer.
create policy "offers_select_parties" on public.offers for select
    using (auth.uid() = from_profile_id or auth.uid() = to_profile_id);

alter table public.messages add constraint messages_offer_id_fkey
    foreign key (offer_id) references public.offers(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 4. FUNCIONES security definer
-- ----------------------------------------------------------------------------

-- Normaliza el par y crea la conversación si no existe, SIN comprobar
-- privacidad — interna, la usan las dos funciones públicas de abajo.
create or replace function public._get_or_create_conversation(a uuid, b uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
    lo uuid := least(a, b);
    hi uuid := greatest(a, b);
    conv_id uuid;
begin
    insert into public.conversations (participant_one_id, participant_two_id)
    values (lo, hi)
    on conflict (participant_one_id, participant_two_id) do nothing;

    select id into conv_id from public.conversations
    where participant_one_id = lo and participant_two_id = hi;

    return conv_id;
end;
$$;

-- ¿Existe alguna oferta aceptada entre estos dos profiles, en cualquier
-- dirección? Es la llave que desbloquea el chat de texto libre con alguien
-- que solo acepta mensajes "tras oferta aceptada".
create or replace function public.has_accepted_offer_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.offers
        where status = 'accepted'
        and ((from_profile_id = a and to_profile_id = b) or (from_profile_id = b and to_profile_id = a))
    );
$$;

-- "Iniciar chat" desde el perfil de alguien. Si esa persona restringe su
-- chat a "solo tras oferta aceptada" y no hay ninguna entre los dos, no se
-- abre — hay que mandarle una oferta primero (create_offer sí la abre).
create or replace function public.get_or_create_conversation(target_profile_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    target_privacy text;
begin
    if me is null or target_profile_id is null or me = target_profile_id then
        raise exception 'Destinatario inválido.';
    end if;

    select chat_privacy into target_privacy from public.profiles where id = target_profile_id;
    if target_privacy is null then
        raise exception 'Ese perfil no existe.';
    end if;

    if target_privacy = 'accepted_offers_only' and not public.has_accepted_offer_between(me, target_profile_id) then
        raise exception 'Este usuario solo recibe mensajes de quien ya tenga una oferta aceptada con él.';
    end if;

    return public._get_or_create_conversation(me, target_profile_id);
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- Envío de texto libre: respeta la privacidad del OTRO participante.
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

    select * into conv from public.conversations where id = p_conversation_id;
    if conv is null or (me <> conv.participant_one_id and me <> conv.participant_two_id) then
        raise exception 'No perteneces a esta conversación.';
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

-- Hacer una oferta sobre un paquete — SIEMPRE sobre un paquete real y activo
-- del destinatario (`package.profile_id` manda quién es `to_profile_id`, no
-- lo decide el cliente). Abre/reutiliza la conversación sin mirar privacidad.
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

    select * into pkg from public.packages where id = p_package_id and active;
    if pkg is null then
        raise exception 'Ese paquete no existe o ya no está disponible.';
    end if;

    if pkg.profile_id = me then
        raise exception 'No puedes ofertar en tu propio paquete.';
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

-- Aceptar/rechazar una oferta. Al aceptar, deja el mensaje de sistema con el
-- precio acordado — el chat "se abre" formalmente entre las dos partes.
create or replace function public.respond_offer(p_offer_id uuid, p_accept boolean)
returns public.offers
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    off public.offers;
    new_status text := case when p_accept then 'accepted' else 'declined' end;
    price_label text;
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
    else
        perform public.notify(off.from_profile_id, 'offer_declined', 'Oferta rechazada', 'Tu oferta ha sido rechazada.', '/chat/' || off.conversation_id);
    end if;

    return off;
end;
$$;

grant execute on function public.respond_offer(uuid, boolean) to authenticated;

-- Marcar conversación como leída (actualiza la columna que corresponda).
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    conv public.conversations;
begin
    select * into conv from public.conversations where id = p_conversation_id;
    if conv is null or (me <> conv.participant_one_id and me <> conv.participant_two_id) then
        raise exception 'No perteneces a esta conversación.';
    end if;

    if conv.participant_one_id = me then
        update public.conversations set participant_one_last_read_at = now() where id = p_conversation_id;
    else
        update public.conversations set participant_two_last_read_at = now() where id = p_conversation_id;
    end if;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Contador de no-leídos para el badge del icono de chat en TopBar.vue —
-- mismo rol que `unreadCount` de useNotifications.ts.
create or replace function public.my_chat_unread_count()
returns integer
language sql stable security definer set search_path = public
as $$
    select count(*)::int from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where (c.participant_one_id = auth.uid() or c.participant_two_id = auth.uid())
    and m.sender_id is distinct from auth.uid()
    and m.created_at > coalesce(
        case when c.participant_one_id = auth.uid() then c.participant_one_last_read_at else c.participant_two_last_read_at end,
        'epoch'::timestamptz
    );
$$;

grant execute on function public.my_chat_unread_count() to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Realtime — mismo proyecto Supabase ya en uso, sin coste aparte. RLS se
--    sigue aplicando por suscriptor, así que cada cliente solo recibe sus
--    propias filas sin necesidad de filtros en el canal.
-- ----------------------------------------------------------------------------
alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.offers replica identity full;

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.offers;
