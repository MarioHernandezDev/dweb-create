-- ============================================================================
-- Biblioteca de archivos: tope de 50 archivos por persona (antes 100).
-- Motivo: acotar el almacenamiento. Las imágenes ya se optimizan en el navegador al subir
-- (lado mayor 2.000 px, webp), así que 50 sobran de sobra para un creador.
-- No destructiva: no borra ni modifica filas; solo cambia el límite de las subidas NUEVAS.
-- Quien ya tuviera más de 50 conserva lo suyo y no podrá añadir hasta bajar de 50.
--
-- ROLLBACK (manual; vuelve al tope anterior de 100):
--   create or replace function public.media_library_cap() returns trigger
--   language plpgsql security definer set search_path = public as $fn$
--   begin
--       if (select count(*) from public.media_library where profile_id = new.profile_id) >= 100 then
--           raise exception 'Tu biblioteca ya tiene 100 archivos. Borra alguno antes de subir otro.';
--       end if;
--       return new;
--   end;
--   $fn$;
-- ============================================================================
begin;

create or replace function public.media_library_cap()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if (select count(*) from public.media_library where profile_id = new.profile_id) >= 50 then
        raise exception 'Tu biblioteca ya tiene 50 archivos. Borra alguno antes de subir otro.';
    end if;
    return new;
end;
$$;
revoke execute on function public.media_library_cap() from public, anon, authenticated;

commit;
