-- Perfil público sin sesión: cada cuenta decide si su ficha se puede abrir con el enlace
-- sin haber iniciado sesión. La lectura anónima NO pasa por RLS: la sirve
-- server/api/public/profile/[role]/[id].get.ts con la clave de servicio y una lista
-- cerrada de campos (ver server/utils/public-profile.ts). Aquí solo vive el interruptor.
--
-- ROLLBACK:
--   revoke update (public_profile_enabled) on public.profiles from authenticated;
--   alter table public.profiles drop column if exists public_profile_enabled;

begin;

alter table public.profiles
    add column if not exists public_profile_enabled boolean not null default true;

comment on column public.profiles.public_profile_enabled is
    'Si la ficha pública se puede ver sin iniciar sesión (enlace compartible). La elige el dueño de la cuenta.';

grant update (public_profile_enabled) on public.profiles to authenticated;

commit;
