// Límite del bucket `post-media` (ver supabase/migrations/20261021130000_post_media_bucket.sql) —
// se comprueba aquí también para poder avisar ANTES de intentar subir, no solo después de que falle.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
// Techo para el archivo ORIGINAL antes incluso de intentar procesarlo (decodificar una imagen de
// varias decenas de MB puede ir lento/pesado en un móvil modesto) — bastante por encima de lo que
// cualquier foto de portada/avatar necesita, solo para cortar casos absurdos pronto y con un aviso claro.
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024

/** Tamaño tras limitar el lado mayor a `maxDimension` (sin ampliar nunca). */
export function scaledSize(width: number, height: number, maxDimension: number): { width: number; height: number; scale: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale }
}

const EXTENSION_BY_TYPE: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }
export function extensionForType(type: string): string {
  return EXTENSION_BY_TYPE[type] ?? 'webp'
}

/** La versión recodificada solo se usa si pesa claramente menos (al menos un 5 % menos) que el original. */
export function isSmallerEncoding(originalBytes: number, encodedBytes: number): boolean {
  return encodedBytes > 0 && encodedBytes < originalBytes * 0.95
}

/** Optimización al subir imágenes de usuario (biblioteca y portadas): lado mayor de 2.000 px y webp al 82 %. */
export const OPTIMIZE_MAX_DIMENSION = 2000
export const OPTIMIZE_QUALITY = 0.82
export function optimizeImageFile(file: File): Promise<File> {
  return resizeImageFile(file, OPTIMIZE_MAX_DIMENSION, OPTIMIZE_QUALITY, { alwaysEncode: true })
}

export function isFileTooLarge(file: File): boolean {
  return file.size > MAX_ORIGINAL_BYTES
}

/**
 * Redimensiona y comprime una imagen en el navegador antes de subirla —
 * una foto de móvil sin tocar pueden ser varios MB para algo que como mucho
 * se va a mostrar a unos cientos de píxeles (avatar/portada). Si por lo que
 * sea el navegador no puede procesarla (formato raro, API no disponible…),
 * se sube el archivo original tal cual: nunca bloquea la subida por esto.
 */
export async function resizeImageFile(file: File, maxDimension: number, quality = 0.85, options: { alwaysEncode?: boolean } = {}): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = scaledSize(bitmap.width, bitmap.height, maxDimension)
    // Por defecto, una imagen que ya cabe se sube tal cual. Con `alwaysEncode` se recodifica igualmente
    // (una foto de 5 MB a 1.800 px pesa mucho menos en webp sin que se note).
    if (size.scale >= 1 && !options.alwaysEncode) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (!blob) return file
    // Nunca se devuelve algo más pesado que el original (p. ej. Safari no codifica webp y entrega un PNG enorme).
    if (options.alwaysEncode && !isSmallerEncoding(file.size, blob.size)) return file
    // El tipo y la extensión son los que el navegador ha producido de verdad (normalmente webp).
    return new File([blob], file.name.replace(/\.\w+$/, `.${extensionForType(blob.type)}`), { type: blob.type })
  } catch (err) {
    console.error('[resizeImageFile] no se pudo procesar en el navegador, se sube el original:', err)
    return file
  }
}
