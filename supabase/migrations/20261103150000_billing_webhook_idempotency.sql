-- ============================================================================
-- H0-02 — Webhook de Stripe: créditos idempotentes y todos los estados de Stripe.
--
-- 1. `credit_ledger.stripe_invoice_id` (único cuando no es NULL). El webhook
--    concede los créditos de `invoice.paid` guardando el id de la factura: si
--    Stripe entrega dos veces el mismo evento (lo documenta como posible) o lo
--    reintenta tras un 500, la segunda inserción choca (23505) y se trata como
--    ya registrada. Las filas existentes quedan con NULL (no se inventa nada).
--
-- 2. `subscriptions.status`: el CHECK inicial solo admite 5 de los 8 estados de
--    Stripe. Con `unpaid`, `incomplete_expired` o `paused` la escritura fallaba
--    (y el webhook respondía 200, así que el estado quedaba desfasado en silencio).
--
-- Orden de despliegue: el código del webhook ya escribe `stripe_invoice_id`.
-- Mientras esta migración no esté aplicada, `invoice.paid` responde 500 y Stripe
-- reintenta (hasta 3 días): no se pierden créditos ni se duplican.
--
-- Pruebas:   tests/unit/stripe-webhook.spec.ts (lógica) y el plan de Stripe Test
--            Mode de docs/audit/07_CRITICAL_FINDINGS_VALIDATION.md (extremo a extremo).
--
-- ROLLBACK:
--   begin;
--   drop index if exists public.credit_ledger_stripe_invoice_id_key;
--   alter table public.credit_ledger drop column if exists stripe_invoice_id;
--   alter table public.subscriptions drop constraint if exists subscriptions_status_check;
--   alter table public.subscriptions add constraint subscriptions_status_check
--     check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete'));
--   commit;
--
-- ESTADO: PREPARADA, NO APLICADA.
-- ============================================================================
begin;

alter table public.credit_ledger add column if not exists stripe_invoice_id text;

create unique index if not exists credit_ledger_stripe_invoice_id_key
    on public.credit_ledger (stripe_invoice_id)
    where stripe_invoice_id is not null;

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'));

commit;
