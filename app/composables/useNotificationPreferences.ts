import { type NotificationPreferenceGroup, toggleGroup } from '~/utils/notifications'

/**
 * Preferencias de avisos del usuario: qué tipos tiene silenciados. Un trigger en la base de datos descarta los
 * avisos silenciados al crearse, así que la preferencia se respeta venga de donde venga el aviso.
 */
export function useNotificationPreferences() {
  const client = useSupabaseClient()
  const { resolveMyProfileId } = useMyProfileId()
  const muted = useState<string[]>('notification-muted-types', () => [])
  const loaded = useState<boolean>('notification-preferences-loaded', () => false)
  const saving = ref<string | null>(null)
  const error = ref('')

  async function load() {
    const { data, error: e } = await client.from('notification_preferences' as never).select('muted_types').maybeSingle()
    if (e) {
      error.value = 'No se han podido cargar tus preferencias de avisos.'
      return
    }
    muted.value = ((data as { muted_types?: string[] } | null)?.muted_types ?? [])
    loaded.value = true
  }

  async function setGroup(group: NotificationPreferenceGroup, enabled: boolean): Promise<boolean> {
    if (saving.value) return false
    const profileId = await resolveMyProfileId()
    if (!profileId) return false
    const next = toggleGroup(group, muted.value, enabled)
    saving.value = group.id
    error.value = ''
    const { error: e } = await client.from('notification_preferences' as never)
      .upsert({ profile_id: profileId, muted_types: next, updated_at: new Date().toISOString() } as never, { onConflict: 'profile_id' })
    saving.value = null
    if (e) {
      error.value = 'No se ha podido guardar el cambio. Inténtalo de nuevo.'
      return false
    }
    muted.value = next
    return true
  }

  return { muted, loaded, saving, error, load, setGroup }
}
