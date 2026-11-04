import { createHash } from 'node:crypto'

/**
 * Lógica pura del servicio de imágenes (/api/img): qué orígenes se aceptan, qué
 * tamaños se permiten y cómo se nombra cada resultado en la caché.
 * Lista cerrada a propósito: el servidor descarga la URL que le piden, así que
 * solo puede ser el Storage público de la propia app o una foto de /img/.
 */

export const IMAGE_MAX = 1600
export const IMAGE_MIN = 16

/** Devuelve la URL a descargar si el origen está permitido; `null` si no. */
export function allowedImageSource(raw: string, storageOrigin: string | undefined, appOrigin: string): string | null {
  if (!raw || raw.length > 600) return null
  if (raw.startsWith('/')) {
    // Solo fotos de /img/, sin escapar de la carpeta.
    if (!raw.startsWith('/img/') || raw.includes('..') || raw.includes('\\') || raw.includes('//')) return null
    return new URL(raw, appOrigin).toString()
  }
  if (!storageOrigin) return null
  let url: URL
  try { url = new URL(raw) } catch { return null }
  const base = new URL(storageOrigin)
  const ok = url.protocol === 'https:' && url.host === base.host && url.pathname.startsWith('/storage/v1/object/public/') && !url.pathname.includes('..')
  return ok ? url.toString() : null
}

/** Entero dentro de [IMAGE_MIN, IMAGE_MAX]; `fallback` si no es un número válido. */
export function clampImageSize(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(IMAGE_MAX, Math.max(IMAGE_MIN, Math.round(n)))
}

export function clampQuality(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(90, Math.max(40, Math.round(n))) : 70
}

/** Nombre estable de un resultado en la caché (cambia si cambia la URL, incluido su `?v=`). */
export function imageCacheKey(source: string, w: number, h: number, q: number): string {
  return createHash('sha1').update(`${source}|${w}x${h}|q${q}`).digest('hex')
}
