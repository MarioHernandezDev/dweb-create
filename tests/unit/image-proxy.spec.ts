import { describe, expect, it } from 'vitest'
import { allowedImageSource, clampImageSize, clampQuality, imageCacheKey } from '../../server/utils/image-proxy'

const storage = 'https://abc.supabase.co'
const app = 'http://localhost:3000'

describe('allowedImageSource', () => {
  it('acepta el Storage público de la app y las fotos de /img/', () => {
    expect(allowedImageSource(`${storage}/storage/v1/object/public/post-media/u1/profile-cover.jpg?v=1`, storage, app)).toContain('/post-media/u1/profile-cover.jpg?v=1')
    expect(allowedImageSource('/img/pexels-a.jpg', storage, app)).toBe('http://localhost:3000/img/pexels-a.jpg')
  })

  it('rechaza cualquier otro sitio (no se puede usar para descargar URLs arbitrarias)', () => {
    expect(allowedImageSource('https://evil.example.com/storage/v1/object/public/x.jpg', storage, app)).toBeNull()
    expect(allowedImageSource('http://abc.supabase.co/storage/v1/object/public/x.jpg', storage, app)).toBeNull() // sin https
    expect(allowedImageSource('https://abc.supabase.co.evil.com/storage/v1/object/public/x.jpg', storage, app)).toBeNull()
    expect(allowedImageSource('http://169.254.169.254/latest/meta-data', storage, app)).toBeNull()
  })

  it('rechaza rutas de Storage privadas y locales fuera de /img/ o con escapes', () => {
    expect(allowedImageSource(`${storage}/storage/v1/object/sign/x.jpg`, storage, app)).toBeNull()
    expect(allowedImageSource('/api/admin/users', storage, app)).toBeNull()
    expect(allowedImageSource('/img/../.env', storage, app)).toBeNull()
    expect(allowedImageSource('//evil.com/img/a.jpg', storage, app)).toBeNull()
  })

  it('rechaza vacío, demasiado largo y sin origen de Storage configurado', () => {
    expect(allowedImageSource('', storage, app)).toBeNull()
    expect(allowedImageSource('/img/' + 'a'.repeat(700), storage, app)).toBeNull()
    expect(allowedImageSource(`${storage}/storage/v1/object/public/x.jpg`, undefined, app)).toBeNull()
  })
})

describe('tamaños y calidad', () => {
  it('limita el tamaño a un rango razonable y usa el valor por defecto si no es número', () => {
    expect(clampImageSize('440', 480)).toBe(440)
    expect(clampImageSize(99999, 480)).toBe(1600)
    expect(clampImageSize(1, 480)).toBe(16)
    expect(clampImageSize('abc', 480)).toBe(480)
    expect(clampImageSize(undefined, 480)).toBe(480)
  })
  it('limita la calidad entre 40 y 90', () => {
    expect(clampQuality(70)).toBe(70)
    expect(clampQuality(5)).toBe(40)
    expect(clampQuality(100)).toBe(90)
    expect(clampQuality('x')).toBe(70)
  })
})

describe('imageCacheKey', () => {
  it('es estable y cambia con la URL (incluido ?v=) o el tamaño', () => {
    const a = imageCacheKey('https://x/a.jpg?v=1', 440, 275, 70)
    expect(a).toBe(imageCacheKey('https://x/a.jpg?v=1', 440, 275, 70))
    expect(a).not.toBe(imageCacheKey('https://x/a.jpg?v=2', 440, 275, 70))
    expect(a).not.toBe(imageCacheKey('https://x/a.jpg?v=1', 880, 550, 70))
    expect(a).toMatch(/^[0-9a-f]{40}$/)
  })
})
