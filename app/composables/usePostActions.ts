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
  const { updatePost, stashPost, deletePostRemote } = useMyPosts()
  const { requests: collabRequests } = useCollabRequests()
  const { confirm } = useConfirm()
  const toast = useToast()

  // Plazo para «Deshacer»: el borrado de verdad no se hace hasta que pasa (cerrar la pestaña antes lo cancela: lo seguro).
  const UNDO_MS = 8000

  /** Vuelve una publicación a la fase en la que estaba; `onUndo` deja a quien la movió (el tablero) reflejarlo. */
  async function undoMove(post: Post, previous: PostStatus, onUndo?: (previous: PostStatus) => void) {
    try {
      await updatePost(post.id, { status: previous })
      onUndo?.(previous)
      toast.success(`«${post.title}» vuelve a ${statusMeta[previous].label}`)
    } catch (err) {
      console.error('[usePostActions] fallo al deshacer el cambio de fase:', err)
      toast.error(`No se ha podido deshacer: «${post.title}» sigue en ${statusMeta[post.status].label}.`)
    }
  }

  async function changeStatus(post: Post, phase: PostStatus, opts: { onUndo?: (previous: PostStatus) => void } = {}): Promise<ChangeStatusResult> {
    if (post.status === phase) return 'ok'
    const previous = post.status

    try {
      await updatePost(post.id, { status: phase })
      toast.success(`«${post.title}» movida a ${statusMeta[phase].label}`, { ms: 7000, action: { label: 'Deshacer', onClick: () => { void undoMove(post, previous, opts.onUndo) } } })
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

  /**
   * Borra una publicación con «Deshacer». Las propias desaparecen al momento y se borran de verdad pasados unos segundos
   * (hasta entonces se pueden recuperar); las de una colaboración piden antes confirmación, porque la marca también las ve.
   * Devuelve si se quitó de las listas.
   */
  async function remove(post: Post, opts: { onUndo?: () => void } = {}): Promise<boolean> {
    if (post.collaborationId) {
      const ok = await confirm({
        title: `¿Borrar "${post.title}"?`,
        message: 'Es una pieza de una colaboración: la marca dejará de verla. Se borrará junto con su checklist, etiquetas y predicción de éxito, y podrás deshacerlo unos segundos.',
        confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
      })
      if (!ok) return false
    }
    const restore = stashPost(post.id)
    if (!restore) return false

    let undone = false
    const timer = setTimeout(async () => {
      if (undone) return
      try {
        await deletePostRemote(post.id)
      } catch (err) {
        console.error('[usePostActions] fallo al borrar:', err)
        restore()
        toast.error(`No se ha podido borrar «${post.title}»: vuelve a estar en tu lista.`)
      }
    }, UNDO_MS)

    toast.info(`«${post.title}» eliminada`, {
      ms: UNDO_MS,
      action: { label: 'Deshacer', onClick: () => { undone = true; clearTimeout(timer); restore(); opts.onUndo?.(); toast.success(`«${post.title}» restaurada`) } }
    })
    return true
  }

  return { changeStatus, remove }
}
