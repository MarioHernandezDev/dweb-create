import { readClientErrorMessage, readSocialApiError } from '~/utils/social-api-error'

/**
 * Vínculo de una publicación con su contenido real en YouTube/Instagram (A-R7).
 * La LECTURA va directa a la base con la sesión del usuario (la RLS deja ver el
 * vínculo al creador dueño y al partner de la colaboración); la ESCRITURA solo
 * por `/api/social/link-post`, que comprueba con el proveedor que el contenido
 * es de la cuenta conectada antes de guardar nada.
 */
export interface PostLink {
  external_id: string
  external_url: string | null
  platform: string
  verified_at: string
}

export interface LinkError {
  code: string | null
  message: string
}

export function usePostExternalLink(postId: Ref<string> | string) {
  const client = useSupabaseClient()
  const id = computed(() => unref(postId))
  const link = ref<PostLink | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  const busy = ref(false)
  const error = ref<LinkError | null>(null)

  async function load() {
    loading.value = true
    const { data, error: err } = await client
      .from('post_external_links')
      .select('external_id, external_url, platform, verified_at')
      .eq('post_id', id.value)
      .maybeSingle()
    if (err) {
      console.error('[usePostExternalLink] fallo al cargar el vínculo:', err.message)
      error.value = { code: null, message: 'No se ha podido cargar el vínculo de esta publicación.' }
    } else {
      link.value = (data as PostLink | null) ?? null
      loaded.value = true
    }
    loading.value = false
  }

  async function linkTo(url: string): Promise<boolean> {
    busy.value = true
    error.value = null
    try {
      const res = await $fetch<{ link: PostLink }>('/api/social/link-post', { method: 'POST', body: { postId: id.value, url }, timeout: 30_000 })
      link.value = res.link
      return true
    } catch (err) {
      const { code, message } = readSocialApiError(err)
      error.value = { code, message: message ?? readClientErrorMessage(err) ?? 'No se ha podido vincular. Inténtalo de nuevo en unos minutos.' }
      return false
    } finally {
      busy.value = false
    }
  }

  async function unlink(): Promise<boolean> {
    busy.value = true
    error.value = null
    try {
      await $fetch('/api/social/link-post', { method: 'DELETE', query: { postId: id.value }, timeout: 20_000 })
      link.value = null
      return true
    } catch (err) {
      const { code, message } = readSocialApiError(err)
      error.value = { code, message: message ?? readClientErrorMessage(err) ?? 'No se ha podido desvincular. Inténtalo de nuevo.' }
      return false
    } finally {
      busy.value = false
    }
  }

  return { link, loading, loaded, busy, error, load, linkTo, unlink }
}
