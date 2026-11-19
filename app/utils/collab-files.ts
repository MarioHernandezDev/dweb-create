/**
 * Archivos de una colaboración (bucket privado `collab-files`, migración 20261110110000). Las mismas reglas
 * están en el bucket (tamaño y tipos) y en la tabla (20 por colaboración): aquí se comprueban antes de subir
 * para dar el motivo en claro.
 */
export const COLLAB_FILE_MAX_BYTES = 10 * 1024 * 1024
export const COLLAB_FILE_MAX_COUNT = 20
export const COLLAB_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Imagen',
  'image/png': 'Imagen',
  'image/webp': 'Imagen',
  'text/plain': 'Texto',
  'text/csv': 'CSV',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint'
}
export const COLLAB_FILE_ACCEPT = Object.keys(COLLAB_FILE_TYPES).join(',')

/** Motivo por el que un archivo no se puede subir, o `null` si es válido. */
export function collabFileProblem(file: { name: string; type: string; size: number }, currentCount: number): string | null {
  if (currentCount >= COLLAB_FILE_MAX_COUNT) return `Esta colaboración ya tiene ${COLLAB_FILE_MAX_COUNT} archivos. Borra alguno antes de subir otro.`
  if (!COLLAB_FILE_TYPES[file.type]) return 'Ese tipo de archivo no se admite. Sube un PDF, una imagen (JPG, PNG, WebP) o un documento de Word, Excel, PowerPoint, texto o CSV.'
  if (file.size <= 0) return 'El archivo está vacío.'
  if (file.size > COLLAB_FILE_MAX_BYTES) return 'El archivo pesa más de 10 MB.'
  return null
}

/** Nombre seguro para la ruta del bucket: sin acentos, espacios ni símbolos; conserva la extensión. */
export function safeFileName(name: string): string {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|-+$/g, '')
  return (clean || 'archivo').slice(-80)
}

export function collabFilePath(collaborationId: string, name: string, unique: string): string {
  return `${collaborationId}/${unique}-${safeFileName(name)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`
}

export function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return 'ph:image'
  if (mime === 'application/pdf') return 'ph:file-pdf'
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') return 'ph:file-xls'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'ph:file-ppt'
  if (mime.includes('word')) return 'ph:file-doc'
  return 'ph:file-text'
}
