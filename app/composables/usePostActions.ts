import { statusMeta, movingSkipsPartnerReview } from '~/utils/status'
import type { Post, PostStatus } from '~/types'

export type ChangeStatusResult = 'ok' | 'cancelled' | 'failed'

/**
 * Cambiar de fase y borrar una publicación desde una vista de LISTA o del
 * Tablero (A-R21), con las mismas reglas que ya aplicaba el tablero: avisar
 * (sin bloquear) si se salta la revisión del partner y no mostrar un éxito
 * hasta que el servidor lo confirme. No toca el estado de ninguna vista:
 * devuelve qué pasó para que quien la llama (p. ej. el Tablero, que mueve la
 * card de columna) decida cómo reflejarlo.
 */
export function usePostActions() {
  const { updatePost, deletePost } = useMyPosts()
  const { requests: collabRequests } = useCollabRequests()
  const { confirm } = useConfirm()
  const toast = useToast()

  async function changeStatus(post: Post, phase: PostStatus): Promise<ChangeStatusResult> {
    if (post.status === phase) return 'ok'

    const collab = post.collaborationId ? collabRequests.value.find((c) => c.id === post.collaborationId) : undefined
    if (post.collaborationId && movingSkipsPartnerReview(phase, collab?.status, post.status)) {
      const partnerName = collab?.partnerName ?? 'el partner'
      const ok = await confirm({
        title: 'Vas a saltarte la revisión del partner',
        message: `Esta publicación pertenece a una colaboración activa con ${partnerName}. Normalmente es ${partnerName} quien la aprueba antes de pasar a "${statusMeta[phase].label}" (desde "Para revisar"). ¿Moverla igualmente sin su aprobación?`,
        confirmLabel: 'Mover igualmente'
      })
      if (!ok) return 'cancelled'
    }

    try {
      await updatePost(post.id, { status: phase })
      toast.success(`«${post.title}» movida a ${statusMeta[phase].label}`)
      return 'ok'
    } catch (err) {
      console.error('[usePostActions] fallo al cambiar de fase:', err)
      toast.error(`No se ha podido mover «${post.title}». Sigue en ${statusMeta[post.status].label}.`)
      return 'failed'
    }
  }

  /** Pide confirmación y borra; devuelve si se borró de verdad. */
  async function remove(post: Post): Promise<boolean> {
    const ok = await confirm({
      title: `¿Borrar "${post.title}"?`,
      message: 'Se borrará permanentemente, junto con su checklist, etiquetas y predicción de éxito si las tenía.',
      confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
    })
    if (!ok) return false
    try {
      await deletePost(post.id)
      toast.success('Publicación borrada')
      return true
    } catch (err) {
      console.error('[usePostActions] fallo al borrar:', err)
      toast.error('No se ha podido borrar la publicación. Inténtalo de nuevo.')
      return false
    }
  }

  return { changeStatus, remove }
}
