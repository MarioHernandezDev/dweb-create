-- ============================================================================
-- Flujo de colaboraciones · F3 — Cronología de la colaboración
-- (CIBERAN_COMPETITIVE_AUDIT.md §7 F3; docs/audit/08_COLLABORATION_FLOW_AUDIT.md §1)
--
-- Hoy la base de datos NO guarda cuándo ocurrió cada cambio de estado
-- (solo `updated_at`, que cambia con cualquier edición), así que una cronología
-- fiable no se puede deducir de las tablas existentes. Esta tabla registra,
-- mediante triggers, lo que de verdad ocurre. Los clientes NO pueden escribir:
-- los eventos automáticos los generan los triggers (SECURITY DEFINER) y las
-- acciones de usuario ya existentes (ofertas, notas de revisión, valoraciones,
-- apuntes del registro) se reflejan desde sus propias tablas.
--
-- Qué se registra (kind):
--   requested             solicitud creada (nace en «requested»)
--   accepted              pasa a aceptada (incluye la nacida de una oferta del chat)
--   declined              solicitud rechazada
--   completed             colaboración completada
--   counteroffer          contraoferta de presupuesto (collaboration_offers)
--   deliverable_sent      entrega enviada (o reenviada) a revisión
--   changes_requested     la marca pide cambios (post_revision_notes)
--   approved              la marca aprueba la entrega (post_revision_notes)
--   deliverable_published la entrega pasa a «Publicado»
--   rated                 una parte valora (SIN la nota: eso ya vive en su tabla)
--   note                  apunte del registro compartido (collaboration_log_entries)
--
-- `actor_profile_id` null = evento automático/sistema (sin sesión).
-- `detail` es jsonb con datos mínimos para pintar la línea (sin duplicar texto
-- sensible: el comentario de una revisión sí se guarda porque ya lo ven las dos partes).
--
-- Relleno de los datos existentes (al final): solo con marcas de tiempo REALES
-- (creación, contraofertas, notas de revisión, valoraciones, apuntes). La
-- aceptación/rechazo/cierre de colaboraciones ya existentes se rellena con
-- `updated_at` marcado `approximate: true`, porque no hay otro dato.
--
-- No toca pagos (`budget_cents`, `paid_at`, `stripe_*` solo se LEEN para el detalle),
-- ni OAuth/redes sociales.
--
-- ROLLBACK:
--   begin;
--   drop trigger if exists collab_events_collaborations_ins on public.collaborations;
--   drop trigger if exists collab_events_collaborations_upd on public.collaborations;
--   drop trigger if exists collab_events_offers on public.collaboration_offers;
--   drop trigger if exists collab_events_posts on public.posts;
--   drop trigger if exists collab_events_revision_notes on public.post_revision_notes;
--   drop trigger if exists collab_events_ratings on public.collaboration_ratings;
--   drop trigger if exists collab_events_log on public.collaboration_log_entries;
--   drop function if exists public.collab_event_from_collaboration_ins(), public.collab_event_from_collaboration_upd(),
--     public.collab_event_from_offer(), public.collab_event_from_post(), public.collab_event_from_revision_note(),
--     public.collab_event_from_rating(), public.collab_event_from_log_entry(), public.collab_event_add(uuid, text, uuid, uuid, jsonb);
--   drop table if exists public.collaboration_events;
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido.
-- ============================================================================
begin;

drop table if exists public.collaboration_events cascade;

create table public.collaboration_events (
    id uuid primary key default gen_random_uuid(),
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    kind text not null check (kind in (
        'requested', 'accepted', 'declined', 'completed', 'counteroffer',
        'deliverable_sent', 'changes_requested', 'approved', 'deliverable_published',
        'rated', 'note'
    )),
    actor_profile_id uuid references public.profiles(id) on delete set null,
    post_id uuid references public.posts(id) on delete set null,
    detail jsonb not null default '{}'::jsonb,
    -- Desempate estable cuando dos eventos comparten `created_at` (misma transacción).
    seq bigint generated always as identity,
    created_at timestamptz not null default now()
);

create index idx_collaboration_events_collab on public.collaboration_events(collaboration_id, created_at, seq);

alter table public.collaboration_events enable row level security;

-- Solo lectura para las dos partes. Sin policy de insert/update/delete: nadie
-- (salvo los triggers de abajo) puede escribir, borrar ni reescribir la historia.
create policy "collaboration_events_select_parties" on public.collaboration_events for select
    to authenticated
    using (
        exists (
            select 1 from public.collaborations c
            where c.id = collaboration_events.collaboration_id
            and (c.partner_id = public.current_partner_id() or c.creator_id = public.current_creator_id())
        )
    );

revoke all on public.collaboration_events from anon, authenticated;
grant select on public.collaboration_events to authenticated;

-- ---------------------------------------------------------------------------
-- Función interna de escritura (solo la usan los triggers).
-- ---------------------------------------------------------------------------
create or replace function public.collab_event_add(
    p_collaboration_id uuid, p_kind text, p_actor uuid, p_post_id uuid, p_detail jsonb,
    p_created_at timestamptz default now()
)
returns void
language sql security definer set search_path = public
as $$
    insert into public.collaboration_events (collaboration_id, kind, actor_profile_id, post_id, detail, created_at)
    values (p_collaboration_id, p_kind, p_actor, p_post_id, coalesce(p_detail, '{}'::jsonb), p_created_at);
