-- ============================================================================
-- Flujo de colaboración · Fase 2 — Acuerdo (C-01, C-02; decisiones D-1 y D-2)
-- docs/audit/08_COLLABORATION_FLOW_AUDIT.md §8.1 y §9.
--
-- Qué hace
--   1. Instantánea del paquete en `collaborations` (package_title,
--      package_description, package_deliverables): lo que se compró queda
--      fijado aunque el paquete cambie o se desactive. Solo se rellena al
--      aceptar una oferta del chat. `respond_offer` conserva su cuerpo; solo
--      se añaden las tres columnas al insert.
--   2. Relleno de las colaboraciones antiguas que nacieron de una oferta cuyo
--      paquete sigue existiendo (solo columnas NUEVAS y vacías; no se toca nada
--      existente).
--   3. Regla «rellenar una vez» (D-1b): `prevent_collaboration_terms_update`
--      pasa de «nada cambia» a «un valor ya fijado no se cambia; uno vacío se
--      puede completar».
--   4. RPC `complete_collaboration_brief`: la marca de la colaboración completa
--      los campos vacíos del brief/condiciones una sola vez por campo.
--      Notifica al creador.
--
-- No toca: pagos, `paid_at`, `stripe_*`, `budget_cents` ni cuándo se cobra.
-- `respond_offer` ya fija `budget_cents`; esa parte se mantiene idéntica.
--
-- ROLLBACK:
--   begin;
--   drop function if exists public.complete_collaboration_brief(uuid, text, text, text, text, integer, boolean, text);
--   -- volver a ejecutar las definiciones anteriores de:
--   --   prevent_collaboration_terms_update → 20261025180000_collaboration_brief_fields.sql
--   --   respond_offer                      → 20261025090000_phase1_security_payments.sql
--   alter table public.collaborations
--       drop column if exists package_title,
--       drop column if exists package_description,
--       drop column if exists package_deliverables;
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA en el proyecto compartido (probada en el
-- Supabase local).
-- ============================================================================
begin;

-- 1. Instantánea del paquete -------------------------------------------------
alter table public.collaborations
    add column if not exists package_title text,
    add column if not exists package_description text,
    add column if not exists package_deliverables text[];

-- 2. Relleno de colaboraciones antiguas (solo columnas nuevas y vacías) -------
update public.collaborations c
set package_title = p.title,
    package_description = p.description,
    package_deliverables = p.deliverables
from public.offers o
join public.packages p on p.id = o.package_id
where c.offer_id = o.id
  and c.package_title is null;

-- 3. Regla «rellenar una vez» -------------------------------------------------
create or replace function public.prevent_collaboration_terms_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if (old.scope_notes is not null and new.scope_notes is distinct from old.scope_notes)
        or (old.revisions_included is not null and new.revisions_included is distinct from old.revisions_included)
        or (old.usage_rights is not null and new.usage_rights is distinct from old.usage_rights)
        or (old.campaign_goal is not null and new.campaign_goal is distinct from old.campaign_goal)
        or (old.target_audience is not null and new.target_audience is distinct from old.target_audience)
        or (old.tone is not null and new.tone is distinct from old.tone)
        -- exclusividad: `false` es el valor por defecto; solo puede pasar a true.
        or (old.exclusivity and not new.exclusivity)
    then
        raise exception 'Las condiciones pactadas no se pueden modificar después de crear la colaboración.';
    end if;
    return new;
end;
$$;

-- 4. respond_offer: igual que la definición viva + instantánea del paquete ----
create or replace function public.respond_offer(p_offer_id uuid, p_accept boolean)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
    me uuid := auth.uid();
    off public.offers;
    new_status text := case when p_accept then 'accepted' else 'declined' end;
    price_label text;
    from_creator_id uuid;
    from_partner_id uuid;
    to_creator_id uuid;
    to_partner_id uuid;
    resolved_creator_id uuid;
    resolved_partner_id uuid;
    resolved_initiated_by text;
    partner_profile_id uuid;
    pkg_title text;
    pkg_description text;
    pkg_deliverables text[];
    new_collab_id uuid;
