-- ============================================================================
-- ROSTER_REQUESTS — el influencer pide unirse a la plantilla de un manager.
--
-- Hueco encontrado en producción: `influencers.manager_id` existe desde el
-- esquema inicial, pero nunca hubo ninguna pantalla que lo rellenase (el
-- paso "¿trabajas con un manager?" de onboarding.vue era decorativo). Esta
-- tabla es la solicitud de unirse; la relación en sí sigue viviendo en
-- `influencers.manager_id`, igual que antes.
-- ============================================================================

create table public.roster_requests (
    id uuid primary key default gen_random_uuid(),
    influencer_id uuid not null references public.influencers(id) on delete cascade,
    manager_id uuid not null references public.managers(id) on delete cascade,
    status text not null check (status in ('requested', 'accepted', 'declined')) default 'requested',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_roster_requests_influencer_id on public.roster_requests(influencer_id);
create index idx_roster_requests_manager_id on public.roster_requests(manager_id);

alter table public.roster_requests enable row level security;

-- El influencer ve sus propias solicitudes; el manager ve las que le llegan.
create policy "roster_requests_select_involved" on public.roster_requests for select
    using (
        influencer_id = public.current_influencer_id()
        or manager_id = public.current_manager_id()
    );

-- Solo el influencer puede pedir unirse (nunca el manager "afilia" a nadie
-- sin que lo pida él mismo).
create policy "roster_requests_insert_by_influencer" on public.roster_requests for insert
    with check (influencer_id = public.current_influencer_id());

-- El manager acepta/rechaza; el propio influencer puede retirar su solicitud.
create policy "roster_requests_update_involved" on public.roster_requests for update
    using (
        influencer_id = public.current_influencer_id()
        or manager_id = public.current_manager_id()
    );

-- `influencers_update_self_or_manager` exige que el manager YA sea el
-- manager del influencer para poder tocar su ficha — paradoja del huevo y
-- la gallina en el primer ingreso al roster. Este trigger corre como
-- security definer y cierra el círculo solo en el instante de aceptar.
create or replace function public.handle_roster_request_accepted()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if new.status = 'accepted' and old.status is distinct from 'accepted' then
        update public.influencers set manager_id = new.manager_id where id = new.influencer_id;
    end if;
    return new;
end;
$$;

create trigger on_roster_request_accepted
    after update on public.roster_requests
    for each row execute function public.handle_roster_request_accepted();
