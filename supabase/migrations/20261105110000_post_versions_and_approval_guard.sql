-- ============================================================================
-- Flujo de colaboraciones · Fase 2 (2/3) — Versiones de contenido y guarda de aprobación
-- (docs/audit/10_FASE2_PROPUESTA_ENTREGABLES.md §3 y §6; decisiones D2, D5, D6, D7)
--
--   1. `posts.content_version`: sube SOLO cuando cambia un campo material (título,
--      texto, medio, tipo, plataforma o hashtags). Fechas, etiquetas, checklist,
--      estado y enlaces NO la tocan. La calcula un trigger: ningún cliente (ni
--      service_role) puede fijarla a mano. `posts.published_version` guarda la versión
--      con la que se publicó DENTRO de una colaboración activa y con aprobación vigente (para no
--      exigir una nueva aprobación a lo ya publicado, sin poder blanquear lo publicado por fuera).
--   2. `post_revision_notes.content_version`: la versión sobre la que se aprobó o se
--      pidieron cambios. D7: las notas anteriores a esta migración reciben la versión 1
--      — es una SUPOSICIÓN de migración («lo aprobado es lo que hay»), no una
--      verificación histórica: sin historial de ediciones no existe mejor dato.
--   3. Guarda de estado (trigger BEFORE INSERT/UPDATE en `posts`, vale también para
--      service_role): un post de una colaboración `accepted|in_progress` no puede pasar
--      a `scheduled` ni `published` sin una aprobación VIGENTE para su versión actual
--      (nota `approved` de esa versión sin `changes_requested` posterior) o una
--      aceptación sin aprobación vigente (misma versión). Aplica también al «modo libre».
--   4. Invalidación (D2): editar un campo material de un post `scheduled` de una
--      colaboración activa lo devuelve a `in_production` (evento `approval_invalidated`).
--      Editar tras publicar (D5) solo deja el evento `edited_after_publish`.
--   5. Notas de revisión: trigger de inserción que exige post en revisión, versión
--      vigente y autor = la marca de la colaboración (no se pueden fabricar aprobaciones
--      saltándose las RPC).
--   6. `approve_post` / `request_post_changes` reciben la versión que la marca estaba
--      viendo y la comparan con la actual BAJO BLOQUEO de la fila del post
--      (`select … for update`): aprobar lo que se vio, no lo que hay ahora. Insertan la
--      nota ANTES de cambiar el estado, de modo que la guarda no necesita excepciones.
--   7. D6: no se puede borrar ni mover a otra colaboración un post en revisión,
--      aprobado o publicado de una colaboración activa (se exceptúa el borrado en
--      cascada de la cuenta del creador). Al mover/borrar un post libre se libera su hueco.
--
-- ORDEN DE BLOQUEO (todas las rutas): post → entregable. Los triggers de `posts` ya
-- tienen el post bloqueado cuando tocan el entregable; las RPC de la migración 3
-- bloquean primero el post y después el entregable. Así no hay interbloqueos.
--
-- Nota: los posts que ya estén `scheduled`/`published` sin aprobación NO se tocan (la
-- guarda actúa en las transiciones nuevas, no con carácter retroactivo). Insertar un
-- post directamente como `scheduled`/`published` en una colaboración activa queda
-- bloqueado (no puede tener aprobación todavía).
--
-- ROLLBACK:
--   begin;
--   drop trigger if exists posts_review_guard_trg on public.posts;
--   drop trigger if exists posts_collab_change_guard_trg on public.posts;
--   drop trigger if exists posts_delete_guard_trg on public.posts;
--   drop trigger if exists post_revision_notes_guard_trg on public.post_revision_notes;
--   drop function if exists public.posts_review_guard(), public.posts_collab_change_guard(), public.posts_delete_guard(),
--     public.post_revision_notes_guard(), public.post_has_review_clearance(uuid, int), public.post_has_valid_approval(uuid, int),
--     public.approve_post(uuid, text, int), public.request_post_changes(uuid, text, int);
--   alter table public.post_revision_notes drop column if exists content_version;
--   alter table public.posts drop column if exists content_version, drop column if exists published_version;
--   -- y volver a ejecutar approve_post / request_post_changes (2 argumentos) y
--   -- collab_event_from_revision_note desde 20261025140000 y 20261104130000.
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido (probada solo en el Supabase local).
-- Depende de 20261105100000_deliverables_snapshot_and_model.sql.
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- 1 y 2. Columnas (los triggers se crean DESPUÉS del relleno)
-- ---------------------------------------------------------------------------
alter table public.posts
    add column if not exists content_version int not null default 1,
    add column if not exists published_version int;
