/**
 * Validación de la ficha pública (A-R18c), compartida por creador y partner.
 * Pura y sin Vue. Los campos numéricos llegan de `<input type="number">` con
 * `v-model.number`, que deja `''` al vaciarlos: se tratan como "sin valor".
 */
export const BIO_MAX = 500
export const LOOKING_FOR_MAX = 300
export const HEADLINE_MAX = 80
export const LOCATION_MAX = 80
export const WEBSITE_MAX = 200

export interface FichaInput {
  bio: string
  lookingFor: string
  min: number | string | null
  max: number | string | null
  headline?: string
  location?: string
  website?: string
}

export type FichaErrors = Partial<Record<'bio' | 'lookingFor' | 'min' | 'max' | 'headline' | 'location' | 'website', string>>

function amountOf(v: number | string | null): number | null {
  if (v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : Number.NaN
}

export function validateFicha(input: FichaInput, labels: { min: string; max: string } = { min: 'El mínimo', max: 'El máximo' }): FichaErrors {
  const errors: FichaErrors = {}
  if (input.bio.length > BIO_MAX) errors.bio = `La biografía admite hasta ${BIO_MAX} caracteres (ahora ${input.bio.length}).`
  if (input.lookingFor.length > LOOKING_FOR_MAX) errors.lookingFor = `Admite hasta ${LOOKING_FOR_MAX} caracteres (ahora ${input.lookingFor.length}).`

  if ((input.headline ?? '').length > HEADLINE_MAX) errors.headline = `La frase de presentación admite hasta ${HEADLINE_MAX} caracteres.`
  if ((input.location ?? '').length > LOCATION_MAX) errors.location = `La ubicación admite hasta ${LOCATION_MAX} caracteres.`
  const site = (input.website ?? '').trim()
  if (site && (site.length > WEBSITE_MAX || !/^https?:\/\/[^\s]+$/i.test(site))) errors.website = 'La web debe empezar por http:// o https:// (máximo 200 caracteres).'

  const min = amountOf(input.min)
  const max = amountOf(input.max)
  if (min !== null && (Number.isNaN(min) || min < 0)) errors.min = `${labels.min} debe ser un número igual o mayor que 0.`
  if (max !== null && (Number.isNaN(max) || max < 0)) errors.max = `${labels.max} debe ser un número igual o mayor que 0.`
  if (!errors.min && !errors.max && min !== null && max !== null && min > max) {
    errors.max = `${labels.max} no puede ser menor que ${labels.min.toLowerCase()}.`
  }
  return errors
}

/** Primer motivo legible para la barra de guardado; `null` si todo es válido. */
export function firstFichaError(errors: FichaErrors): string | null {
  return errors.bio ?? errors.headline ?? errors.location ?? errors.website ?? errors.lookingFor ?? errors.min ?? errors.max ?? null
}
