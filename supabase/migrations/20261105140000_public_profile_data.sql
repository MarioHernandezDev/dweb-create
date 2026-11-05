-- ============================================================================
-- Perfil público rediseñado: los datos nuevos que enseña tienen su sitio al
-- crear/editar el perfil, y lo que se ve de otros sale de datos reales.
--
-- Datos que escribe la persona en su ficha (UPDATE concedido por columna):
--   creators / partners: headline (frase de presentación), location (ubicación),
--                        show_collaborations (mostrar con quién ha colaborado)
--   creators:            audience (audiencia declarada: países, edades, género)
--   partners:            website
--   posts:               featured_on_profile (el creador elige qué publicadas enseña)
--
-- Lo que se muestra de otros se calcula con funciones (security definer,
-- solo `authenticated`) que devuelven agregados o lo que su dueño eligió enseñar:
--   get_public_creator_stats   métricas medias por red (solo redes verificadas con OAuth)
--   get_public_creator_content publicaciones destacadas y ya publicadas, con sus métricas
--   get_public_collaborations  con quién ha completado colaboraciones (si no lo oculta)
--   get_public_activity        nº de colaboraciones y mediana de tiempo de respuesta
--
-- No toca pagos. No cambia ningún flujo existente.
--
-- ROLLBACK:
--   begin;
--   drop function if exists public.get_public_creator_stats(uuid), public.get_public_creator_content(uuid),
--     public.get_public_collaborations(text, uuid), public.get_public_activity(text, uuid), public.audience_is_valid(jsonb);
--   alter table public.posts drop column if exists featured_on_profile;
--   alter table public.creators drop column if exists headline, drop column if exists location,
--     drop column if exists audience, drop column if exists show_collaborations;
--   alter table public.partners drop column if exists headline, drop column if exists location,
--     drop column if exists website, drop column if exists show_collaborations;
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido (solo en el Supabase local).
-- ============================================================================
begin;

-- ---- Validación de la audiencia declarada ---------------------------------
-- { countries: [{name, pct}], ages: [{range, pct}], gender: {female, male, other} }
-- Porcentajes 0–100, cada bloque suma como mucho 100, tamaños acotados.
create or replace function public.audience_is_valid(a jsonb)
returns boolean
language plpgsql immutable
as $$
declare
    el jsonb;
    total numeric;
    k text;
begin
    if a is null or jsonb_typeof(a) <> 'object' then return false; end if;
    if pg_column_size(a) > 4000 then return false; end if;
    for k in select jsonb_object_keys(a) loop
        if k not in ('countries', 'ages', 'gender') then return false; end if;
    end loop;

    if a ? 'countries' then
        if jsonb_typeof(a->'countries') <> 'array' or jsonb_array_length(a->'countries') > 6 then return false; end if;
        total := 0;
        for el in select * from jsonb_array_elements(a->'countries') loop
            if jsonb_typeof(el) <> 'object' or jsonb_typeof(el->'name') <> 'string' or char_length(el->>'name') not between 1 and 60
               or jsonb_typeof(el->'pct') <> 'number' or (el->>'pct')::numeric not between 0 and 100 then return false; end if;
            total := total + (el->>'pct')::numeric;
        end loop;
        if total > 100.0001 then return false; end if;
    end if;

    if a ? 'ages' then
        if jsonb_typeof(a->'ages') <> 'array' or jsonb_array_length(a->'ages') > 8 then return false; end if;
        total := 0;
        for el in select * from jsonb_array_elements(a->'ages') loop
            if jsonb_typeof(el) <> 'object' or jsonb_typeof(el->'range') <> 'string' or char_length(el->>'range') not between 1 and 20
               or jsonb_typeof(el->'pct') <> 'number' or (el->>'pct')::numeric not between 0 and 100 then return false; end if;
            total := total + (el->>'pct')::numeric;
        end loop;
        if total > 100.0001 then return false; end if;
    end if;

    if a ? 'gender' then
        if jsonb_typeof(a->'gender') <> 'object' then return false; end if;
        total := 0;
        for k in select jsonb_object_keys(a->'gender') loop
            if k not in ('female', 'male', 'other') then return false; end if;
            if jsonb_typeof(a->'gender'->k) <> 'number' or (a->'gender'->>k)::numeric not between 0 and 100 then return false; end if;
            total := total + (a->'gender'->>k)::numeric;
        end loop;
        if total > 100.0001 then return false; end if;
    end if;
    return true;
end;
$$;

-- ---- Columnas nuevas -------------------------------------------------------
alter table public.creators
    add column if not exists headline text check (headline is null or char_length(headline) <= 80),
    add column if not exists location text check (location is null or char_length(location) <= 80),
    add column if not exists audience jsonb not null default '{}'::jsonb check (public.audience_is_valid(audience)),
    add column if not exists show_collaborations boolean not null default true;

alter table public.partners
    add column if not exists headline text check (headline is null or char_length(headline) <= 80),
    add column if not exists location text check (location is null or char_length(location) <= 80),
    add column if not exists website text check (website is null or (char_length(website) <= 200 and website ~* '^https?://[^\s]+$')),
    add column if not exists show_collaborations boolean not null default true;

alter table public.posts
    add column if not exists featured_on_profile boolean not null default false;

