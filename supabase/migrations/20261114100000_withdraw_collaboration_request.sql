-- Retirar una solicitud de colaboración que sigue sin responder.
--
-- Quien envió la solicitud (creador o marca) puede retirarla mientras la otra parte no la haya
-- aceptado ni rechazado. Una solicitud sin responder no tiene trabajo compartido, así que se
-- borra del todo (sus tablas dependientes se van en cascada, igual que ya ocurre al eliminar una
-- cuenta), se limpian los avisos que tenía pendientes la otra parte y se le avisa de que se retiró.
-- Es lo que permite, por ejemplo, eliminar la cuenta teniendo solicitudes enviadas sin responder.
--
-- Solo añade una función: el código anterior sigue funcionando sin cambios.
--
-- ROLLBACK:
--   drop function if exists public.withdraw_collaboration_request(uuid);

begin;

create or replace function public.withdraw_collaboration_request(p_collaboration_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
    coll public.collaborations;
    creator_profile uuid;
    partner_profile uuid;
begin
    select * into coll from public.collaborations where id = p_collaboration_id for update;
    if coll.id is null or (coll.creator_id is distinct from public.current_creator_id() and coll.partner_id is distinct from public.current_partner_id()) then
        raise exception 'Esta colaboración no existe o no tienes permiso sobre ella.';
    end if;
    if not (
        (coll.initiated_by = 'creator' and coll.creator_id is not distinct from public.current_creator_id())
        or (coll.initiated_by = 'partner' and coll.partner_id is not distinct from public.current_partner_id())
    ) then
        raise exception 'Solo puede retirar la solicitud quien la envió.';
    end if;
    if coll.status <> 'requested' then
        raise exception 'Esta solicitud ya no está pendiente.';
    end if;

    select profile_id into creator_profile from public.creators where id = coll.creator_id;
    select profile_id into partner_profile from public.partners where id = coll.partner_id;

    -- Los avisos de «nueva solicitud» y «caduca pronto» de la otra parte ya no llevan a ningún sitio.
    delete from public.notifications
    where type in ('collaboration_requested', 'collaboration_expiring')
      and link like '%?collaboration=' || coll.id::text;

    perform public.notify(
        case when coll.initiated_by = 'creator' then partner_profile else creator_profile end,
        'collaboration_cancelled',
        'Solicitud retirada',
        'La otra parte ha retirado su solicitud de colaboración.',
        case when coll.initiated_by = 'creator' then '/partner/requests' else '/creator/requests' end
    );

    delete from public.collaborations where id = coll.id and status = 'requested';
end;
$$;

revoke execute on function public.withdraw_collaboration_request(uuid) from public, anon;
grant execute on function public.withdraw_collaboration_request(uuid) to authenticated;

commit;
