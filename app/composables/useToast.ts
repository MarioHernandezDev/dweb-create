export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  /** Ruta interna a la que lleva el botón del aviso. */
  to: string
}

export interface Toast {
  id: number
  tone: ToastTone
  text: string
  action?: ToastAction
}

const DEFAULT_MS: Record<ToastTone, number> = { success: 4000, info: 5000, error: 7000 }
let nextId = 1
// Los temporizadores viven fuera de useState a propósito (no son serializables
// ni se pintan) — mismo criterio que `pendingResolve` en useConfirm.ts.
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * Avisos breves y no bloqueantes ("Publicación creada", "No se ha podido
 * guardar"…). Un único `ToastHost` montado en AppShell los pinta. Reglas de
 * uso: avisar SOLO tras la respuesta del servidor (nunca antes) y un aviso
 * por acción; `key` evita duplicar el mismo aviso si se repite la acción.
 * Para lo que el usuario debe corregir sigue habiendo mensajes en línea.
 */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    const t = timers.get(id)
    if (t) clearTimeout(t)
    timers.delete(id)
    toasts.value = toasts.value.filter((x) => x.id !== id)
  }

  function push(tone: ToastTone, text: string, opts: { action?: ToastAction; key?: string; ms?: number } = {}) {
    if (import.meta.server) return 0
    // Mismo texto y mismo tono ya visibles = una sola vez (la acción repetida
    // renueva el aviso en vez de apilar copias).
    const existing = toasts.value.find((t) => t.tone === tone && t.text === text)
    if (existing) dismiss(existing.id)
    const id = nextId++
    toasts.value = [...toasts.value.slice(-3), { id, tone, text, action: opts.action }]
    timers.set(id, setTimeout(() => dismiss(id), opts.ms ?? DEFAULT_MS[tone]))
    return id
  }

  return {
    toasts,
    dismiss,
    success: (text: string, opts?: { action?: ToastAction; ms?: number }) => push('success', text, opts),
    error: (text: string, opts?: { action?: ToastAction; ms?: number }) => push('error', text, opts),
    info: (text: string, opts?: { action?: ToastAction; ms?: number }) => push('info', text, opts)
  }
}
