-- ============================================================================
-- FEEDMA — "condiciones pactadas" de una colaboración: alcance, revisiones
-- incluidas, exclusividad y derechos de uso. Hoy `collaborations.brief` es
-- un único texto libre de presentación ("Qué necesitas y para cuándo…") —
-- ninguna de estas cuatro cosas queda nunca escrita en ningún sitio, así
-- que el creador acepta/rechaza una solicitud sin saber por escrito cuántas
-- revisiones incluye el trabajo, si hay exclusividad, quién tiene los
-- derechos de uso del contenido o qué alcance concreto se pactó.
--
-- Se fijan UNA SOLA VEZ al crear la colaboración (igual que `brief`/
-- `budget_cents` hoy) y quedan congeladas — nunca se editan ni se
-- renegocian; si no convencen, se rechaza la solicitud (flujo ya
-- existente) y se puede volver a proponer con otras condiciones.
--
-- Escrita para poder ejecutarse más de una vez sin reventar (misma
-- convención que el resto de migraciones de este proyecto).
-- ============================================================================

alter table public.collaborations add column if not exists scope_notes text;
alter table public.collaborations add column if not exists revisions_included integer;
alter table public.collaborations add column if not exists exclusivity boolean not null default false;
alter table public.collaborations add column if not exists usage_rights text;

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'collaborations_revisions_included_check'
    ) then
        alter table public.collaborations
            add constraint collaborations_revisions_included_check
            check (revisions_included is null or revisions_included >= 0);
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- Inmutabilidad real, a nivel de base de datos — no basta con que hoy no
-- exista ninguna policy de `update` para el cliente sobre `collaborations`
-- (se cerró en 20261025090000_phase1_security_payments.sql precisamente
-- porque dejaba reescribir budget_cents/status sin validar nada; los únicos
-- escritores actuales son accept_collaboration_request/
-- decline_collaboration_request/mark_collaboration_completed, y ninguno
-- toca estas 4 columnas). Ese invariante ya se rompió una vez en este mismo
-- proyecto, así que esta garantía no depende de que nadie vuelva a tener
-- cuidado con las policies en el futuro: el trigger bloquea cualquier
-- intento de cambiar estas 4 columnas, venga de donde venga (RLS, un RPC
-- nuevo, o incluso service_role saltándose RLS por completo — los triggers
-- se ejecutan siempre, independientemente del rol).
--
-- No rompe ningún flujo legítimo: las tres RPCs de arriba solo hacen
-- `set status = ..., budget_cents = ..., updated_at = now()`, nunca tocan
-- scope_notes/revisions_included/exclusivity/usage_rights — así que
-- `new.<columna> is distinct from old.<columna>` siempre es `false` para
-- ellas en esos updates y el trigger nunca las bloquea.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_collaboration_terms_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.scope_notes is distinct from old.scope_notes
        or new.revisions_included is distinct from old.revisions_included
        or new.exclusivity is distinct from old.exclusivity
        or new.usage_rights is distinct from old.usage_rights
    then
        raise exception 'Las condiciones pactadas no se pueden modificar después de crear la colaboración.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_collaborations_terms_immutable on public.collaborations;

create trigger trg_collaborations_terms_immutable
    before update on public.collaborations
    for each row execute function public.prevent_collaboration_terms_update();