-- `published_version` queda NULL en lo ya publicado: solo se rellena cuando una publicación sale
-- DENTRO de una colaboración activa con aprobación vigente (así no se puede «blanquear» un post
-- publicado por fuera asignándolo después a un entregable).

alter table public.post_revision_notes add column if not exists content_version int;
update public.post_revision_notes set content_version = 1 where content_version is null; -- D7 (suposición)
alter table public.post_revision_notes alter column content_version set not null;

-- ---------------------------------------------------------------------------
-- Aprobación vigente / aprobación o aceptación sin aprobación vigente, para una versión
-- ---------------------------------------------------------------------------
create or replace function public.post_has_valid_approval(p_post_id uuid, p_version int)
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.post_revision_notes n
        where n.post_id = p_post_id and n.kind = 'approved' and n.content_version = p_version
          and not exists (
              select 1 from public.post_revision_notes n2
              where n2.post_id = p_post_id and n2.kind = 'changes_requested'
                and n2.content_version = p_version and n2.created_at > n.created_at
          )
    );
$$;
revoke execute on function public.post_has_valid_approval(uuid, int) from public, anon, authenticated;

create or replace function public.post_has_review_clearance(p_post_id uuid, p_version int)
returns boolean
language sql stable security definer set search_path = public
as $$
    select public.post_has_valid_approval(p_post_id, p_version)
    or exists (
        select 1
        from public.collaboration_deliverables d
        join lateral (
            select dd.kind, dd.content_version
            from public.collaboration_deliverable_decisions dd
            where dd.deliverable_id = d.id
            order by dd.seq desc limit 1
        ) last on true
        where d.post_id = p_post_id and last.kind = 'accepted_without_approval' and last.content_version = p_version
    );
