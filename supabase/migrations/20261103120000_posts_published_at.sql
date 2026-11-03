-- ============================================================================
-- A-R21 — `posts.published_at` se escribe al pasar a "Publicado".
--
-- La columna existe desde la migración inicial pero nadie la escribía (auditoría
-- A-R21). Un trigger BEFORE UPDATE la rellena la primera vez que una publicación
-- pasa a `published` (aunque cambie de estado el creador por UPDATE directo o el
-- partner por las RPC `approve_post`/`request_post_changes`, que no llegan a
-- `published`). No toca filas existentes: las ya publicadas siguen con NULL (no se
-- inventa una fecha que no se sabe).
--
-- Pruebas:   tests/integration/posts-published-at.spec.ts
--
-- ROLLBACK:
--   drop trigger if exists posts_set_published_at on public.posts;
--   drop function if exists public.set_post_published_at();
--
-- ESTADO: PREPARADA, NO APLICADA (la aplica Alex en el SQL Editor).
-- ============================================================================
begin;

create or replace function public.set_post_published_at()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'published' and old.status is distinct from 'published' and new.published_at is null then
        new.published_at := now();
    end if;
    return new;
end;
$$;

drop trigger if exists posts_set_published_at on public.posts;
create trigger posts_set_published_at before update on public.posts
    for each row execute function public.set_post_published_at();

commit;
