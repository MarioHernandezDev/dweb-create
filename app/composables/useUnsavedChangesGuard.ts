/**
 * Avisa antes de perder cambios sin guardar — pensado para la pestaña
 * "Ficha pública" de creator/profile.vue y partner/profile.vue, donde
 * editar bio/categorías/tarifa y navegar a otra página sin pulsar "Guardar
 * ficha" descartaba todo en silencio. Cubre las dos formas de "salir":
 * navegar dentro de la app (el diálogo de useConfirm, con el estilo de la
 * app) y cerrar/recargar la pestaña (el aviso nativo del navegador, que no
 * se puede personalizar ni esperar a una promesa — `beforeunload` es síncrono).
 */
export function useUnsavedChangesGuard(isDirty: Ref<boolean> | ComputedRef<boolean>) {
  const { confirm } = useConfirm()

  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true
    return await confirm({
      title: 'Tienes cambios sin guardar',
      message: 'Si sales ahora se perderán los cambios de la ficha que no hayas guardado todavía.',
      confirmLabel: 'Salir sin guardar',
      cancelLabel: 'Seguir editando',
      tone: 'danger'
    })
  })

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (!isDirty.value) return
    e.preventDefault()
    e.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
