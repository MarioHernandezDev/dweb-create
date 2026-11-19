-- ============================================================================
-- Flujo de colaboraciones · Fase 2 (3/3) — RPC de entregables, vista de estado y regla de cierre
-- (docs/audit/10_FASE2_PROPUESTA_ENTREGABLES.md §2, §4, §6, §7; decisiones D1 y D3)
--
-- Toda escritura sobre `collaboration_deliverables` y sus decisiones pasa por estas RPC
-- (SECURITY DEFINER, `search_path = public`, sin PUBLIC ni anon; el cliente no tiene
-- INSERT/UPDATE/DELETE sobre las tablas). Cada una comprueba el rol y la pertenencia.
--
--   assign_deliverable(deliverable, post)      creador · vincula una publicación a un hueco
--   unassign_deliverable(deliverable)          creador · solo si el post no está en revisión ni aprobado
--   define_deliverables(collaboration, titles) marca · una sola vez, en una colaboración sin entregables (D1)
--   confirm_deliverables(collaboration)        creador · confirma los definidos por la marca (D1)
--   resolve_deliverable(deliverable, kind, why) marca · renuncia o aceptación sin aprobación, con motivo
--   reopen_deliverable(deliverable, why)       marca · deshace una decisión (queda en el historial)
--   mark_collaboration_completed               nuevo: exige todos los entregables exigibles resueltos (D3)
--   collaboration_deliverable_status (vista)   estado DERIVADO de cada entregable (security_invoker)
--
-- Orden de bloqueo en todas: post → entregable → colaboración (FOR SHARE; el cierre la toma
-- FOR UPDATE). Las decisiones son idempotentes (repetir la misma no crea otra fila) y nunca
-- se sobrescriben: reabrir añade una fila `reopened`.
--
-- «Resuelto» = aprobado (vigente, o publicado con aprobación vigente) · aceptado sin
-- aprobación (vigente: misma versión que la aceptada) · renunciado.
-- «Exigible» = confirmado (los del paquete lo están; los definidos por la marca, tras confirmar el creador).
--
-- Sin entregables (modo libre): el cierre se comporta como hasta ahora.
--
-- ROLLBACK:
--   begin;
--   drop view if exists public.collaboration_deliverable_status;
--   drop function if exists public.assign_deliverable(uuid, uuid), public.unassign_deliverable(uuid),
--     public.define_deliverables(uuid, text[]), public.confirm_deliverables(uuid),
--     public.resolve_deliverable(uuid, text, text), public.reopen_deliverable(uuid, text);
--   -- y volver a ejecutar mark_collaboration_completed desde 20261104100000.
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido (probada solo en el Supabase local).
-- Depende de 20261105100000 y 20261105110000.
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- Vista de estado derivado (la interfaz deja de inferirlo)
-- ---------------------------------------------------------------------------
create or replace view public.collaboration_deliverable_status with (security_invoker = true) as
with base as (
    select
        d.id as deliverable_id, d.collaboration_id, d.position, d.title, d.origin, d.confirmed_at, d.post_id,
        p.title as post_title, p.status as post_status, p.due_date, p.content_version, p.published_version,
        rv.kind as last_review_kind, rv.content_version as last_review_version, rv.comment as last_review_comment,
        dc.kind as decision_kind, dc.reason as decision_reason, dc.decided_by, dc.created_at as decided_at,
        dc.content_version as decision_version,
        -- Aprobación vigente (inline: la vista es security_invoker y las funciones auxiliares no son ejecutables por el cliente).
        coalesce((
            p.id is not null and exists (
                select 1 from public.post_revision_notes n
                where n.post_id = p.id and n.kind = 'approved' and n.content_version = p.content_version
                  and not exists (
                      select 1 from public.post_revision_notes n2
                      where n2.post_id = p.id and n2.kind = 'changes_requested'
                        and n2.content_version = p.content_version and n2.created_at > n.created_at
                  )
            )
        ), false) as approval_valid,
        (p.id is not null and exists (
            select 1 from public.post_revision_notes n where n.post_id = p.id and n.kind = 'approved' and n.content_version < p.content_version
        )) as had_older_approval
    from public.collaboration_deliverables d
    left join public.posts p on p.id = d.post_id
    left join lateral (
        select n.kind, n.content_version, n.comment from public.post_revision_notes n
        where n.post_id = d.post_id order by n.created_at desc limit 1
    ) rv on true
    left join lateral (
        select x.kind, x.reason, x.decided_by, x.created_at, x.content_version
        from public.collaboration_deliverable_decisions x where x.deliverable_id = d.id order by x.seq desc limit 1
    ) dc on true
),
derived as (
    select b.*,
        case
            when b.decision_kind = 'waived' then 'waived'
            when b.decision_kind = 'accepted_without_approval' and b.decision_version = b.content_version then 'accepted_without_approval'
            when b.post_id is null then 'open'
            when b.post_status in ('scheduled', 'published') and b.approval_valid then 'approved'
            when b.post_status = 'published' and b.published_version is not null then 'approved'
            when b.post_status = 'ready_for_review' then 'in_review'
            when b.last_review_kind = 'changes_requested' and b.last_review_version = b.content_version
                 and b.post_status in ('idea', 'in_production') then 'changes_requested'
            else 'in_progress'
        end as state
    from base b
)
select
    deliverable_id, collaboration_id, position, title, origin, confirmed_at, post_id, post_title, post_status, due_date,
    content_version, published_version, last_review_kind, last_review_version, last_review_comment,
    decision_kind, decision_reason, decided_by, decided_at, decision_version,
    state,
    (state in ('approved', 'accepted_without_approval', 'waived')) as resolved,
    (confirmed_at is not null) as enforceable,
    -- Avisos para la interfaz
    (post_id is not null and had_older_approval and not approval_valid and post_status not in ('scheduled', 'published')) as approval_invalidated,
    (published_version is not null and content_version > published_version) as edited_after_publish,
    (post_status in ('scheduled', 'published') and not approval_valid and published_version is null
        and state not in ('accepted_without_approval', 'waived')) as approval_missing,
    (decision_kind = 'accepted_without_approval' and decision_version is distinct from content_version) as decision_outdated
