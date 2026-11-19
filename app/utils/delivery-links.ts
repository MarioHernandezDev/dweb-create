/**
 * Enlaces de entrega de una publicación: el del borrador (para que la marca lo vea al revisar) y el de la publicación
 * ya subida a la red (el resultado de la colaboración). Solo se admiten enlaces http(s) y hasta 500 caracteres: es lo
 * mismo que exige la base de datos (`posts_delivery_urls_valid`), comprobado antes para dar el motivo en claro.
 */
export const DELIVERY_URL_MAX = 500

export type DeliveryUrlResult = { ok: true; value: string | null } | { ok: false; error: string }

/** Normaliza lo escrito: vacío → null; sin esquema («drive.google.com/…») → https://; otro esquema → error. */
export function parseDeliveryUrl(input: string): DeliveryUrlResult {
  const raw = input.trim()
  if (!raw) return { ok: true, value: null }
  if (/\s/.test(raw)) return { ok: false, error: 'El enlace no puede llevar espacios.' }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return { ok: false, error: 'Ese enlace no parece válido.' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, error: 'El enlace debe empezar por http:// o https://.' }
  if (!url.hostname.includes('.')) return { ok: false, error: 'Ese enlace no parece válido.' }
  if (withScheme.length > DELIVERY_URL_MAX) return { ok: false, error: `El enlace es demasiado largo (máximo ${DELIVERY_URL_MAX} caracteres).` }
  return { ok: true, value: withScheme }
}

/** Dominio para enseñar en el botón («drive.google.com»), sin «www.». */
export function linkHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
