-- Panel de admin para un equipo con volumen:
--   · cuentas de admin individuales con rol (viewer / moderator / admin) y registro de auditoría
--   · asignación de reportes y solicitudes de eliminación a una persona del equipo
--   · vistas planas (solo clave de servicio) para buscar, filtrar y paginar EN LA BASE
--   · índices (incluido pg_trgm para búsqueda por texto) y analíticas agregadas en SQL
--   · admin_anonymize_account: vaciar los datos personales de una cuenta sin borrar el registro compartido
-- Todo aditivo: no toca datos existentes. Lo escribe y lee solo el servidor con la clave de servicio.
--
-- ROLLBACK:
--   drop function if exists public.admin_anonymize_account(uuid);
--   drop function if exists public.admin_analytics(text);
--   drop view if exists public.admin_activity_view, public.admin_deletion_requests_view, public.admin_reports_view, public.admin_users_view;
--   alter table public.reports drop column if exists assigned_to;
--   alter table public.account_deletion_requests drop column if exists assigned_to;
--   drop table if exists public.admin_audit_log;
--   drop table if exists public.admin_members;
--   drop index if exists public.idx_reports_status_created, public.idx_reports_reporter, public.idx_reports_assigned,
--     public.idx_adr_status_created, public.idx_profiles_created_at, public.idx_collaborations_created_at,
--     public.idx_collaborations_paid_at, public.idx_subscriptions_created_at,
--     public.idx_profiles_full_name_trgm, public.idx_creators_display_name_trgm, public.idx_partners_company_name_trgm;

begin;

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------- equipo y auditoría
create table if not exists public.admin_members (
    id uuid primary key default gen_random_uuid(),
    email text not null unique check (email = lower(email) and char_length(email) between 5 and 200),
    name text not null check (char_length(name) between 2 and 80),
    role text not null check (role in ('viewer', 'moderator', 'admin')),
    password_hash text not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    last_login_at timestamptz,
    created_by text
);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon, authenticated;

