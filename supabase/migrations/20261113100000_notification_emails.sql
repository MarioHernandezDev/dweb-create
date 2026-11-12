-- Avisos por correo (SMTP propio, ver docs/16-EMAIL-SMTP.md).
--
--   · notifications.emailed_at: cuándo se mandó (o se descartó) el aviso por correo.
--     Lo escribe solo el servidor (clave de servicio); `authenticated` sigue
--     pudiendo actualizar únicamente `read_at` (permisos por columna de 20261103170000).
--   · notification_preferences.email_enabled: el usuario puede apagar el correo.
--
-- Solo añade columnas. Los avisos que ya existían se marcan como enviados para
-- que el primer envío programado no mande correos antiguos.
--
-- ROLLBACK:
--   drop index if exists public.idx_notifications_email_pending;
--   alter table public.notifications drop column if exists emailed_at;
--   alter table public.notification_preferences drop column if exists email_enabled;

begin;

alter table public.notifications add column if not exists emailed_at timestamptz;
update public.notifications set emailed_at = now() where emailed_at is null;

create index if not exists idx_notifications_email_pending
    on public.notifications (created_at) where emailed_at is null and read_at is null;

alter table public.notification_preferences add column if not exists email_enabled boolean not null default true;

commit;
