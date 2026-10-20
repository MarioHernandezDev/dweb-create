-- ----------------------------------------------------------------------------
-- REGISTRO REAL: hasta ahora `handle_new_user()` solo creaba la fila de
-- `profiles` — nunca la ficha de rol (`influencers`/`managers`/
-- `brand_clients`), así que un alta nueva por signUp() se quedaba a medias
-- (sesión creada, pero sin ficha con la que trabajar en ningún sitio de la
-- app). `app/pages/onboarding.vue` pasa ahora estos datos en
-- `raw_user_meta_data` al registrarse:
--   role: 'influencer' | 'manager' | 'client'
--   full_name: nombre de la persona (va a profiles.full_name)
--   name: display_name / agency_name / company_name, según el rol
--   detail: niche / focus / industry — opcional, puede venir vacío
--
-- Se hace aquí (trigger, security definer) y no desde el cliente tras el
-- signUp porque Supabase exige confirmar el email antes de dar sesión
-- (`mailer_autoconfirm` está en false en este proyecto) — en ese momento
-- todavía no hay `auth.uid()` con el que cumplir las policies de
-- `..._insert_own`. El trigger no tiene ese problema: corre en el propio
-- insert de `auth.users`, sin depender de ninguna sesión.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    user_role text := coalesce(new.raw_user_meta_data ->> 'role', 'influencer');
    display_name text := coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', 'Sin nombre');
    detail text := new.raw_user_meta_data ->> 'detail';
begin
    insert into public.profiles (id, role, full_name)
    values (new.id, user_role, new.raw_user_meta_data ->> 'full_name');

    if user_role = 'influencer' then
        insert into public.influencers (profile_id, display_name, niche)
        values (new.id, display_name, detail);
    elsif user_role = 'manager' then
        insert into public.managers (profile_id, agency_name, focus)
        values (new.id, display_name, detail);
    elsif user_role = 'client' then
        insert into public.brand_clients (profile_id, company_name, industry)
        values (new.id, display_name, detail);
    end if;

    return new;
end;
$$;
