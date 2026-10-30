import { matchInstagramMedia, type InstagramMediaItem } from './external-link'

const META_FETCH_TIMEOUT_MS = 8_000
/** 4 páginas de 50 = las 200 publicaciones más recientes: suficiente para vincular contenido reciente sin gastar cuota. */
const MAX_PAGES = 4
const PAGE_SIZE = 50

interface MediaPage {
  data?: InstagramMediaItem[]
  paging?: { cursors?: { after?: string }; next?: string }
}

/**
 * Busca en las publicaciones de la cuenta conectada (Instagram Login, `/me/media`)
 * la que tiene ese código corto. Que aparezca en la lista de la propia cuenta es lo
 * que PRUEBA que el contenido le pertenece. Devuelve `null` si no está entre las
 * últimas 200. SIN VERIFICAR con una cuenta real de Instagram.
 */
export async function findInstagramMedia(accessToken: string, shortcode: string): Promise<{ id: string; permalink: string } | null> {
  let after: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await $fetch<MediaPage>('https://graph.instagram.com/v21.0/me/media', {
      params: { fields: 'id,permalink', limit: PAGE_SIZE, access_token: accessToken, ...(after ? { after } : {}) },
      timeout: META_FETCH_TIMEOUT_MS
    })
    const found = matchInstagramMedia(res.data ?? [], shortcode)
    if (found) return found
    after = res.paging?.next ? res.paging.cursors?.after : undefined
    if (!after) return null
  }
  return null
}
