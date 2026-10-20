-- ----------------------------------------------------------------------------
-- CREDIT_LEDGER: regalo de bienvenida al crear la ficha de influencer (ver
-- README Fase 4 — "Consumo de créditos"). El resto de movimientos
-- (consumo en /api/ml/predict, recarga mensual al renovar Pro/Agencia) los
-- escribe el servidor directamente, no hace falta trigger para esos.
-- ----------------------------------------------------------------------------
create or replace function public.grant_welcome_credits()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    insert into public.credit_ledger (influencer_id, amount, reason)
    values (new.id, 3, 'subscription_grant');
    return new;
end;
$$;

create trigger on_influencer_created
    after insert on public.influencers
    for each row execute function public.grant_welcome_credits();

-- Backfill: las fichas de influencer creadas antes de que existiera este
-- trigger (las 3 cuentas demo, sobre todo) no tienen ningún movimiento
-- todavía — sin esto, se quedarían atascadas en 0 créditos para siempre.
insert into public.credit_ledger (influencer_id, amount, reason)
select i.id, 3, 'subscription_grant'
from public.influencers i
where not exists (
    select 1 from public.credit_ledger cl where cl.influencer_id = i.id
);
