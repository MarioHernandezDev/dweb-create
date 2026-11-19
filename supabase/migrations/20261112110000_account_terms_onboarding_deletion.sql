-- Gestión de cuenta:
--   1. Aceptación de términos con versión: qué versión aceptó cada cuenta y cuándo.
--      Solo se escribe con accept_terms() (la fecha la pone el servidor).
--   2. Recorrido de bienvenida recordado en la cuenta (antes solo en el navegador).
--   3. Solicitudes de eliminación de cuenta para las cuentas con historial de
--      colaboraciones: borrarlas en cascada se llevaría los registros de la otra
--      parte, así que quedan pendientes de revisión por el equipo. Las escribe solo
--      el servidor (server/api/account/delete.*) con la clave de servicio.
--
-- ROLLBACK:
--   drop table if exists public.account_deletion_requests;
--   drop function if exists public.accept_terms(text);
--   revoke update (onboarding_completed_at) on public.profiles from authenticated;
--   alter table public.profiles drop column if exists onboarding_completed_at,
--       drop column if exists terms_version, drop column if exists terms_accepted_at;

begin;

alter table public.profiles
    add column if not exists terms_version text,
    add column if not exists terms_accepted_at timestamptz,
    add column if not exists onboarding_completed_at timestamptz;

grant update (onboarding_completed_at) on public.profiles to authenticated;

create or replace function public.accept_terms(p_version text)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
    v_uid uuid := (select auth.uid());
    v_now timestamptz := now();
begin
    if v_uid is null then
        raise exception 'No autenticado.';
    end if;
    if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception 'Versión de términos no válida.';
    end if;
    update public.profiles set terms_version = p_version, terms_accepted_at = v_now where id = v_uid;
    return v_now;
end;
$$;
revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

create table if not exists public.account_deletion_requests (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    reason text check (reason is null or char_length(reason) <= 1000),
    status text not null default 'pending' check (status in ('pending', 'cancelled', 'done')),
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);
alter table public.account_deletion_requests enable row level security;
create policy "account_deletion_requests_select_own" on public.account_deletion_requests for select to authenticated
    using (profile_id = (select auth.uid()));
revoke all on public.account_deletion_requests from anon;
revoke all on public.account_deletion_requests from authenticated;
grant select on public.account_deletion_requests to authenticated;

commit;
