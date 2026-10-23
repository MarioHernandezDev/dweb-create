-- ============================================================================
-- FEEDMA — Fase 3 de la implementación de la auditoría: objetivo semanal
-- configurable. Antes `creator/index.vue` mostraba "tu objetivo semanal"
-- con una barra de progreso sobre un `weeklyTarget = 5` fijo en el cliente,
-- igual para todos los creadores y sin forma de cambiarlo — rompía la misma
-- norma de honestidad ("esto es tuyo de verdad") que el resto de la app sí
-- respeta.
-- ============================================================================

alter table public.creators
    add column if not exists weekly_post_target integer not null default 5 check (weekly_post_target > 0);
