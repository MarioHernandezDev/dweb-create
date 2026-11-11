-- ============================================================================
-- Endurecimiento del bucket `post-media` (R-04 parcial, tarea 1.6 de ROADMAP.md)
--
-- PREPARADA, NO APLICADA en la base compartida. Aditiva y sin pérdida de datos.
--
-- 1) La política de SELECT era pública: cualquier persona podía LISTAR por la API
--    los archivos de todos (carpeta = id de usuario). Las imágenes se sirven por
--    URL pública (bucket public = true), que NO pasa por RLS, así que las URL
--    existentes siguen funcionando. Ahora cada usuario solo lista/lee (por API)
--    su propia carpeta; esto también basta para `upload(..., { upsert: true })`.
-- 2) `insert ... on conflict do nothing` de la migración original NO reaplica los
--    límites si el bucket ya existía: se fuerzan aquí (8 MB, JPEG/PNG/WebP).
--
-- NO cambia: el bucket sigue siendo público (los borradores se ven con la URL
-- exacta, que no es adivinable pero sí compartible). Hacerlo privado exige URL
-- firmadas en la app: decisión de producto pendiente (R-04).
--
-- ROLLBACK (manual):
--   drop policy if exists "post_media_select_own_folder" on storage.objects;
--   create policy "post_media_select_public" on storage.objects for select
--       using (bucket_id = 'post-media');
-- ============================================================================

update storage.buckets
   set file_size_limit = 8388608,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'post-media';

drop policy if exists "post_media_select_public" on storage.objects;

create policy "post_media_select_own_folder" on storage.objects for select
    using (
        bucket_id = 'post-media'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
