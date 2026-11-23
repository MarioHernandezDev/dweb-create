import { describe, it, expect } from 'vitest'
import { errorMessage } from '../../app/utils/error-message'
import { plural } from '../../app/utils/plural'

const FALLBACK = 'No se ha podido hacer esto.'

describe('errorMessage', () => {
  it('deja pasar los mensajes de negocio en castellano (de Error o de objetos de Supabase)', () => {
    expect(errorMessage(new Error('Faltan 2 entregable(s) por aprobar.'), FALLBACK)).toBe('Faltan 2 entregable(s) por aprobar.')
    expect(errorMessage({ message: 'La publicación ha cambiado: recarga y vuelve a intentarlo.' }, FALLBACK)).toBe('La publicación ha cambiado: recarga y vuelve a intentarlo.')
  })
  it('usa el texto de reserva cuando no hay mensaje', () => {
    for (const e of [null, undefined, {}, '', new Error(''), { message: '' }, 42]) expect(errorMessage(e, FALLBACK), String(e)).toBe(FALLBACK)
  })
  it('traduce los errores de permisos (RLS) y de sesión', () => {
    expect(errorMessage({ message: 'new row violates row-level security policy for table "posts"' }, FALLBACK)).toMatch(/permiso/)
    expect(errorMessage({ message: 'permission denied for table collaborations' }, FALLBACK)).toMatch(/permiso/)
    expect(errorMessage({ message: 'JWT expired' }, FALLBACK)).toMatch(/sesión/)
    expect(errorMessage(new Error('Auth session missing!'), FALLBACK)).toMatch(/sesión/)
  })
  it('traduce red caída, duplicados, claves foráneas y tiempos de espera', () => {
    expect(errorMessage(new TypeError('Failed to fetch'), FALLBACK)).toMatch(/conectar/)
    expect(errorMessage({ message: 'NetworkError when attempting to fetch resource.' }, FALLBACK)).toMatch(/conectar/)
    expect(errorMessage({ message: 'duplicate key value violates unique constraint "x_key"' }, FALLBACK)).toMatch(/ya existe/i)
    expect(errorMessage({ message: 'insert or update on table "a" violates foreign key constraint "b"' }, FALLBACK)).toMatch(/algo ha cambiado/)
    expect(errorMessage({ message: 'canceling statement due to statement timeout' }, FALLBACK)).toMatch(/tardado/)
    expect(errorMessage({ message: 'Too many requests' }, FALLBACK)).toMatch(/Demasiados/)
  })
  it('nunca enseña nombres de tablas, columnas ni errores de código: usa el texto de reserva', () => {
    for (const m of ['relation "public.xyz" does not exist', 'column "foo" of relation "posts" does not exist', 'syntax error at or near "select"', 'TypeError: x is not a function', 'Cannot read properties of undefined']) {
      expect(errorMessage({ message: m }, FALLBACK), m).toBe(FALLBACK)
    }
  })
})

describe('plural', () => {
  it('singular solo con 1', () => {
    expect(plural(1, 'mensaje', 'mensajes')).toBe('1 mensaje')
    expect(plural(0, 'mensaje', 'mensajes')).toBe('0 mensajes')
    expect(plural(2, 'mensaje', 'mensajes')).toBe('2 mensajes')
  })
})
