    -- ============================================================================
    -- FEEDMA — "Pedir cambios" en una publicación no capturaba ningún motivo:
    -- `request_post_changes()` solo movía el estado de vuelta a producción, sin
    -- texto ni historial. El creador se encontraba su publicación devuelta sin
    -- ninguna pista de qué cambiar. Esta migración añade un historial real de
    -- revisión por publicación (no por colaboración — es sobre un entregable
    -- concreto, mismo criterio ya usado para `labels`/`checklist_items`).
    --
    -- Escrita para poder ejecutarse más de una vez sin reventar (misma
    -- convención que el resto de migraciones de este proyecto).
    -- ============================================================================

    drop table if exists public.post_revision_notes cascade;

    create table public.post_revision_notes (
        id uuid primary key default gen_random_uuid(),
        post_id uuid not null references public.posts(id) on delete cascade,
        author_profile_id uuid not null references public.profiles(id) on delete cascade,
        kind text not null check (kind in ('changes_requested', 'approved')),
        comment text check (comment is null or char_length(comment) <= 1000),
        created_at timestamptz not null default now()
    );

    create index idx_post_revision_notes_post_id on public.post_revision_notes(post_id, created_at);

    alter table public.post_revision_notes enable row level security;

    -- Solo las dos partes de la colaboración del post (mismo join que ya usan
    -- approve_post/request_post_changes) — sin policy de insert/update/delete
    -- para "authenticated" a propósito: la única puerta de escritura son las
    -- dos RPCs de abajo.
    create policy "post_revision_notes_select_involved" on public.post_revision_notes for select
        using (
            exists (
                select 1 from public.posts p
                join public.collaborations c on c.id = p.collaboration_id
                where p.id = post_revision_notes.post_id
                and (c.partner_id = public.current_partner_id() or c.creator_id = public.current_creator_id())
            )
        );

    -- ----------------------------------------------------------------------------
    -- approve_post / request_post_changes — redefinidas para exigir (la
    -- segunda) o admitir (la primera) un comentario, dejar una nota en el
    -- historial y avisar al creador. El cambio de estado real sigue siendo un
    -- único `update ... where status = 'ready_for_review'`: si dos llamadas
    -- concurrentes apuntan al mismo post, la segunda no encuentra fila que
    -- actualizar (la primera ya la movió) y se rechaza en vez de ejecutarse
    -- dos veces — la comprobación de "soy la parte implicada" de antes sigue
    -- ahí, pero quien de verdad evita la carrera es el `where` del `update`.
    --
    -- Hay que BORRAR antes las versiones de 1 solo argumento: `create or
    -- replace` con una firma distinta (2 argumentos) crea una sobrecarga
    -- nueva, no sustituye la vieja — si se dejara la de 1 argumento viva,
    -- cualquiera podría seguir llamando a `request_post_changes(uuid)` sin
    -- comentario, saltándose por completo la exigencia de explicar qué hay
    -- que cambiar.
    -- ----------------------------------------------------------------------------
    drop function if exists public.approve_post(uuid);
    drop function if exists public.request_post_changes(uuid);

    create or replace function public.approve_post(target_post_id uuid, p_comment text default null)
    returns void
    language plpgsql security definer set search_path = public
    as $$
    declare
        is_owner boolean;
        updated_id uuid;
        post_creator_id uuid;
        creator_profile_id uuid;
    begin
        select exists (
            select 1 from public.posts p
            join public.collaborations c on c.id = p.collaboration_id
            where p.id = target_post_id
            and c.partner_id = public.current_partner_id()
        ) into is_owner;

        if not is_owner then
            raise exception 'No tienes una colaboración activa sobre este post';
        end if;

        update public.posts
        set status = 'scheduled'
        where id = target_post_id
        and status = 'ready_for_review'
        returning id, creator_id into updated_id, post_creator_id;

        if updated_id is null then
            raise exception 'Esta publicación ya no está pendiente de revisión.';
        end if;

        insert into public.post_revision_notes (post_id, author_profile_id, kind, comment)
        values (target_post_id, auth.uid(), 'approved', nullif(trim(coalesce(p_comment, '')), ''));

        select profile_id into creator_profile_id from public.creators where id = post_creator_id;
        if creator_profile_id is not null then
            perform public.notify(creator_profile_id, 'post_approved', 'Publicación aprobada', p_comment, '/creator/post/' || target_post_id);
        end if;
    end;
    $$;

    create or replace function public.request_post_changes(target_post_id uuid, p_comment text default null)
    returns void
    language plpgsql security definer set search_path = public
    as $$
    declare
        is_owner boolean;
        updated_id uuid;
        post_creator_id uuid;
        creator_profile_id uuid;
        clean_comment text;
    begin
        clean_comment := nullif(trim(coalesce(p_comment, '')), '');
        if clean_comment is null then
            raise exception 'Explica qué hay que cambiar — el comentario es obligatorio.';
        end if;

        select exists (
            select 1 from public.posts p
            join public.collaborations c on c.id = p.collaboration_id
            where p.id = target_post_id
            and c.partner_id = public.current_partner_id()
        ) into is_owner;

        if not is_owner then
            raise exception 'No tienes una colaboración activa sobre este post';
        end if;

        update public.posts
        set status = 'in_production'
        where id = target_post_id
        and status = 'ready_for_review'
        returning id, creator_id into updated_id, post_creator_id;

        if updated_id is null then
            raise exception 'Esta publicación ya no está pendiente de revisión.';
        end if;

        insert into public.post_revision_notes (post_id, author_profile_id, kind, comment)
        values (target_post_id, auth.uid(), 'changes_requested', clean_comment);

        select profile_id into creator_profile_id from public.creators where id = post_creator_id;
        if creator_profile_id is not null then
            perform public.notify(creator_profile_id, 'post_changes_requested', 'Te han pedido cambios', clean_comment, '/creator/post/' || target_post_id);
        end if;
    end;
    $$;

    grant execute on function public.approve_post(uuid, text) to authenticated;
    grant execute on function public.request_post_changes(uuid, text) to authenticated;
