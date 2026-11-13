import { LABEL_COLORS } from '~/utils/labels'
import type { Label } from '~/composables/useLabels'
import type { ChecklistItem } from '~/composables/useChecklist'
import { platformMeta } from '~/utils/mock-data'
import type { Platform, Post, PostStatus } from '~/types'

/**
 * Estado y acciones compartidas entre las dos superficies de edición de una
 * publicación: el panel del Tablero (`PostEditSheet.vue`) y la página
 * completa (`/creator/post/[id].vue`). Antes cada una reimplementaba lo
 * mismo con capacidades distintas — la página no tenía etiquetas ni
 * checklist, el panel no mostraba el historial de revisión ni el aviso de
 * "te han pedido cambios" — por ser copias independientes que fueron
 * divergiendo. Ahora las dos llaman a esto; solo difieren en cómo cambian
 * de fase (selector libre en el panel, botón secuencial en la página) y en
 * el layout, que se queda en cada archivo porque son sitios distintos de
 * verdad (edición rápida desde el tablero vs. página dedicada).
 */
export function usePostEditorPanel(post: Ref<Post | null | undefined>) {
  const { updatePost, deletePost, refresh: refreshPosts } = useMyPosts()
  const { balance: creditBalance, ensureLoaded: ensureCreditsLoaded, setBalance: setCreditBalance } = useMyCredits()
  const { labels, ensureLabels, createLabel, attachLabel, detachLabel } = useLabels()
  const { itemsByPost, ensureItems, addItem: addChecklistItem, toggleItem: toggleChecklistItem, deleteItem: deleteChecklistItem } = useChecklist()
  const { notesByPost, ensureLoaded: ensureRevisionsLoaded, latestPendingChangeRequest } = usePostRevisions()
  const { confirm } = useConfirm()
  const toast = useToast()

  const title = ref('')
  const caption = ref('')
  const dueDate = ref('')
  /** Hashtags como texto libre («#moda #verano»); se guardan como lista. */
  const hashtagsText = ref('')
  const parsedHashtags = computed(() => parseHashtags(hashtagsText.value))
  const hashtagsChanged = computed(() => !!post.value && parsedHashtags.value.join(' ') !== post.value.hashtags.join(' '))

  const dirty = computed(
    () => !!post.value && (title.value !== post.value.title || caption.value !== post.value.caption || dueDate.value !== post.value.dueDate || hashtagsChanged.value)
  )
  /** Vuelve a lo guardado, sin tocar el servidor. */
  function discard() {
    if (!post.value) return
    title.value = post.value.title
    caption.value = post.value.caption
    dueDate.value = post.value.dueDate
    hashtagsText.value = post.value.hashtags.join(' ')
  }
  const saving = ref(false)
  async function save() {
    if (!post.value) return
    // Una pieza ya aprobada de una colaboración: cambiar el título o el texto invalida la aprobación
    // (el servidor la devuelve a «En producción»). Se avisa antes, no después.
    const changesApprovedContent = post.value.status === 'scheduled' && !!post.value.collaborationId
      && (title.value !== post.value.title || caption.value !== post.value.caption || hashtagsChanged.value)
    if (changesApprovedContent) {
      const ok = await confirm({
        title: 'Esta publicación ya está aprobada',
        message: 'Si cambias el título, el texto o los hashtags, la marca tendrá que aprobarla de nuevo: volverá a «En producción» y tendrás que enviarla otra vez a revisión.',
        confirmLabel: 'Guardar y pedir nueva aprobación'
      })
      if (!ok) return
    }
    saving.value = true
    try {
      const patch: Parameters<typeof updatePost>[1] = { title: title.value, caption: caption.value, dueDate: dueDate.value }
      // Solo si cambian: los hashtags son contenido material (suben la versión).
      if (hashtagsChanged.value) patch.hashtags = parsedHashtags.value
      await updatePost(post.value.id, patch)
      hashtagsText.value = post.value.hashtags.join(' ')
      if (changesApprovedContent) await refreshPosts() // el servidor cambió la fase: se muestra la real
      toast.success('Cambios guardados')
    } catch (err) {
      console.error('[usePostEditorPanel] fallo al guardar:', err)
      toast.error('No se han podido guardar los cambios. Inténtalo de nuevo.')
    } finally {
      saving.value = false
    }
  }

  const deleting = ref(false)
  /** Pide confirmación y borra — devuelve si se borró de verdad, para que cada pantalla decida qué hacer después (cerrar el panel, volver al tablero...). */
  async function remove(): Promise<boolean> {
    if (!post.value) return false
    const ok = await confirm({
      title: `¿Borrar "${post.value.title}"?`,
      message: 'Se borrará permanentemente, junto con su checklist, etiquetas y predicción de éxito si las tenía.',
      confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
    })
    if (!ok) return false
    deleting.value = true
    try {
      await deletePost(post.value.id)
      toast.success('Publicación borrada')
      return true
    } catch (err) {
      console.error('[usePostEditorPanel] fallo al borrar:', err)
      toast.error('No se ha podido borrar la publicación. Inténtalo de nuevo.')
      return false
    } finally {
      deleting.value = false
    }
  }

  // Motor de ML real (ver docs/3-ML-PIPELINE.md §3.5).
  const predicting = ref(false)
  const predictError = ref('')
  async function predict() {
    if (!post.value) return
    predicting.value = true
    predictError.value = ''
    try {
      const result = await $fetch('/api/ml/predict', { method: 'POST', body: { postId: post.value.id } })
      if (post.value) {
        post.value.successScore = result.successScore
        post.value.aiEvaluated = result.aiEvaluated
        post.value.suggestions = result.suggestions.length ? result.suggestions : undefined
      }
      setCreditBalance(result.creditsRemaining)
    } catch (err) {
      console.error('[usePostEditorPanel] fallo al predecir:', err)
      const statusCode = (err as { statusCode?: number; response?: { status?: number } })?.statusCode
        ?? (err as { response?: { status?: number } })?.response?.status
      predictError.value = statusCode === 402
        ? 'Sin créditos disponibles. Mejora tu plan para seguir prediciendo.'
        : 'No se ha podido predecir. Inténtalo de nuevo.'
    } finally {
      predicting.value = false
    }
  }

  // Etiquetas
  const labelsPickerOpen = ref(false)
  const newLabelName = ref('')
  const newLabelColor = ref<(typeof LABEL_COLORS)[number]['hex']>(LABEL_COLORS[0].hex)
  const attachedLabels = computed(() => {
    if (!post.value) return []
    const ids = post.value.labelIds
    return labels.value.filter((l) => ids.includes(l.id))
  })
  function isLabelAttached(labelId: string) {
    return !!post.value?.labelIds.includes(labelId)
  }
  async function toggleLabel(label: Label) {
    if (!post.value) return
    if (isLabelAttached(label.id)) await detachLabel(post.value.id, label.id, post.value)
    else await attachLabel(post.value.id, label.id, post.value)
  }
  async function createAndAttachLabel() {
    const name = newLabelName.value.trim()
    if (!name || !post.value) return
    const created = await createLabel(name, newLabelColor.value)
    await attachLabel(post.value.id, created.id, post.value)
    newLabelName.value = ''
  }

  // Checklist
  const checklistItems = computed<ChecklistItem[]>(() => (post.value ? itemsByPost.value[post.value.id] ?? [] : []))
  const checklistPct = computed(() => {
    const total = checklistItems.value.length
    if (!total) return 0
    return Math.round((checklistItems.value.filter((i) => i.done).length / total) * 100)
  })
  const newItemText = ref('')
  async function addItem() {
    const text = newItemText.value.trim()
    if (!text || !post.value) return
    await addChecklistItem(post.value.id, text, post.value)
    newItemText.value = ''
  }
  function toggleItem(itemId: string, done: boolean) {
    if (post.value) toggleChecklistItem(post.value.id, itemId, done, post.value)
  }
  function deleteItem(itemId: string) {
    if (post.value) deleteChecklistItem(post.value.id, itemId, post.value)
  }

  // Historial de revisión — solo tiene algo que mostrar si el post está/
  // estuvo ligado a una colaboración (ver supabase/migrations/
  // 20261025140000_post_revision_notes.sql); si no, llega vacío sin más.
  const revisionNotes = computed(() => (post.value ? notesByPost.value[post.value.id] ?? [] : []))
  // Vigente de verdad solo si el post sigue en producción — en cuanto se
  // reenvía a revisión, deja de ser "lo pendiente", aunque la nota se quede
  // en el historial para siempre.
  const pendingChangeRequest = computed(() => (post.value?.status === 'in_production' ? latestPendingChangeRequest(post.value.id) : null))

  // Se resetea cada vez que cambia de post (el panel del tablero reutiliza
  // la misma instancia para cualquier card que se abra; la página completa
  // solo pasa por aquí una vez, pero el mismo watch sirve igual). Tiene que
  // ir al final, después de declarar todo lo que toca dentro: con
  // `immediate: true` se ejecuta en el mismo instante síncrono en que se
  // llama `watch(...)`, y si `post` ya tiene valor desde el principio (el
  // caso de la página completa, a diferencia del panel del Tablero, que
  // empieza con `post: null`) entra directo en el cuerpo del callback —
  // si ese cuerpo tocara una `const` declarada más abajo en el archivo,
  // reventaría con un "Cannot access before initialization".
  watch(
    () => post.value?.id,
    (id) => {
      if (!id || !post.value) return
      title.value = post.value.title
      caption.value = post.value.caption
      dueDate.value = post.value.dueDate
      hashtagsText.value = post.value.hashtags.join(' ')
      predictError.value = ''
      labelsPickerOpen.value = false
      newLabelName.value = ''
      newLabelColor.value = LABEL_COLORS[0].hex
      newItemText.value = ''
      ensureCreditsLoaded()
      ensureLabels()
      ensureItems(id)
      ensureRevisionsLoaded(id)
    },
    { immediate: true }
  )

  // ---- Guardado con aviso, validación y atajo (lo comparten la página y la ficha rápida) ----
  const saved = ref(false)
  let savedTimer: ReturnType<typeof setTimeout> | undefined
  async function saveWithFeedback() {
    if (!dirty.value || saving.value || blockedReason.value) return
    await save()
    if (dirty.value) return // falló o se canceló: el aviso ya lo dio `save`
    saved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => { saved.value = false }, 3000)
  }
  onBeforeUnmount(() => clearTimeout(savedTimer))

  const titleError = computed(() => (title.value.trim() ? null : 'Ponle un título para reconocerla en el tablero.'))
  // Límite del texto que admite cada red (el que publican ellas); sin dato, sin límite.
  const captionMax = computed(() => (post.value ? CAPTION_LIMIT[post.value.platform] : undefined))
  const captionLength = computed(() => caption.value.length + (parsedHashtags.value.length ? parsedHashtags.value.join(' ').length + 2 : 0))
  const captionError = computed(() => (post.value && captionMax.value && captionLength.value > captionMax.value
    ? `Te pasas ${captionLength.value - captionMax.value} caracteres del límite de ${platformMeta[post.value.platform].label} (texto + hashtags).`
    : null))
  const blockedReason = computed(() => titleError.value || captionError.value)

  const { copied, copy } = useClipboard()
  function copyText() {
    copy([caption.value.trim(), parsedHashtags.value.join(' ')].filter(Boolean).join('\n\n'))
  }

  // ---- Fases ----
  const { statusFlow, stepIndex, nextStatus, prevStatus, waitingForPartner, advanceLabel } = usePostFlow(post)

  return {
    title, caption, dueDate, hashtagsText, parsedHashtags, dirty, discard, saving, save, deleting, remove,
    saved, saveWithFeedback, titleError, captionMax, captionLength, captionError, blockedReason, copied, copyText,
    statusFlow, stepIndex, nextStatus, prevStatus, waitingForPartner, advanceLabel,
    predicting, predictError, predict, creditBalance,
    labels, labelsPickerOpen, newLabelName, newLabelColor, attachedLabels, isLabelAttached, toggleLabel, createAndAttachLabel,
    checklistItems, checklistPct, newItemText, addItem, toggleItem, deleteItem,
    revisionNotes, pendingChangeRequest
  }
}

