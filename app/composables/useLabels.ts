import type { Post } from '~/types'

export interface Label {
  id: string
  name: string
  color: string
}

interface LabelRow {
  id: string
  name: string
  color: string
}

const LABEL_SELECT = 'id, name, color'

function mapLabelRow(row: LabelRow): Label {
  return { id: row.id, name: row.name, color: row.color }
}

/**
 * Las etiquetas del creador logueado — reutilizables entre posts, como en
 * Trello: se crean/editan una vez desde el panel de una card y quedan
 * disponibles para el resto. `post.labelIds` (ver useMyPosts.ts, que las
 * trae ya unidas con un join) es lo que decide qué chips pinta cada card;
 * aquí solo vive el catálogo nombre+color y las funciones para asignarlas.
 */
export function useLabels() {
  const client = useSupabaseClient()
  const { creator, ensureCreator } = useMyCreator()

  const labels = useState<Label[]>('my-labels', () => [])
  const loaded = useState<boolean>('my-labels-loaded', () => false)

  async function ensureLabels() {
    if (loaded.value) return labels.value
    const me = creator.value ?? (await ensureCreator())
    if (!me) return labels.value

    const { data, error } = await client
      .from('labels')
      .select(LABEL_SELECT)
      .eq('creator_id', me.id)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[useLabels] fallo al cargar etiquetas:', error.message)
      return labels.value
    }
    labels.value = (data as LabelRow[]).map(mapLabelRow)
    loaded.value = true
    return labels.value
  }

  async function createLabel(name: string, color: string) {
    const me = creator.value ?? (await ensureCreator())
    if (!me) throw new Error('No se ha encontrado tu ficha de creador.')

    const { data, error } = await client
      .from('labels')
      .insert({ creator_id: me.id, name, color } as never)
      .select(LABEL_SELECT)
      .single<LabelRow>()
    if (error) throw error

    const mapped = mapLabelRow(data)
    labels.value = [...labels.value, mapped]
    return mapped
  }

  async function updateLabel(id: string, patch: { name?: string; color?: string }) {
    const { error } = await client.from('labels').update(patch as never).eq('id', id)
    if (error) throw error
    const local = labels.value.find((l) => l.id === id)
    if (local) Object.assign(local, patch)
  }

  async function deleteLabel(id: string) {
    const { error } = await client.from('labels').delete().eq('id', id)
    if (error) throw error
    labels.value = labels.value.filter((l) => l.id !== id)
  }

  // Mutan también `post.labelIds` (misma referencia de objeto que pinta la
  // card en el tablero): el chip aparece/desaparece al instante, sin
  // recargar ni el post ni el tablero entero.
  async function attachLabel(postId: string, labelId: string, post: Post) {
    const { error } = await client.from('post_labels').insert({ post_id: postId, label_id: labelId } as never)
    if (error) throw error
    if (!post.labelIds.includes(labelId)) post.labelIds.push(labelId)
  }

  async function detachLabel(postId: string, labelId: string, post: Post) {
    const { error } = await client.from('post_labels').delete().eq('post_id', postId).eq('label_id', labelId)
    if (error) throw error
    post.labelIds = post.labelIds.filter((id) => id !== labelId)
  }

  return { labels, ensureLabels, createLabel, updateLabel, deleteLabel, attachLabel, detachLabel }
}
