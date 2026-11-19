import { describe, expect, it } from 'vitest'
import { displayName, filterLibrary, humanSize, libraryPath, LIBRARY_MAX_BYTES, LIBRARY_MAX_FILES, normalizeTags, tagCounts, validateLibraryFile } from '../../app/utils/media-library'

describe('validateLibraryFile', () => {
  const ok = { name: 'foto.jpg', size: 1000, type: 'image/jpeg' }
  it('admite JPG, PNG y WebP razonables', () => {
    expect(validateLibraryFile(ok)).toBeNull()
    expect(validateLibraryFile({ ...ok, type: 'image/webp' })).toBeNull()
  })
  it('rechaza otros tipos, vacíos, demasiado grandes y biblioteca llena, con motivo', () => {
    expect(validateLibraryFile({ ...ok, type: 'video/mp4' })).toMatch(/no es una imagen/)
    expect(validateLibraryFile({ ...ok, type: 'image/gif' })).toMatch(/JPG, PNG o WebP/)
    expect(validateLibraryFile({ ...ok, size: 0 })).toMatch(/vacío/)
    expect(validateLibraryFile({ ...ok, size: LIBRARY_MAX_BYTES + 1 })).toMatch(/máximo/)
    expect(validateLibraryFile(ok, LIBRARY_MAX_FILES)).toMatch(/100 archivos/)
  })
})

describe('nombres, rutas y etiquetas', () => {
  it('displayName quita la extensión y limpia guiones bajos', () => {
    expect(displayName('mi_foto_de__otoño.JPG')).toBe('mi foto de otoño')
    expect(displayName('.png')).toBe('Imagen')
    expect(displayName(`${'a'.repeat(300)}.png`)).toHaveLength(120)
  })
  it('libraryPath cuelga de la carpeta del dueño', () => {
    expect(libraryPath('u1', 'abc', 'image/png')).toBe('u1/library/abc.png')
    expect(libraryPath('u1', 'abc', 'image/webp')).toBe('u1/library/abc.webp')
  })
  it('normalizeTags limpia, no repite y respeta los máximos', () => {
    expect(normalizeTags('#Moda, verano ,moda,\n  ##Otoño  ')).toEqual(['moda', 'verano', 'otoño'])
    expect(normalizeTags(['A'.repeat(50)])[0]).toHaveLength(30)
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(8)
    expect(normalizeTags('  ,, ')).toEqual([])
  })
})

describe('filterLibrary y tagCounts', () => {
  const items = [
    { name: 'Reseña otoño', tags: ['otoño', 'vídeo'] },
    { name: 'Logo marca', tags: ['logo'] },
    { name: 'Portada verano', tags: ['verano', 'otoño'] }
  ]
  it('busca por nombre o etiqueta sin acentos y por etiqueta concreta', () => {
    expect(filterLibrary(items, 'resena').map((i) => i.name)).toEqual(['Reseña otoño'])
    expect(filterLibrary(items, 'otono').map((i) => i.name)).toEqual(['Reseña otoño', 'Portada verano'])
    expect(filterLibrary(items, 'portada otono')).toHaveLength(1)
    expect(filterLibrary(items, '', 'logo').map((i) => i.name)).toEqual(['Logo marca'])
    expect(filterLibrary(items, 'zzz')).toEqual([])
  })
  it('cuenta etiquetas de más a menos usadas', () => {
    expect(tagCounts(items)[0]).toEqual({ tag: 'otoño', count: 2 })
    expect(tagCounts(items)).toHaveLength(4)
  })
})

describe('humanSize', () => {
  it('usa B, KB y MB', () => {
    expect(humanSize(500)).toBe('500 B')
    expect(humanSize(2048)).toBe('2 KB')
    expect(humanSize(2.5 * 1024 * 1024)).toBe('2,5 MB')
  })
})
