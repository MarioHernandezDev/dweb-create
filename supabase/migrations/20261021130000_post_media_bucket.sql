-- ============================================================================
-- FEEDMA — bucket de Storage para las fotos de portada de los posts (el
-- tablero estilo Trello). Público: una vez un post se publica de verdad en
-- redes la foto ya es pública de todas formas, así que servirla por URL
-- pública directa (sin firmar) simplifica el frontend (NuxtImg normal).
--
-- Cada archivo vive bajo `<profile_id del creador>/...` — las políticas de
-- abajo solo dejan escribir/editar/borrar dentro de la propia carpeta,
-- igual que el resto de RLS de la app (comparar con "creators_update_own"
-- en 20261021120000_remove_manager_rename_creator_partner.sql).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "post_media_select_public" on storage.objects for select
    using (bucket_id = 'post-media');

create policy "post_media_insert_own_folder" on storage.objects for insert
    with check (
        bucket_id = 'post-media'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "post_media_update_own_folder" on storage.objects for update
    using (
        bucket_id = 'post-media'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "post_media_delete_own_folder" on storage.objects for delete
    using (
        bucket_id = 'post-media'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
