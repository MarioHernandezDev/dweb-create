-- ============================================================================
-- Flujo de colaboraciones · Fase 2 (1/3) — Entregables como datos
-- (docs/audit/10_FASE2_PROPUESTA_ENTREGABLES.md §1, §2, §4, §5; decisiones D1, D4)
--
--   1. Instantánea del paquete EN LA OFERTA (`offers.package_description` y
--      `offers.package_deliverables`, escritas por `create_offer`): lo contratado es
--      lo que la oferta mostraba, no lo que el paquete diga el día que se acepta.
--      `respond_offer` copia de la oferta; solo las ofertas pendientes anteriores a
--      esta migración (sin instantánea) caen al paquete vivo, que es lo único que existe.
--   2. `collaboration_deliverables`: un hueco por elemento de `package_deliverables`
--      (texto literal; «3 stories» es UN entregable: no se interpreta ni se parte).
--      Un hueco ocupa como mucho un post y un post como mucho un hueco (índice único).
--      Los clientes NO escriben: todo pasa por las RPC de la migración 3.
--      `origin = 'defined'` (la marca define entregables en una colaboración sin
--      paquete, D1) nace sin confirmar y no es exigible hasta que el creador confirma.
--   3. `collaboration_deliverable_decisions`: historial APEND-ONLY de renuncias,
--      aceptaciones sin aprobación y reaperturas. Nunca se sobrescribe ni se borra
--      (triggers, también para service_role); el estado vigente es la última fila.
--   4. `collaboration_events` (Fase 1) y las dos tablas nuevas pasan a ser inmutables
--      salvo la puesta a NULL de referencias (post/actor) al borrar el post o la cuenta;
--      solo se pueden borrar en cascada al borrar la colaboración. Nuevos tipos de evento.
--   5. Relleno: huecos para las colaboraciones que ya tienen `package_deliverables`
--      no vacío (origin 'package', confirmados). Las demás siguen en «modo libre».
--      Los posts NO se asignan automáticamente (no hay forma fiable de saber cuál
--      cumple cuál).
--
-- Permisos: sin PUBLIC ni anon; `authenticated` solo SELECT (con RLS de las dos partes).
-- No toca pagos (`budget_cents`, `paid_at`, `stripe_*`) ni OAuth/redes.
--
-- ROLLBACK (en orden inverso: 3, 2 y 1):
--   begin;
--   drop trigger if exists collab_events_immutable_upd on public.collaboration_events;
--   drop trigger if exists collab_events_immutable_del on public.collaboration_events;
--   drop function if exists public.collab_events_immutable();
--   drop table if exists public.collaboration_deliverable_decisions;
--   drop table if exists public.collaboration_deliverables;
--   drop function if exists public.collab_deliverables_guard(), public.collab_deliverable_decisions_guard(),
--     public.collab_deliverables_events(), public.collab_deliverable_decision_events();
--   alter table public.collaboration_events drop constraint collaboration_events_kind_check;
--   alter table public.collaboration_events add constraint collaboration_events_kind_check check (kind in (
--     'requested','accepted','declined','completed','counteroffer','deliverable_sent','changes_requested',
--     'approved','deliverable_published','rated','note'));
--   alter table public.offers drop column if exists package_description, drop column if exists package_deliverables;
--   -- y volver a ejecutar create_offer y respond_offer desde 20261103110000 y 20261104110000.
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido (probada solo en el Supabase local).
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- 1. Instantánea en la oferta
-- ---------------------------------------------------------------------------
alter table public.offers
    add column if not exists package_description text,
    add column if not exists package_deliverables text[];

