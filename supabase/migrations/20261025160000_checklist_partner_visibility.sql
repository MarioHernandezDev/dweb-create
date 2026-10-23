-- ============================================================================
-- FEEDMA — "seguimiento del progreso": el partner no tenía ninguna forma de
-- ver el checklist de una publicación de su colaboración, solo la fase
-- general (StatusPill). El propio código lo documentaba ya como pendiente
-- (app/composables/usePartnerPosts.ts: "Etiquetas/checklist son solo del
-- tablero del creador por ahora — el partner no las ve todavía").
--
-- Solo se amplía LECTURA — mismo patrón ya usado en posts_select_scoped
-- (20261021120000_remove_manager_rename_creator_partner.sql): "soy el
-- creador dueño" O "soy el partner con una colaboración activa sobre ese
-- post". Las policies de insert/update/delete no se tocan — siguen
-- exigiendo creator_id = current_creator_id(), así que el partner sigue
-- sin poder escribir nada en el checklist. `labels`/`post_labels` quedan
-- fuera a propósito (organización personal del creador, no información de
-- progreso).
--
-- Escrita para poder ejecutarse más de una vez sin reventar (misma
-- convención que el resto de migraciones de este proyecto).
-- ============================================================================

drop policy if exists "checklist_items_select_own" on public.checklist_items;
drop policy if exists "checklist_items_select_scoped" on public.checklist_items;

create policy "checklist_items_select_scoped" on public.checklist_items for select
    using (
        post_id in (select id from public.posts where creator_id = public.current_creator_id())
        or exists (
            select 1 from public.posts p
            join public.collaborations c on c.id = p.collaboration_id
            where p.id = checklist_items.post_id
            and c.partner_id = public.current_partner_id()
        )
    );
