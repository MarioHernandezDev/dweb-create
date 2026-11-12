import { readSocialApiError } from '~/utils/social-api-error'
import type { VideoDto } from '~/utils/youtube-videos-view'

/**
 * Vídeos del canal desde `GET /api/social/youtube-videos`, de 24 en 24
 * (A-R16d). Solo se usa en el navegador, después de montar la página. Los
 * vídeos de páginas sucesivas se añaden sin duplicar ids.
 */
interface VideosResponse {
  videos: VideoDto[]
  nextPageToken: string | null
  totalVideos: number | null
}

export interface VideosError {
  code: string | null
  message: string
}

const FALLBACK_MESSAGE = 'No se han podido cargar los vídeos. Inténtalo de nuevo en unos minutos.'

export function useYoutubeVideos() {
  const videos = ref<VideoDto[]>([])
  const nextPageToken = ref<string | null>(null)
  const total = ref<number | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const loaded = ref(false)
  const error = ref<VideosError | null>(null)

  async function fetchPage(pageToken?: string): Promise<VideosResponse | null> {
    try {
      return await $fetch<VideosResponse>('/api/social/youtube-videos', { query: pageToken ? { pageToken } : {}, timeout: 25_000 })
    } catch (err) {
      const { code, message } = readSocialApiError(err)
      error.value = { code, message: message ?? FALLBACK_MESSAGE }
      return null
    }
  }

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = null
    const res = await fetchPage()
    if (res) {
      videos.value = res.videos
      nextPageToken.value = res.nextPageToken
      total.value = res.totalVideos
      loaded.value = true
    }
    loading.value = false
  }

  async function loadMore() {
    if (!nextPageToken.value || loading.value || loadingMore.value) return
    loadingMore.value = true
    error.value = null
    const res = await fetchPage(nextPageToken.value)
    if (res) {
      const known = new Set(videos.value.map((v) => v.id))
      videos.value = [...videos.value, ...res.videos.filter((v) => !known.has(v.id))]
      nextPageToken.value = res.nextPageToken
      total.value = res.totalVideos ?? total.value
    }
    loadingMore.value = false
  }

  /** Vuelve a pedir desde la primera página (botón Actualizar / Reintentar). */
  async function reload() {
    videos.value = []
    nextPageToken.value = null
    loaded.value = false
    await load()
  }

  return { videos, nextPageToken, total, loading, loadingMore, loaded, error, load, loadMore, reload }
}
