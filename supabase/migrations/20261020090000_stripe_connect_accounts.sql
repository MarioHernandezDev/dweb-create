-- ============================================================================
-- FEEDMA — Cuentas conectadas de Stripe Connect (Fase 3)
--
-- Guarda el id de la cuenta conectada de Stripe de cada manager/influencer
-- (quien recibe el pago de una marca, menos la comisión de FEEDMA) y si ya
-- terminó el onboarding de verificación de Stripe. `onboarded` se actualiza
-- desde el webhook (evento `account.updated`), nunca lo escribe el cliente.
-- ============================================================================

alter table public.managers
    add column stripe_connect_account_id text unique,
    add column stripe_connect_onboarded boolean not null default false;

alter table public.influencers
    add column stripe_connect_account_id text unique,
    add column stripe_connect_onboarded boolean not null default false;
