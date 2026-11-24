-- ============================================================================
-- El partner ve una publicación desde que se envió por primera vez a revisión
-- ============================================================================
-- Corrige el efecto de 20261124100000: allí la visibilidad dependía del estado
-- de trabajo (ready_for_review / scheduled / published), así que al «pedir
-- cambios» la publicación volvía a «En producción» y desaparecía del tablero de
-- la marca. Ahora la visibilidad depende de un hecho que no se deshace:
-- «esta publicación ya se envió alguna vez a revisión».
--
--   posts.submitted_at  → la fija un trigger la primera vez que el estado es
--                         ready_for_review, scheduled o published. Nunca se
--                         borra y el cliente no puede escribirla (el trigger
--                         ignora lo que se envíe).
--   posts_select_scoped → partner ve la fila si submitted_at no es nulo.
--                         Sin consultar otras tablas: no hay recursión de RLS.
--   partner_hidden_posts() → ahora oculto = nunca enviado.
--
-- Una publicación con cambios pedidos sigue visible para la marca (que ya la
-- conocía) y la interfaz la marca como «Cambios pedidos». Las ideas y borradores
-- nunca enviados siguen sin llegarle.
--
-- Relleno de las filas existentes: submitted_at = published_at o updated_at de
-- las que ya están en ready_for_review/scheduled/published. Se hace con los
-- triggers de usuario desactivados dentro de la transacción para no alterar
-- updated_at ni lanzar las guardas.
--
-- No destructiva: solo añade una columna y un trigger, y reescribe una policy
-- y una función creadas ayer.
--
-- ROLLBACK (manual; vuelve a la visibilidad por estado de 20261124100000):
--   drop trigger if exists posts_submitted_at_trg on public.posts;
--   drop function if exists public.posts_set_submitted_at();
--   drop policy if exists "posts_select_scoped" on public.posts;
--   create policy "posts_select_scoped" on public.posts for select
--     using (
--       (creator_id = public.current_creator_id())
--       or (collaboration_id is not null
--           and status in ('ready_for_review', 'scheduled', 'published')
--           and exists (select 1 from public.collaborations c
--                       where c.id = posts.collaboration_id and c.partner_id = public.current_partner_id()))
--     );
--   create or replace function public.partner_hidden_posts()
--   returns table (collaboration_id uuid, hidden integer, started integer)
--   language sql stable security definer set search_path = public as $fn$
--     select p.collaboration_id, count(*)::integer,
--            (count(*) filter (where p.status in ('in_production', 'overdue')))::integer
--     from public.posts p join public.collaborations c on c.id = p.collaboration_id
--     where c.partner_id = public.current_partner_id()
--       and p.status not in ('ready_for_review', 'scheduled', 'published')
--     group by p.collaboration_id
--   $fn$;
--   alter table public.posts drop column if exists submitted_at;
-- ============================================================================
begin;

alter table public.posts add column if not exists submitted_at timestamptz;

create or replace function public.posts_set_submitted_at()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    -- Lo decide la base de datos, nunca el cliente: se ignora cualquier valor enviado.
    if tg_op = 'INSERT' then
        new.submitted_at := case when new.status in ('ready_for_review', 'scheduled', 'published') then now() else null end;
    else
        new.submitted_at := coalesce(old.submitted_at, case when new.status in ('ready_for_review', 'scheduled', 'published') then now() else null end);
    end if;
    return new;
end;
$$;
revoke execute on function public.posts_set_submitted_at() from public, anon, authenticated;

drop trigger if exists posts_submitted_at_trg on public.posts;
create trigger posts_submitted_at_trg
    before insert or update on public.posts
    for each row execute function public.posts_set_submitted_at();

-- Relleno de lo ya enviado (sin disparar los demás triggers).
alter table public.posts disable trigger user;
update public.posts
   set submitted_at = coalesce(published_at, updated_at)
 where submitted_at is null and status in ('ready_for_review', 'scheduled', 'published');
alter table public.posts enable trigger user;

drop policy if exists "posts_select_scoped" on public.posts;
create policy "posts_select_scoped" on public.posts for select
  using (
    (creator_id = public.current_creator_id())
    or (
      collaboration_id is not null
      and submitted_at is not null
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
    and p.submitted_at is null
  group by p.collaboration_id
$$;
revoke execute on function public.partner_hidden_posts() from public, anon;
grant execute on function public.partner_hidden_posts() to authenticated;

commit;
