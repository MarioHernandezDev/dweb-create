/**
 * Interruptor «perfil visible sin iniciar sesión» de la cuenta
 * (`profiles.public_profile_enabled`, migración 20261112100000). Con él apagado,
 * el enlace del perfil solo funciona para quien ya ha entrado en CIBERAN.
 */
export function usePublicProfileSetting() {
  const client = useSupabaseClient()
  const { resolveMyProfileId } = useMyProfileId()

  const enabled = useState<boolean | null>('my-public-profile-enabled', () => null)
  const saving = ref(false)
  const error = ref('')

  async function load() {
    error.value = ''
    const id = await resolveMyProfileId()
    if (!id) return
    const { data, error: e } = await client.from('profiles').select('public_profile_enabled').eq('id', id).maybeSingle<{ public_profile_enabled: boolean }>()
    if (e || !data) {
      error.value = 'No se ha podido cargar este ajuste.'
      return
    }
    enabled.value = data.public_profile_enabled
  }

  async function set(value: boolean): Promise<boolean> {
    const id = await resolveMyProfileId()
    if (!id || saving.value) return false
    saving.value = true
    error.value = ''
    const { error: e } = await client.from('profiles').update({ public_profile_enabled: value } as never).eq('id', id)
    saving.value = false
    if (e) {
      console.error('[perfil público] no se guardó el ajuste:', e.message)
      error.value = 'No se ha podido guardar. Inténtalo de nuevo.'
      return false
    }
    enabled.value = value
    return true
  }

  function reset() {
    enabled.value = null
  }

  return { enabled, saving, error, load, set, reset }
}
