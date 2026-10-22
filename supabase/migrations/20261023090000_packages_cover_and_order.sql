-- ============================================================================
-- FEEDMA — portada por paquete + orden manual en la pestaña "Paquetes"/
-- "Necesidades" de /creator/profile.vue y /partner/profile.vue.
--
-- `cover_url` reutiliza el bucket `post-media` que ya existe (ver
-- 20261021130000_post_media_bucket.sql): sus policies solo comprueban que
-- el archivo viva bajo `<auth.uid()>/...`, no que sea de un post ni de una
-- ficha — sirve tal cual para esto también, sin bucket ni policies nuevas.
--
-- `sort_order` empieza en 0 para todos los paquetes existentes a propósito:
-- el listado ordena por `sort_order asc, created_at desc`, así que con todos
-- a 0 el orden visible sigue siendo "más reciente primero" hasta que alguien
-- reordene a mano — no hace falta backfill por fila.
--
-- Idempotente (IF NOT EXISTS), por si hace falta relanzarla — mismo criterio
-- que 20261021160000_discovery_cover_photos.sql.
-- ============================================================================
alter table public.packages add column if not exists cover_url text;
alter table public.packages add column if not exists sort_order integer not null default 0;
