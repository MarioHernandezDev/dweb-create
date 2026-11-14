import type { Role } from '~/types'
import { type TourAutoStartInput, shouldAutoStartTour, tourSteps } from '~/utils/onboarding-steps'

// Versión en la clave: si el recorrido cambia mucho, subirla lo vuelve a mostrar.
const storageKey = (userId: string) => `ciberan:tour:v1:${userId}`

/**
 * Recorrido de bienvenida (M-O1). El progreso se guarda en `localStorage`
 * por usuario y, además, en la cuenta (`profiles.onboarding_completed_at`,
 * vía useAccountState), que es lo que vale en cualquier dispositivo.
 *
 * Solo se abre solo la primera vez de una cuenta recién creada (ver
 * `shouldAutoStartTour`) y se anota como visto en el momento de abrirlo, no al
 * cerrarlo: recargar, navegar o cerrar la pestaña con él abierto no lo trae de
 * vuelta. Después solo se abre con «Ver el recorrido de bienvenida».
 *
 * Si `localStorage` falla (modo privado, bloqueado), el recorrido no se
 * muestra solo — es preferible no mostrarlo a que reaparezca en cada visita.
 */
export function useOnboardingTour() {
  const open = useState<boolean>('onboarding-tour-open', () => false)
  const stepIndex = useState<number>('onboarding-tour-step', () => 0)
  const role = useState<Role | null>('onboarding-tour-role', () => null)
  const userId = useState<string | null>('onboarding-tour-user', () => null)
  // Evita volver a decidir en cada navegación dentro de la misma pestaña.
  const decided = useState<boolean>('onboarding-tour-decided', () => false)

  const steps = computed(() => (role.value ? tourSteps[role.value] : []))
  const current = computed(() => steps.value[stepIndex.value] ?? null)
  const isLast = computed(() => stepIndex.value >= steps.value.length - 1)

  function wasSeen(id: string): boolean {
    try {
      return localStorage.getItem(storageKey(id)) !== null
    } catch {
      return true
    }
  }

  function markSeen() {
    if (!userId.value) return
    try {
      localStorage.setItem(storageKey(userId.value), new Date().toISOString())
    } catch {
      // sin almacenamiento: no pasa nada, simplemente no se recuerda
    }
  }

  /** Decide, una sola vez por pestaña, si hay que abrirlo solo (primera vez de una cuenta nueva). */
  function maybeAutoStart(id: string, userRole: Role, account: Omit<TourAutoStartInput, 'seenLocally' | 'now'>) {
    if (decided.value) return
    decided.value = true
    userId.value = id
    role.value = userRole
    if (account.completedAt) {
      markSeen()
      return
    }
    if (shouldAutoStartTour({ ...account, seenLocally: wasSeen(id) })) {
      stepIndex.value = 0
      open.value = true
      markSeen()
    }
  }

  /** "Ver el recorrido otra vez" desde el perfil. */
  function start(id: string, userRole: Role) {
    userId.value = id
    role.value = userRole
    stepIndex.value = 0
    open.value = true
  }

  function next() {
    if (isLast.value) return close()
    stepIndex.value += 1
  }

  function back() {
    if (stepIndex.value > 0) stepIndex.value -= 1
  }

  /** Cierra (por terminar o por saltar) y lo recuerda. */
  function close() {
    open.value = false
    markSeen()
  }

  return { open, stepIndex, steps, current, isLast, maybeAutoStart, start, next, back, close }
}