from derived;

revoke all on public.collaboration_deliverable_status from public, anon, authenticated;
grant select on public.collaboration_deliverable_status to authenticated;

-- ---------------------------------------------------------------------------
-- assign_deliverable (creador)
-- ---------------------------------------------------------------------------
create or replace function public.assign_deliverable(p_deliverable_id uuid, p_post_id uuid)
returns public.collaboration_deliverables
language plpgsql security definer set search_path = public
as $$
declare
    me_creator uuid := public.current_creator_id();
    p public.posts;
    d public.collaboration_deliverables;
    c public.collaborations;
    last_kind text;
begin
    if me_creator is null then
        raise exception 'Solo el creador de la colaboración puede asignar publicaciones.';
    end if;

    -- Orden de bloqueo: post → entregable → colaboración.
    select * into p from public.posts where id = p_post_id for update;
    if p.id is null or p.creator_id is distinct from me_creator then
        raise exception 'Esta publicación no existe o no es tuya.';
    end if;
    select * into d from public.collaboration_deliverables where id = p_deliverable_id for update;
    if d.id is null then
        raise exception 'Este entregable no existe.';
    end if;
    select * into c from public.collaborations where id = d.collaboration_id for share;
    if c.creator_id is distinct from me_creator then
        raise exception 'No tienes permiso sobre esta colaboración.';
    end if;

    if d.post_id = p.id then
        return d; -- idempotente
    end if;
    if c.status not in ('accepted', 'in_progress') then
        raise exception 'Solo se puede asignar una publicación en una colaboración aceptada o en curso.';
    end if;
    if d.origin = 'defined' and d.confirmed_at is null then
        raise exception 'Confirma primero los entregables definidos por la marca.';
    end if;
    if d.post_id is not null then
        raise exception 'Este entregable ya tiene una publicación asignada.';
    end if;
    select x.kind into last_kind from public.collaboration_deliverable_decisions x where x.deliverable_id = d.id order by x.seq desc limit 1;
    if last_kind = 'waived' then
        raise exception 'La marca ha renunciado a este entregable.';
    end if;
    if exists (select 1 from public.collaboration_deliverables x where x.post_id = p.id) then
        raise exception 'Esta publicación ya ocupa otro entregable.';
    end if;
    if p.collaboration_id is not null and p.collaboration_id <> d.collaboration_id then
        raise exception 'La publicación pertenece a otra colaboración.';
    end if;

    if p.collaboration_id is null then
        update public.posts set collaboration_id = d.collaboration_id where id = p.id;
    end if;
    update public.collaboration_deliverables set post_id = p.id where id = d.id returning * into d;
    return d;
end;
$$;

