// Límite del bucket `post-media` (ver supabase/migrations/20261021130000_post_media_bucket.sql) —
// se comprueba aquí también para poder avisar ANTES de intentar subir, no solo después de que falle.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
// Techo para el archivo ORIGINAL antes incluso de intentar procesarlo (decodificar una imagen de
// varias decenas de MB puede ir lento/pesado en un móvil modesto) — bastante por encima de lo que
// cualquier foto de portada/avatar necesita, solo para cortar casos absurdos pronto y con un aviso claro.
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
export async function resizeImageFile(file: File, maxDimension: number, quality = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    if (scale >= 1) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })
  } catch (err) {
    console.error('[resizeImageFile] no se pudo procesar en el navegador, se sube el original:', err)
    return file
  }
}
