-- ============================================================================
-- CIBERAN — nombre de la campaña (UX-05).
-- Campo opcional que el autor de la solicitud pone al crearla. Hasta ahora el
-- título se derivaba del paquete o del brief; con este campo manda el nombre
-- elegido. Aditiva y sin backfill: las colaboraciones existentes quedan en NULL
-- y siguen usando la derivación de siempre. No hay UPDATE directo sobre
-- collaborations (20261103170000), así que el nombre queda fijado al crearla.
--
-- ROLLBACK (manual):
--   revoke insert (campaign_name) on public.collaborations from authenticated;
--   alter table public.collaborations drop constraint if exists collaborations_campaign_name_len;
--   alter table public.collaborations drop column if exists campaign_name;
-- ============================================================================
begin;

alter table public.collaborations add column if not exists campaign_name text;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'collaborations_campaign_name_len') then
        alter table public.collaborations
            add constraint collaborations_campaign_name_len
            check (campaign_name is null or char_length(btrim(campaign_name)) between 1 and 80);
    end if;
end $$;

grant insert (campaign_name) on public.collaborations to authenticated;

commit;