-- ---------------------------------------------------------------------------
-- unassign_deliverable (creador)
-- ---------------------------------------------------------------------------
create or replace function public.unassign_deliverable(p_deliverable_id uuid)
returns public.collaboration_deliverables
language plpgsql security definer set search_path = public
as $$
declare
    me_creator uuid := public.current_creator_id();
    p public.posts;
    d public.collaboration_deliverables;
    c public.collaborations;
    seen_post uuid;
begin
    if me_creator is null then
        raise exception 'Solo el creador de la colaboración puede soltar una publicación.';
    end if;
    select post_id into seen_post from public.collaboration_deliverables where id = p_deliverable_id;
    if seen_post is not null then
        select * into p from public.posts where id = seen_post for update;
    end if;
    select * into d from public.collaboration_deliverables where id = p_deliverable_id for update;
    if d.id is null then
        raise exception 'Este entregable no existe.';
    end if;
    select * into c from public.collaborations where id = d.collaboration_id for share;
    if c.creator_id is distinct from me_creator then
        raise exception 'No tienes permiso sobre esta colaboración.';
    end if;
    if d.post_id is null then
        return d; -- idempotente
    end if;
    if d.post_id is distinct from seen_post then
        raise exception 'El entregable ha cambiado mientras lo editabas. Inténtalo de nuevo.';
    end if;
    if c.status not in ('accepted', 'in_progress') then
        raise exception 'La colaboración ya no está activa.';
    end if;
    if p.status not in ('idea', 'in_production') then
        raise exception 'No se puede soltar una publicación que ya está en revisión, aprobada o publicada.';
    end if;
    update public.collaboration_deliverables set post_id = null where id = d.id returning * into d;
    return d;
end;
$$;

-- ---------------------------------------------------------------------------
-- define_deliverables (marca, una sola vez) y confirm_deliverables (creador)  — D1
-- ---------------------------------------------------------------------------
create or replace function public.define_deliverables(p_collaboration_id uuid, p_titles text[])
returns int
language plpgsql security definer set search_path = public
as $$
declare
    c public.collaborations;
    cleaned text[];
    creator_profile uuid;
begin
    select * into c from public.collaborations where id = p_collaboration_id for update;
    if c.id is null or c.partner_id is distinct from public.current_partner_id() then
        raise exception 'Solo la marca de la colaboración puede definir sus entregables.';
    end if;
    if c.status not in ('accepted', 'in_progress') then
        raise exception 'Los entregables solo se pueden definir en una colaboración aceptada o en curso.';
    end if;
    if exists (select 1 from public.collaboration_deliverables where collaboration_id = c.id) then
        raise exception 'Esta colaboración ya tiene entregables: solo se pueden definir una vez.';
    end if;
    select coalesce(array_agg(btrim(t)), '{}') into cleaned from unnest(coalesce(p_titles, '{}')) as t where btrim(t) <> '';
    if coalesce(array_length(cleaned, 1), 0) = 0 or array_length(cleaned, 1) > 20 then
        raise exception 'Indica entre 1 y 20 entregables.';
    end if;
    if exists (select 1 from unnest(cleaned) t where char_length(t) > 500) then
        raise exception 'Cada entregable puede tener como máximo 500 caracteres.';
    end if;

    insert into public.collaboration_deliverables (collaboration_id, position, title, origin)
    select c.id, (u.ord - 1)::smallint, u.t, 'defined' from unnest(cleaned) with ordinality as u(t, ord);

    perform public.collab_event_add(c.id, 'deliverables_defined', auth.uid(), null,
        jsonb_build_object('count', array_length(cleaned, 1), 'titles', to_jsonb(cleaned)));
    select profile_id into creator_profile from public.creators where id = c.creator_id;
    if creator_profile is not null then
        perform public.notify(creator_profile, 'deliverables_defined', 'Entregables por confirmar',
            'La marca ha definido ' || array_length(cleaned, 1) || ' entregable(s). Revísalos y confirma.',
            '/creator/collaborations/' || c.id || '#entregables');
    end if;
    return array_length(cleaned, 1);
end;
$$;

