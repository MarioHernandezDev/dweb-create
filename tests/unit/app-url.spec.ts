import { describe, expect, it } from 'vitest'
import { appRedirectUrl } from '../../server/utils/app-url'

describe('appRedirectUrl', () => {
  it('sin APP_URL devuelve la ruta relativa de siempre', () => {
    expect(appRedirectUrl(undefined, '/creator/socials?instagram=connected')).toBe('/creator/socials?instagram=connected')
    expect(appRedirectUrl('', '/creator/socials')).toBe('/creator/socials')
  })

  it('con APP_URL vuelve a la app real, conservando la ruta y la query', () => {
    expect(appRedirectUrl('http://localhost:3000', '/creator/socials?instagram=connected')).toBe('http://localhost:3000/creator/socials?instagram=connected')
  })

  it.each(['http://localhost:3000/', 'http://localhost:3000/algo/mas', 'http://localhost:3000?x=1'])('usa solo el origen de %s', (base) => {
    expect(appRedirectUrl(base, '/creator/socials')).toBe('http://localhost:3000/creator/socials')
  })

  it('mantiene el mensaje de error codificado', () => {
    const path = `/creator/socials?instagram=error&reason=${encodeURIComponent('Algo falló: reintenta')}`
    expect(appRedirectUrl('https://ciberan.example', path)).toBe(`https://ciberan.example${path}`)
  })

  it.each(['no es una url', 'javascript:alert(1)', 'ftp://servidor.example', 'data:text/html,hola'])('un valor no válido o con otro protocolo (%s) se ignora', (bad) => {
    expect(appRedirectUrl(bad, '/creator/socials')).toBe('/creator/socials')
  })

  it('un path sin barra inicial no genera una URL rota', () => {
    expect(appRedirectUrl('http://localhost:3000', 'creator/socials')).toBe('http://localhost:3000/creator/socials')
  })
})
