-- ============================================================================
-- CIBERAN — enlaces de entrega en las publicaciones.
--   · `draft_url`: enlace al borrador (vídeo o archivo pesado en Drive, WeTransfer, un vídeo privado…) para que la
--     marca lo vea al revisar, junto a la imagen de vista previa.
--   · `result_url`: enlace a la publicación ya subida a la red: deja constancia del resultado de la colaboración.
-- Aditiva y sin backfill (NULL por defecto). Solo admite http(s) y hasta 500 caracteres. No son «contenido material»:
-- el trigger de versión (20261105110000) no los mira, así que cambiarlos no invalida ninguna aprobación.
--
-- ROLLBACK (manual):
--   alter table public.posts drop constraint if exists posts_delivery_urls_valid;
--   alter table public.posts drop column if exists draft_url;
--   alter table public.posts drop column if exists result_url;
-- ============================================================================
begin;

alter table public.posts add column if not exists draft_url text;
alter table public.posts add column if not exists result_url text;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'posts_delivery_urls_valid') then
        alter table public.posts
            add constraint posts_delivery_urls_valid
            check (
                (draft_url is null or (draft_url ~* '^https?://[^\s]+$' and char_length(draft_url) <= 500))
                and (result_url is null or (result_url ~* '^https?://[^\s]+$' and char_length(result_url) <= 500))
            );
    end if;
end $$;

commit;