create or replace function public.confirm_deliverables(p_collaboration_id uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
    c public.collaborations;
    n int;
    partner_profile uuid;
begin
    select * into c from public.collaborations where id = p_collaboration_id for update;
    if c.id is null or c.creator_id is distinct from public.current_creator_id() then
        raise exception 'Solo el creador de la colaboración puede confirmar sus entregables.';
    end if;
    if c.status not in ('accepted', 'in_progress') then
        raise exception 'La colaboración ya no está activa.';
    end if;
    update public.collaboration_deliverables
    set confirmed_at = now(), confirmed_by = auth.uid()
    where collaboration_id = c.id and origin = 'defined' and confirmed_at is null;
    get diagnostics n = row_count;
    if n = 0 then
        return 0; -- idempotente
    end if;
    perform public.collab_event_add(c.id, 'deliverables_confirmed', auth.uid(), null, jsonb_build_object('count', n));
    select profile_id into partner_profile from public.partners where id = c.partner_id;
    if partner_profile is not null then
        perform public.notify(partner_profile, 'deliverables_confirmed', 'Entregables confirmados',
            'El creador ha confirmado los entregables de la colaboración.', '/partner/collaborations/' || c.id || '#entregables');
    end if;
    return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- resolve_deliverable / reopen_deliverable (marca) — historial append-only
-- ---------------------------------------------------------------------------
create or replace function public.resolve_deliverable(p_deliverable_id uuid, p_resolution text, p_reason text)
returns public.collaboration_deliverables
language plpgsql security definer set search_path = public
as $$
declare
    me_partner uuid := public.current_partner_id();
    p public.posts;
    d public.collaboration_deliverables;
    c public.collaborations;
    seen_post uuid;
    lastd public.collaboration_deliverable_decisions;
    clean_reason text := btrim(coalesce(p_reason, ''));
    effective boolean;
    creator_profile uuid;
begin
    if me_partner is null then
        raise exception 'Solo la marca de la colaboración puede resolver un entregable.';
    end if;
    if p_resolution not in ('waived', 'accepted_without_approval') then
        raise exception 'Resolución no válida.';
    end if;
    if char_length(clean_reason) < 10 or char_length(clean_reason) > 500 then
        raise exception 'Explica el motivo (entre 10 y 500 caracteres).';
    end if;

    select post_id into seen_post from public.collaboration_deliverables where id = p_deliverable_id;
    if seen_post is not null then
        select * into p from public.posts where id = seen_post for update;
    end if;
    select * into d from public.collaboration_deliverables where id = p_deliverable_id for update;
    if d.id is null then
        raise exception 'Este entregable no existe.';
    end if;
    select * into c from public.collaborations where id = d.collaboration_id for share;
    if c.partner_id is distinct from me_partner then
        raise exception 'No tienes permiso sobre esta colaboración.';
    end if;
    if d.post_id is distinct from seen_post then
        raise exception 'El entregable ha cambiado mientras lo editabas. Inténtalo de nuevo.';
    end if;
    if c.status not in ('accepted', 'in_progress') then
        raise exception 'La colaboración ya no está activa.';
    end if;
    if d.confirmed_at is null then
        raise exception 'El creador todavía no ha confirmado este entregable.';
    end if;

    select * into lastd from public.collaboration_deliverable_decisions where deliverable_id = d.id order by seq desc limit 1;
    effective := lastd.id is not null and (
        lastd.kind = 'waived'
        or (lastd.kind = 'accepted_without_approval' and p.id is not null and lastd.content_version = p.content_version)
    );
    if effective then
        if lastd.kind = p_resolution then
            return d; -- idempotente: la misma decisión vigente no crea otra fila
        end if;
        raise exception 'Este entregable ya tiene una decisión vigente: reábrelo antes de cambiarla.';
    end if;

    if p_resolution = 'accepted_without_approval' then
        if p.id is null then
            raise exception 'Solo se puede aceptar sin aprobación un entregable que tenga una publicación asignada.';
        end if;
        if p.status not in ('ready_for_review', 'scheduled', 'published') then
            raise exception 'La publicación todavía no se ha entregado (debe estar en revisión, aprobada o publicada).';
        end if;
        insert into public.collaboration_deliverable_decisions (deliverable_id, collaboration_id, kind, decided_by, reason, content_version)
        values (d.id, d.collaboration_id, 'accepted_without_approval', auth.uid(), clean_reason, p.content_version);
    else
        insert into public.collaboration_deliverable_decisions (deliverable_id, collaboration_id, kind, decided_by, reason)
        values (d.id, d.collaboration_id, 'waived', auth.uid(), clean_reason);
    end if;

    select profile_id into creator_profile from public.creators where id = c.creator_id;
    if creator_profile is not null then
        perform public.notify(creator_profile, 'deliverable_resolved',
            case when p_resolution = 'waived' then 'Entregable renunciado' else 'Entregable aceptado sin aprobación' end,
            '«' || d.title || '»: ' || clean_reason,
            '/creator/collaborations/' || c.id || '#entregables');
    end if;
    return d;
end;
$$;

create or replace function public.reopen_deliverable(p_deliverable_id uuid, p_reason text)
returns public.collaboration_deliverables
language plpgsql security definer set search_path = public
as $$
declare
    me_partner uuid := public.current_partner_id();
    p public.posts;
    d public.collaboration_deliverables;
    c public.collaborations;
    seen_post uuid;
    lastd public.collaboration_deliverable_decisions;
    clean_reason text := btrim(coalesce(p_reason, ''));
    creator_profile uuid;
begin
    if me_partner is null then
        raise exception 'Solo la marca de la colaboración puede reabrir un entregable.';
    end if;
    if char_length(clean_reason) < 10 or char_length(clean_reason) > 500 then
        raise exception 'Explica el motivo (entre 10 y 500 caracteres).';
    end if;

    select post_id into seen_post from public.collaboration_deliverables where id = p_deliverable_id;
    if seen_post is not null then
        select * into p from public.posts where id = seen_post for update;
    end if;
    select * into d from public.collaboration_deliverables where id = p_deliverable_id for update;
    if d.id is null then
        raise exception 'Este entregable no existe.';
    end if;
    select * into c from public.collaborations where id = d.collaboration_id for share;
    if c.partner_id is distinct from me_partner then
        raise exception 'No tienes permiso sobre esta colaboración.';
    end if;
    if c.status not in ('accepted', 'in_progress') then
        raise exception 'La colaboración ya no está activa: no se puede reabrir.';
    end if;

    select * into lastd from public.collaboration_deliverable_decisions where deliverable_id = d.id order by seq desc limit 1;
    if lastd.id is null or lastd.kind = 'reopened' then
        return d; -- idempotente: no hay nada que reabrir
    end if;

    insert into public.collaboration_deliverable_decisions (deliverable_id, collaboration_id, kind, decided_by, reason)
    values (d.id, d.collaboration_id, 'reopened', auth.uid(), clean_reason);

    select profile_id into creator_profile from public.creators where id = c.creator_id;
    if creator_profile is not null then
        perform public.notify(creator_profile, 'deliverable_resolved', 'Entregable reabierto',
            '«' || d.title || '»: ' || clean_reason, '/creator/collaborations/' || c.id || '#entregables');
    end if;
    return d;
end;
$$;

-- ---------------------------------------------------------------------------
-- Regla de cierre (D3)
-- ---------------------------------------------------------------------------
create or replace function public.mark_collaboration_completed(p_collaboration_id uuid)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    pending int;
begin
    -- Se bloquea la colaboración: una asignación o decisión simultánea espera a que termine el cierre.
    select * into coll from public.collaborations where id = p_collaboration_id for update;
    if coll is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if coll.status not in ('accepted', 'in_progress') then
        raise exception 'Solo se puede completar una colaboración aceptada o en curso.';
    end if;

    select count(*) into pending
    from public.collaboration_deliverable_status s
    where s.collaboration_id = coll.id and s.enforceable and not s.resolved;
    if pending > 0 then
        raise exception 'Faltan % entregable(s) por resolver. Tienen que estar aprobados o resueltos por la marca (aceptados sin aprobación o renunciados, indicando el motivo) antes de completar la colaboración.', pending;
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

-- ---------------------------------------------------------------------------
-- Permisos: sin PUBLIC ni anon
-- ---------------------------------------------------------------------------
revoke execute on function public.assign_deliverable(uuid, uuid) from public, anon;
revoke execute on function public.unassign_deliverable(uuid) from public, anon;
revoke execute on function public.define_deliverables(uuid, text[]) from public, anon;
revoke execute on function public.confirm_deliverables(uuid) from public, anon;
revoke execute on function public.resolve_deliverable(uuid, text, text) from public, anon;
revoke execute on function public.reopen_deliverable(uuid, text) from public, anon;
revoke execute on function public.mark_collaboration_completed(uuid) from public, anon;
grant execute on function public.assign_deliverable(uuid, uuid) to authenticated, service_role;
grant execute on function public.unassign_deliverable(uuid) to authenticated, service_role;
grant execute on function public.define_deliverables(uuid, text[]) to authenticated, service_role;
grant execute on function public.confirm_deliverables(uuid) to authenticated, service_role;
grant execute on function public.resolve_deliverable(uuid, text, text) to authenticated, service_role;
grant execute on function public.reopen_deliverable(uuid, text) to authenticated, service_role;
grant execute on function public.mark_collaboration_completed(uuid) to authenticated, service_role;

commit;
