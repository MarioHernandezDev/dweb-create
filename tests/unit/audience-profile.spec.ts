import { describe, expect, it } from 'vitest'
import { audienceError, audienceFromDb, audienceToDb, emptyAudience, hasAudience } from '../../app/utils/audience'
import { validateFicha, firstFichaError } from '../../app/utils/profile-ficha'

describe('audiencia declarada', () => {
  it('ida y vuelta con la columna jsonb, sin guardar lo vacío', () => {
    const a = emptyAudience()
    expect(audienceToDb(a)).toEqual({})
    a.countries.push({ label: ' España ', pct: 70 }, { label: '', pct: 0 })
    a.ages.find((x) => x.label === '25-34')!.pct = 40
    a.gender.female = 60
    const db = audienceToDb(a)
    expect(db).toEqual({ countries: [{ name: 'España', pct: 70 }], ages: [{ range: '25-34', pct: 40 }], gender: { female: 60, male: 0, other: 0 } })
    expect(audienceToDb(audienceFromDb(db))).toEqual(db)
    expect(hasAudience(db)).toBe(true)
    expect(hasAudience({})).toBe(false)
  })
  it('cada bloque suma como mucho 100 y los porcentajes van de 0 a 100', () => {
    const a = emptyAudience()
    expect(audienceError(a)).toBeNull()
    a.countries = [{ label: 'España', pct: 70 }, { label: 'México', pct: 40 }]
    expect(audienceError(a)).toMatch(/países/)
    a.countries = [{ label: 'España', pct: 120 }]
    expect(audienceError(a)).toMatch(/entre 0 y 100/)
    a.countries = []
    a.gender = { female: 60, male: 50, other: 0 }
    expect(audienceError(a)).toMatch(/género/)
  })
  it('ignora datos corruptos de la base de datos', () => {
    expect(audienceFromDb(null)).toEqual(emptyAudience())
    expect(audienceFromDb({ ages: [{ range: '99-100', pct: 10 }], gender: { female: 'x' } })).toEqual(emptyAudience())
  })
})

describe('ficha: frase, ubicación y web', () => {
  const ok = { bio: '', lookingFor: '', min: null, max: null }
  it('límites de longitud', () => {
    expect(validateFicha({ ...ok, headline: 'x'.repeat(81) }).headline).toBeTruthy()
    expect(validateFicha({ ...ok, location: 'x'.repeat(81) }).location).toBeTruthy()
    expect(validateFicha({ ...ok, headline: 'x'.repeat(80), location: 'Granada, España' })).toEqual({})
  })
  it('la web exige http(s) y sin espacios; vacía vale', () => {
    expect(validateFicha({ ...ok, website: '' })).toEqual({})
    expect(validateFicha({ ...ok, website: 'https://marca.com/x' })).toEqual({})
    expect(validateFicha({ ...ok, website: 'javascript:alert(1)' }).website).toBeTruthy()
    expect(validateFicha({ ...ok, website: 'marca.com' }).website).toBeTruthy()
    expect(firstFichaError(validateFicha({ ...ok, website: 'x' }))).toBeTruthy()
  })
})