create table if not exists public.admin_audit_log (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    actor_id uuid,
    actor_name text not null,
    action text not null,
    target_type text,
    target_id text,
    target_label text,
    detail jsonb
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
create index if not exists idx_admin_audit_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_target on public.admin_audit_log (target_id, created_at desc);
create index if not exists idx_admin_audit_actor on public.admin_audit_log (actor_id, created_at desc);

-- ---------------------------------------------------------------- asignación
alter table public.reports add column if not exists assigned_to uuid references public.admin_members (id) on delete set null;
alter table public.account_deletion_requests add column if not exists assigned_to uuid references public.admin_members (id) on delete set null;

-- ---------------------------------------------------------------- índices
create index if not exists idx_reports_status_created on public.reports (status, created_at desc);
create index if not exists idx_reports_reporter on public.reports (reporter_profile_id);
create index if not exists idx_reports_assigned on public.reports (assigned_to) where assigned_to is not null;
create index if not exists idx_adr_status_created on public.account_deletion_requests (status, created_at desc);
create index if not exists idx_profiles_created_at on public.profiles (created_at desc);
create index if not exists idx_collaborations_created_at on public.collaborations (created_at desc);
create index if not exists idx_collaborations_paid_at on public.collaborations (paid_at) where paid_at is not null;
create index if not exists idx_subscriptions_created_at on public.subscriptions (created_at desc);
create index if not exists idx_profiles_full_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index if not exists idx_creators_display_name_trgm on public.creators using gin (display_name extensions.gin_trgm_ops);
create index if not exists idx_partners_company_name_trgm on public.partners using gin (company_name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------- vistas (solo clave de servicio)
create or replace view public.admin_users_view as
select
    p.id,
    u.email::text as email,
    p.full_name,
    p.role,
    p.created_at,
    u.last_sign_in_at,
    (u.banned_until is not null and u.banned_until > now()) as banned,
    c.id as creator_id,
    case when pa.id is not null then pa.verified_at is not null end as partner_verified,
    coalesce(c.display_name, pa.company_name) as display_name,
    s.plan_id,
    s.status as plan_status,
    s.current_period_end as plan_expires_at,
    exists (select 1 from public.account_deletion_requests d where d.profile_id = p.id and d.status = 'pending') as deletion_pending
from public.profiles p
left join auth.users u on u.id = p.id
left join public.creators c on c.profile_id = p.id
left join public.partners pa on pa.profile_id = p.id
left join public.subscriptions s on s.creator_id = c.id;

create or replace view public.admin_reports_view as
select
    r.id, r.reason, r.detail, r.created_at, r.status, r.admin_note, r.resolved_at,
    r.assigned_to, m.name as assigned_name,
    r.reporter_profile_id, rp.full_name as reporter_name, rp.role as reporter_role,
    col.id as collaboration_id, col.brief as collaboration_brief, col.status as collaboration_status,
    col.budget_cents, (col.paid_at is not null) as paid,
    cr.display_name as creator_name, pa.company_name as partner_name,
    case when pa.profile_id = r.reporter_profile_id then cr.profile_id else pa.profile_id end as reported_profile_id,
    case when pa.profile_id = r.reporter_profile_id then cr.display_name else pa.company_name end as reported_name
from public.reports r
left join public.profiles rp on rp.id = r.reporter_profile_id
left join public.collaborations col on col.id = r.collaboration_id
left join public.creators cr on cr.id = col.creator_id
left join public.partners pa on pa.id = col.partner_id
left join public.admin_members m on m.id = r.assigned_to;

create or replace view public.admin_deletion_requests_view as
select
    d.id, d.profile_id, d.reason, d.status, d.created_at, d.resolved_at, d.assigned_to, m.name as assigned_name,
    coalesce(p.full_name, 'Sin nombre') as name, p.role, u.email::text as email
from public.account_deletion_requests d
left join public.profiles p on p.id = d.profile_id
left join auth.users u on u.id = d.profile_id
left join public.admin_members m on m.id = d.assigned_to;

create or replace view public.admin_activity_view as
    select 'signup'::text as type, p.created_at, p.id as profile_id, p.id::text as ref_id,
           coalesce(p.full_name, 'Alguien') || ' se ha registrado como ' || case when p.role = 'creator' then 'creador de contenido' else 'partner' end as summary
    from public.profiles p
  union all
    select 'collaboration_created', col.created_at,
           case when col.initiated_by = 'creator' then cr.profile_id else pa.profile_id end, col.id::text,
           case when col.initiated_by = 'creator'
                then coalesce(cr.display_name, 'Un creador') || ' solicitó una colaboración a ' || coalesce(pa.company_name, 'un partner')
                else coalesce(pa.company_name, 'Un partner') || ' propuso una colaboración a ' || coalesce(cr.display_name, 'un creador') end
    from public.collaborations col
    left join public.creators cr on cr.id = col.creator_id
    left join public.partners pa on pa.id = col.partner_id
  union all
    select 'payment', col.paid_at, pa.profile_id, col.id::text,
           coalesce(pa.company_name, 'Un partner') || ' pagó ' || round(coalesce(col.budget_cents, 0) / 100.0)::int::text || ' € a ' || coalesce(cr.display_name, 'un creador')
    from public.collaborations col
    left join public.creators cr on cr.id = col.creator_id
    left join public.partners pa on pa.id = col.partner_id
    where col.paid_at is not null
  union all
    select 'collaboration_cancelled', col.cancelled_at, cr.profile_id, col.id::text,
           'Se canceló la colaboración entre ' || coalesce(pa.company_name, 'un partner') || ' y ' || coalesce(cr.display_name, 'un creador')
    from public.collaborations col
    left join public.creators cr on cr.id = col.creator_id
    left join public.partners pa on pa.id = col.partner_id
    where col.cancelled_at is not null
  union all
    select 'collaboration_terminated', col.terminated_at, col.terminated_by, col.id::text,
           'Terminada por incumplimiento: ' || coalesce(pa.company_name, 'un partner') || ' y ' || coalesce(cr.display_name, 'un creador')
    from public.collaborations col
    left join public.creators cr on cr.id = col.creator_id
    left join public.partners pa on pa.id = col.partner_id
    where col.terminated_at is not null
  union all
    select case when s.stripe_subscription_id is not null then 'pro_paid' else 'pro_gifted' end, s.created_at, cr.profile_id, s.id::text,
           coalesce(cr.display_name, 'Un creador') || ' se hizo Pro (' || case when s.stripe_subscription_id is not null then 'pago real' else 'regalo del equipo' end || ')'
    from public.subscriptions s
    left join public.creators cr on cr.id = s.creator_id
  union all
    select 'report_created', r.created_at, r.reporter_profile_id, r.id::text,
           coalesce(rp.full_name, 'Alguien') || ' ha enviado un reporte (' ||
             case r.reason when 'spam' then 'spam' when 'unrealistic_budget' then 'presupuesto poco serio' when 'inappropriate' then 'contenido inapropiado'
                           when 'breach' then 'incumplimiento' else 'otro motivo' end || ')'
    from public.reports r
    left join public.profiles rp on rp.id = r.reporter_profile_id
  union all
    select 'deletion_requested', d.created_at, d.profile_id, d.id::text,
           coalesce(p.full_name, 'Alguien') || ' ha pedido eliminar su cuenta'
    from public.account_deletion_requests d
    left join public.profiles p on p.id = d.profile_id
  union all
    select 'admin_action', a.created_at,
           case when a.target_type = 'user' and a.target_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then a.target_id::uuid end,
           a.id::text,
           a.actor_name || ': ' || a.action || coalesce(' · ' || a.target_label, '')
    from public.admin_audit_log a;

revoke all on public.admin_users_view, public.admin_reports_view, public.admin_deletion_requests_view, public.admin_activity_view from public, anon, authenticated;
grant select on public.admin_users_view, public.admin_reports_view, public.admin_deletion_requests_view, public.admin_activity_view to service_role;

-- ---------------------------------------------------------------- analíticas agregadas en la base
create or replace function public.admin_analytics(p_unit text)
returns table (bucket integer, signups integer, collaborations integer, revenue_cents bigint, pro_paid integer, pro_gifted integer)
language sql stable security definer set search_path = public as $$
    with cfg as (
        select case when p_unit = 'month' then 30 else 7 end as bd, case when p_unit = 'month' then 6 else 8 end as n
    ), b as (
        select i,
               now() - ((cfg.n - i) * cfg.bd) * interval '1 day' as s,
               now() - ((cfg.n - 1 - i) * cfg.bd) * interval '1 day' as e
        from cfg, generate_series(0, (select n from cfg) - 1) as i
    )
    select b.i,
           (select count(*) from public.profiles x where x.created_at > b.s and x.created_at <= b.e)::integer,
           (select count(*) from public.collaborations x where x.created_at > b.s and x.created_at <= b.e)::integer,
           (select coalesce(sum(x.budget_cents), 0) from public.collaborations x where x.paid_at > b.s and x.paid_at <= b.e)::bigint,
           (select count(*) from public.subscriptions x where x.stripe_subscription_id is not null and x.created_at > b.s and x.created_at <= b.e)::integer,
           (select count(*) from public.subscriptions x where x.stripe_subscription_id is null and x.created_at > b.s and x.created_at <= b.e)::integer
    from b order by b.i;
$$;
revoke all on function public.admin_analytics(text) from public, anon, authenticated;
grant execute on function public.admin_analytics(text) to service_role;

-- ---------------------------------------------------------------- anonimizar una cuenta (docs/14, opción A)
-- Vacía los datos personales y deja el registro de colaboraciones, chats y reportes que la otra parte necesita.
-- El acceso (login) se bloquea desde el servidor con la API de Auth. Devuelve cuántas filas ha tocado de cada cosa.
create or replace function public.admin_anonymize_account(p_profile_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_creator uuid;
    v_partner uuid;
    v_packages int := 0;
    v_socials int := 0;
    v_posts int := 0;
begin
    if not exists (select 1 from public.profiles where id = p_profile_id) then
        raise exception 'Perfil no encontrado';
    end if;
    select id into v_creator from public.creators where profile_id = p_profile_id;
    select id into v_partner from public.partners where profile_id = p_profile_id;

    update public.profiles set full_name = 'Cuenta eliminada', avatar_url = null, public_profile_enabled = false where id = p_profile_id;

    if v_creator is not null then
        update public.creators set
            display_name = 'Cuenta eliminada', niche = null, bio = null, avatar_url = null, cover_url = null, headline = null,
            location = null, looking_for = null, categories = '{}', audience = '{}'::jsonb, min_rate_cents = null, max_rate_cents = null
        where id = v_creator;
        delete from public.social_accounts where creator_id = v_creator;
        get diagnostics v_socials = row_count;
        -- Solo el contenido propio: lo que cuelga de una colaboración lo conserva la otra parte.
        delete from public.posts where creator_id = v_creator and collaboration_id is null;
        get diagnostics v_posts = row_count;
    end if;

    if v_partner is not null then
        update public.partners set
            company_name = 'Cuenta eliminada', industry = null, bio = null, cover_url = null, headline = null, location = null,
            website = null, looking_for = null, categories = '{}', collaboration_types = '{}', min_budget_cents = null, max_budget_cents = null,
            verified_at = null
        where id = v_partner;
    end if;

    delete from public.packages where profile_id = p_profile_id;
    get diagnostics v_packages = row_count;

    return jsonb_build_object('packages', v_packages, 'social_accounts', v_socials, 'posts', v_posts);
end;
$$;
revoke all on function public.admin_anonymize_account(uuid) from public, anon, authenticated;
grant execute on function public.admin_anonymize_account(uuid) to service_role;

commit;
