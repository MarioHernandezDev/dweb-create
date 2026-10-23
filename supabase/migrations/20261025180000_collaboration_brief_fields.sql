-- ============================================================================
-- FEEDMA — "brief estructurado": `collaborations.brief` sigue siendo el
-- mensaje libre de presentación ("Qué necesitas y para cuándo…"), pero
-- nunca dejaba constancia por separado de objetivo, público objetivo ni
-- tono — tres cosas distintas, mezcladas o ausentes del todo en el texto
-- libre. Mismo criterio de alcance que "condiciones pactadas"
-- (20261025150000): 3 columnas opcionales, fijadas una sola vez al crear
-- la colaboración, congeladas para siempre.
--
-- No es una tabla ni un trigger nuevos: son 3 columnas más en la MISMA fila
-- que ya protege `prevent_collaboration_terms_update()` — se amplía esa
-- misma función (create or replace sustituye el cuerpo; el trigger
-- `trg_collaborations_terms_immutable` ya existente sigue apuntando al
-- mismo nombre, no hace falta tocarlo).
--
-- Escrita para poder ejecutarse más de una vez sin reventar (misma
-- convención que el resto de migraciones de este proyecto).
-- ============================================================================

alter table public.collaborations add column if not exists campaign_goal text;
alter table public.collaborations add column if not exists target_audience text;
alter table public.collaborations add column if not exists tone text;

create or replace function public.prevent_collaboration_terms_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.scope_notes is distinct from old.scope_notes
        or new.revisions_included is distinct from old.revisions_included
        or new.exclusivity is distinct from old.exclusivity
        or new.usage_rights is distinct from old.usage_rights
        or new.campaign_goal is distinct from old.campaign_goal
        or new.target_audience is distinct from old.target_audience
        or new.tone is distinct from old.tone
    then
        raise exception 'Las condiciones pactadas no se pueden modificar después de crear la colaboración.';
    end if;
    return new;
end;
$$;
