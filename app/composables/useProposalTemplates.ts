import { TEMPLATE_MAX, templateName, type TemplateKind } from '~/utils/proposal-templates'

export interface ProposalTemplate { id: string; name: string; data: unknown }

/** Plantillas de propuesta del usuario (privadas: RLS por dueño). Guardar con un nombre que ya existe la actualiza. */
export function useProposalTemplates(kind: TemplateKind) {
  const client = useSupabaseClient()
  const templates = useState<ProposalTemplate[]>(`proposal-templates-${kind}`, () => [])
  const loaded = useState<boolean>(`proposal-templates-loaded-${kind}`, () => false)
  const db = client as unknown as { from: (t: string) => any }

  async function load(force = false) {
    if (loaded.value && !force) return
    const { data, error } = await db.from('proposal_templates').select('id, name, data').eq('kind', kind).order('name')
    if (error) {
      console.error('[useProposalTemplates] fallo al cargar:', error.message)
      return
    }
    templates.value = data as ProposalTemplate[]
    loaded.value = true
  }

  /** Guarda (o actualiza, si el nombre ya existe). Lanza un `Error` con el motivo si no se puede. */
  async function save(rawName: string, data: unknown): Promise<'created' | 'updated'> {
    const name = templateName(rawName)
    if (!name) throw new Error('Ponle un nombre a la plantilla (máximo 80 caracteres).')
    const existing = templates.value.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      const { error } = await db.from('proposal_templates').update({ data }).eq('id', existing.id)
      if (error) throw new Error('No se ha podido actualizar la plantilla.')
      await load(true)
      return 'updated'
    }
    if (templates.value.length >= TEMPLATE_MAX) throw new Error(`Ya tienes ${TEMPLATE_MAX} plantillas. Borra alguna antes de guardar otra.`)
    const { error } = await db.from('proposal_templates').insert({ kind, name, data })
    if (error) throw new Error(error.message?.includes('15 plantillas') ? error.message : 'No se ha podido guardar la plantilla.')
    await load(true)
    return 'created'
  }

  async function remove(id: string) {
    const { error } = await db.from('proposal_templates').delete().eq('id', id)
    if (error) throw new Error('No se ha podido borrar la plantilla.')
    templates.value = templates.value.filter((t) => t.id !== id)
  }

  return { templates, loaded, load, save, remove }
}
