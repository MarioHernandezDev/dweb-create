/**
 * Bienvenida al iniciar sesión: una animación breve con el símbolo de CIBERAN
 * y, después, el aviso de lanzamiento gratuito (con «No volver a mostrar»).
 *
 * `announce()` se llama al iniciar sesión (login.vue, confirm.vue); el
 * componente `LoginWelcome` (montado en AppShell) la reproduce una sola vez y
 * la consume: recargar o navegar no la repite, solo un inicio de sesión nuevo.
 *
 * «No volver a mostrar» se guarda por usuario en este navegador. Si
 * `localStorage` falla, el aviso se vuelve a enseñar (es informativo, mejor
 * repetirlo que perderlo).
 */
export type LoginWelcomePhase = 'idle' | 'intro' | 'notice'

const hideKey = (userId: string) => `ciberan:launch-notice:hide:v1:${userId}`

export function useLoginWelcome() {
  const pending = useState<boolean>('login-welcome-pending', () => false)
  const phase = useState<LoginWelcomePhase>('login-welcome-phase', () => 'idle')
  // Mientras está activa, el recorrido de bienvenida espera su turno.
  const active = computed(() => pending.value || phase.value !== 'idle')

  function announce() {
    pending.value = true
  }

  function noticeHidden(userId: string): boolean {
    try {
      return localStorage.getItem(hideKey(userId)) !== null
    } catch {
      return false
    }
  }

  function hideNoticeForever(userId: string) {
    try {
      localStorage.setItem(hideKey(userId), new Date().toISOString())
    } catch {
      // sin almacenamiento: volverá a salir, no pasa nada
    }
  }

  return { pending, phase, active, announce, noticeHidden, hideNoticeForever }
}
