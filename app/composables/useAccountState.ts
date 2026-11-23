import { TERMS_VERSION } from '~/utils/legal'

interface AccountStateRow {
  terms_version: string | null
  terms_accepted_at: string | null
  onboarding_completed_at: string | null
  created_at: string | null
}

/**
 * Estado de la cuenta que no es ficha: qué versión de los términos tiene
 * aceptada y si ya vio el recorrido de bienvenida (migración 20261112110000).
 * Se lee una vez por sesión de pestaña.
 */
// Petición en curso compartida por todos los que llamen a la vez: TermsGate y OnboardingTour se montan juntos y antes
// lanzaban cada uno su propia consulta idéntica en cada carga de página.
let inflight: Promise<AccountStateRow | null> | null = null

export function useAccountState() {
  const client = useSupabaseClient()
  const { resolveMyProfileId } = useMyProfileId()

  const state = useState<AccountStateRow | null>('account-state', () => null)
  const loaded = useState<boolean>('account-state-loaded', () => false)

  function ensureLoaded(): Promise<AccountStateRow | null> {
    if (loaded.value) return Promise.resolve(state.value)
    inflight ??= load().finally(() => { inflight = null })
    return inflight
  }

  async function load(): Promise<AccountStateRow | null> {
    const id = await resolveMyProfileId()
    if (!id) return null
    const { data, error } = await client.from('profiles').select('terms_version, terms_accepted_at, onboarding_completed_at, created_at').eq('id', id).maybeSingle<AccountStateRow>()
    if (error) {
      console.error('[cuenta] no se pudo leer el estado de la cuenta:', error.message)
      return null
    }
    state.value = data
    loaded.value = true
    return data
  }

  const termsPending = computed(() => loaded.value && state.value?.terms_version !== TERMS_VERSION)

  /** Registra la aceptación de la versión vigente; la fecha la pone la base de datos. */
  async function acceptTerms(): Promise<boolean> {
    const { data, error } = await client.rpc('accept_terms' as never, { p_version: TERMS_VERSION } as never)
    if (error) {
      console.error('[cuenta] no se pudo registrar la aceptación:', error.message)
      return false
    }
    state.value = { terms_version: TERMS_VERSION, terms_accepted_at: (data as string | null) ?? new Date().toISOString(), onboarding_completed_at: state.value?.onboarding_completed_at ?? null, created_at: state.value?.created_at ?? null }
    return true
  }

  /** Deja anotado en la cuenta que el recorrido de bienvenida ya se vio (vale para cualquier dispositivo). */
  async function markOnboardingDone() {
    const id = await resolveMyProfileId()
    if (!id || state.value?.onboarding_completed_at) return
    const now = new Date().toISOString()
    const { error } = await client.from('profiles').update({ onboarding_completed_at: now } as never).eq('id', id)
    if (error) console.error('[cuenta] no se pudo anotar el recorrido como visto:', error.message)
    else if (state.value) state.value = { ...state.value, onboarding_completed_at: now }
  }

  function reset() {
    state.value = null
    loaded.value = false
    inflight = null
  }

  return { state, loaded, termsPending, ensureLoaded, acceptTerms, markOnboardingDone, reset }
}
