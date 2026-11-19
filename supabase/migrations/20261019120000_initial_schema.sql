-- ============================================================================
-- FEEDMA — Esquema inicial (marketplace de 3 roles: manager, influencer, cliente)
-- Fase 2 del proyecto. Ver docs/2-DATABASE-SCHEMA.md para la explicación larga.
--
-- Esta migración SOLO crea estructura (tablas, índices, constraints).
-- La seguridad (RLS) vive en la siguiente migración a propósito, para que
-- quede clarísimo en el historial qué protege a qué.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES — extiende auth.users. Se crea sola vía trigger (ver migración 3).
-- ----------------------------------------------------------------------------
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('manager', 'influencer', 'client')),
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. MANAGERS — una agencia/representante. Una fila por profile con role='manager'.
-- ----------------------------------------------------------------------------
create table public.managers (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    agency_name text not null,
    focus text,
    bio text,
    created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. INFLUENCERS — un creador. manager_id null = trabaja independiente.
-- ----------------------------------------------------------------------------
create table public.influencers (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    manager_id uuid references public.managers(id) on delete set null,
    display_name text not null,
    niche text,
    bio text,
    avatar_url text,
    created_at timestamptz not null default now()
);

create index idx_influencers_manager_id on public.influencers(manager_id);

-- ----------------------------------------------------------------------------
-- 4. BRAND_CLIENTS — la marca que contrata. Una fila por profile con role='client'.
-- ----------------------------------------------------------------------------
create table public.brand_clients (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    company_name text not null,
    industry text,
    created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. COLLABORATIONS — el "contrato" del marketplace entre marca <-> influencer,
--    directo o a través de un manager. influencer_id se rellena al asignar
--    (de inmediato si es contacto directo; después, si pasa por un manager).
-- ----------------------------------------------------------------------------
create table public.collaborations (
    id uuid primary key default gen_random_uuid(),
    brand_client_id uuid not null references public.brand_clients(id) on delete cascade,
    manager_id uuid references public.managers(id) on delete set null,
    influencer_id uuid references public.influencers(id) on delete set null,
    status text not null check (
        status in ('requested', 'accepted', 'in_progress', 'completed', 'declined')
    ) default 'requested',
    brief text not null,
    budget_cents integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint collaboration_has_a_target check (manager_id is not null or influencer_id is not null)
);

create index idx_collaborations_brand_client_id on public.collaborations(brand_client_id);
create index idx_collaborations_manager_id on public.collaborations(manager_id);
create index idx_collaborations_influencer_id on public.collaborations(influencer_id);

-- ----------------------------------------------------------------------------
-- 6. SOCIAL_ACCOUNTS — redes conectadas por un influencer.
-- ----------------------------------------------------------------------------
create table public.social_accounts (
    id uuid primary key default gen_random_uuid(),
    influencer_id uuid not null references public.influencers(id) on delete cascade,
    platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin')),
    handle text,
    access_token_encrypted text,
    refresh_token_encrypted text,
    token_expires_at timestamptz,
    followers_count bigint not null default 0,
    connected_at timestamptz not null default now(),
    unique (influencer_id, platform)
);

create index idx_social_accounts_influencer_id on public.social_accounts(influencer_id);

-- ----------------------------------------------------------------------------
-- 7. POSTS — entregas de contenido (el tablero). collaboration_id es opcional:
--    un influencer puede publicar contenido propio sin que venga de un encargo.
-- ----------------------------------------------------------------------------
create table public.posts (
    id uuid primary key default gen_random_uuid(),
    influencer_id uuid not null references public.influencers(id) on delete cascade,
    collaboration_id uuid references public.collaborations(id) on delete set null,
    title text not null,
    caption text,
    content_type text not null check (content_type in ('video', 'reel', 'carousel', 'image', 'story')),
    platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin')),
    status text not null check (
        status in ('idea', 'in_production', 'ready_for_review', 'scheduled', 'published', 'overdue')
    ) default 'idea',
    due_date timestamptz not null,
    published_at timestamptz,
    media_url text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_posts_influencer_id on public.posts(influencer_id);
create index idx_posts_collaboration_id on public.posts(collaboration_id);
create index idx_posts_due_date on public.posts(due_date);
create index idx_posts_status on public.posts(status);

-- ----------------------------------------------------------------------------
-- 8. METRICS — snapshot de métricas por post. Solo las escribe el servidor
--    (jobs de sincronización), nunca el cliente — ver políticas en migración 2.
-- ----------------------------------------------------------------------------
create table public.metrics (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    social_account_id uuid references public.social_accounts(id) on delete set null,
    views bigint not null default 0,
    likes bigint not null default 0,
    comments bigint not null default 0,
    shares bigint not null default 0,
    saves bigint not null default 0,
    engagement_rate numeric(6,3),
    captured_at timestamptz not null default now()
);

create index idx_metrics_post_id on public.metrics(post_id);

-- ----------------------------------------------------------------------------
-- 9. ML_PREDICTIONS — resultado del motor de ML por post.
-- ----------------------------------------------------------------------------
create table public.ml_predictions (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    success_score numeric(5,2) not null check (success_score between 0 and 100),
    confidence numeric(4,3) check (confidence between 0 and 1),
    suggestions jsonb not null default '[]'::jsonb,
    model_version text,
    created_at timestamptz not null default now()
);

create index idx_ml_predictions_post_id on public.ml_predictions(post_id);

-- ----------------------------------------------------------------------------
-- 10. TRENDS — tendencias detectadas, visibles para toda la app (no por tenant).
-- ----------------------------------------------------------------------------
create table public.trends (
    id uuid primary key default gen_random_uuid(),
    platform text not null,
    topic text not null,
    description text,
    score numeric(5,2),
    detected_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 11. SUBSCRIPTIONS — el plan de pago, de un manager O de un influencer
--     (exactamente uno de los dos, nunca los dos ni ninguno).
-- ----------------------------------------------------------------------------
create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    manager_id uuid unique references public.managers(id) on delete cascade,
    influencer_id uuid unique references public.influencers(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    plan_id text not null default 'free' check (plan_id in ('free', 'starter', 'pro', 'agency')),
    status text not null check (
        status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')
    ) default 'trialing',
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint subscription_owner_is_exactly_one check (
        (manager_id is not null)::int + (influencer_id is not null)::int = 1
    )
);

-- ----------------------------------------------------------------------------
-- 12. CREDIT_LEDGER — consumo de créditos de ML, por influencer.
-- ----------------------------------------------------------------------------
create table public.credit_ledger (
    id uuid primary key default gen_random_uuid(),
    influencer_id uuid not null references public.influencers(id) on delete cascade,
    amount integer not null,
    reason text not null check (
        reason in ('subscription_grant', 'ml_prediction', 'trend_generation', 'adjustment', 'refund')
    ),
    related_post_id uuid references public.posts(id) on delete set null,
    created_at timestamptz not null default now()
);

create index idx_credit_ledger_influencer_id on public.credit_ledger(influencer_id);
