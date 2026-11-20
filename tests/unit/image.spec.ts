import { describe, it, expect } from 'vitest'
import { extensionForType, isSmallerEncoding, OPTIMIZE_MAX_DIMENSION, scaledSize } from '../../app/utils/image'
import { LIBRARY_MAX_FILES } from '../../app/utils/media-library'

describe('scaledSize', () => {
  it('reduce el lado mayor al máximo y mantiene la proporción', () => {
    expect(scaledSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500, scale: 0.5 })
    expect(scaledSize(3000, 6000, 2000)).toEqual({ width: 1000, height: 2000, scale: 1 / 3 })
  })
  it('nunca amplía', () => {
    expect(scaledSize(800, 600, 2000)).toEqual({ width: 800, height: 600, scale: 1 })
  })
  it('no devuelve lados de 0 píxeles', () => {
    expect(scaledSize(10000, 1, 100).height).toBe(1)
  })
})

describe('isSmallerEncoding', () => {
  it('solo acepta la versión recodificada si pesa claramente menos', () => {
    expect(isSmallerEncoding(5_000_000, 500_000)).toBe(true)
    expect(isSmallerEncoding(100_000, 99_000)).toBe(false) // casi igual: se queda el original
    expect(isSmallerEncoding(100_000, 150_000)).toBe(false)
    expect(isSmallerEncoding(100_000, 0)).toBe(false)
  })
})

describe('extensionForType', () => {
  it('usa la extensión del tipo real producido por el navegador', () => {
    expect(extensionForType('image/webp')).toBe('webp')
    expect(extensionForType('image/png')).toBe('png')
    expect(extensionForType('image/jpeg')).toBe('jpg')
    expect(extensionForType('image/otro')).toBe('webp')
  })
})

describe('límites de la biblioteca', () => {
  it('50 archivos por persona y 2.000 px de lado mayor', () => {
    expect(LIBRARY_MAX_FILES).toBe(50)
    expect(OPTIMIZE_MAX_DIMENSION).toBe(2000)
  })
})
