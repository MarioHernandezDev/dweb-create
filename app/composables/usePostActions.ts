import { statusMeta, isApprovalRequiredError } from '~/utils/status'
import type { Post, PostStatus } from '~/types'

export type ChangeStatusResult = 'ok' | 'cancelled' | 'failed'

/**
 * Cambiar de fase y borrar una publicación desde una vista de LISTA o del
 * Tablero (A-R21): no se muestra un éxito hasta que el servidor lo confirma. Si la
 * publicación es de una colaboración activa y se intenta programar o publicar sin
 * la aprobación de la marca, el servidor lo rechaza (Fase 2) y aquí se ofrece
 * enviarla a revisión. No toca el estado de ninguna vista: devuelve qué pasó para
 * que quien la llama (p. ej. el Tablero, que mueve la card de columna) decida cómo
 * reflejarlo.
 */
export function usePostActions() {
  const { updatePost, deletePost } = useMyPosts()
  const { requests: collabRequests } = useCollabRequests()
  const { confirm } = useConfirm()
  const toast = useToast()

  async function changeStatus(post: Post, phase: PostStatus): Promise<ChangeStatusResult> {
    if (post.status === phase) return 'ok'

    try {
      await updatePost(post.id, { status: phase })
      toast.success(`«${post.title}» movida a ${statusMeta[phase].label}`)
      return 'ok'
    } catch (err) {
      // Una publicación de una colaboración activa no se programa ni se publica sin la aprobación de la
      // marca: el servidor lo impide (no es solo un aviso). Se ofrece el camino correcto.
      if (isApprovalRequiredError(err)) {
        const collab = post.collaborationId ? collabRequests.value.find((c) => c.id === post.collaborationId) : undefined
        const partnerName = collab?.partnerName ?? 'la marca'
        const ok = await confirm({
          title: 'Necesita la aprobación de la marca',
          message: `Esta publicación pertenece a una colaboración activa con ${partnerName}, que tiene que aprobarla antes de pasar a "${statusMeta[phase].label}". ¿Enviarla a revisión ahora?`,
          confirmLabel: 'Enviar a revisión'
        })
        if (!ok) return 'cancelled'
        try {
          await updatePost(post.id, { status: 'ready_for_review' })
          toast.success(`«${post.title}» enviada a revisión`)
        } catch (reviewErr) {
          console.error('[usePostActions] fallo al enviar a revisión:', reviewErr)
          toast.error(`No se ha podido enviar «${post.title}» a revisión. Sigue en ${statusMeta[post.status].label}.`)
          return 'failed'
        }
        // La tarjeta ya está en «Para revisar» (se refleja sola): quien llama no tiene que moverla.
        return 'cancelled'
      }
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
