import { initialsFromName, hueFromString } from '~/utils/avatar'

interface MyAvatarInfo {
  avatarUrl: string | null
  fullName: string
}

/**
 * Foto de perfil de la cuenta logueada (`profiles.avatar_url`/`full_name`) —
 * vive en `profiles`, no en `creators`/`partners`: es de la cuenta, no de la
 * ficha de rol, así que sirve igual para los dos. Se deja lista desde
 * role-guard.global.ts (igual que ensureCreator/ensurePartner), así que para
 * cuando TopBar.vue/SideRail.vue la leen ya está en caché, sin parpadeo.
 */
export function useMyAvatar() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const info = useState<MyAvatarInfo | undefined>('my-avatar-info', () => undefined)
  const uploading = useState<boolean>('my-avatar-uploading', () => false)

  /** `userId` es opcional: pásalo cuando ya lo tengas resuelto (ver ensureCreator en useMyCreator.ts para el porqué de no fiarse directamente de `user.value`). */
  async function ensureAvatar(userId?: string) {
    if (info.value !== undefined) return info.value

    const id = userId ?? user.value?.sub ?? (await client.auth.getUser()).data.user?.id
    if (!id) return { avatarUrl: null, fullName: 'Usuario' }

    const { data } = await client.from('profiles').select('avatar_url, full_name').eq('id', id).maybeSingle<{ avatar_url: string | null; full_name: string | null }>()
    info.value = { avatarUrl: data?.avatar_url ?? null, fullName: data?.full_name || 'Usuario' }
    return info.value
  }

  /**
   * Sube la foto al bucket `post-media` (mismo bucket que las portadas de
   * ficha, ver useMyCreator.uploadCoverPhoto) bajo tu propia carpeta
   * (`<userId>/avatar.<ext>`, nombre estable + `upsert` + `?v=` para evitar
   * la versión cacheada por el navegador) y la guarda en `profiles`.
   */
  async function uploadAvatar(file: File) {
    uploading.value = true
    try {
      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError || !userData.user) throw userError ?? new Error('No hay sesión activa.')
      const id = userData.user.id

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${id}/avatar.${ext}`

      const { error: uploadError } = await client.storage.from('post-media').upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = client.storage.from('post-media').getPublicUrl(path)
      const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

      const { error } = await client.from('profiles').update({ avatar_url: avatarUrl } as never).eq('id', id)
      if (error) throw error

      info.value = { avatarUrl, fullName: info.value?.fullName ?? 'Usuario' }
      return avatarUrl
    } finally {
      uploading.value = false
    }
  }

  /** Vuelve al estado "sin foto" (iniciales + matiz) — no borra el archivo del bucket, solo la referencia. */
  async function removeAvatar() {
    uploading.value = true
    try {
      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError || !userData.user) throw userError ?? new Error('No hay sesión activa.')

      const { error } = await client.from('profiles').update({ avatar_url: null } as never).eq('id', userData.user.id)
      if (error) throw error

      info.value = { avatarUrl: null, fullName: info.value?.fullName ?? 'Usuario' }
    } finally {
      uploading.value = false
    }
  }

  const avatarUrl = computed(() => info.value?.avatarUrl ?? null)
  const initials = computed(() => initialsFromName(info.value?.fullName ?? 'Usuario'))
  const hue = computed(() => hueFromString(info.value?.fullName ?? 'Usuario'))

  return { info, avatarUrl, initials, hue, uploading, ensureAvatar, uploadAvatar, removeAvatar }
}
