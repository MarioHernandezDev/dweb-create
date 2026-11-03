-- ============================================================================
-- H0-17 — Restaura `handle_new_user()` (el trigger de alta de cuentas).
--
-- La auditoría de catálogo del 2026-11-03 (solo lectura) encontró que la función
-- VIVA es idéntica a la de `20261020180000_real_signup.sql`, dos versiones por
-- detrás: usa los roles antiguos (`influencer`/`manager`/`client`) e inserta en
-- `influencers`/`managers`/`brand_clients`, tablas que ya no existen. El resto
-- de `20261021120000_remove_manager_rename_creator_partner.sql` sí está aplicado
-- (por ejemplo `grant_welcome_credits()` coincide con esa migración), así que lo
-- más probable es que `20261020180000` se volviera a ejecutar después.
--
-- Efecto en un alta real desde /onboarding (role = 'creator' | 'partner'): se crea
-- el perfil, pero ninguna rama del IF coincide, así que NO se crea la ficha
-- (`creators`/`partners`), no hay créditos de bienvenida ni aviso de bienvenida.
-- La app no crea la ficha por su cuenta. Sin metadata de rol, el valor por
-- defecto 'influencer' viola `profiles_role_check` y el alta entera falla.
-- Datos actuales: las 21 cuentas tienen ficha (última alta: 2026-10-23); en toda
-- la base hay 0 avisos `welcome`.
--
-- Este archivo repite LITERALMENTE la definición de 20261021120000 (sección 8),
-- que es la última y la que esperan el código y los tests. `notify()` ya no es
-- ejecutable por los roles de la API (20261103140000), pero esta función es
-- SECURITY DEFINER de `postgres` y la llama como propietaria: sigue funcionando
-- (comprobado en el entorno aislado).
--
-- Pruebas:   tests/integration/signup-trigger.spec.ts (crea una cuenta de prueba
--            con la Admin API y la borra): ANTES de aplicar falla; DESPUÉS pasa.
--
-- ROLLBACK: no aplica (volver atrás sería restaurar la versión rota). Si hiciera
-- falta, la definición anterior está en 20261020180000_real_signup.sql.
--
-- ESTADO: PREPARADA, NO APLICADA.
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

    perform public.notify(new.id, 'welcome', 'Bienvenido a FEEDMA', 'Tu cuenta se ha creado correctamente.', null);

    return new;
end;
$$;

commit;
