/**
 * Lectura de los enlaces que el creador pega para vincular una publicación del
 * tablero con su contenido real (A-R7). Lógica pura, sin red, para probarla.
 *
 * Reglas de seguridad: el texto viene del navegador y acaba en una consulta al
 * proveedor, así que solo se aceptan enlaces de los dominios oficiales y un
 * identificador con la forma exacta de un id real. Cualquier otra cosa -> `null`.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const INSTAGRAM_SHORTCODE = /^[A-Za-z0-9_-]{5,40}$/

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be'])
const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com'])

function parseUrl(input: string): URL | null {
  const raw = input.trim()
  if (!raw || raw.length > 500) return null
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
}

/**
 * Id de vídeo de YouTube a partir de un enlace (watch?v=, youtu.be/, shorts/,
 * embed/, live/) o del propio id de 11 caracteres. Dominio no oficial -> `null`.
 */
export function parseYoutubeVideoId(input: string): string | null {
  const raw = input.trim()
  if (YOUTUBE_ID.test(raw)) return raw
  const url = parseUrl(raw)
  if (!url || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)
  let candidate: string | undefined
  if (host.endsWith('youtu.be')) candidate = parts[0]
  else if (url.pathname === '/watch') candidate = url.searchParams.get('v') ?? undefined
  else if (['shorts', 'embed', 'live', 'v'].includes(parts[0] ?? '')) candidate = parts[1]
  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null
}

/** Código corto de una publicación de Instagram (`/p/`, `/reel/`, `/reels/`, `/tv/`). */
export function parseInstagramShortcode(input: string): string | null {
  const url = parseUrl(input)
  if (!url || !INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) return null
  const parts = url.pathname.split('/').filter(Boolean)
  // Enlaces de la forma /<usuario>/p/<código>/ también existen.
  const i = parts.findIndex((p) => ['p', 'reel', 'reels', 'tv'].includes(p))
  const code = i >= 0 ? parts[i + 1] : undefined
  return code && INSTAGRAM_SHORTCODE.test(code) ? code : null
}

export interface InstagramMediaItem {
  id?: string
  permalink?: string
}

/** Busca, entre las publicaciones de la cuenta conectada, la que tiene ese código corto. */
export function matchInstagramMedia(items: InstagramMediaItem[], shortcode: string): { id: string; permalink: string } | null {
  for (const item of items) {
    if (!item.id || !item.permalink) continue
    const code = parseInstagramShortcode(item.permalink)
    if (code === shortcode) return { id: item.id, permalink: item.permalink }
  }
  return null
}

export const YOUTUBE_WATCH_URL = (id: string) => `https://www.youtube.com/watch?v=${id}`
