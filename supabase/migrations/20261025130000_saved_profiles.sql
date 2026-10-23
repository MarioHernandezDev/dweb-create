-- ============================================================================
-- FEEDMA — favoritos: guardar un candidato visto en Descubrir para volver a
-- él más tarde sin tener que recordarlo ni repetir la búsqueda (roadmap de
-- producto, secciones 6 y 16 — "guardado de favoritos y listas de
-- selección"). Pura propiedad del que guarda, sin validación cruzada de
-- negocio (a diferencia de collaboration_ratings) — mismo criterio de
-- sencillez que `labels`: RLS de solo-lo-mío, sin funciones RPC.
--
-- `target_creator_id`/`target_partner_id`: exactamente una de las dos, nunca
-- las dos ni ninguna — el objetivo guardado es siempre de la tabla contraria
-- a la que mira `creators.id`/`partners.id` tal como ya circulan por
-- Descubrir (DiscoveryResult.id), así no hace falta resolver nada nuevo en
-- el cliente. Un FK real a cada tabla (en vez de un `target_id` genérico sin
-- FK) mantiene la integridad: si el perfil guardado se borra, la fila de
-- favorito se borra con él.
-- ============================================================================

drop table if exists public.saved_profiles cascade;

create table public.saved_profiles (
    id uuid primary key default gen_random_uuid(),
    owner_profile_id uuid not null references public.profiles(id) on delete cascade,
    target_creator_id uuid references public.creators(id) on delete cascade,
    target_partner_id uuid references public.partners(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint saved_profiles_exactly_one_target check (
        (target_creator_id is not null and target_partner_id is null)
        or (target_creator_id is null and target_partner_id is not null)
    )
);

-- Índices únicos parciales (no un `unique` normal): con columnas nulas, un
-- `unique(owner_profile_id, target_creator_id)` no evitaría dos favoritos de
-- partner duplicados, porque Postgres nunca considera que NULL = NULL.
create unique index saved_profiles_unique_creator on public.saved_profiles(owner_profile_id, target_creator_id) where target_creator_id is not null;
create unique index saved_profiles_unique_partner on public.saved_profiles(owner_profile_id, target_partner_id) where target_partner_id is not null;
create index idx_saved_profiles_owner on public.saved_profiles(owner_profile_id);

alter table public.saved_profiles enable row level security;

create policy "saved_profiles_select_own" on public.saved_profiles for select
    using (owner_profile_id = auth.uid());

create policy "saved_profiles_insert_own" on public.saved_profiles for insert
    with check (owner_profile_id = auth.uid());

create policy "saved_profiles_delete_own" on public.saved_profiles for delete
    using (owner_profile_id = auth.uid());
