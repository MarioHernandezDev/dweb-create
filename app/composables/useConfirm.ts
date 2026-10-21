export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' para acciones destructivas/irreversibles (borrar, rechazar, pagar...) — cambia el icono y el color del botón de confirmar. */
  tone?: 'default' | 'danger'
  icon?: string
}

interface ConfirmDialogState extends Required<Omit<ConfirmOptions, 'message'>> {
  open: boolean
  message: string
}

// El resolve de la promesa en curso vive fuera de useState a propósito:
// una función no es serializable/reactiva, no tiene sentido que viaje en el
// payload SSR — mismo criterio que typingTimers en useChat.ts.
let pendingResolve: ((value: boolean) => void) | null = null

/**
 * Confirmación modal reutilizable para cualquier acción "de verdad quieres
 * [X]" (borrar, rechazar una oferta, pagar, cerrar sesión...) — un solo
 * componente montado una vez (ver ConfirmDialogHost.vue en AppShell.vue,
 * mismo sitio que arranca Realtime) en vez de que cada página reinvente su
 * propio diálogo. `await confirm(...)` se resuelve en `true`/`false` según
 * lo que pulse el usuario, igual que un `window.confirm` nativo pero con el
 * estilo de la app.
 */
export function useConfirm() {
  const state = useState<ConfirmDialogState>('confirm-dialog-state', () => ({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    tone: 'default',
    icon: 'ph:question-fill'
  }))

  function confirm(options: ConfirmOptions): Promise<boolean> {
    // Si ya había una confirmación pendiente (no debería pasar: el diálogo
    // bloquea el resto de la UI), se resuelve a `false` para no dejar esa
    // promesa colgada para siempre.
    pendingResolve?.(false)

    state.value = {
      open: true,
      title: options.title,
      message: options.message ?? '',
      confirmLabel: options.confirmLabel ?? 'Confirmar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      tone: options.tone ?? 'default',
      icon: options.icon ?? (options.tone === 'danger' ? 'ph:warning-fill' : 'ph:question-fill')
    }
    return new Promise((resolve) => {
      pendingResolve = resolve
    })
  }

  function resolve(value: boolean) {
    state.value = { ...state.value, open: false }
    pendingResolve?.(value)
    pendingResolve = null
  }

  return { state, confirm, resolve }
}
