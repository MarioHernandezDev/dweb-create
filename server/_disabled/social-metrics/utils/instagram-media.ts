import { matchInstagramMedia, type InstagramMediaItem } from './external-link'
import { insightValue, mapInstagramMetrics, type InstagramBasicFields, type InstagramInsightsResponse } from './post-metrics'

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

export const INSTAGRAM_INSIGHT_METRICS = ['views', 'reach', 'saved', 'shares'] as const

/**
 * Métricas de UNA publicación de Instagram: campos básicos (me gusta y comentarios)
 * e insights, cada insight pedido por separado para que uno que no exista para ese
 * tipo de publicación (carruseles, stories…) no tire abajo los demás. Un fallo en
 * los campos básicos se relanza (el llamador lo clasifica: acceso caducado, etc.);
 * un fallo de un insight deja SOLO esa métrica en `null`. SIN VERIFICAR con una
 * cuenta real: los nombres siguen la documentación de Meta.
 */
export async function fetchInstagramMediaMetrics(accessToken: string, mediaId: string) {
  const basic = await $fetch<InstagramBasicFields>(`https://graph.instagram.com/v21.0/${encodeURIComponent(mediaId)}`, {
    params: { fields: 'like_count,comments_count', access_token: accessToken },
    timeout: META_FETCH_TIMEOUT_MS
  })
  const insights: Partial<Record<(typeof INSTAGRAM_INSIGHT_METRICS)[number], number | null>> = {}
  for (const metric of INSTAGRAM_INSIGHT_METRICS) {
    try {
      const res = await $fetch<InstagramInsightsResponse>(`https://graph.instagram.com/v21.0/${encodeURIComponent(mediaId)}/insights`, {
        params: { metric, access_token: accessToken },
        timeout: META_FETCH_TIMEOUT_MS
      })
      insights[metric] = insightValue(res, metric)
    } catch {
      insights[metric] = null
    }
  }
  return mapInstagramMetrics(basic, insights)
}
