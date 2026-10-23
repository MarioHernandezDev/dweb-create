-- ============================================================================
-- FEEDMA — valoraciones mutuas entre creador y partner (MVP de confianza).
--
-- Solo se puede valorar una colaboración con `status = 'completed'` —
-- señal que ahora sí es fiable gracias a `mark_collaboration_completed()`
-- (20261025090000_phase1_security_payments.sql). Antes de esa migración no
-- existía ninguna forma honesta de anclar una valoración a "esto se
-- completó de verdad", así que esta pieza dependía de aquella.
--
-- Una valoración por persona y colaboración (constraint unique), y nunca
-- editable una vez enviada (sin policy de update/delete para el cliente) —
-- mitigación simple contra reseñas manipuladas, sin construir todavía un
-- sistema de moderación completo (fuera de alcance de este incremento).
--
-- Escrita para poder ejecutarse más de una vez sin reventar (misma
-- convención que el resto de migraciones de este proyecto).
-- ============================================================================

drop table if exists public.collaboration_ratings cascade;

create table public.collaboration_ratings (
    id uuid primary key default gen_random_uuid(),
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    rater_profile_id uuid not null references public.profiles(id) on delete cascade,
    ratee_profile_id uuid not null references public.profiles(id) on delete cascade,
    stars smallint not null check (stars between 1 and 5),
    comment text check (comment is null or char_length(comment) <= 500),
    created_at timestamptz not null default now(),
    unique (collaboration_id, rater_profile_id)
);

create index idx_collaboration_ratings_ratee on public.collaboration_ratings(ratee_profile_id);
create index idx_collaboration_ratings_collaboration on public.collaboration_ratings(collaboration_id);

alter table public.collaboration_ratings enable row level security;

-- Visible para cualquier autenticado: es la base de la reputación pública
-- de un perfil (mismo criterio ya usado para `creators`/`partners`, ambos
-- directorios públicos de solo lectura). Nunca hay policy de insert/update/
-- delete para "authenticated" a propósito — la única puerta de escritura es
-- `submit_collaboration_rating`, más abajo.
create policy "collaboration_ratings_select_all" on public.collaboration_ratings for select
    to authenticated using (true);

-- ----------------------------------------------------------------------------
-- Enviar una valoración. Resuelve ella misma quién es el rater/ratee a
-- partir de auth.uid() y de la colaboración real — nunca se fía de un
-- profile_id que mande el cliente. Rechaza: colaboración inexistente, no
-- completada, quien llama no es parte de ella, o ya valoró antes.
-- ----------------------------------------------------------------------------
create or replace function public.submit_collaboration_rating(p_collaboration_id uuid, p_stars integer, p_comment text default null)
returns public.collaboration_ratings
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    me uuid := auth.uid();
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

    if coll.creator_id = public.current_creator_id() then
        select profile_id into rater_profile from public.creators where id = coll.creator_id;
        select profile_id into ratee_profile from public.partners where id = coll.partner_id;
        notify_link := '/creator/requests';
    elsif coll.partner_id = public.current_partner_id() then
        select profile_id into rater_profile from public.partners where id = coll.partner_id;
        select profile_id into ratee_profile from public.creators where id = coll.creator_id;
        notify_link := '/partner/profile';
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

grant execute on function public.submit_collaboration_rating(uuid, integer, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Resumen de reputación de un perfil (media + nº de valoraciones). Devuelve
-- siempre los datos crudos, sin ocultar nada aquí — es la UI quien decide
-- cuándo hay "suficientes" valoraciones para mostrar un número (ver
-- app/utils/ratings.ts), para no mezclar esa decisión de producto dentro
-- de la base de datos.
-- ----------------------------------------------------------------------------
create or replace function public.profile_rating_summary(p_profile_id uuid)
returns table(avg_stars numeric, rating_count integer)
language sql stable security definer set search_path = public
as $$
    select coalesce(avg(stars), 0)::numeric(10,2), count(*)::int
    from public.collaboration_ratings
    where ratee_profile_id = p_profile_id;
$$;

grant execute on function public.profile_rating_summary(uuid) to authenticated;
