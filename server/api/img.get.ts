import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { allowedImageSource, clampImageSize, clampQuality, imageCacheKey } from '../utils/image-proxy'

/**
 * GET /api/img?u=<url>&w=<ancho>&h=<alto>&q=<calidad> — portadas y avatares al
 * tamaño real con que se pintan, en webp.
 *
 * Por qué existe: las fotos subidas pesan de cientos de KB a varios MB y una
 * pantalla de Descubrir pinta decenas. Esto las reduce a ~10 KB cada una y
 * guarda el resultado (memoria + disco), así que el trabajo pesado (descargar
 * la original y redimensionarla) solo lo paga la primera visita de la historia.
 * Las peticiones simultáneas de la misma imagen comparten una única descarga.
 *
 * Seguridad: solo acepta fotos de /img/ y del Storage público de la propia
 * app (ver server/utils/image-proxy.ts); cualquier otra URL da 400, así no se
 * puede usar el servidor para descargar sitios arbitrarios.
 */

const MEMORY_MAX = 300
const memory = new Map<string, Buffer>()
const inflight = new Map<string, Promise<Buffer>>()
const CACHE_DIR = join(process.cwd(), '.data', 'img-cache')

function remember(key: string, buf: Buffer) {
  memory.set(key, buf)
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value as string)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const config = useRuntimeConfig()
  const appOrigin = getRequestURL(event).origin
  const storageOrigin = (config.public as { supabase?: { url?: string } }).supabase?.url || process.env.SUPABASE_URL
  const source = allowedImageSource(String(q.u ?? ''), storageOrigin, appOrigin)
  if (!source) throw createError({ statusCode: 400, statusMessage: 'Origen de imagen no permitido.' })

  const w = clampImageSize(q.w, 480)
  const h = clampImageSize(q.h, Math.round(w * 0.625))
  const quality = clampQuality(q.q)
  const key = imageCacheKey(source, w, h, quality)

  setResponseHeaders(event, { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' })

  const hit = memory.get(key)
  if (hit) { setResponseHeader(event, 'x-img-cache', 'memory'); return hit }

  try {
    const disk = await readFile(join(CACHE_DIR, `${key}.webp`))
    remember(key, disk)
    setResponseHeader(event, 'x-img-cache', 'disk')
    return disk
  } catch { /* no estaba en disco */ }

  let job = inflight.get(key)
  if (!job) {
    job = (async () => {
      const original = Buffer.from(await $fetch<ArrayBuffer>(source, { responseType: 'arrayBuffer', timeout: 15000 }))
      const out = await sharp(original, { failOn: 'none' }).rotate().resize({ width: w, height: h, fit: 'cover' }).webp({ quality }).toBuffer()
      remember(key, out)
      mkdir(CACHE_DIR, { recursive: true }).then(() => writeFile(join(CACHE_DIR, `${key}.webp`), out)).catch(() => {})
      return out
    })().finally(() => inflight.delete(key))
    inflight.set(key, job)
  }
  try {
    const out = await job
    setResponseHeader(event, 'x-img-cache', 'miss')
    return out
  } catch (err) {
    console.error('[img] no se pudo preparar la imagen:', (err as Error).message)
    throw createError({ statusCode: 404, statusMessage: 'Imagen no disponible.' })
  }
})
