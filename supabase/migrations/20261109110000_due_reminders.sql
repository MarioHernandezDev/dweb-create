-- ============================================================================
-- Fase 2 (bloque 1): recordatorios de plazo como avisos internos, sin servicios
-- externos ni coste. Tarea 2 de ROADMAP.md.
--
-- Qué hace:
--   · notifications.dedupe_key + índice único parcial (profile_id, dedupe_key):
--     un mismo recordatorio no se puede crear dos veces (ON CONFLICT DO NOTHING).
--   · public.send_due_reminders(): crea dos tipos de aviso, solo para plazos FUTUROS
--     dentro de las próximas 48 h (nunca avisa de lo ya vencido):
--       - collaboration_expiring: solicitud en estado `requested` que caduca pronto.
--         Se avisa a quien debe responder (la parte que NO la inició).
--       - post_due_soon: contenido en `idea` o `in_production` que vence pronto.
--         Se avisa al creador. Si se mueve la fecha, se permite un recordatorio nuevo
--         (la clave incluye la fecha de vencimiento).
--   · Una tarea de pg_cron cada hora (minuto 5) que la ejecuta.
--
-- Qué NO hace (decisiones, ver ROADMAP.md):
--   · No cambia ningún estado ni caduca nada solo: la falta de respuesta NO se
--     convierte en aceptación ni en rechazo (plan-imp.md §Fase 3).
--   · No envía email ni push (servicios externos): bloque posterior.
--   · No hay todavía preferencias de aviso por usuario: requieren pantalla nueva y
--     mockup previo (plan-imp.md §3). Mientras tanto salen solo estos dos tipos y
--     una vez cada uno.
--   · Las horas del texto se muestran en Europe/Madrid.
--
-- La función es interna: solo la ejecuta pg_cron (rol postgres) y service_role.
--
-- ROLLBACK (manual):
--   select cron.unschedule('send-due-reminders');
--   drop function if exists public.send_due_reminders();
--   drop index if exists public.uq_notifications_dedupe;
--   alter table public.notifications drop column if exists dedupe_key;
--   -- No se desactiva pg_cron (borraría TODAS sus tareas): `drop extension pg_cron`
--   -- solo si no hay más tareas.
--
-- ESTADO: APLICADA el 2026-11-09 con el conector de Supabase (sin registrar en
-- supabase_migrations, igual que las anteriores).
-- ============================================================================
begin;

alter table public.notifications add column if not exists dedupe_key text;

create unique index if not exists uq_notifications_dedupe
    on public.notifications (profile_id, dedupe_key)
    where dedupe_key is not null;

create or replace function public.send_due_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    n_collab integer := 0;
    n_post integer := 0;
begin
    -- 1) Solicitudes que caducan en las próximas 48 h → a quien debe responder.
    insert into public.notifications (profile_id, type, title, body, link, dedupe_key)
    select
        case when c.initiated_by = 'creator' then p.profile_id else cr.profile_id end,
        'collaboration_expiring',
        'Una propuesta caduca pronto',
        coalesce(case when c.initiated_by = 'creator' then cr.display_name else p.company_name end, 'Alguien')
            || ' espera tu respuesta. Caduca el '
            || to_char(c.expires_at at time zone 'Europe/Madrid', 'DD/MM') || ' a las '
            || to_char(c.expires_at at time zone 'Europe/Madrid', 'HH24:MI') || '.',
        case when c.initiated_by = 'creator' then '/partner/requests' else '/creator/requests' end
            || '?collaboration=' || c.id,
        'collaboration_expiring:' || c.id
    from public.collaborations c
    join public.creators cr on cr.id = c.creator_id
    join public.partners p on p.id = c.partner_id
    where c.status = 'requested'
      and c.expires_at is not null
      and c.expires_at > now()
      and c.expires_at <= now() + interval '48 hours'
      and case when c.initiated_by = 'creator' then p.profile_id else cr.profile_id end is not null
    on conflict (profile_id, dedupe_key) where dedupe_key is not null do nothing;
    get diagnostics n_collab = row_count;

    -- 2) Contenidos sin entregar que vencen en las próximas 48 h → al creador.
    insert into public.notifications (profile_id, type, title, body, link, dedupe_key)
    select
        cr.profile_id,
        'post_due_soon',
        'Un contenido vence pronto',
        '«' || po.title || '» vence el '
            || to_char(po.due_date at time zone 'Europe/Madrid', 'DD/MM') || ' a las '
            || to_char(po.due_date at time zone 'Europe/Madrid', 'HH24:MI') || '.',
        '/creator/post/' || po.id,
        'post_due_soon:' || po.id || ':' || to_char(po.due_date at time zone 'UTC', 'YYYYMMDDHH24MI')
    from public.posts po
    join public.creators cr on cr.id = po.creator_id
    where po.status in ('idea', 'in_production')
      and po.due_date > now()
      and po.due_date <= now() + interval '48 hours'
      and cr.profile_id is not null
    on conflict (profile_id, dedupe_key) where dedupe_key is not null do nothing;
    get diagnostics n_post = row_count;

    return jsonb_build_object('collaboration_expiring', n_collab, 'post_due_soon', n_post);
end;
$$;

revoke execute on function public.send_due_reminders() from public, anon, authenticated;
grant execute on function public.send_due_reminders() to service_role;

commit;

-- Activación (tarea programada). Va aparte de la transacción: pg_cron crea su
-- propio esquema. Es idempotente: si ya existe una tarea con ese nombre, la sustituye.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('send-due-reminders', '5 * * * *', $cron$select public.send_due_reminders()$cron$);
