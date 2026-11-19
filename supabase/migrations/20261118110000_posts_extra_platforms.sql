-- ============================================================================
-- CIBERAN — varias redes por publicación.
-- `posts.platform` sigue siendo la red principal (la usan filtros, calendario,
-- predicción y perfil público). `extra_platforms` guarda las redes adicionales
-- en las que se publicará la misma pieza. Aditiva: por defecto vacío, así que
-- nada de lo existente cambia. Valores permitidos = los de `platform`.
--
-- ROLLBACK (manual):
--   alter table public.posts drop constraint if exists posts_extra_platforms_valid;
--   alter table public.posts drop column if exists extra_platforms;
-- ============================================================================
begin;

alter table public.posts add column if not exists extra_platforms text[] not null default '{}';

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'posts_extra_platforms_valid') then
        alter table public.posts
            add constraint posts_extra_platforms_valid
            check (
                extra_platforms <@ array['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin']::text[]
                and not (platform = any (extra_platforms))
                and cardinality(extra_platforms) <= 5
            );
    end if;
end $$;

commit;
