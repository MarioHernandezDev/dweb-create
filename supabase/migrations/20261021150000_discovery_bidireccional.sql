-- ============================================================================
-- FEEDMA — "Descubrir" bidireccional (creador <-> partner) + registro de
-- búsquedas para analíticas de admin.
--
-- Hasta ahora `partner/discover.vue` era un listado plano sin filtros, y no
-- existía ningún "descubrir" para el creador (solo el partner podía iniciar
-- una colaboración — ver `collaborations_insert_by_partner`). Esta migración:
--
-- 1. Añade a `creators`/`partners` los campos mínimos para que un match
--    tenga sentido en los dos sentidos: qué categorías trabaja/busca, un
--    rango económico, una bio y un "qué busco" en texto libre.
-- 2. Abre `partners` como directorio público de solo lectura, igual que ya
--    lo era `creators` — sin esto, un creador no puede ni listar partners.
-- 3. Permite que una colaboración la inicie también el creador (antes solo
--    el partner podía `insert`): se añade `initiated_by` y se generaliza la
--    policy de insert y el aviso de notificación.
-- 4. Tabla `discovery_searches`: cada búsqueda (filtros normales o IA) deja
--    un registro de "qué pide la gente". A diferencia de `reports` (que sí
--    escribe el cliente directo), esto solo lo escribe
--    `server/api/discover/search.post.ts` con la service_role — por eso no
--    lleva ninguna policy de insert/select para "authenticated": sin
--    política no hay permiso, es la forma correcta de decir "esto es
--    enteramente del servidor" (mismo criterio que `metrics`/`ml_predictions`).
--
-- Escrita para poder ejecutarse más de una vez sin reventar (IF NOT EXISTS /
-- IF EXISTS / DROP+CREATE en todo lo que no lo soporta nativo) — por si un
-- primer intento se queda a medias (el SQL Editor de Supabase no envuelve
-- esto en una transacción) y hay que relanzarla entera tal cual.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Campos de ficha para matching, en ambos lados.
-- ----------------------------------------------------------------------------
alter table public.creators
    add column if not exists bio text,
    add column if not exists categories text[] not null default '{}'::text[],
    add column if not exists min_rate_cents integer,
    add column if not exists max_rate_cents integer,
    add column if not exists looking_for text;

alter table public.partners
    add column if not exists bio text,
    add column if not exists categories text[] not null default '{}'::text[],
    add column if not exists min_budget_cents integer,
    add column if not exists max_budget_cents integer,
    add column if not exists looking_for text;

-- Backfill: `niche`/`industry` ya eran texto libre de una sola categoría —
-- se usan como primera entrada de `categories` para no partir de cero en
-- los filtros. Quien edite su ficha después podrá afinar/ampliar la lista.
-- La condición `categories = '{}'` ya hace esto seguro de repetir: una vez
-- rellenas (a mano o por este backfill), una segunda pasada no las toca.
update public.creators set categories = array[niche] where niche is not null and categories = '{}'::text[];
update public.partners set categories = array[industry] where industry is not null and categories = '{}'::text[];

create index if not exists idx_creators_categories on public.creators using gin (categories);
create index if not exists idx_partners_categories on public.partners using gin (categories);

-- ----------------------------------------------------------------------------
-- 2. `partners` pasa a ser directorio público de solo lectura, igual que
--    `creators` (ver "creators_select_public_directory" en la migración de
--    renombrado) — necesario para que un creador pueda listar partners en
--    /creator/discover. No hay nada sensible en la tabla (sin tokens, sin
--    datos de pago): solo ficha de empresa. La policy vieja queda cubierta
--    por esta (más permisiva), así que se retira para no dejar RLS muerta.
-- ----------------------------------------------------------------------------
drop policy if exists "partners_select_own" on public.partners;
drop policy if exists "partners_select_public_directory" on public.partners;

create policy "partners_select_public_directory" on public.partners for select
    to authenticated using (true);

-- ----------------------------------------------------------------------------
-- 3. Colaboraciones iniciadas por cualquiera de las dos partes.
--
-- `initiated_by` registra quién mandó la primera propuesta (antes siempre
-- era el partner, implícito en el código) — lo necesita tanto la policy de
-- insert como `NegotiationPanel.vue` (a quién le toca responder si todavía
-- no hay ninguna contraoferta en `collaboration_offers`).
-- ----------------------------------------------------------------------------
alter table public.collaborations
    add column if not exists initiated_by text not null default 'partner' check (initiated_by in ('creator', 'partner'));

drop policy if exists "collaborations_insert_by_partner" on public.collaborations;
drop policy if exists "collaborations_insert_by_initiator" on public.collaborations;

create policy "collaborations_insert_by_initiator" on public.collaborations for insert
    with check (
        (initiated_by = 'partner' and partner_id = public.current_partner_id())
        or (initiated_by = 'creator' and creator_id = public.current_creator_id())
    );

-- Redefinida entera (CREATE OR REPLACE sustituye el cuerpo completo, y ya es
-- idempotente de por sí): ahora avisa a quien NO inició, sea quien sea.
create or replace function public.notify_collaboration_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    partner_name text;
    creator_name text;
    target_profile_id uuid;
begin
    if new.initiated_by = 'creator' then
        select profile_id, company_name into target_profile_id, partner_name from public.partners where id = new.partner_id;
        select display_name into creator_name from public.creators where id = new.creator_id;
        perform public.notify(target_profile_id, 'collaboration_requested', 'Nueva propuesta de colaboración', coalesce(creator_name, 'Un creador de contenido') || ' quiere colaborar contigo.', '/partner/requests');
    else
        select profile_id into target_profile_id from public.creators where id = new.creator_id;
        select company_name into partner_name from public.partners where id = new.partner_id;
        perform public.notify(target_profile_id, 'collaboration_requested', 'Nueva solicitud de colaboración', coalesce(partner_name, 'Un partner') || ' quiere colaborar contigo.', '/creator/requests');
    end if;
    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Registro de búsquedas en "Descubrir" — para la vista de analíticas del
--    admin ("qué pide la gente"). Sin ninguna policy de insert/select para
--    "authenticated" a propósito: solo lo escribe el servidor con la
--    service_role (ver cabecera de este archivo), igual que `metrics`/
--    `ml_predictions`.
-- ----------------------------------------------------------------------------
create table if not exists public.discovery_searches (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.profiles(id) on delete set null,
    searcher_role text not null check (searcher_role in ('creator', 'partner')),
    mode text not null check (mode in ('filters', 'ai')),
    query_text text,
    filters jsonb not null default '{}'::jsonb,
    results_count integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_discovery_searches_created_at on public.discovery_searches(created_at);

alter table public.discovery_searches enable row level security;
