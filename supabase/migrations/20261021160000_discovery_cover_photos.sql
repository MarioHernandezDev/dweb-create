-- ============================================================================
-- FEEDMA — foto de portada para la ficha de creator/partner, para que las
-- cards de /creator/discover y /partner/discover sean de verdad "fotos en
-- grande" y no solo texto. Reutiliza el bucket `post-media` que ya existe
-- (ver 20261021130000_post_media_bucket.sql): sus policies solo comprueban
-- que el archivo viva bajo la carpeta `<auth.uid()>/...`, no que sea de un
-- creador ni que esté atado a un post — sirve tal cual para esto también,
-- sin bucket ni policies nuevas.
--
-- Idempotente (IF NOT EXISTS), por si hace falta relanzarla — mismo criterio
-- que 20261021150000_discovery_bidireccional.sql.
-- ============================================================================
alter table public.creators add column if not exists cover_url text;
alter table public.partners add column if not exists cover_url text;
