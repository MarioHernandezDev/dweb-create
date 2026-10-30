-- ============================================================================
-- A-R21f — `posts.collaboration_id` solo puede ser NULL o una colaboración
-- DEL PROPIO creador.
--
-- Problema (reproducido con tests/integration/posts-collaboration-rls.spec.ts
-- antes de esta migración): `posts_insert_self` y `posts_update_self` solo
-- exigían `creator_id = current_creator_id()`. Nada comprobaba en servidor que
-- `collaboration_id` fuese una colaboración en la que el creador es parte:
-- un creador, por la API directa, podía crear o mover una publicación suya a
-- una colaboración AJENA (el partner de esa colaboración la vería entonces por
-- `posts_select_scoped`). La interfaz solo ofrece las colaboraciones propias,
-- pero la interfaz no es una barrera de seguridad.
--
-- Cambio: se recrean las dos políticas añadiendo la condición. Es aditivo en
-- lo que ya funcionaba (contenido propio y colaboraciones propias siguen
-- igual). Las RPC `approve_post` / `request_post_changes` son `security
-- definer` y no pasan por estas políticas, así que el flujo del partner no
-- cambia. Un `UPDATE` que no toque `collaboration_id` de una fila ya existente
-- se sigue validando con la misma regla, pero las filas existentes que ya
-- estén bien siguen cumpliéndola (ver la comprobación previa más abajo).
--
-- COMPROBACIÓN PREVIA (solo lectura; debe devolver 0 filas — si no, hay datos
-- antiguos con una colaboración ajena y habría que revisarlos antes de aplicar,
-- porque cualquier UPDATE de esas filas empezaría a fallar):
--
--   select p.id, p.creator_id, c.creator_id as collab_creator_id
--   from public.posts p
--   join public.collaborations c on c.id = p.collaboration_id
--   where c.creator_id <> p.creator_id;
--
-- Pruebas:   tests/integration/posts-collaboration-rls.spec.ts
--            (antes: fallan los dos de "RECHAZO"; después: pasan los 6)
--
-- ROLLBACK (vuelve a las políticas anteriores):
--   begin;
--   drop policy if exists "posts_insert_self" on public.posts;
--   drop policy if exists "posts_update_self" on public.posts;
--   create policy "posts_insert_self" on public.posts for insert
--       with check (creator_id = public.current_creator_id());
--   create policy "posts_update_self" on public.posts for update
--       using (creator_id = public.current_creator_id());
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA. Requiere aplicarla Alex en el SQL Editor y
-- avisar a Mario (RLS de una tabla compartida).
-- ============================================================================
begin;

drop policy if exists "posts_insert_self" on public.posts;
drop policy if exists "posts_update_self" on public.posts;

create policy "posts_insert_self" on public.posts for insert
    with check (
        creator_id = public.current_creator_id()
        and (
            collaboration_id is null
            or exists (
                select 1 from public.collaborations c
                where c.id = collaboration_id
                and c.creator_id = public.current_creator_id()
            )
        )
    );

create policy "posts_update_self" on public.posts for update
    using (creator_id = public.current_creator_id())
    with check (
        creator_id = public.current_creator_id()
        and (
            collaboration_id is null
            or exists (
                select 1 from public.collaborations c
                where c.id = collaboration_id
                and c.creator_id = public.current_creator_id()
            )
        )
    );

commit;
