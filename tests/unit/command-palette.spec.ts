import { describe, expect, it } from 'vitest'
import { filterPalette, normalize, scoreItem, type PaletteItem } from '../../app/utils/command-palette'

const item = (id: string, group: PaletteItem['group'], label: string, hint = '', keywords = ''): PaletteItem => ({ id, group, label, hint, keywords, icon: 'ph:x', to: `/${id}` })
const items = [
  item('inicio', 'goto', 'Inicio'),
  item('pubs', 'goto', 'Publicaciones'),
  item('nueva', 'action', 'Nueva publicación', '', 'crear idea'),
  item('c1', 'collab', 'Reseña de otoño (prueba)', 'mexo'),
  item('c2', 'collab', 'Lanzamiento de primavera', 'Marca Sol'),
  item('p1', 'post', 'Reseña de otoño - vídeo', 'En producción'),
  item('chat1', 'chat', 'mexo', 'Hola, ¿cómo vamos?')
]

describe('normalize', () => {
  it('quita acentos y mayúsculas', () => { expect(normalize('  Reseña ÓTOÑO ')).toBe('resena otono') })
})

describe('scoreItem', () => {
  it('no coincide si falta alguna palabra, y las palabras valen en cualquier orden', () => {
    expect(scoreItem(items[3]!, 'otono resena')).toBeGreaterThan(0)
    expect(scoreItem(items[3]!, 'otono marte')).toBe(0)
  })
  it('empezar por el texto vale más que encontrarlo dentro o en el texto secundario', () => {
    const empieza = scoreItem(item('a', 'goto', 'Paquetes'), 'paq')
    const dentro = scoreItem(item('b', 'goto', 'Mis paquetes'), 'quet')
    const hint = scoreItem(item('c', 'goto', 'Otra cosa', 'con paquetes'), 'paquetes')
    expect(empieza).toBeGreaterThan(dentro)
    expect(dentro).toBeGreaterThan(hint)
    expect(hint).toBeGreaterThan(0)
  })
  it('las palabras clave sirven para encontrar acciones', () => {
    expect(scoreItem(items[2]!, 'crear')).toBeGreaterThan(0)
  })
})

describe('filterPalette', () => {
  it('sin texto solo enseña «Ir a» y «Acciones»', () => {
    expect(filterPalette(items, '').map((i) => i.id)).toEqual(['inicio', 'pubs', 'nueva'])
    expect(filterPalette(items, '   ').map((i) => i.id)).toEqual(['inicio', 'pubs', 'nueva'])
  })
  it('con texto filtra en todos los grupos, en su orden y sin acentos', () => {
    expect(filterPalette(items, 'resena').map((i) => i.id)).toEqual(['c1', 'p1'])
    expect(filterPalette(items, 'mexo').map((i) => i.id)).toEqual(['c1', 'chat1'])
  })
  it('respeta el tope por grupo y devuelve vacío si nada coincide', () => {
    const many = Array.from({ length: 10 }, (_, i) => item(`x${i}`, 'collab', `Campaña ${i}`))
    expect(filterPalette(many, 'campana', 4)).toHaveLength(4)
    expect(filterPalette(items, 'zzzz')).toEqual([])
  })
})