$$;
revoke execute on function public.post_has_review_clearance(uuid, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3 y 4. Guarda de estado, versión e invalidación (un solo trigger: orden garantizado)
-- ---------------------------------------------------------------------------
create or replace function public.posts_review_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    c public.collaborations;
    v_active boolean := false;
    material boolean := false;
begin
    if tg_op = 'INSERT' then
        new.content_version := 1;
        new.published_version := null;
    else
        material := (new.title, new.caption, new.content_type, new.platform, new.media_url, coalesce(new.metadata -> 'hashtags', '[]'::jsonb))
            is distinct from
            (old.title, old.caption, old.content_type, old.platform, old.media_url, coalesce(old.metadata -> 'hashtags', '[]'::jsonb));
        -- La versión la decide la base de datos, nunca el cliente.
        new.content_version := old.content_version + case when material then 1 else 0 end;
        new.published_version := old.published_version;
    end if;

    if new.collaboration_id is not null then
        select * into c from public.collaborations where id = new.collaboration_id;
        v_active := coalesce(c.status in ('accepted', 'in_progress'), false);
    end if;

    if tg_op = 'UPDATE' and material and new.collaboration_id is not null then
        if v_active and old.status = 'scheduled' and new.status = 'scheduled' then
            -- D2: una modificación material de una pieza aprobada la devuelve a producción.
            new.status := 'in_production';
            perform public.collab_event_add(new.collaboration_id, 'approval_invalidated', auth.uid(), new.id,
                jsonb_build_object('title', new.title, 'fromVersion', old.content_version, 'toVersion', new.content_version));
        elsif old.status = 'published' and new.status = 'published' then
            -- D5: ya está fuera; se informa, no se castiga.
            perform public.collab_event_add(new.collaboration_id, 'edited_after_publish', auth.uid(), new.id,
                jsonb_build_object('title', new.title, 'fromVersion', old.content_version, 'toVersion', new.content_version));
        end if;
    end if;

    if tg_op = 'INSERT' or new.status is distinct from old.status then
        if v_active and new.status in ('scheduled', 'published') then
            if not public.post_has_review_clearance(new.id, new.content_version) then
                raise exception 'Esta publicación necesita la aprobación de la marca antes de programarse o publicarse. Envíala a revisión.';
            end if;
        end if;
        if v_active and new.status = 'published' then
            new.published_version := new.content_version;
        end if;
    end if;
    return new;
end;
$$;
revoke execute on function public.posts_review_guard() from public, anon, authenticated;

drop trigger if exists posts_review_guard_trg on public.posts;
create trigger posts_review_guard_trg
    before insert or update on public.posts
    for each row execute function public.posts_review_guard();

-- ---------------------------------------------------------------------------
-- 7. Mover o borrar posts (D6) y liberar el hueco
-- ---------------------------------------------------------------------------
create or replace function public.posts_collab_change_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    c public.collaborations;
begin
    if old.collaboration_id is not null and new.collaboration_id is distinct from old.collaboration_id then
        select * into c from public.collaborations where id = old.collaboration_id;
        if c.status in ('accepted', 'in_progress') and old.status in ('ready_for_review', 'scheduled', 'published') then
            raise exception 'No puedes mover a otra colaboración una publicación en revisión, aprobada o publicada.';
        end if;
        -- El post ya está bloqueado (orden post → entregable).
        update public.collaboration_deliverables set post_id = null where post_id = old.id;
    end if;
    return new;
end;
$$;
revoke execute on function public.posts_collab_change_guard() from public, anon, authenticated;

drop trigger if exists posts_collab_change_guard_trg on public.posts;
create trigger posts_collab_change_guard_trg
    before update of collaboration_id on public.posts
    for each row execute function public.posts_collab_change_guard();

create or replace function public.posts_delete_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    c public.collaborations;
begin
    if old.collaboration_id is not null and old.status in ('ready_for_review', 'scheduled', 'published')
       -- Se exceptúa el borrado en cascada de la cuenta del creador (su fila ya no existe).
       and exists (select 1 from public.creators where id = old.creator_id) then
        select * into c from public.collaborations where id = old.collaboration_id;
        if c.status in ('accepted', 'in_progress') then
            raise exception 'No puedes borrar una publicación en revisión, aprobada o publicada de una colaboración activa.';
        end if;
    end if;
    return old;
end;
$$;
revoke execute on function public.posts_delete_guard() from public, anon, authenticated;

drop trigger if exists posts_delete_guard_trg on public.posts;
create trigger posts_delete_guard_trg
    before delete on public.posts
    for each row execute function public.posts_delete_guard();

-- ---------------------------------------------------------------------------
-- 5. Las notas de revisión solo nacen de una revisión real
-- ---------------------------------------------------------------------------
create or replace function public.post_revision_notes_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    p public.posts;
    c public.collaborations;
    partner_profile uuid;
begin
    select * into p from public.posts where id = new.post_id;
    select * into c from public.collaborations where id = p.collaboration_id;
    if p.id is null or c.id is null then
        raise exception 'Una revisión solo puede referirse a una publicación de una colaboración.';
    end if;
    select profile_id into partner_profile from public.partners where id = c.partner_id;
    if new.author_profile_id is distinct from partner_profile then
        raise exception 'Solo la marca de la colaboración puede revisar una publicación.';
    end if;
    if p.status <> 'ready_for_review' then
        raise exception 'Esta publicación ya no está pendiente de revisión.';
    end if;
    if new.content_version is distinct from p.content_version then
        raise exception 'La publicación ha cambiado mientras la revisabas. Ábrela de nuevo para revisar la última versión.';
    end if;
    return new;
end;
$$;
revoke execute on function public.post_revision_notes_guard() from public, anon, authenticated;

drop trigger if exists post_revision_notes_guard_trg on public.post_revision_notes;
create trigger post_revision_notes_guard_trg
    before insert on public.post_revision_notes
    for each row execute function public.post_revision_notes_guard();

-- La cronología muestra la versión revisada.
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
        jsonb_build_object('title', p.title, 'comment', new.comment, 'contentVersion', new.content_version), new.created_at);
    return new;
