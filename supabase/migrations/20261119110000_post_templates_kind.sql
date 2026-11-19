-- ============================================================================
-- CIBERAN — plantillas de publicación.
-- Reutiliza `proposal_templates` (privadas por dueño, máximo 15 por tipo) y solo amplía los tipos permitidos con
-- `post`. No cambia datos, políticas ni permisos existentes.
--
-- ROLLBACK (manual; antes borra las plantillas de publicación):
--   delete from public.proposal_templates where kind = 'post';
--   alter table public.proposal_templates drop constraint if exists proposal_templates_kind_check;
--   alter table public.proposal_templates add constraint proposal_templates_kind_check check (kind in ('proposal', 'invite'));
-- ============================================================================
begin;

alter table public.proposal_templates drop constraint if exists proposal_templates_kind_check;
alter table public.proposal_templates
    add constraint proposal_templates_kind_check check (kind in ('proposal', 'invite', 'post'));

commit;
