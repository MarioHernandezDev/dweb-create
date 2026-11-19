-- Revisión de reportes por el equipo (incluidas las terminaciones por incumplimiento):
-- cada reporte pasa por abierto → en revisión → resuelto / desestimado, con una nota interna.
-- Lo escribe solo el panel de admin (clave de servicio).
--
-- De paso se cierra un hueco: la tabla tenía permisos de tabla completos para anon y
-- authenticated (solo los frenaba RLS). Con columnas nuevas, quien reporta podría haber
-- insertado el reporte ya «resuelto». Ahora solo puede insertar sus cuatro columnas.
--
-- ROLLBACK:
--   grant insert on public.reports to authenticated;
--   alter table public.reports drop column if exists status, drop column if exists admin_note, drop column if exists resolved_at;

begin;

alter table public.reports
    add column if not exists status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
    add column if not exists admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
    add column if not exists resolved_at timestamptz;

revoke all on public.reports from anon;
revoke all on public.reports from authenticated;
grant insert (collaboration_id, reporter_profile_id, reason, detail) on public.reports to authenticated;

commit;
