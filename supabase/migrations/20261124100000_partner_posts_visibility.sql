-- ============================================================================
-- El partner solo ve las publicaciones de sus colaboraciones desde «Para revisar»
-- ============================================================================
-- Hasta ahora `posts_select_scoped` dejaba al partner leer TODAS las filas de las
-- publicaciones de sus colaboraciones, incluidas ideas y borradores en producción
-- (título, texto, enlace de borrador). Decisión de producto (24-nov-2026): el
-- partner ve una publicación cuando el creador la envía a revisión.
--
--   Visibles para el partner: ready_for_review, scheduled, published.
--   Ocultas: idea, in_production, overdue (y las que vuelven a producción tras
--   «pedir cambios»: mientras el creador las corrige, la marca no ve el borrador).
--
-- Las tablas que cuelgan de posts (checklist_items, post_external_links,
-- post_revision_notes) consultan `posts` dentro de su propia policy, así que
-- heredan esta restricción sin tocarlas.
--
-- Además: `partner_hidden_posts()` devuelve al partner SOLO recuentos (no filas)
-- de lo que no ve, para que la fase de cada colaboración («En producción») y los
-- textos de espera sigan siendo correctos.
--
-- No destructiva: no toca datos. Las funciones SECURITY DEFINER que ya usa el
-- partner (approve_post, request_post_changes) no cambian.
--
-- ROLLBACK (manual; vuelve a la lectura anterior):
--   drop function if exists public.partner_hidden_posts();
--   drop policy if exists "posts_select_scoped" on public.posts;
--   create policy "posts_select_scoped" on public.posts for select
--     using (
--       (creator_id = public.current_creator_id())
--       or ((collaboration_id is not null) and exists (
--         select 1 from public.collaborations c
--         where c.id = posts.collaboration_id and c.partner_id = public.current_partner_id()
--       ))
--     );
-- ============================================================================
begin;

drop policy if exists "posts_select_scoped" on public.posts;
create policy "posts_select_scoped" on public.posts for select
  using (
    (creator_id = public.current_creator_id())
    or (
      collaboration_id is not null
      and status in ('ready_for_review', 'scheduled', 'published')
      and exists (
        select 1 from public.collaborations c
        where c.id = posts.collaboration_id and c.partner_id = public.current_partner_id()
      )
    )
  );

create or replace function public.partner_hidden_posts()
returns table (collaboration_id uuid, hidden integer, started integer)
language sql stable security definer set search_path = public
as $$
  select p.collaboration_id,
         count(*)::integer as hidden,
         (count(*) filter (where p.status in ('in_production', 'overdue')))::integer as started
  from public.posts p
  join public.collaborations c on c.id = p.collaboration_id
  where c.partner_id = public.current_partner_id()
    and p.status not in ('ready_for_review', 'scheduled', 'published')
  group by p.collaboration_id
$$;
revoke execute on function public.partner_hidden_posts() from public, anon;
grant execute on function public.partner_hidden_posts() to authenticated;

commit;
