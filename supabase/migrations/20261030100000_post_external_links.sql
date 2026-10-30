-- ============================================================================
-- FEEDMA — M2 (A-R7): vínculo entre una publicación del tablero y su contenido
-- externo (el vídeo de YouTube / la publicación de Instagram).
--
-- Hasta ahora una entrega (`posts`) no sabía qué contenido real del proveedor
-- era, así que no se le podían pedir métricas. Esta tabla NUEVA guarda ese
-- vínculo sin tocar `posts`:
--   * `posts_update_self` deja al creador modificar cualquier columna de
--     `posts`; si el vínculo viviera allí, podría escribir ids ajenos o falsos.
--   * Aquí NO hay políticas de escritura para el navegador: solo el servidor
--     (service_role) inserta, y solo después de comprobar con el proveedor que
--     el contenido pertenece a la cuenta conectada del creador.
--
-- Integridad:
--   * un vínculo por publicación (`post_id` único);
--   * el mismo contenido no se vincula a dos publicaciones
--     (`unique (social_account_id, external_id)`);
--   * la plataforma no puede discrepar de la cuenta: clave foránea compuesta
--     (social_account_id, platform) -> social_accounts(id, platform).
--
-- LECTURA: el creador dueño de la publicación, o el partner de su
-- colaboración (mismo criterio que `posts_select_scoped`). Sin escritura.
--
-- Solo AÑADE: una restricción única en `social_accounts` (necesaria para la
-- clave compuesta; `id` ya es único, así que no puede fallar con datos
-- existentes) y una tabla nueva sin consumidores. El código que la usa se
-- publica DESPUÉS de aplicar esta migración.
--
-- Propuesta: docs/PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md (M2).
-- Pruebas:   tests/integration/post-links-and-metrics.spec.ts
--
-- ROLLBACK (no toca nada anterior):
--   begin;
--   drop table if exists public.post_external_links;
--   alter table public.social_accounts drop constraint if exists social_accounts_id_platform_key;
--   commit;
-- ============================================================================
begin;

alter table public.social_accounts
  add constraint social_accounts_id_platform_key unique (id, platform);

create table public.post_external_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  social_account_id uuid not null,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin')),
  external_id text not null check (char_length(external_id) between 1 and 200),
  external_url text check (external_url is null or char_length(external_url) <= 500),
  -- Sin valor por defecto a propósito: lo fija el servidor al verificar con el proveedor.
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint post_external_links_account_platform_fkey
    foreign key (social_account_id, platform)
    references public.social_accounts (id, platform) on delete cascade,
  constraint post_external_links_account_external_key unique (social_account_id, external_id)
);

create index idx_post_external_links_social_account_id on public.post_external_links (social_account_id);

alter table public.post_external_links enable row level security;

create policy "post_external_links_select_scoped" on public.post_external_links for select
  using (
    post_id in (
      select id from public.posts
      where creator_id = public.current_creator_id()
      or (collaboration_id is not null and exists (
        select 1 from public.collaborations c
        where c.id = posts.collaboration_id
        and c.partner_id = public.current_partner_id()
      ))
    )
  );

-- Defensa en profundidad: aunque no haya políticas de escritura, el navegador
-- tampoco recibe el privilegio. Solo lectura.
revoke all on table public.post_external_links from anon, authenticated;
grant select on table public.post_external_links to authenticated;

commit;