$$;
revoke execute on function public.collab_event_add(uuid, text, uuid, uuid, jsonb, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- collaborations: alta y cambios de estado.
-- ---------------------------------------------------------------------------
create or replace function public.collab_event_from_collaboration_ins()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    actor uuid;
begin
    select case when new.initiated_by = 'creator' then (select profile_id from public.creators where id = new.creator_id)
                else (select profile_id from public.partners where id = new.partner_id) end
    into actor;

    if new.status = 'requested' then
        perform public.collab_event_add(new.id, 'requested', actor, null,
            jsonb_build_object('initiatedBy', new.initiated_by, 'budgetCents', new.budget_cents));
    else
        -- Nacida ya aceptada (oferta aceptada en el chat): un solo evento, con su origen.
        perform public.collab_event_add(new.id, 'accepted', null, null,
            jsonb_build_object('origin', case when new.offer_id is not null then 'chat_offer' else 'direct' end,
                               'budgetCents', new.budget_cents));
    end if;
    return new;
end;
$$;
revoke execute on function public.collab_event_from_collaboration_ins() from public, anon, authenticated;

create or replace function public.collab_event_from_collaboration_upd()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if new.status is not distinct from old.status then
        return new;
    end if;
    if new.status = 'accepted' and old.status = 'requested' then
        perform public.collab_event_add(new.id, 'accepted', auth.uid(), null,
            jsonb_build_object('origin', 'request', 'budgetCents', new.budget_cents));
    elsif new.status = 'declined' then
        perform public.collab_event_add(new.id, 'declined', auth.uid(), null, '{}'::jsonb);
    elsif new.status = 'completed' then
        perform public.collab_event_add(new.id, 'completed', auth.uid(), null, '{}'::jsonb);
    end if;
    return new;
end;
$$;
revoke execute on function public.collab_event_from_collaboration_upd() from public, anon, authenticated;

drop trigger if exists collab_events_collaborations_ins on public.collaborations;
create trigger collab_events_collaborations_ins
    after insert on public.collaborations
    for each row execute function public.collab_event_from_collaboration_ins();

drop trigger if exists collab_events_collaborations_upd on public.collaborations;
create trigger collab_events_collaborations_upd
    after update of status on public.collaborations
    for each row execute function public.collab_event_from_collaboration_upd();

-- ---------------------------------------------------------------------------
-- Contraofertas.
-- ---------------------------------------------------------------------------
create or replace function public.collab_event_from_offer()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    actor uuid;
begin
    select case when new.proposed_by = 'creator' then (select cr.profile_id from public.collaborations c join public.creators cr on cr.id = c.creator_id where c.id = new.collaboration_id)
                else (select p.profile_id from public.collaborations c join public.partners p on p.id = c.partner_id where c.id = new.collaboration_id) end
    into actor;
    perform public.collab_event_add(new.collaboration_id, 'counteroffer', actor, null,
        jsonb_build_object('proposedBy', new.proposed_by, 'budgetCents', new.budget_cents, 'message', new.message),
        new.created_at);
    return new;
end;
$$;
revoke execute on function public.collab_event_from_offer() from public, anon, authenticated;

drop trigger if exists collab_events_offers on public.collaboration_offers;
create trigger collab_events_offers
    after insert on public.collaboration_offers
    for each row execute function public.collab_event_from_offer();

-- ---------------------------------------------------------------------------
-- Entregas: envío a revisión y publicación (las aprobaciones y peticiones de
-- cambios llegan por post_revision_notes, que ya identifica a su autor).
-- ---------------------------------------------------------------------------
create or replace function public.collab_event_from_post()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    creator_profile uuid;
    resubmission boolean;
begin
    if new.collaboration_id is null then
        return new;
    end if;
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then
        return new;
    end if;
    select profile_id into creator_profile from public.creators where id = new.creator_id;

    if new.status = 'ready_for_review' then
        resubmission := exists (select 1 from public.post_revision_notes where post_id = new.id and kind = 'changes_requested');
        perform public.collab_event_add(new.collaboration_id, 'deliverable_sent', creator_profile, new.id,
            jsonb_build_object('title', new.title, 'resubmission', resubmission));
    elsif new.status = 'published' then
        perform public.collab_event_add(new.collaboration_id, 'deliverable_published', creator_profile, new.id,
            jsonb_build_object('title', new.title));
    end if;
    return new;
end;
$$;
revoke execute on function public.collab_event_from_post() from public, anon, authenticated;

drop trigger if exists collab_events_posts on public.posts;
create trigger collab_events_posts
    after insert or update of status on public.posts
    for each row execute function public.collab_event_from_post();

create or replace function public.collab_event_from_revision_note()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    p public.posts;
begin
    select * into p from public.posts where id = new.post_id;
    if p.id is null or p.collaboration_id is null then
        return new;
    end if;
    perform public.collab_event_add(p.collaboration_id,
        case when new.kind = 'approved' then 'approved' else 'changes_requested' end,
        new.author_profile_id, p.id,
        jsonb_build_object('title', p.title, 'comment', new.comment), new.created_at);
    return new;
end;
$$;
revoke execute on function public.collab_event_from_revision_note() from public, anon, authenticated;

drop trigger if exists collab_events_revision_notes on public.post_revision_notes;
create trigger collab_events_revision_notes
    after insert on public.post_revision_notes
    for each row execute function public.collab_event_from_revision_note();

-- ---------------------------------------------------------------------------
-- Valoraciones y apuntes del registro compartido.
-- ---------------------------------------------------------------------------
create or replace function public.collab_event_from_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    perform public.collab_event_add(new.collaboration_id, 'rated', new.rater_profile_id, null, '{}'::jsonb, new.created_at);
    return new;
end;
$$;
revoke execute on function public.collab_event_from_rating() from public, anon, authenticated;

drop trigger if exists collab_events_ratings on public.collaboration_ratings;
create trigger collab_events_ratings
    after insert on public.collaboration_ratings
    for each row execute function public.collab_event_from_rating();

create or replace function public.collab_event_from_log_entry()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    perform public.collab_event_add(new.collaboration_id, 'note', new.author_profile_id, null,
        jsonb_build_object('logKind', new.kind, 'text', new.detail), new.created_at);
    return new;
end;
$$;
revoke execute on function public.collab_event_from_log_entry() from public, anon, authenticated;

drop trigger if exists collab_events_log on public.collaboration_log_entries;
create trigger collab_events_log
    after insert on public.collaboration_log_entries
    for each row execute function public.collab_event_from_log_entry();

-- ---------------------------------------------------------------------------
-- Relleno de lo que ya existe (solo marcas de tiempo reales; las transiciones
-- de estado, con `updated_at` y marcadas como aproximadas).
-- ---------------------------------------------------------------------------
insert into public.collaboration_events (collaboration_id, kind, actor_profile_id, detail, created_at)
select c.id,
       case when c.offer_id is not null then 'accepted' else 'requested' end,
       case when c.offer_id is not null then null
            when c.initiated_by = 'creator' then (select profile_id from public.creators where id = c.creator_id)
            else (select profile_id from public.partners where id = c.partner_id) end,
       case when c.offer_id is not null
            then jsonb_build_object('origin', 'chat_offer', 'budgetCents', c.budget_cents, 'backfilled', true)
            else jsonb_build_object('initiatedBy', c.initiated_by, 'budgetCents', c.budget_cents, 'backfilled', true) end,
       c.created_at
from public.collaborations c;

insert into public.collaboration_events (collaboration_id, kind, detail, created_at)
select c.id, 'accepted', jsonb_build_object('origin', 'request', 'approximate', true, 'backfilled', true), c.updated_at
from public.collaborations c
where c.offer_id is null and c.status in ('accepted', 'in_progress', 'completed');

insert into public.collaboration_events (collaboration_id, kind, detail, created_at)
select c.id, 'declined', jsonb_build_object('approximate', true, 'backfilled', true), c.updated_at
from public.collaborations c where c.status = 'declined';

insert into public.collaboration_events (collaboration_id, kind, detail, created_at)
select c.id, 'completed', jsonb_build_object('approximate', true, 'backfilled', true), c.updated_at
from public.collaborations c where c.status = 'completed';

insert into public.collaboration_events (collaboration_id, kind, actor_profile_id, detail, created_at)
select o.collaboration_id, 'counteroffer',
       case when o.proposed_by = 'creator' then (select cr.profile_id from public.collaborations c join public.creators cr on cr.id = c.creator_id where c.id = o.collaboration_id)
            else (select p.profile_id from public.collaborations c join public.partners p on p.id = c.partner_id where c.id = o.collaboration_id) end,
       jsonb_build_object('proposedBy', o.proposed_by, 'budgetCents', o.budget_cents, 'message', o.message, 'backfilled', true),
       o.created_at
from public.collaboration_offers o;

insert into public.collaboration_events (collaboration_id, kind, actor_profile_id, post_id, detail, created_at)
select p.collaboration_id, case when n.kind = 'approved' then 'approved' else 'changes_requested' end,
       n.author_profile_id, p.id, jsonb_build_object('title', p.title, 'comment', n.comment, 'backfilled', true), n.created_at
from public.post_revision_notes n join public.posts p on p.id = n.post_id
where p.collaboration_id is not null;

insert into public.collaboration_events (collaboration_id, kind, actor_profile_id, detail, created_at)
select r.collaboration_id, 'rated', r.rater_profile_id, jsonb_build_object('backfilled', true), r.created_at
from public.collaboration_ratings r;

insert into public.collaboration_events (collaboration_id, kind, actor_profile_id, detail, created_at)
select l.collaboration_id, 'note', l.author_profile_id, jsonb_build_object('logKind', l.kind, 'text', l.detail, 'backfilled', true), l.created_at
from public.collaboration_log_entries l;

commit;