end;
$$;
revoke execute on function public.collab_event_from_revision_note() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. approve_post / request_post_changes con versión y bloqueo de fila
-- ---------------------------------------------------------------------------
drop function if exists public.approve_post(uuid, text);
drop function if exists public.request_post_changes(uuid, text);

create or replace function public.approve_post(target_post_id uuid, p_comment text default null, p_content_version int default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
    p public.posts;
    c public.collaborations;
    creator_profile_id uuid;
begin
    -- Primero el bloqueo: una edición simultánea espera a que termine esta aprobación
    -- (y la invalida), o ya habrá subido la versión antes de que se compare.
    select * into p from public.posts where id = target_post_id for update;
    select * into c from public.collaborations where id = p.collaboration_id;
    if p.id is null or c.id is null or c.partner_id is distinct from public.current_partner_id() then
        raise exception 'No tienes una colaboración activa sobre este post';
    end if;
    if p.status <> 'ready_for_review' then
        raise exception 'Esta publicación ya no está pendiente de revisión.';
    end if;
    if p_content_version is not null and p_content_version <> p.content_version then
        raise exception 'La publicación ha cambiado mientras la revisabas. Ábrela de nuevo para revisar la última versión.';
    end if;

    -- La nota (con su versión) antes que el estado: la guarda exige aprobación vigente.
    insert into public.post_revision_notes (post_id, author_profile_id, kind, comment, content_version)
    values (target_post_id, auth.uid(), 'approved', nullif(trim(coalesce(p_comment, '')), ''), p.content_version);

    update public.posts set status = 'scheduled' where id = target_post_id;

    select profile_id into creator_profile_id from public.creators where id = p.creator_id;
    if creator_profile_id is not null then
        perform public.notify(creator_profile_id, 'post_approved', 'Publicación aprobada', p_comment, '/creator/post/' || target_post_id);
    end if;
end;
$$;

create or replace function public.request_post_changes(target_post_id uuid, p_comment text default null, p_content_version int default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
    p public.posts;
    c public.collaborations;
    creator_profile_id uuid;
    clean_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
    if clean_comment is null then
        raise exception 'Explica qué hay que cambiar — el comentario es obligatorio.';
    end if;

    select * into p from public.posts where id = target_post_id for update;
    select * into c from public.collaborations where id = p.collaboration_id;
    if p.id is null or c.id is null or c.partner_id is distinct from public.current_partner_id() then
        raise exception 'No tienes una colaboración activa sobre este post';
    end if;
    if p.status <> 'ready_for_review' then
        raise exception 'Esta publicación ya no está pendiente de revisión.';
    end if;
    if p_content_version is not null and p_content_version <> p.content_version then
        raise exception 'La publicación ha cambiado mientras la revisabas. Ábrela de nuevo para revisar la última versión.';
    end if;

    insert into public.post_revision_notes (post_id, author_profile_id, kind, comment, content_version)
    values (target_post_id, auth.uid(), 'changes_requested', clean_comment, p.content_version);

    update public.posts set status = 'in_production' where id = target_post_id;

    select profile_id into creator_profile_id from public.creators where id = p.creator_id;
    if creator_profile_id is not null then
        perform public.notify(creator_profile_id, 'post_changes_requested', 'Te han pedido cambios', clean_comment, '/creator/post/' || target_post_id);
    end if;
end;
$$;

revoke execute on function public.approve_post(uuid, text, int) from public, anon;
revoke execute on function public.request_post_changes(uuid, text, int) from public, anon;
grant execute on function public.approve_post(uuid, text, int) to authenticated, service_role;
grant execute on function public.request_post_changes(uuid, text, int) to authenticated, service_role;

commit;
