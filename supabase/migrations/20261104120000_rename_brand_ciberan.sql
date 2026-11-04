-- ============================================================================
-- Cambio de marca: FEEDMA → CIBERAN (textos que ve el usuario).
--
-- Solo cambia el TEXTO de dos avisos que generan funciones de la base de datos:
--   · handle_new_user()  → aviso de bienvenida al crear la cuenta.
--   · notify_user_login() → aviso de «nuevo acceso» al iniciar sesión.
-- Las dos definiciones son idénticas a las vigentes (handle_new_user:
-- 20261103160000; notify_user_login: 20261021110000), salvo ese texto. No cambia
-- ninguna lógica, permiso ni tabla; `create or replace` conserva los EXECUTE
-- existentes. Los avisos YA guardados siguen diciendo «FEEDMA»: son datos de los
-- usuarios y no se reescriben.
--
-- No se editan las migraciones anteriores: son el registro de lo ya aplicado.
--
-- ROLLBACK: volver a ejecutar las definiciones de los dos archivos citados.
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido.
-- ============================================================================
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    user_role text := coalesce(new.raw_user_meta_data ->> 'role', 'creator');
    display_name text := coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', 'Sin nombre');
    detail text := new.raw_user_meta_data ->> 'detail';
begin
    insert into public.profiles (id, role, full_name)
    values (new.id, user_role, new.raw_user_meta_data ->> 'full_name');

    if user_role = 'creator' then
        insert into public.creators (profile_id, display_name, niche)
        values (new.id, display_name, detail);
    elsif user_role = 'partner' then
        insert into public.partners (profile_id, company_name, industry)
        values (new.id, display_name, detail);
    end if;

    perform public.notify(new.id, 'welcome', 'Bienvenido a CIBERAN', 'Tu cuenta se ha creado correctamente.', null);

    return new;
end;
$$;

create or replace function public.notify_user_login()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    if new.last_sign_in_at is distinct from old.last_sign_in_at then
        perform public.notify(new.id, 'login', 'Has iniciado sesión', 'Nuevo acceso a tu cuenta de CIBERAN.', null);
    end if;
    return new;
end;
$$;

commit;