/** «moda, #verano  ootd» → ['#moda', '#verano', '#ootd'] (sin vacíos ni repetidos). */
export function parseHashtags(text: string): string[] {
  const tags = text
    .split(/[\s,]+/)
    .map((h) => h.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .map((h) => `#${h}`)
  return [...new Set(tags)]
}

const CAPTION_LIMIT: Partial<Record<Platform, number>> = { instagram: 2200, tiktok: 2200, youtube: 5000, x: 280, linkedin: 3000 }

const FULL_FLOW: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']

/**
 * Fases por las que pasa una publicación y qué botón toca. El contenido propio no
 * pasa por «Para revisar» (no hay marca que apruebe), salvo que ya esté ahí; en una
 * colaboración, mientras está en revisión decide la marca, no el creador.
 */
export function usePostFlow(post: Ref<Post | null | undefined>) {
  const statusFlow = computed<PostStatus[]>(() => {
    if (!post.value || post.value.collaborationId || post.value.status === 'ready_for_review') return FULL_FLOW
    return FULL_FLOW.filter((s) => s !== 'ready_for_review')
  })
  const stepIndex = computed(() => (post.value ? statusFlow.value.indexOf(post.value.status) : -1))
  const nextStatus = computed(() => statusFlow.value[stepIndex.value + 1] ?? null)
  const prevStatus = computed(() => (stepIndex.value > 0 ? statusFlow.value[stepIndex.value - 1]! : null))
  const waitingForPartner = computed(() => !!post.value?.collaborationId && post.value.status === 'ready_for_review')
  const advanceLabel = computed(() => {
    switch (nextStatus.value) {
      case 'in_production': return 'Empezar a producirla'
      case 'ready_for_review': return 'Enviar a revisión'
      case 'scheduled': return 'Marcar como programada'
      case 'published': return 'Marcar como publicada'
      default: return ''
    }
  })
  return { statusFlow, stepIndex, nextStatus, prevStatus, waitingForPartner, advanceLabel }
}
