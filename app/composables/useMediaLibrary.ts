import { optimizeImageFile } from '~/utils/image'
import { displayName, libraryPath, LIBRARY_TYPES, normalizeTags, validateLibraryFile, type LibraryItem } from '~/utils/media-library'

interface LibraryRow { id: string; path: string; name: string; mime: string; size_bytes: number; tags: string[] | null; created_at: string }

const BUCKET = 'post-media'
const SELECT = 'id, path, name, mime, size_bytes, tags, created_at'
/** Plazo para «Deshacer» un borrado: el borrado de verdad espera a que pase. */
const UNDO_MS = 8000

/**
 * Biblioteca de archivos del creador: imágenes reutilizables (portadas de publicaciones y de paquetes). Los archivos
 * viven en el bucket público `post-media` bajo `<perfil>/library/` y la tabla `media_library` guarda nombre y etiquetas
 * (migración 20261119120000). Elegir una imagen como portada la COPIA a la publicación o al paquete: son independientes,
 * así que borrar de la biblioteca nunca rompe una portada ya puesta.
 */
export function useMediaLibrary() {
  const client = useSupabaseClient()
  const db = client as unknown as { from: (t: string) => any }
  const toast = useToast()

  const items = useState<LibraryItem[]>('media-library', () => [])
  const loaded = useState<boolean>('media-library-loaded', () => false)
  const loading = useState<boolean>('media-library-loading', () => false)
  const uploading = useState<boolean>('media-library-uploading', () => false)
  const error = useState<string>('media-library-error', () => '')

  const urlOf = (path: string) => client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  const mapRow = (r: LibraryRow): LibraryItem => ({ id: r.id, path: r.path, name: r.name, mime: r.mime, sizeBytes: r.size_bytes, tags: r.tags ?? [], createdAt: r.created_at, url: urlOf(r.path) })

  async function load(force = false) {
    if ((loaded.value && !force) || loading.value) return
    loading.value = true
    error.value = ''
    const { data, error: e } = await db.from('media_library').select(SELECT).order('created_at', { ascending: false })
    loading.value = false
    if (e) {
      console.error('[useMediaLibrary] fallo al cargar:', e.message)
      error.value = 'No se ha podido cargar tu biblioteca. Inténtalo de nuevo.'
      return
    }
    items.value = (data as LibraryRow[]).map(mapRow)
    loaded.value = true
  }

  /** Sube varias imágenes una a una. Devuelve cuántas entraron y el motivo de cada una que no. */
  async function upload(files: File[], tags: string[] = []): Promise<{ added: number; errors: string[] }> {
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) return { added: 0, errors: ['No hay sesión activa.'] }
    const uid = userData.user.id
    const errors: string[] = []
    let added = 0
    uploading.value = true
    try {
      for (const file of files) {
        const reason = validateLibraryFile(file, items.value.length)
        if (reason) { errors.push(reason); continue }
        // Se guarda la versión optimizada (lado mayor 2.000 px, webp): ocupa una fracción y no se nota al mostrarla.
        const prepared = await optimizeImageFile(file)
        const mime = LIBRARY_TYPES[prepared.type] ? prepared.type : file.type
        const id = crypto.randomUUID()
        const path = libraryPath(uid, id, mime)
        const { error: upErr } = await client.storage.from(BUCKET).upload(path, prepared, { contentType: mime })
        if (upErr) { console.error('[useMediaLibrary] fallo al subir:', upErr.message); errors.push(`No se ha podido subir «${file.name}». Inténtalo de nuevo.`); continue }
        const { data, error: insErr } = await db.from('media_library')
          .insert({ path, name: displayName(file.name), mime, size_bytes: prepared.size, tags: normalizeTags(tags) }).select(SELECT).single()
        if (insErr) {
          // Sin fila no hay archivo que valga: se quita para no dejar huérfanos.
          await client.storage.from(BUCKET).remove([path])
          errors.push(/\d+ archivos/.test(insErr.message ?? '') ? insErr.message : `No se ha podido guardar «${file.name}». Inténtalo de nuevo.`)
          continue
        }
        items.value = [mapRow(data as LibraryRow), ...items.value]
        added++
      }
    } finally {
      uploading.value = false
    }
    return { added, errors }
  }

  async function updateMeta(id: string, patch: { name?: string; tags?: string[] }) {
    const payload: Record<string, unknown> = {}
    if (patch.name !== undefined) {
      const name = patch.name.trim().replace(/\s+/g, ' ').slice(0, 120)
      if (!name) throw new Error('Ponle un nombre al archivo.')
      payload.name = name
    }
    if (patch.tags !== undefined) payload.tags = normalizeTags(patch.tags)
    const { error: e } = await db.from('media_library').update(payload).eq('id', id)
    if (e) throw new Error('No se han podido guardar los cambios.')
    items.value = items.value.map((i) => (i.id === id ? { ...i, ...(payload.name ? { name: payload.name as string } : {}), ...(payload.tags ? { tags: payload.tags as string[] } : {}) } : i))
  }

  /** Borra con «Deshacer»: desaparece al momento y se borra de verdad pasados unos segundos (cerrar la pestaña antes lo cancela). */
  function removeWithUndo(item: LibraryItem) {
    const index = items.value.findIndex((i) => i.id === item.id)
    if (index === -1) return
    items.value = items.value.filter((i) => i.id !== item.id)
    let undone = false
    const timer = setTimeout(async () => {
      if (undone) return
      const { error: e } = await db.from('media_library').delete().eq('id', item.id)
      if (e) {
        console.error('[useMediaLibrary] fallo al borrar:', e.message)
        if (!items.value.some((i) => i.id === item.id)) { const next = [...items.value]; next.splice(Math.min(index, next.length), 0, item); items.value = next }
        toast.error(`No se ha podido borrar «${item.name}»: vuelve a estar en tu biblioteca.`)
        return
      }
      const { error: sErr } = await client.storage.from(BUCKET).remove([item.path])
      if (sErr) console.error('[useMediaLibrary] fila borrada, pero el archivo no:', sErr.message)
    }, UNDO_MS)
    toast.info(`«${item.name}» eliminada de la biblioteca`, {
      ms: UNDO_MS,
      action: {
        label: 'Deshacer',
        onClick: () => {
          undone = true
          clearTimeout(timer)
          if (!items.value.some((i) => i.id === item.id)) { const next = [...items.value]; next.splice(Math.min(index, next.length), 0, item); items.value = next }
          toast.success(`«${item.name}» restaurada`)
        }
      }
    })
  }

  /** La imagen como `File`, lista para pasarla por la misma subida que una imagen elegida del equipo. */
  async function toFile(item: LibraryItem): Promise<File> {
    const res = await fetch(item.url)
    if (!res.ok) throw new Error('No se ha podido leer la imagen de tu biblioteca.')
    const blob = await res.blob()
    const ext = item.path.split('.').pop() ?? 'jpg'
    return new File([blob], `${displayName(item.name)}.${ext}`, { type: item.mime })
  }

  return { items, loaded, loading, uploading, error, load, upload, updateMeta, removeWithUndo, toFile }
}
