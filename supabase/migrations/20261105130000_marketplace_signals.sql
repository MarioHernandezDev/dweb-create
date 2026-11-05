-- ============================================================================
-- Señales de confianza del marketplace: marca verificada, tipos de colaboración
-- que ofrece una marca y caducidad de las propuestas.
--
--  · partners.verified_at — la concede el equipo de CIBERAN desde el panel de admin
--    (/api/admin/partners/:id/verify). NO la puede escribir el usuario: no está
--    en las columnas con UPDATE concedido, así que una marca no se autoverifica.
--  · partners.collaboration_types — qué formatos ofrece la marca (post, reel,
--    stories, ambassador). Lo edita la propia marca en su ficha; alimenta el
--    filtro «Tipo de colaboración» de Descubrir.
--  · collaborations.expires_at — una solicitud nueva (`requested`) caduca a los 7 días.
--    Las que ya existen quedan SIN caducidad (null): no se caducan solicitudes
--    antiguas de golpe. Aceptar una caducada falla en base de datos
--    (`accept_collaboration_request`); rechazarla sigue permitido. No cambia el
--    estado: «caducada» es `status = 'requested' and expires_at < now()`.
--
-- No toca pagos ni Stripe. No añade estados nuevos (los dos flujos y los
-- tests existentes siguen igual).
--
-- ROLLBACK:
--   begin;
--   drop trigger if exists collaborations_set_expiry on public.collaborations;
--   drop function if exists public.collaborations_set_expiry();
--   alter table public.collaborations drop column if exists expires_at;
--   alter table public.partners drop column if exists collaboration_types, drop column if exists verified_at;
--   -- y volver a ejecutar accept_collaboration_request de 20261104100000_collaboration_flow_phase1.sql
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido (solo en el Supabase local).
-- ============================================================================
begin;

alter table public.partners
    add column if not exists verified_at timestamptz,
    add column if not exists collaboration_types text[] not null default '{}'::text[];

alter table public.partners
    drop constraint if exists partners_collaboration_types_valid;
alter table public.partners
    add constraint partners_collaboration_types_valid
    check (collaboration_types <@ array['post', 'reel', 'stories', 'ambassador']::text[]);

-- La marca edita sus tipos; `verified_at` queda fuera a propósito.
grant update (collaboration_types) on public.partners to authenticated;

alter table public.collaborations
    add column if not exists expires_at timestamptz;

create or replace function public.collaborations_set_expiry()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'requested' then
        new.expires_at := now() + interval '7 days';
    end if;
    return new;
end;
$$;

drop trigger if exists collaborations_set_expiry on public.collaborations;
create trigger collaborations_set_expiry
    before insert on public.collaborations
    for each row execute function public.collaborations_set_expiry();

-- Aceptar: igual que antes + no se puede aceptar una solicitud caducada.
create or replace function public.accept_collaboration_request(p_collaboration_id uuid, p_agreed_budget_cents integer default null)
returns public.collaborations
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    valid_amount boolean;
begin
    select * into coll from public.collaborations where id = p_collaboration_id;
    if coll is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if coll.status <> 'requested' then
        raise exception 'Esta colaboración ya no está pendiente.';
    end if;
    if coll.expires_at is not null and coll.expires_at < now() then
        raise exception 'Esta propuesta ha caducado. Pide que te la envíen de nuevo.';
    end if;
    if p_agreed_budget_cents is not null then
        valid_amount := p_agreed_budget_cents = coll.budget_cents
            or exists (
                select 1 from public.collaboration_offers
                where collaboration_id = p_collaboration_id and budget_cents = p_agreed_budget_cents
            );
        if not valid_amount then
            raise exception 'Ese importe no coincide con ninguna propuesta real de esta negociación.';
        end if;
    end if;
    update public.collaborations
    set status = 'accepted',
        budget_cents = coalesce(p_agreed_budget_cents, budget_cents),
        updated_at = now()
    where id = p_collaboration_id and status = 'requested'
    returning * into coll;
    if not found then
        raise exception 'Esta colaboración ya no está pendiente.';
    end if;
    return coll;
end;
$$;

-- Mismos permisos que tenía (ver 20261103140000_function_execute_privileges.sql).
revoke all on function public.accept_collaboration_request(uuid, integer) from public, anon;
grant execute on function public.accept_collaboration_request(uuid, integer) to authenticated, service_role;

commit;
