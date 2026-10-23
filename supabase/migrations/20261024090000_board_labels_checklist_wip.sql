-- ============================================================================
-- FEEDMA — tablero con usabilidad "tipo Trello": etiquetas de color
-- reutilizables, checklist por card y límite de WIP por columna.
--
-- Todo esto es exclusivo del creador dueño del post — a diferencia de
-- `posts`, un partner con colaboración activa NO necesita ver ni gestionar
-- nada de esto todavía (no estaba pedido), así que el `select` se queda
-- igual de estricto que el resto ("solo el dueño"), sin la rama de
-- `has_active_collaboration_with` que sí tiene `posts_select_scoped`.
-- ============================================================================

-- Limpieza por si un intento anterior llegó a crear parte de esto antes de
-- fallar a mitad (CREATE TABLE no es idempotente, a diferencia de los ADD
-- COLUMN IF NOT EXISTS de más abajo) — sin usuarios reales todavía, se
-- recrea limpio en vez de parchear, mismo criterio que
-- 20261021120000_remove_manager_rename_creator_partner.sql. El CASCADE se
-- lleva también las policies e índices de cada tabla.
drop table if exists public.post_labels cascade;
drop table if exists public.checklist_items cascade;
drop table if exists public.labels cascade;

-- ----------------------------------------------------------------------------
-- 1. LABELS — etiquetas del creador, reutilizables entre posts (como en
--    Trello: se crean una vez y se reasignan). El nombre no es único a
--    propósito: nada obliga a ello en Trello tampoco.
-- ----------------------------------------------------------------------------
create table public.labels (
    id uuid primary key default gen_random_uuid(),
    creator_id uuid not null references public.creators(id) on delete cascade,
    name text not null,
    color text not null,
    created_at timestamptz not null default now()
);

create index idx_labels_creator_id on public.labels(creator_id);

alter table public.labels enable row level security;

create policy "labels_select_own" on public.labels for select
    using (creator_id = public.current_creator_id());

create policy "labels_insert_own" on public.labels for insert
    with check (creator_id = public.current_creator_id());

create policy "labels_update_own" on public.labels for update
    using (creator_id = public.current_creator_id());

create policy "labels_delete_own" on public.labels for delete
    using (creator_id = public.current_creator_id());

-- ----------------------------------------------------------------------------
-- 2. POST_LABELS — relación N:M entre posts y labels.
-- ----------------------------------------------------------------------------
create table public.post_labels (
    post_id uuid not null references public.posts(id) on delete cascade,
    label_id uuid not null references public.labels(id) on delete cascade,
    primary key (post_id, label_id)
);

create index idx_post_labels_post_id on public.post_labels(post_id);
create index idx_post_labels_label_id on public.post_labels(label_id);

alter table public.post_labels enable row level security;

create policy "post_labels_select_own" on public.post_labels for select
    using (post_id in (select id from public.posts where creator_id = public.current_creator_id()));

-- Comprueba dueño del post Y dueño de la etiqueta — sin esto, en teoría se
-- podría enlazar el id de una etiqueta ajena a un post propio si alguien
-- llegara a adivinarlo (aunque `labels_select_own` ya evita que la vea).
create policy "post_labels_insert_own" on public.post_labels for insert
    with check (
        post_id in (select id from public.posts where creator_id = public.current_creator_id())
        and label_id in (select id from public.labels where creator_id = public.current_creator_id())
    );

create policy "post_labels_delete_own" on public.post_labels for delete
    using (post_id in (select id from public.posts where creator_id = public.current_creator_id()));

-- ----------------------------------------------------------------------------
-- 3. CHECKLIST_ITEMS — subtareas de un post concreto (no reutilizables,
--    a diferencia de las labels).
-- ----------------------------------------------------------------------------
create table public.checklist_items (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    text text not null,
    done boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index idx_checklist_items_post_id on public.checklist_items(post_id);

alter table public.checklist_items enable row level security;

create policy "checklist_items_select_own" on public.checklist_items for select
    using (post_id in (select id from public.posts where creator_id = public.current_creator_id()));

create policy "checklist_items_insert_own" on public.checklist_items for insert
    with check (post_id in (select id from public.posts where creator_id = public.current_creator_id()));

create policy "checklist_items_update_own" on public.checklist_items for update
    using (post_id in (select id from public.posts where creator_id = public.current_creator_id()));

create policy "checklist_items_delete_own" on public.checklist_items for delete
    using (post_id in (select id from public.posts where creator_id = public.current_creator_id()));

-- ----------------------------------------------------------------------------
-- 4. WIP LIMITS — un número por fase, guardado como JSONB en `creators`
--    (ej. {"in_production": 3}) en vez de una tabla aparte: es solo una
--    preferencia de visualización del propio tablero, no un dato con
--    relaciones ni RLS propia que lo justifique.
-- ----------------------------------------------------------------------------
alter table public.creators add column if not exists board_wip_limits jsonb not null default '{}'::jsonb;
