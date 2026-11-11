import { collabFilePath, collabFileProblem } from '~/utils/collab-files'

export interface CollabFile {
  id: string
  name: string
  mime: string
  sizeBytes: number
  path: string
  uploaderProfileId: string
  createdAt: string
}

interface FileRow { id: string; name: string; mime: string; size_bytes: number; path: string; uploader_profile_id: string; created_at: string }

/**
 * Archivos compartidos de una colaboración. El bucket es privado: se listan desde la tabla `collaboration_files`
 * (RLS: solo las dos partes) y se descargan con una URL firmada de un minuto.
 */
export function useCollabFiles(collaborationId: string) {
  const client = useSupabaseClient()
  const files = useState<CollabFile[]>(`collab-files-${collaborationId}`, () => [])
  const loaded = useState<boolean>(`collab-files-loaded-${collaborationId}`, () => false)
  const loadError = ref('')
  const db = client as unknown as { from: (t: string) => any }

  async function load() {
    const { data, error } = await db.from('collaboration_files')
      .select('id, name, mime, size_bytes, path, uploader_profile_id, created_at')
      .eq('collaboration_id', collaborationId).order('created_at', { ascending: false })
    if (error) {
      loadError.value = 'No se han podido cargar los archivos.'
      return
    }
    loadError.value = ''
    files.value = (data as FileRow[]).map((r) => ({ id: r.id, name: r.name, mime: r.mime, sizeBytes: r.size_bytes, path: r.path, uploaderProfileId: r.uploader_profile_id, createdAt: r.created_at }))
    loaded.value = true
  }

  /** Sube un archivo. Lanza un `Error` con el motivo en castellano si no se puede. */
  async function upload(file: File) {
    const problem = collabFileProblem(file, files.value.length)
    if (problem) throw new Error(problem)
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const path = collabFilePath(collaborationId, file.name, unique)
    const { error: upErr } = await client.storage.from('collab-files').upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) throw new Error('No se ha podido subir el archivo. Comprueba que la colaboración sigue abierta e inténtalo de nuevo.')
    const { error } = await db.from('collaboration_files').insert({ collaboration_id: collaborationId, path, name: file.name.slice(0, 200), mime: file.type, size_bytes: file.size })
    if (error) {
      // Sin fila en la tabla el archivo no se vería: se retira del bucket para no dejarlo huérfano.
      await client.storage.from('collab-files').remove([path])
      throw new Error(error.message || 'No se ha podido registrar el archivo.')
    }
    await load()
  }

  async function remove(file: CollabFile) {
    const { error } = await db.from('collaboration_files').delete().eq('id', file.id)
    if (error) throw new Error('No se ha podido borrar el archivo.')
    await client.storage.from('collab-files').remove([file.path])
    files.value = files.value.filter((f) => f.id !== file.id)
  }

  /** URL temporal (60 s) para abrir o descargar el archivo. */
  async function signedUrl(file: CollabFile): Promise<string> {
    const { data, error } = await client.storage.from('collab-files').createSignedUrl(file.path, 60, { download: file.name })
    if (error || !data?.signedUrl) throw new Error('No se ha podido abrir el archivo.')
    return data.signedUrl
  }

  return { files, loaded, loadError, load, upload, remove, signedUrl }
}
