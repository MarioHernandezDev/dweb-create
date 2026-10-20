-- ============================================================================
-- FEEDMA — Cobro real de una colaboración (Fase 3, parte 2)
--
-- `budget_cents` ya existía en el esquema inicial pero no se usaba en
-- ningún sitio. Aquí se añaden las columnas para registrar el pago de
-- verdad — separadas de `status` a propósito: el estado de "en qué fase
-- va el trabajo" (requested/accepted/in_progress/completed) y "si ya se
-- pagó" son dos cosas distintas (se puede estar in_progress y ya pagado,
-- o completed sin cobrar todavía).
-- ============================================================================

alter table public.collaborations
    add column stripe_payment_intent_id text,
    add column paid_at timestamptz;
