-- ----------------------------------------------------------------------------
-- TRENDS: columnas que necesita la tarjeta de tendencias del front
-- (hashtags, formato sugerido, potencial estimado) y el niche al que
-- pertenece cada idea, para poder cachear por nicho en /api/ml/trends.
-- Todas nullable/con default: no rompe las filas que ya existan.
-- ----------------------------------------------------------------------------
alter table public.trends
    add column niche text,
    add column hashtags text[] not null default '{}'::text[],
    add column format text,
    add column growth_pct numeric(6,2);

create index idx_trends_niche on public.trends(niche);
