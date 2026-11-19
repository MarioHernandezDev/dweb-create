-- ============================================================================
-- CIBERAN — paquete destacado.
-- Un perfil puede marcar UN paquete como principal; aparece primero en su perfil
-- público y en Descubrir. El índice único parcial garantiza uno por perfil y la
-- función lo cambia de forma atómica (security invoker: aplica la RLS de
-- packages, solo el dueño puede cambiar sus paquetes).
--
-- ROLLBACK (manual):
--   drop function if exists public.set_featured_package(uuid);
--   drop index if exists public.packages_one_featured_per_profile;
--   alter table public.packages drop column if exists is_featured;
-- ============================================================================
begin;

alter table public.packages add column if not exists is_featured boolean not null default false;

create unique index if not exists packages_one_featured_per_profile
    on public.packages (profile_id) where is_featured;

-- p_package_id = null quita el destacado.
create or replace function public.set_featured_package(p_package_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_profile uuid;
begin
    if p_package_id is not null then
        select profile_id into v_profile from public.packages where id = p_package_id;
        if v_profile is null then
            raise exception 'Paquete no encontrado.';
        end if;
        update public.packages set is_featured = false where profile_id = v_profile and is_featured and id <> p_package_id;
        update public.packages set is_featured = true where id = p_package_id;
    else
        update public.packages set is_featured = false
        where profile_id in (select id from public.profiles where id = auth.uid()) and is_featured;
    end if;
end;
$$;

revoke execute on function public.set_featured_package(uuid) from public, anon;
grant execute on function public.set_featured_package(uuid) to authenticated, service_role;

commit;
