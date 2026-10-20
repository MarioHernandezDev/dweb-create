-- ----------------------------------------------------------------------------
-- Backfill ÚNICO (no pensado para re-ejecutarse): las suscripciones Pro/
-- Agencia que ya estaban "active"/"trialing" antes de que
-- server/api/stripe/webhook.post.ts empezara a escuchar `invoice.paid` (ver
-- docs/CHANGELOG.md, "Consumo de créditos por predicción") nunca recibieron
-- su primer reparto de créditos de plan — solo el regalo de bienvenida de
-- Free. A partir de ahora, cada pago/renovación real ya lo hace solo; esto
-- es solo para poner al día lo que ya estaba activo.
-- ----------------------------------------------------------------------------

-- Influencer con suscripción propia (plan Pro).
insert into public.credit_ledger (influencer_id, amount, reason)
select s.influencer_id, 20, 'subscription_grant'
from public.subscriptions s
where s.influencer_id is not null
  and s.plan_id = 'pro'
  and s.status in ('active', 'trialing');

-- Manager con suscripción Agencia: reparte entre su plantilla actual (cada
-- influencer recibe sus propios 20, no un pozo común — mismo criterio que
-- en el webhook).
insert into public.credit_ledger (influencer_id, amount, reason)
select i.id, 20, 'subscription_grant'
from public.subscriptions s
join public.influencers i on i.manager_id = s.manager_id
where s.manager_id is not null
  and s.plan_id = 'agency'
  and s.status in ('active', 'trialing');
