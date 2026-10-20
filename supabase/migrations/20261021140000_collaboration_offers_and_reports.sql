-- ============================================================================
-- FEEDMA — negociación de presupuesto por contraofertas, y un mecanismo
-- mínimo para reportar solicitudes que parezcan spam o presupuestos poco
-- serios.
--
-- Diseño: `collaborations.budget_cents` sigue siendo la propuesta INICIAL
-- (la pone el partner al contactar, ver partner/discover.vue — no se toca
-- ese flujo). Cada ronda posterior de negociación es una fila en
-- `collaboration_offers`: un historial append-only, nunca se edita ni se
-- borra una oferta ya hecha, igual que un hilo de mensajes. "A quién le
-- toca responder" se calcula en el cliente a partir de quién hizo la
-- última oferta (o del partner, si todavía no hay ninguna — la propuesta
-- inicial siempre es suya). Solo se puede seguir negociando mientras la
-- colaboración sigue en 'requested'; en cuanto se acepta/rechaza, el hilo
-- se congela (el insert lo exige explícitamente más abajo).
-- ============================================================================

create table public.collaboration_offers (
    id uuid primary key default gen_random_uuid(),
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    proposed_by text not null check (proposed_by in ('creator', 'partner')),
    budget_cents integer not null check (budget_cents > 0),
    message text,
    created_at timestamptz not null default now()
);

create index idx_collaboration_offers_collaboration_id on public.collaboration_offers(collaboration_id, created_at);

alter table public.collaboration_offers enable row level security;

create policy "collaboration_offers_select_parties" on public.collaboration_offers for select
    using (
        exists (
            select 1 from public.collaborations c
            where c.id = collaboration_offers.collaboration_id
            and (c.creator_id = public.current_creator_id() or c.partner_id = public.current_partner_id())
        )
    );

-- El insert comprueba que quien escribe es de verdad la parte que dice ser
-- (`proposed_by` tiene que casar con tu propio rol en ESTA colaboración, no
-- te puedes hacer pasar por la otra parte) y que la negociación sigue
-- abierta (`status = 'requested'`) — ya aceptada o rechazada, se acabó.
create policy "collaboration_offers_insert_parties" on public.collaboration_offers for insert
    with check (
        exists (
            select 1 from public.collaborations c
            where c.id = collaboration_offers.collaboration_id
            and c.status = 'requested'
            and (
                (collaboration_offers.proposed_by = 'creator' and c.creator_id = public.current_creator_id())
                or (collaboration_offers.proposed_by = 'partner' and c.partner_id = public.current_partner_id())
            )
        )
    );

-- ----------------------------------------------------------------------------
-- Aviso a la otra parte cuando llega una contraoferta — mismo patrón que
-- notify_collaboration_created/_updated en 20261021110000_notifications.sql.
-- ----------------------------------------------------------------------------
create or replace function public.notify_collaboration_offer_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    target_profile_id uuid;
    target_link text;
    proposer_name text;
begin
    if new.proposed_by = 'creator' then
        select p.profile_id, cr.display_name into target_profile_id, proposer_name
        from public.collaborations c
        join public.partners p on p.id = c.partner_id
        join public.creators cr on cr.id = c.creator_id
        where c.id = new.collaboration_id;
        target_link := '/partner/requests';
    else
        select cr.profile_id, p.company_name into target_profile_id, proposer_name
        from public.collaborations c
        join public.creators cr on cr.id = c.creator_id
        join public.partners p on p.id = c.partner_id
        where c.id = new.collaboration_id;
        target_link := '/creator/requests';
    end if;

    perform public.notify(
        target_profile_id,
        'collaboration_countered',
        'Nueva contraoferta',
        coalesce(proposer_name, 'La otra parte') || ' ha propuesto un nuevo presupuesto.',
        target_link
    );
    return new;
end;
$$;

create trigger on_collaboration_offer_created
    after insert on public.collaboration_offers
    for each row execute function public.notify_collaboration_offer_created();

-- ----------------------------------------------------------------------------
-- REPORTS — solo escritura desde el cliente, a propósito: todavía no hay
-- ningún panel de moderación (no hay rol admin en la app), así que de
-- momento se revisan a mano desde el Table Editor de Supabase con la
-- service_role. Sin policy de select para "authenticated": nadie puede
-- leer reportes, ni siquiera el suyo propio.
-- ----------------------------------------------------------------------------
create table public.reports (
    id uuid primary key default gen_random_uuid(),
    collaboration_id uuid not null references public.collaborations(id) on delete cascade,
    reporter_profile_id uuid not null references public.profiles(id) on delete cascade,
    reason text not null check (reason in ('spam', 'unrealistic_budget', 'inappropriate', 'other')),
    detail text,
    created_at timestamptz not null default now()
);

create index idx_reports_collaboration_id on public.reports(collaboration_id);

alter table public.reports enable row level security;

create policy "reports_insert_parties" on public.reports for insert
    with check (
        reporter_profile_id = auth.uid()
        and exists (
            select 1 from public.collaborations c
            where c.id = reports.collaboration_id
            and (c.creator_id = public.current_creator_id() or c.partner_id = public.current_partner_id())
        )
    );
