import { translateAuthError } from '~/utils/auth-errors'

const COOLDOWN_SECONDS = 60

/**
 * Reenviar el correo de confirmación de una cuenta recién creada (login con
 * «email no confirmado» y pantalla «Revisa tu email»). Un reenvío cada minuto
 * para no chocar con el límite de envíos de Supabase ni saturar el SMTP.
 * La respuesta no revela si el email existe.
 */
export function useResendConfirmation() {
  const supabase = useSupabaseClient()
  const sending = ref(false)
  const sent = ref(false)
  const error = ref('')
  const cooldown = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function startCooldown() {
    cooldown.value = COOLDOWN_SECONDS
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      cooldown.value -= 1
      if (cooldown.value <= 0 && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  }

  async function resend(email: string) {
    if (sending.value || cooldown.value > 0 || !email.trim()) return
    sending.value = true
    error.value = ''
    sent.value = false
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/confirm` } })
    sending.value = false
    if (resendError) {
      error.value = translateAuthError(resendError.message)
      // Si Supabase pide esperar, no dejamos reintentar de golpe.
      if (/demasiados intentos/i.test(error.value)) startCooldown()
      return
    }
    sent.value = true
    startCooldown()
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { sending, sent, error, cooldown, resend }
}
