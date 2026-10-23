-- ============================================================================
-- FEEDMA — Fase 5 de la implementación de la auditoría: `useMyCredits.ts`
-- traía TODO el historial de `credit_ledger` al cliente solo para sumarlo en
-- JS, sin límite — el mismo tipo de problema que `useMyPosts.ts` ya corrigió
-- con `.limit(300)`. Aquí no vale un simple límite (truncaría la suma de
-- verdad): el saldo tiene que ser exacto, así que se mueve la suma al
-- servidor con una función `security definer`, igual que `my_chat_unread_count()`.
-- ============================================================================

create or replace function public.my_credit_balance()
returns integer
language sql stable security definer set search_path = public
as $$
    select coalesce(sum(amount), 0)::int from public.credit_ledger where creator_id = public.current_creator_id();
$$;

grant execute on function public.my_credit_balance() to authenticated;