begin
    select * into off from public.offers where id = p_offer_id and to_profile_id = me and status = 'pending';
    if off is null then
        raise exception 'Esta oferta no existe o ya no está pendiente.';
    end if;

    update public.offers set status = new_status, responded_at = now() where id = p_offer_id
    returning * into off;

    if p_accept then
        price_label := to_char(off.proposed_price_cents / 100.0, 'FM999999990.00') || ' €';
        insert into public.messages (conversation_id, sender_id, kind, body, offer_id)
        values (off.conversation_id, null, 'system', 'Oferta aceptada. Precio acordado: ' || price_label, off.id);
        update public.conversations set last_message_at = now() where id = off.conversation_id;
        perform public.notify(off.from_profile_id, 'offer_accepted', 'Oferta aceptada', 'Tu oferta de ' || price_label || ' ha sido aceptada.', '/chat/' || off.conversation_id);

        select id into from_creator_id from public.creators where profile_id = off.from_profile_id;
        select id into from_partner_id from public.partners where profile_id = off.from_profile_id;
        select id into to_creator_id from public.creators where profile_id = off.to_profile_id;
        select id into to_partner_id from public.partners where profile_id = off.to_profile_id;

        if from_creator_id is not null and to_partner_id is not null then
            resolved_creator_id := from_creator_id;
            resolved_partner_id := to_partner_id;
            resolved_initiated_by := 'creator';
            partner_profile_id := off.to_profile_id;
        elsif from_partner_id is not null and to_creator_id is not null then
            resolved_creator_id := to_creator_id;
            resolved_partner_id := from_partner_id;
            resolved_initiated_by := 'partner';
            partner_profile_id := off.from_profile_id;
        end if;

        if resolved_creator_id is not null and resolved_partner_id is not null then
            select title, description, deliverables
              into pkg_title, pkg_description, pkg_deliverables
              from public.packages where id = off.package_id;

            insert into public.collaborations (
                creator_id, partner_id, status, brief, budget_cents, initiated_by, offer_id,
                package_title, package_description, package_deliverables
            )
            values (
                resolved_creator_id, resolved_partner_id, 'accepted',
                coalesce('Oferta aceptada por chat: ' || pkg_title, 'Oferta aceptada por chat'),
                off.proposed_price_cents, resolved_initiated_by, off.id,
                pkg_title, pkg_description, pkg_deliverables
            )
            on conflict (offer_id) do nothing
            returning id into new_collab_id;

            if new_collab_id is not null and partner_profile_id is not null then
                perform public.notify(
                    partner_profile_id, 'collaboration_requested', 'Colaboración lista para pagar',
                    'La oferta aceptada ya es una colaboración — puedes pagarla desde tus colaboraciones.', '/partner/requests'
                );
            end if;
        end if;
    else
        perform public.notify(off.from_profile_id, 'offer_declined', 'Oferta rechazada', 'Tu oferta ha sido rechazada.', '/chat/' || off.conversation_id);
    end if;

    return off;
end;
$$;

revoke execute on function public.respond_offer(uuid, boolean) from public, anon;
grant execute on function public.respond_offer(uuid, boolean) to authenticated, service_role;

-- 5. Completar el brief una vez ----------------------------------------------
create or replace function public.complete_collaboration_brief(
    p_collaboration_id uuid,
    p_campaign_goal text default null,
    p_target_audience text default null,
    p_tone text default null,
    p_scope_notes text default null,
    p_revisions_included integer default null,
    p_exclusivity boolean default null,
    p_usage_rights text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    me_partner uuid := public.current_partner_id();
    c public.collaborations;
    creator_profile uuid;
    v_goal text := nullif(btrim(p_campaign_goal), '');
    v_audience text := nullif(btrim(p_target_audience), '');
    v_tone text := nullif(btrim(p_tone), '');
    v_scope text := nullif(btrim(p_scope_notes), '');
    v_usage text := nullif(btrim(p_usage_rights), '');
    changed boolean := false;
begin
    if me_partner is null then
        raise exception 'Solo la marca de la colaboración puede completar el brief.';
    end if;

    select * into c from public.collaborations where id = p_collaboration_id for update;
    if c is null or c.partner_id <> me_partner then
        raise exception 'Solo la marca de la colaboración puede completar el brief.';
    end if;
    if c.status not in ('accepted', 'in_progress') then
        raise exception 'El brief solo se puede completar en una colaboración aceptada o en curso.';
    end if;
    if p_revisions_included is not null and (p_revisions_included < 0 or p_revisions_included > 20) then
        raise exception 'Las revisiones incluidas deben estar entre 0 y 20.';
    end if;

    -- Un campo ya fijado no se sobrescribe: si llega con otro valor, se rechaza
    -- entero (no se aplica nada a medias).
    if (v_goal is not null and c.campaign_goal is not null and v_goal <> c.campaign_goal)
        or (v_audience is not null and c.target_audience is not null and v_audience <> c.target_audience)
        or (v_tone is not null and c.tone is not null and v_tone <> c.tone)
        or (v_scope is not null and c.scope_notes is not null and v_scope <> c.scope_notes)
        or (v_usage is not null and c.usage_rights is not null and v_usage <> c.usage_rights)
        or (p_revisions_included is not null and c.revisions_included is not null and p_revisions_included <> c.revisions_included)
    then
        raise exception 'Hay campos que ya estaban fijados y no se pueden cambiar.';
    end if;

    update public.collaborations set
        campaign_goal = coalesce(campaign_goal, v_goal),
        target_audience = coalesce(target_audience, v_audience),
        tone = coalesce(tone, v_tone),
        scope_notes = coalesce(scope_notes, v_scope),
        usage_rights = coalesce(usage_rights, v_usage),
        revisions_included = coalesce(revisions_included, p_revisions_included),
        exclusivity = exclusivity or coalesce(p_exclusivity, false)
    where id = p_collaboration_id
      and (
          (v_goal is not null and campaign_goal is null)
          or (v_audience is not null and target_audience is null)
          or (v_tone is not null and tone is null)
          or (v_scope is not null and scope_notes is null)
          or (v_usage is not null and usage_rights is null)
          or (p_revisions_included is not null and revisions_included is null)
          or (coalesce(p_exclusivity, false) and not exclusivity)
      )
    returning true into changed;

    if not coalesce(changed, false) then
        raise exception 'No hay ningún campo vacío que completar.';
    end if;

    select profile_id into creator_profile from public.creators where id = c.creator_id;
    perform public.notify(
        creator_profile, 'collaboration_brief_added', 'La marca ha completado el brief',
        'Revisa lo que se espera de la colaboración.', '/creator/requests?collaboration=' || c.id
    );
end;
$$;

revoke execute on function public.complete_collaboration_brief(uuid, text, text, text, text, integer, boolean, text) from public, anon;
grant execute on function public.complete_collaboration_brief(uuid, text, text, text, text, integer, boolean, text) to authenticated, service_role;

commit;
