import type { Post } from '~/types'

export interface ChecklistItem {
  id: string
  postId: string
  text: string
  done: boolean
  sortOrder: number
}

interface ChecklistItemRow {
  id: string
  post_id: string
  text: string
  done: boolean
  sort_order: number
}

const ITEM_SELECT = 'id, post_id, text, done, sort_order'

function mapItemRow(row: ChecklistItemRow): ChecklistItem {
  return { id: row.id, postId: row.post_id, text: row.text, done: row.done, sortOrder: row.sort_order }
}

/**
 * Checklist por post. La lista completa de items solo se carga al abrir el
 * panel de una card (`ensureItems`, perezoso) — el recuento `{done,total}`
 * que pinta la barra de progreso en la cara de la card ya viaja con el
 * propio `Post` (useMyPosts.ts trae el join agregado), así que el tablero
 * no depende de esta carga para mostrar el progreso.
 */
export function useChecklist() {
  const client = useSupabaseClient()
  const itemsByPost = useState<Record<string, ChecklistItem[]>>('checklist-items-by-post', () => ({}))

  async function ensureItems(postId: string) {
    if (itemsByPost.value[postId]) return itemsByPost.value[postId]

    const { data, error } = await client
      .from('checklist_items')
      .select(ITEM_SELECT)
      .eq('post_id', postId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[useChecklist] fallo al cargar el checklist:', error.message)
      return []
    }
    const items = (data as ChecklistItemRow[]).map(mapItemRow)
    itemsByPost.value = { ...itemsByPost.value, [postId]: items }
    return items
  }

  // El recuento cacheado en el Post (para la card) se recalcula a mano tras
  // cada cambio — es más simple que releer con un segundo fetch agregado.
  function syncCount(postId: string, post?: Post) {
    if (!post) return
    const items = itemsByPost.value[postId] ?? []
    post.checklist = { total: items.length, done: items.filter((i) => i.done).length }
  }

  async function addItem(postId: string, text: string, post?: Post) {
    const items = itemsByPost.value[postId] ?? []
    const nextOrder = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0

    const { data, error } = await client
      .from('checklist_items')
      .insert({ post_id: postId, text, sort_order: nextOrder } as never)
      .select(ITEM_SELECT)
      .single<ChecklistItemRow>()
    if (error) throw error

    const mapped = mapItemRow(data)
    itemsByPost.value = { ...itemsByPost.value, [postId]: [...items, mapped] }
    syncCount(postId, post)
    return mapped
  }

  async function toggleItem(postId: string, itemId: string, done: boolean, post?: Post) {
    const { error } = await client.from('checklist_items').update({ done } as never).eq('id', itemId)
    if (error) throw error
    const item = (itemsByPost.value[postId] ?? []).find((i) => i.id === itemId)
    if (item) item.done = done
    syncCount(postId, post)
  }

  async function deleteItem(postId: string, itemId: string, post?: Post) {
    const { error } = await client.from('checklist_items').delete().eq('id', itemId)
    if (error) throw error
    itemsByPost.value = { ...itemsByPost.value, [postId]: (itemsByPost.value[postId] ?? []).filter((i) => i.id !== itemId) }
    syncCount(postId, post)
  }

  return { itemsByPost, ensureItems, addItem, toggleItem, deleteItem }
}