-- ---------------------------------------------------------------------------
-- 2. Entregables
-- ---------------------------------------------------------------------------
create table if not exists public.collaboration_deliverables (
    id uuid primary key default gen_random_uuid(),
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    position smallint not null check (position >= 0),
    title text not null check (char_length(btrim(title)) between 1 and 500),
    origin text not null check (origin in ('package', 'defined')),
    confirmed_at timestamptz,
    confirmed_by uuid references public.profiles(id) on delete set null,
    post_id uuid references public.posts(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (collaboration_id, position),
    -- Lo que viene del paquete aceptado ya está acordado por las dos partes.
    constraint collab_deliverables_package_confirmed check (origin <> 'package' or confirmed_at is not null)
);

-- Un post ocupa como mucho un hueco (la base de datos lo hace cumplir, no la interfaz).
create unique index if not exists uq_collab_deliverables_post on public.collaboration_deliverables(post_id) where post_id is not null;
create index if not exists idx_collab_deliverables_collab on public.collaboration_deliverables(collaboration_id, position);

-- Decisiones de la marca: historial append-only.
create table if not exists public.collaboration_deliverable_decisions (
    id uuid primary key default gen_random_uuid(),
    deliverable_id uuid not null references public.collaboration_deliverables(id) on delete cascade,
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    kind text not null check (kind in ('waived', 'accepted_without_approval', 'reopened')),
    decided_by uuid references public.profiles(id) on delete set null,
    reason text not null check (char_length(btrim(reason)) between 10 and 500),
    -- Solo al aceptar sin aprobación: la versión del contenido que se aceptó.
    content_version int,
    seq bigint generated always as identity,
    created_at timestamptz not null default now(),
    constraint collab_decisions_version check ((kind = 'accepted_without_approval') = (content_version is not null))
);
create index if not exists idx_collab_decisions_deliverable on public.collaboration_deliverable_decisions(deliverable_id, seq);

-- ---------------------------------------------------------------------------
-- 3. Guardas (triggers: valen también para service_role)
-- ---------------------------------------------------------------------------
create or replace function public.collab_deliverables_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    p public.posts;
    c public.collaborations;
begin
    if tg_op = 'DELETE' then
        -- Solo en cascada al borrar la colaboración (la fila padre ya no existe).
        if exists (select 1 from public.collaborations where id = old.collaboration_id) then
            raise exception 'Los entregables no se pueden borrar: forman parte del historial de la colaboración.';
        end if;
        return old;
    end if;

    if tg_op = 'UPDATE' then
        if new.collaboration_id is distinct from old.collaboration_id
           or new.position is distinct from old.position
           or new.title is distinct from old.title
           or new.origin is distinct from old.origin
           or new.created_at is distinct from old.created_at then
            raise exception 'Lo contratado (título, orden y origen del entregable) no se puede modificar.';
        end if;
        if old.confirmed_at is not null and (new.confirmed_at is distinct from old.confirmed_at or new.confirmed_by is distinct from old.confirmed_by) then
            raise exception 'La confirmación de un entregable no se puede deshacer.';
        end if;
    end if;

    -- Asignar un post (nuevo valor no nulo): mismo creador, misma colaboración y colaboración activa.
    if new.post_id is not null and (tg_op = 'INSERT' or new.post_id is distinct from old.post_id) then
        select * into c from public.collaborations where id = new.collaboration_id;
        if c.status not in ('accepted', 'in_progress') then
            raise exception 'Solo se puede asignar una publicación en una colaboración aceptada o en curso.';
        end if;
        select * into p from public.posts where id = new.post_id;
        if p.id is null or p.collaboration_id is distinct from new.collaboration_id or p.creator_id is distinct from c.creator_id then
            raise exception 'La publicación no pertenece a esta colaboración.';
        end if;
    end if;
    return new;
end;
$$;
revoke execute on function public.collab_deliverables_guard() from public, anon, authenticated;

drop trigger if exists collab_deliverables_guard_trg on public.collaboration_deliverables;
create trigger collab_deliverables_guard_trg
    before insert or update or delete on public.collaboration_deliverables
    for each row execute function public.collab_deliverables_guard();

create or replace function public.collab_deliverable_decisions_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if tg_op = 'DELETE' then
        if exists (select 1 from public.collaborations where id = old.collaboration_id) then
            raise exception 'El historial de decisiones de un entregable no se puede borrar.';
        end if;
        return old;
    end if;
    -- UPDATE: solo se admite poner a NULL el autor cuando se borra su cuenta (clave foránea).
    if (to_jsonb(new) - 'decided_by') is distinct from (to_jsonb(old) - 'decided_by')
       or (new.decided_by is not null and new.decided_by is distinct from old.decided_by) then
        raise exception 'El historial de decisiones de un entregable no se puede modificar.';
    end if;
    return new;
end;
$$;
revoke execute on function public.collab_deliverable_decisions_guard() from public, anon, authenticated;

drop trigger if exists collab_decisions_guard_trg on public.collaboration_deliverable_decisions;
create trigger collab_decisions_guard_trg
    before update or delete on public.collaboration_deliverable_decisions
    for each row execute function public.collab_deliverable_decisions_guard();

-- La cronología de la Fase 1 también pasa a ser inmutable (salvo referencias a NULL).
create or replace function public.collab_events_immutable()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if tg_op = 'DELETE' then
        if exists (select 1 from public.collaborations where id = old.collaboration_id) then
            raise exception 'La cronología de una colaboración no se puede borrar.';
        end if;
        return old;
    end if;
    if (to_jsonb(new) - 'post_id' - 'actor_profile_id') is distinct from (to_jsonb(old) - 'post_id' - 'actor_profile_id')
       or (new.post_id is not null and new.post_id is distinct from old.post_id)
       or (new.actor_profile_id is not null and new.actor_profile_id is distinct from old.actor_profile_id) then
        raise exception 'La cronología de una colaboración no se puede modificar.';
    end if;
    return new;
end;
$$;
revoke execute on function public.collab_events_immutable() from public, anon, authenticated;

drop trigger if exists collab_events_immutable_upd on public.collaboration_events;
create trigger collab_events_immutable_upd before update on public.collaboration_events
    for each row execute function public.collab_events_immutable();
drop trigger if exists collab_events_immutable_del on public.collaboration_events;
create trigger collab_events_immutable_del before delete on public.collaboration_events
    for each row execute function public.collab_events_immutable();

-- Nuevos tipos de evento.
alter table public.collaboration_events drop constraint if exists collaboration_events_kind_check;
alter table public.collaboration_events add constraint collaboration_events_kind_check check (kind in (
    'requested', 'accepted', 'declined', 'completed', 'counteroffer',
    'deliverable_sent', 'changes_requested', 'approved', 'deliverable_published',
    'rated', 'note',
    'deliverables_defined', 'deliverables_confirmed', 'deliverable_assigned', 'deliverable_unassigned',
    'approval_invalidated', 'deliverable_waived', 'deliverable_accepted_without_approval',
    'deliverable_reopened', 'edited_after_publish'
));

-- ---------------------------------------------------------------------------
-- 4. Eventos de asignación y de decisiones
-- ---------------------------------------------------------------------------
create or replace function public.collab_deliverables_events()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    ptitle text;
begin
    if new.post_id is not null and old.post_id is null then
        select title into ptitle from public.posts where id = new.post_id;
        perform public.collab_event_add(new.collaboration_id, 'deliverable_assigned', auth.uid(), new.post_id,
            jsonb_build_object('deliverableId', new.id, 'deliverableTitle', new.title, 'postTitle', ptitle));
    elsif new.post_id is null and old.post_id is not null then
        -- Sin `post_id`: si el post se acaba de borrar, la fila ya no existe (clave foránea).
        perform public.collab_event_add(new.collaboration_id, 'deliverable_unassigned', auth.uid(), null,
            jsonb_build_object('deliverableId', new.id, 'deliverableTitle', new.title, 'postId', old.post_id));
    elsif new.post_id is not null and old.post_id is not null and new.post_id is distinct from old.post_id then
        raise exception 'Para cambiar la publicación de un entregable hay que soltar la anterior primero.';
    end if;
    return new;
end;
$$;
revoke execute on function public.collab_deliverables_events() from public, anon, authenticated;

drop trigger if exists collab_deliverables_events_trg on public.collaboration_deliverables;
create trigger collab_deliverables_events_trg
    after update of post_id on public.collaboration_deliverables
    for each row execute function public.collab_deliverables_events();

create or replace function public.collab_deliverable_decision_events()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    d public.collaboration_deliverables;
begin
    select * into d from public.collaboration_deliverables where id = new.deliverable_id;
    perform public.collab_event_add(new.collaboration_id,
        case new.kind when 'waived' then 'deliverable_waived'
                      when 'accepted_without_approval' then 'deliverable_accepted_without_approval'
                      else 'deliverable_reopened' end,
        new.decided_by, d.post_id,
        jsonb_build_object('deliverableId', d.id, 'deliverableTitle', d.title, 'reason', new.reason, 'contentVersion', new.content_version),
        new.created_at);
    return new;
end;
$$;
revoke execute on function public.collab_deliverable_decision_events() from public, anon, authenticated;

drop trigger if exists collab_decision_events_trg on public.collaboration_deliverable_decisions;
create trigger collab_decision_events_trg
    after insert on public.collaboration_deliverable_decisions
    for each row execute function public.collab_deliverable_decision_events();

-- ---------------------------------------------------------------------------
-- 5. RLS y permisos (solo lectura para las dos partes; escritura solo por RPC)
-- ---------------------------------------------------------------------------
alter table public.collaboration_deliverables enable row level security;
alter table public.collaboration_deliverable_decisions enable row level security;

drop policy if exists "collab_deliverables_select_parties" on public.collaboration_deliverables;
create policy "collab_deliverables_select_parties" on public.collaboration_deliverables for select
    to authenticated
    using (exists (
        select 1 from public.collaborations c
        where c.id = collaboration_deliverables.collaboration_id
        and (c.partner_id = public.current_partner_id() or c.creator_id = public.current_creator_id())
    ));

drop policy if exists "collab_decisions_select_parties" on public.collaboration_deliverable_decisions;
create policy "collab_decisions_select_parties" on public.collaboration_deliverable_decisions for select
    to authenticated
    using (exists (
        select 1 from public.collaborations c
        where c.id = collaboration_deliverable_decisions.collaboration_id
        and (c.partner_id = public.current_partner_id() or c.creator_id = public.current_creator_id())
    ));

revoke all on public.collaboration_deliverables from public, anon, authenticated;
revoke all on public.collaboration_deliverable_decisions from public, anon, authenticated;
grant select on public.collaboration_deliverables to authenticated;
grant select on public.collaboration_deliverable_decisions to authenticated;


-- ---------------------------------------------------------------------------
-- 6. create_offer y respond_offer (definiciones vivas + instantánea y entregables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_offer(p_package_id uuid, p_proposed_price_cents integer, p_message text DEFAULT NULL::text)
 RETURNS offers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    if (
        select count(*) from public.offers
        where from_profile_id = me and created_at > now() - interval '1 hour'
    ) >= 20 then
        raise exception 'Has enviado demasiadas ofertas en poco tiempo. Inténtalo más tarde.';
    end if;

    conv_id := public._get_or_create_conversation(me, pkg.profile_id);

    insert into public.offers (package_id, package_title, package_description, package_deliverables, conversation_id, from_profile_id, to_profile_id, proposed_price_cents, message)
    values (p_package_id, pkg.title, pkg.description, pkg.deliverables, conv_id, me, pkg.profile_id, p_proposed_price_cents, p_message)
    returning * into inserted;

    insert into public.messages (conversation_id, sender_id, kind, body, offer_id)
    values (conv_id, me, 'offer', p_message, inserted.id);

    update public.conversations set last_message_at = inserted.created_at where id = conv_id;

    select coalesce(full_name, 'Alguien') into sender_name from public.profiles where id = me;
    perform public.notify(pkg.profile_id, 'offer_received', 'Nueva oferta recibida', coalesce(sender_name, 'Alguien') || ' te ha hecho una oferta sobre "' || pkg.title || '".', '/chat/' || conv_id);

    return inserted;
end;
$function$;

CREATE OR REPLACE FUNCTION public.respond_offer(p_offer_id uuid, p_accept boolean)
 RETURNS offers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    pkg_description text;
    pkg_deliverables text[];
    live_title text;
    live_description text;
    live_deliverables text[];
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
            -- Lo contratado es lo que la oferta mostraba (instantánea al crearla).
            pkg_title := off.package_title;
            pkg_description := off.package_description;
            pkg_deliverables := off.package_deliverables;
            if off.package_deliverables is null then
                -- Oferta anterior a la instantánea: lo único que existe es el paquete vivo.
                select p.title, p.description, p.deliverables into live_title, live_description, live_deliverables
                  from public.packages p where p.id = off.package_id;
                pkg_title := coalesce(pkg_title, live_title);
                pkg_description := coalesce(pkg_description, live_description);
                pkg_deliverables := live_deliverables;
            end if;

            insert into public.collaborations (
                creator_id, partner_id, status, brief, budget_cents, initiated_by, offer_id,
                package_title, package_description, package_deliverables
            )
            values (
                resolved_creator_id, resolved_partner_id, 'accepted',
                coalesce('Oferta aceptada por chat: ' || pkg_title, 'Oferta aceptada por chat'),
                off.proposed_price_cents, resolved_initiated_by, off.id,
                pkg_title, pkg_description, pkg_deliverables
            )
            on conflict (offer_id) do nothing
            returning id into new_collab_id;

            -- Un entregable por elemento (texto literal, sin interpretar). Solo si la colaboración se creó ahora.
            if new_collab_id is not null and coalesce(array_length(pkg_deliverables, 1), 0) > 0 then
                insert into public.collaboration_deliverables (collaboration_id, position, title, origin, confirmed_at)
                select new_collab_id, (row_number() over (order by u.ord) - 1)::smallint, btrim(u.t), 'package', now()
                from unnest(pkg_deliverables) with ordinality as u(t, ord)
                where btrim(u.t) <> '';
            end if;

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
$function$;

revoke execute on function public.create_offer(uuid, integer, text) from public, anon;
grant execute on function public.create_offer(uuid, integer, text) to authenticated, service_role;
revoke execute on function public.respond_offer(uuid, boolean) from public, anon;
grant execute on function public.respond_offer(uuid, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Relleno: huecos para lo ya contratado (sin asignar publicaciones)
-- ---------------------------------------------------------------------------
insert into public.collaboration_deliverables (collaboration_id, position, title, origin, confirmed_at)
select c.id, (row_number() over (partition by c.id order by u.ord) - 1)::smallint, btrim(u.t), 'package', c.created_at
from public.collaborations c
cross join lateral unnest(c.package_deliverables) with ordinality as u(t, ord)
where coalesce(array_length(c.package_deliverables, 1), 0) > 0
  and btrim(u.t) <> ''
  -- Solo las vivas: a las completadas, rechazadas o pendientes no se les crean huecos nuevos.
  and c.status in ('accepted', 'in_progress')
  and not exists (select 1 from public.collaboration_deliverables d where d.collaboration_id = c.id)
on conflict do nothing;

commit;
