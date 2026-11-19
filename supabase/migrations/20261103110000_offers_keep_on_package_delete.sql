-- ============================================================================
-- A-R20i — Al borrar un paquete se CONSERVAN las ofertas aceptadas (y rechazadas).
--
-- Problema (auditoría A-R20, A.2 punto 1): `offers.package_id` era `on delete
-- cascade`, así que borrar un paquete borraba sus ofertas —aceptadas
-- incluidas, aunque respaldaran una colaboración— y el mensaje de oferta
-- quedaba en la conversación con `offer_id` nulo (una burbuja vacía).
--
-- Decisión (aprobada por Alex; Mario conforme): conservar las ofertas aceptadas.
--   * `offers.package_id` pasa a ser nullable con `on delete set null`.
--   * Se guarda el título del paquete en la propia oferta (`package_title`)
--     para poder seguir enseñando de qué paquete era ("paquete ya no disponible").
--   * Las ofertas PENDIENTES de un paquete que se borra no tienen sentido
--     (ya no se puede ofertar sobre él): un trigger BEFORE DELETE las elimina,
--     como pasaba hasta ahora. Aceptadas y rechazadas se conservan.
--   * `create_offer` guarda el título; las ofertas existentes se rellenan.
--
-- No cambia ninguna regla de negocio: quién oferta, quién responde y la
-- creación de la colaboración al aceptar siguen igual.
--
-- Pruebas:   tests/integration/offers-package-delete.spec.ts
--
-- ROLLBACK:
--   begin;
--   drop trigger if exists packages_delete_pending_offers on public.packages;
--   drop function if exists public.delete_pending_offers_of_package();
--   alter table public.offers drop constraint if exists offers_package_id_fkey;
--   alter table public.offers add constraint offers_package_id_fkey
--       foreign key (package_id) references public.packages(id) on delete cascade;
--   -- (package_id debe volver a not null solo si no hay filas con valor nulo)
--   alter table public.offers drop column if exists package_title;
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA (la aplica Alex en el SQL Editor).
-- ============================================================================
begin;

alter table public.offers add column if not exists package_title text;

update public.offers o
set package_title = p.title
from public.packages p
where p.id = o.package_id and o.package_title is null;

alter table public.offers alter column package_id drop not null;
alter table public.offers drop constraint if exists offers_package_id_fkey;
alter table public.offers
    add constraint offers_package_id_fkey foreign key (package_id) references public.packages(id) on delete set null;

-- Pendientes: no se pueden responder sobre un paquete que ya no existe.
create or replace function public.delete_pending_offers_of_package()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    delete from public.offers where package_id = old.id and status = 'pending';
    return old;
end;
$$;

drop trigger if exists packages_delete_pending_offers on public.packages;
create trigger packages_delete_pending_offers before delete on public.packages
    for each row execute function public.delete_pending_offers_of_package();

-- create_offer guarda el título del paquete en la oferta.
-- (Misma definición que 20261103100000_chat_limits.sql, con `package_title`.)
create or replace function public.create_offer(p_package_id uuid, p_proposed_price_cents integer, p_message text default null)
returns public.offers
language plpgsql security definer set search_path = public
as $$
declare
    me uuid := auth.uid();
    pkg public.packages;
    conv_id uuid;
    inserted public.offers;
    sender_name text;
begin
    if p_proposed_price_cents is null or p_proposed_price_cents <= 0 then
        raise exception 'El precio propuesto tiene que ser mayor que 0.';
    end if;
    if p_message is not null and char_length(p_message) > 500 then
        raise exception 'El mensaje de la oferta es demasiado largo (máximo 500 caracteres).';
    end if;

    select * into pkg from public.packages where id = p_package_id and active;
    if pkg is null then
        raise exception 'Ese paquete no existe o ya no está disponible.';
    end if;

    if pkg.profile_id = me then
        raise exception 'No puedes ofertar en tu propio paquete.';
    end if;

    if (
        select count(*) from public.offers
        where from_profile_id = me and created_at > now() - interval '1 hour'
    ) >= 20 then
        raise exception 'Has enviado demasiadas ofertas en poco tiempo. Inténtalo más tarde.';
    end if;

    conv_id := public._get_or_create_conversation(me, pkg.profile_id);

    insert into public.offers (package_id, package_title, conversation_id, from_profile_id, to_profile_id, proposed_price_cents, message)
    values (p_package_id, pkg.title, conv_id, me, pkg.profile_id, p_proposed_price_cents, p_message)
    returning * into inserted;

    insert into public.messages (conversation_id, sender_id, kind, body, offer_id)
    values (conv_id, me, 'offer', p_message, inserted.id);

    update public.conversations set last_message_at = inserted.created_at where id = conv_id;

    select coalesce(full_name, 'Alguien') into sender_name from public.profiles where id = me;
    perform public.notify(pkg.profile_id, 'offer_received', 'Nueva oferta recibida', coalesce(sender_name, 'Alguien') || ' te ha hecho una oferta sobre "' || pkg.title || '".', '/chat/' || conv_id);

    return inserted;
end;
$$;

grant execute on function public.create_offer(uuid, integer, text) to authenticated;

commit;
