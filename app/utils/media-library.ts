/**
 * Biblioteca de archivos del creador: reglas y utilidades puras (sin Vue ni red). Las mismas reglas están en el bucket
 * `post-media` (tipos y tamaño) y en la tabla `media_library` (100 archivos, 8 etiquetas, nombre); aquí se comprueban
 * antes de subir para dar el motivo en claro.
 */
export const LIBRARY_MAX_BYTES = 8 * 1024 * 1024
export const LIBRARY_MAX_FILES = 100
export const LIBRARY_MAX_TAGS = 8
export const LIBRARY_TAG_MAX = 30
export const LIBRARY_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const LIBRARY_ACCEPT = Object.keys(LIBRARY_TYPES).join(',')

export interface LibraryItem {
  id: string
  path: string
  name: string
  mime: string
  sizeBytes: number
  tags: string[]
  createdAt: string
  /** URL pública del archivo (bucket público). */
  url: string
}

/** Motivo por el que un archivo no se puede subir, o `null` si vale. */
export function validateLibraryFile(file: { name: string; size: number; type: string }, currentCount = 0): string | null {
  if (currentCount >= LIBRARY_MAX_FILES) return `La biblioteca ya tiene ${LIBRARY_MAX_FILES} archivos. Borra alguno antes de subir otro.`
  if (!LIBRARY_TYPES[file.type]) return `«${file.name}» no es una imagen JPG, PNG o WebP.`
  if (file.size <= 0) return `«${file.name}» está vacío.`
  if (file.size > LIBRARY_MAX_BYTES) return `«${file.name}» pesa ${humanSize(file.size)}: el máximo son ${humanSize(LIBRARY_MAX_BYTES)}.`
  return null
}

/** Nombre para enseñar: el del archivo sin extensión, con espacios en vez de guiones bajos y sin pasarse de 120. */
export function displayName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return (base || 'Imagen').slice(0, 120)
}

/** Ruta en el bucket: `<perfil>/library/<id>.<ext>` (la carpeta del dueño, como exigen las políticas y la tabla). */
export function libraryPath(profileId: string, id: string, mime: string): string {
  return `${profileId}/library/${id}.${LIBRARY_TYPES[mime] ?? 'jpg'}`
}

/** Etiquetas limpias: minúsculas, sin «#», sin repetidas, de hasta 30 caracteres y como mucho 8. Acepta texto («#moda, verano»). */
export function normalizeTags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[,\n]+/)
  const out: string[] = []
  for (const t of raw) {
    const tag = t.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase().slice(0, LIBRARY_TAG_MAX).trim()
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out.slice(0, LIBRARY_MAX_TAGS)
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Búsqueda por nombre o etiqueta (sin acentos, todas las palabras) y, opcionalmente, por una etiqueta concreta. */
export function filterLibrary<T extends { name: string; tags: string[] }>(items: T[], query: string, tag: string | null = null): T[] {
  const words = norm(query).split(/\s+/).filter(Boolean)
  return items.filter((i) => {
    if (tag && !i.tags.includes(tag)) return false
    if (!words.length) return true
    const hay = norm(`${i.name} ${i.tags.join(' ')}`)
    return words.every((w) => hay.includes(w))
  })
}

/** Etiquetas usadas, de más a menos frecuentes (y alfabético en empates), con cuántas veces. */
export function tagCounts(items: { tags: string[] }[]): { tag: string; count: number }[] {
  const map = new Map<string, number>()
  for (const i of items) for (const t of i.tags) map.set(t, (map.get(t) ?? 0) + 1)
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'es'))
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
