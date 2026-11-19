-- ============================================================================
-- FEEDMA — Seguridad a nivel de fila (RLS)
--
-- Regla de oro de este proyecto: TODA tabla tiene RLS activado, sin excepción,
-- desde el primer día — incluso en desarrollo. Nada se consulta "porque total
-- es de prueba": si una tabla existe, tiene política, o nadie (aparte del
-- service_role del servidor) puede leerla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Funciones auxiliares (security definer): devuelven la fila del usuario
-- logueado para cada rol, o null si no le corresponde. Evitan repetir
-- subconsultas en cada policy y evitan la recursión infinita típica de RLS.
-- ----------------------------------------------------------------------------
create or replace function public.current_manager_id()
returns uuid
language sql stable security definer set search_path = public
as $$
    select id from public.managers where profile_id = auth.uid();
$$;

create or replace function public.current_influencer_id()
returns uuid
language sql stable security definer set search_path = public
as $$
    select id from public.influencers where profile_id = auth.uid();
$$;

create or replace function public.current_brand_client_id()
returns uuid
language sql stable security definer set search_path = public
as $$
    select id from public.brand_clients where profile_id = auth.uid();
$$;

-- ¿El influencer indicado está en el roster del manager logueado?
create or replace function public.is_in_my_roster(target_influencer_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.influencers
        where id = target_influencer_id
        and manager_id = public.current_manager_id()
    );
$$;

-- ¿Tengo (como marca) una colaboración activa con este influencer?
-- Esto es lo que evita que una marca vea TODO el contenido del influencer:
-- solo ve lo que está atado a una colaboración suya.
create or replace function public.has_active_collaboration_with(target_influencer_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.collaborations
        where influencer_id = target_influencer_id
        and brand_client_id = public.current_brand_client_id()
    );
$$;

-- ----------------------------------------------------------------------------
-- Activar RLS en todo
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.managers enable row level security;
alter table public.influencers enable row level security;
alter table public.brand_clients enable row level security;
alter table public.collaborations enable row level security;
alter table public.social_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.metrics enable row level security;
alter table public.ml_predictions enable row level security;
alter table public.trends enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES: cada uno ve y edita solo su propia fila.
-- ----------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles for select
    using (id = auth.uid());

create policy "profiles_update_own" on public.profiles for update
    using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- MANAGERS: el propio manager ve/edita su ficha. Es además un directorio
-- público para que las marcas puedan descubrir agencias (datos no sensibles:
-- nombre, especialidad — nunca tokens ni nada de dinero).
-- ----------------------------------------------------------------------------
create policy "managers_select_public_directory" on public.managers for select
    to authenticated using (true);

create policy "managers_update_own" on public.managers for update
    using (profile_id = auth.uid());

create policy "managers_insert_own" on public.managers for insert
    with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- INFLUENCERS: mismo criterio que managers — directorio público de solo
-- lectura (para "Descubrir"), pero solo el propio influencer o su manager
-- pueden editar su ficha.
-- ----------------------------------------------------------------------------
create policy "influencers_select_public_directory" on public.influencers for select
    to authenticated using (true);

create policy "influencers_update_self_or_manager" on public.influencers for update
    using (profile_id = auth.uid() or manager_id = public.current_manager_id());

create policy "influencers_insert_own" on public.influencers for insert
    with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- BRAND_CLIENTS: la marca ve/edita su propia ficha. Un influencer o manager
-- con una colaboración activa puede VER (no editar) el nombre de la marca
-- con la que está trabajando.
-- ----------------------------------------------------------------------------
create policy "brand_clients_select_own" on public.brand_clients for select
    using (
        profile_id = auth.uid()
        or id in (
            select brand_client_id from public.collaborations
            where influencer_id = public.current_influencer_id()
            or manager_id = public.current_manager_id()
        )
    );

create policy "brand_clients_update_own" on public.brand_clients for update
    using (profile_id = auth.uid());

create policy "brand_clients_insert_own" on public.brand_clients for insert
    with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- COLLABORATIONS: el "contrato" del marketplace. Cada parte ve solo las
-- suyas. La marca crea la solicitud; el manager (si aplica) la asigna;
-- cualquiera de las tres partes implicadas puede actualizarla (aceptar,
-- asignar influencer, declinar) — nunca alguien externo.
-- ----------------------------------------------------------------------------
create policy "collaborations_select_own" on public.collaborations for select
    using (
        brand_client_id = public.current_brand_client_id()
        or manager_id = public.current_manager_id()
        or influencer_id = public.current_influencer_id()
    );

