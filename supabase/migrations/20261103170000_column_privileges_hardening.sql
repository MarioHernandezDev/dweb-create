-- ============================================================================
-- S-01 / S-02 / S-03 (auditoría de seguridad, Fase 2) — Permisos por columna.
--
-- La auditoría de catálogo (solo lectura, 2026-11-03) mostró que `authenticated`
-- tiene INSERT y UPDATE sobre TODAS las columnas de `collaborations`, `profiles`,
-- `creators`, `partners` y `notifications` (privilegios por defecto de Supabase).
-- RLS limita las filas, pero no las columnas:
--   · collaborations: la política de alta solo comprueba quién la inicia, así
--     que el alta podía llevar `status`, `paid_at`, `stripe_payment_intent_id`
--     u `offer_id` puestos por el cliente (los estados y el pago solo deben
--     cambiar por RPC o por el webhook).
--   · profiles: el propio usuario podía cambiar su `role`.
--   · creators/partners: `creators_insert_own`/`partners_insert_own` no miran el
--     rol (un partner podía crearse ficha de creador, N-02) y el creador podía
--     escribir `stripe_connect_account_id`/`stripe_connect_onboarded` (solo
--     debe hacerlo el servidor). Además cualquier usuario con sesión leía el
--     `stripe_connect_account_id` de todos los creadores.
--
-- Después de esta migración el navegador solo puede escribir las columnas que la
-- app escribe de verdad (comprobado en el código: useMyCreator/useMyPartner
-- updateFicha y portada, board_wip_limits, useChatSettings, useMyAvatar,
-- useNotifications y el alta de solicitudes en */discover.vue). Las fichas las
-- crea `handle_new_user()` (SECURITY DEFINER); las funciones SECURITY DEFINER,
-- el webhook y los endpoints con service_role NO se ven afectados.
--
-- Pruebas:   permisos efectivos con has_column_privilege en el catálogo (antes:
--            todas las columnas; después: solo las listadas) y regresión en
--            navegador en el entorno de demo: alta de solicitud desde Descubrir,
--            guardar ficha, portada, avatar, privacidad del chat, avisos leídos,
--            aceptar oferta y flujo de revisión. Ver docs/audit/02_SECURITY_AUDIT.md.
--
-- ROLLBACK:
--   begin;
--   grant insert, update on public.collaborations, public.profiles, public.creators,
--     public.partners, public.notifications to authenticated;
--   grant select on public.creators to anon, authenticated;
--   create policy "creators_insert_own" on public.creators for insert with check (profile_id = auth.uid());
--   create policy "partners_insert_own" on public.partners for insert with check (profile_id = auth.uid());
--   commit;
--
-- ESTADO: APLICADA en el proyecto compartido el 2026-11-03 (también en el Supabase
-- local de la demo). Catálogo verificado en solo lectura tras aplicarla: permisos
-- por columna como arriba, sin políticas de alta en creators/partners, y las 6
-- funciones que escriben en estas tablas son SECURITY DEFINER (no afectadas).
-- ============================================================================
begin;

-- collaborations: alta de solicitud sin estado, pago ni oferta; sin UPDATE directo.
revoke insert, update on public.collaborations from anon, authenticated;
grant insert (partner_id, creator_id, initiated_by, brief, budget_cents,
              campaign_goal, target_audience, tone, scope_notes,
              revisions_included, exclusivity, usage_rights)
    on public.collaborations to authenticated;

-- profiles: las crea el trigger de alta; el usuario solo cambia nombre, avatar y privacidad.
revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, chat_privacy) on public.profiles to authenticated;

-- creators: sin alta desde el navegador; sin escribir ni leer el id de Stripe Connect.
drop policy if exists "creators_insert_own" on public.creators;
revoke insert, update, select on public.creators from anon, authenticated;
grant select (id, profile_id, display_name, niche, bio, avatar_url, created_at,
              stripe_connect_onboarded, categories, min_rate_cents, max_rate_cents,
              looking_for, cover_url, board_wip_limits, weekly_post_target)
    on public.creators to authenticated;
grant update (display_name, niche, bio, avatar_url, categories, min_rate_cents,
              max_rate_cents, looking_for, cover_url, board_wip_limits, weekly_post_target)
    on public.creators to authenticated;

-- partners: sin alta desde el navegador.
drop policy if exists "partners_insert_own" on public.partners;
revoke insert, update on public.partners from anon, authenticated;
grant update (company_name, industry, bio, categories, min_budget_cents,
              max_budget_cents, looking_for, cover_url)
    on public.partners to authenticated;

-- notifications: el usuario solo marca como leído.
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

commit;
