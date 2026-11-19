-- ============================================================================
-- FEEDMA — M3 (A-R8a y A-R8b): histórico de la cuenta y métricas por
-- publicación sin confundir "0" con "no disponible".
--
-- A) `social_account_snapshots` (TABLA NUEVA, A-R8a): una fila por cuenta y día
--    con los ACUMULADOS (seguidores/suscriptores, visualizaciones totales,
--    vídeos). Google no conserva esos acumulados con histórico (solo el valor
--    actual), así que sin esta tabla no hay evolución de suscriptores totales
--    ni dashboard resistente a una cuenta revocada o a la cuota. Las series por
--    día (vistas, suscriptores ganados/perdidos) se siguen pidiendo EN VIVO a la
--    Analytics API y no se duplican aquí.
--      * clave primaria (cuenta, día) -> un upsert repetido no crea filas;
--      * columnas nullable: un canal puede ocultar sus suscriptores y Instagram
--        no da visualizaciones totales; no se guarda un 0 falso.
--
-- B) `metrics` (EXISTENTE, A-R8b). Hoy ninguna parte del código la lee ni la
--    escribe. Cambios:
--      * views/likes/comments/shares/saves pasan a ser NULLABLES y sin valor por
--        defecto: un 0 no distingue "cero de verdad" de "el proveedor no lo da"
--        (p. ej. Instagram no ofrece todo para todos los tipos de publicación).
--        Las filas ya existentes conservan sus valores.
--      * `source`, `measured_on` (día UTC al que corresponde la medida),
--        `measured_at` (cuándo mide el proveedor; distinto de `captured_at`, que
--        es cuándo lo guardamos), `reach` y `unavailable_metrics` (qué métricas
--        no se pudieron obtener).
--      * restricción única (post_id, source, measured_on): un registro por
--        publicación y día; reintentar el mismo sync hace upsert sobre la misma
--        fila (idempotente, almacenamiento acotado). Se conserva el histórico.
--      Desviación respecto a la propuesta: el día se guarda como columna `date`
--      en lugar de una expresión sobre `measured_at`, porque un `upsert` desde la
--      API no puede apuntar a un índice de expresión.
--
-- PERMISOS: ninguna escritura desde el navegador (solo service_role). Lectura de
-- `social_account_snapshots` solo para el creador dueño de la cuenta; la de
-- `metrics` conserva su política existente (`metrics_select_scoped`), que no se
-- toca. El perfil público sigue usando su RPC, no estas tablas.
--
-- El código que usa esto (escritor de snapshots y de métricas) se publica
-- DESPUÉS de aplicar esta migración.
--
-- Propuesta: docs/PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md (M3).
-- Pruebas:   tests/integration/post-links-and-metrics.spec.ts
--
-- ROLLBACK (solo pierde lo escrito en lo nuevo; las columnas antiguas de
-- `metrics` solo se vuelven a poner NOT NULL si ningún valor es null):
--   begin;
--   drop table if exists public.social_account_snapshots;
--   alter table public.metrics
--     drop constraint if exists metrics_post_source_day_key,
--     drop column if exists unavailable_metrics,
--     drop column if exists reach,
--     drop column if exists measured_at,
--     drop column if exists measured_on,
--     drop column if exists source;
--   update public.metrics set views = coalesce(views, 0), likes = coalesce(likes, 0),
--     comments = coalesce(comments, 0), shares = coalesce(shares, 0), saves = coalesce(saves, 0);
--   alter table public.metrics
--     alter column views set default 0, alter column views set not null,
--     alter column likes set default 0, alter column likes set not null,
--     alter column comments set default 0, alter column comments set not null,
--     alter column shares set default 0, alter column shares set not null,
--     alter column saves set default 0, alter column saves set not null;
--   commit;
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- A) Histórico diario de acumulados por cuenta.
-- ---------------------------------------------------------------------------
create table public.social_account_snapshots (
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  observed_on date not null,
  followers_count bigint check (followers_count is null or followers_count >= 0),
  views_total bigint check (views_total is null or views_total >= 0),
  videos_count integer check (videos_count is null or videos_count >= 0),
  created_at timestamptz not null default now(),
  primary key (social_account_id, observed_on)
);

alter table public.social_account_snapshots enable row level security;

create policy "social_account_snapshots_select_own" on public.social_account_snapshots for select
  using (
    social_account_id in (
      select id from public.social_accounts
      where creator_id = public.current_creator_id()
    )
  );

revoke all on table public.social_account_snapshots from anon, authenticated;
grant select on table public.social_account_snapshots to authenticated;

-- ---------------------------------------------------------------------------
-- B) Métricas por publicación: nullables y con trazabilidad.
-- ---------------------------------------------------------------------------
alter table public.metrics
  alter column views drop not null,    alter column views drop default,
  alter column likes drop not null,    alter column likes drop default,
  alter column comments drop not null, alter column comments drop default,
  alter column shares drop not null,   alter column shares drop default,
  alter column saves drop not null,    alter column saves drop default;

alter table public.metrics
  add column source text check (source in ('instagram', 'youtube')),
  add column measured_on date,
  add column measured_at timestamptz,
  add column reach bigint check (reach is null or reach >= 0),
  add column unavailable_metrics text[] not null default '{}';

-- Un registro por publicación, origen y día. Las filas antiguas (source null) no cuentan.
alter table public.metrics
  add constraint metrics_post_source_day_key unique (post_id, source, measured_on);

commit;