create policy "collaborations_insert_by_brand" on public.collaborations for insert
    with check (brand_client_id = public.current_brand_client_id());

create policy "collaborations_update_involved_parties" on public.collaborations for update
    using (
        brand_client_id = public.current_brand_client_id()
        or manager_id = public.current_manager_id()
        or influencer_id = public.current_influencer_id()
    );

-- ----------------------------------------------------------------------------
-- SOCIAL_ACCOUNTS: datos de conexión (tokens incluidos) — nunca públicos.
-- Solo el propio influencer gestiona sus redes; su manager puede verlas
-- (para el panel "roster") pero no tocarlas.
-- ----------------------------------------------------------------------------
create policy "social_accounts_select_self_or_manager" on public.social_accounts for select
    using (
        influencer_id = public.current_influencer_id()
        or public.is_in_my_roster(influencer_id)
    );

create policy "social_accounts_insert_self" on public.social_accounts for insert
    with check (influencer_id = public.current_influencer_id());

create policy "social_accounts_update_self" on public.social_accounts for update
    using (influencer_id = public.current_influencer_id());

create policy "social_accounts_delete_self" on public.social_accounts for delete
    using (influencer_id = public.current_influencer_id());

-- ----------------------------------------------------------------------------
-- POSTS: la política más delicada del esquema.
--   - El influencer ve/edita los suyos.
--   - Su manager los ve/edita también (gestiona el tablero del roster).
--   - La marca SOLO ve los posts atados a UNA colaboración suya — nunca el
--     resto del contenido del influencer. Y no puede editarlos directo:
--     aprobar/pedir cambios se hace con las funciones de la migración 3,
--     no dándole UPDATE libre sobre la tabla.
-- ----------------------------------------------------------------------------
create policy "posts_select_scoped" on public.posts for select
    using (
        influencer_id = public.current_influencer_id()
        or public.is_in_my_roster(influencer_id)
        or (collaboration_id is not null and exists (
            select 1 from public.collaborations c
            where c.id = posts.collaboration_id
            and c.brand_client_id = public.current_brand_client_id()
        ))
    );

create policy "posts_insert_self_or_manager" on public.posts for insert
    with check (
        influencer_id = public.current_influencer_id()
        or public.is_in_my_roster(influencer_id)
    );

create policy "posts_update_self_or_manager" on public.posts for update
    using (
        influencer_id = public.current_influencer_id()
        or public.is_in_my_roster(influencer_id)
    );

create policy "posts_delete_self_or_manager" on public.posts for delete
    using (
        influencer_id = public.current_influencer_id()
        or public.is_in_my_roster(influencer_id)
    );

-- ----------------------------------------------------------------------------
-- METRICS / ML_PREDICTIONS: de solo lectura para quien pueda ver el post.
-- La escritura es exclusiva del servidor (service_role, que salta RLS) —
-- por eso aquí NO hay policy de insert/update para "authenticated": si no
-- hay policy, no hay permiso, es la forma correcta de bloquearlo del todo.
-- ----------------------------------------------------------------------------
create policy "metrics_select_scoped" on public.metrics for select
    using (
        post_id in (
            select id from public.posts
            where influencer_id = public.current_influencer_id()
            or public.is_in_my_roster(influencer_id)
            or (collaboration_id is not null and exists (
                select 1 from public.collaborations c
                where c.id = posts.collaboration_id
                and c.brand_client_id = public.current_brand_client_id()
            ))
        )
    );

create policy "ml_predictions_select_scoped" on public.ml_predictions for select
    using (
        post_id in (
            select id from public.posts
            where influencer_id = public.current_influencer_id()
            or public.is_in_my_roster(influencer_id)
        )
    );

-- ----------------------------------------------------------------------------
-- TRENDS: catálogo global de la app, cualquier usuario logueado lo lee.
-- ----------------------------------------------------------------------------
create policy "trends_select_authenticated" on public.trends for select
    to authenticated using (true);

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS: cada cual ve solo la suya. Escritura solo por el webhook
-- de Stripe (service_role) — igual que metrics, sin policy = sin acceso.
-- ----------------------------------------------------------------------------
create policy "subscriptions_select_own" on public.subscriptions for select
    using (
        manager_id = public.current_manager_id()
        or influencer_id = public.current_influencer_id()
    );

-- ----------------------------------------------------------------------------
-- CREDIT_LEDGER: solo lectura de tu propio historial (o el de tu roster,
-- si eres manager).
-- ----------------------------------------------------------------------------
create policy "credit_ledger_select_scoped" on public.credit_ledger for select
    using (
        influencer_id = public.current_influencer_id()
        or public.is_in_my_roster(influencer_id)
    );