-- creators tiene SELECT/UPDATE por columna (20261103170000): se añaden las nuevas.
grant select (headline, location, audience, show_collaborations) on public.creators to authenticated;
grant update (headline, location, audience, show_collaborations) on public.creators to authenticated;
-- partners: SELECT abierto (directorio); UPDATE por columna.
grant update (headline, location, website, show_collaborations) on public.partners to authenticated;

-- ---- Métricas medias por red ----------------------------------------------
create or replace function public.get_public_creator_stats(p_creator_id uuid)
returns table (platform text, handle text, followers bigint, posts_published integer, measured_posts integer,
               avg_views numeric, avg_likes numeric, avg_comments numeric, engagement numeric)
language sql security definer set search_path = public stable
as $$
    with latest as (
        select distinct on (m.post_id) m.post_id, m.views, m.likes, m.comments, m.engagement_rate
        from public.metrics m
        order by m.post_id, m.captured_at desc
    ),
    per_post as (
        select p.platform, l.views, l.likes, l.comments, l.engagement_rate
        from public.posts p
        join latest l on l.post_id = p.id
        where p.creator_id = p_creator_id and p.status = 'published'
    )
    select sa.platform, sa.handle, sa.followers_count,
           (select count(*)::int from public.posts p where p.creator_id = p_creator_id and p.status = 'published' and p.platform = sa.platform),
           (select count(*)::int from per_post pp where pp.platform = sa.platform),
           (select round(avg(pp.views)) from per_post pp where pp.platform = sa.platform),
           (select round(avg(pp.likes)) from per_post pp where pp.platform = sa.platform),
           (select round(avg(pp.comments)) from per_post pp where pp.platform = sa.platform),
           (select round(avg(pp.engagement_rate), 2) from per_post pp where pp.platform = sa.platform)
    from public.social_accounts sa
    where sa.creator_id = p_creator_id and sa.access_token_encrypted is not null
    order by sa.followers_count desc;
$$;

-- ---- Contenido destacado ----------------------------------------------------
create or replace function public.get_public_creator_content(p_creator_id uuid)
returns table (post_id uuid, title text, platform text, content_type text, media_url text, external_url text,
               views bigint, likes bigint, published_at timestamptz)
language sql security definer set search_path = public stable
as $$
    select p.id, p.title, p.platform, p.content_type, p.media_url, l.external_url,
           m.views, m.likes, coalesce(p.published_at, p.updated_at)
    from public.posts p
    left join public.post_external_links l on l.post_id = p.id
    left join lateral (
        select views, likes from public.metrics where post_id = p.id order by captured_at desc limit 1
    ) m on true
    where p.creator_id = p_creator_id and p.status = 'published' and p.featured_on_profile
    order by coalesce(p.published_at, p.updated_at) desc
    limit 24;
$$;

-- ---- Con quién ha colaborado -----------------------------------------------
create or replace function public.get_public_collaborations(p_role text, p_id uuid)
returns table (counterpart_id uuid, counterpart_name text, completed_at timestamptz)
language plpgsql security definer set search_path = public stable
as $$
begin
    if p_role = 'creator' then
        if not exists (select 1 from public.creators where id = p_id and show_collaborations) then return; end if;
        return query
            select pa.id, pa.company_name, max(c.updated_at)
            from public.collaborations c join public.partners pa on pa.id = c.partner_id
            where c.creator_id = p_id and c.status = 'completed'
            group by pa.id, pa.company_name
            order by max(c.updated_at) desc limit 24;
    elsif p_role = 'partner' then
        if not exists (select 1 from public.partners where id = p_id and show_collaborations) then return; end if;
        return query
            select cr.id, cr.display_name, max(c.updated_at)
            from public.collaborations c join public.creators cr on cr.id = c.creator_id
            where c.partner_id = p_id and c.status = 'completed'
            group by cr.id, cr.display_name
            order by max(c.updated_at) desc limit 24;
    end if;
end;
$$;

-- ---- Actividad: nº de colaboraciones y tiempo de respuesta -------------------
create or replace function public.get_public_activity(p_role text, p_id uuid)
returns table (collab_count integer, response_hours numeric, response_samples integer)
language sql security definer set search_path = public stable
as $$
    with mine as (
        select c.id, c.status, c.initiated_by
        from public.collaborations c
        where (p_role = 'creator' and c.creator_id = p_id) or (p_role = 'partner' and c.partner_id = p_id)
    ),
    resp as (
        -- Solo solicitudes que le enviaron a esta ficha (las inició la otra parte).
        select extract(epoch from (a.created_at - r.created_at)) / 3600.0 as hours
        from mine m
        join lateral (select min(created_at) created_at from public.collaboration_events where collaboration_id = m.id and kind = 'requested') r on true
        join lateral (select min(created_at) created_at from public.collaboration_events where collaboration_id = m.id and kind in ('accepted', 'declined')) a on true
        where m.initiated_by <> p_role and r.created_at is not null and a.created_at is not null and a.created_at >= r.created_at
    )
    select (select count(*)::int from mine where status in ('accepted', 'in_progress', 'completed')),
           (select round((percentile_cont(0.5) within group (order by hours))::numeric, 1) from resp),
           (select count(*)::int from resp);
$$;

revoke all on function public.get_public_creator_stats(uuid), public.get_public_creator_content(uuid),
    public.get_public_collaborations(text, uuid), public.get_public_activity(text, uuid) from public, anon;
grant execute on function public.get_public_creator_stats(uuid), public.get_public_creator_content(uuid),
    public.get_public_collaborations(text, uuid), public.get_public_activity(text, uuid) to authenticated, service_role;

commit;
