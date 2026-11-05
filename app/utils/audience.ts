/**
 * Audiencia declarada por el creador (`creators.audience`). Es información que escribe él mismo, no medida por una red:
 * la ficha pública lo dice así. Misma forma y mismos límites que `audience_is_valid` en la base de datos.
 */
export interface AudienceShare { label: string; pct: number }
export interface Audience {
  countries: AudienceShare[]
  ages: AudienceShare[]
  gender: { female: number; male: number; other: number }
}

export const AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'] as const
export const MAX_COUNTRIES = 6

export function emptyAudience(): Audience {
  return { countries: [], ages: AGE_RANGES.map((r) => ({ label: r, pct: 0 })), gender: { female: 0, male: 0, other: 0 } }
}

/** De la columna jsonb (`{countries:[{name,pct}], ages:[{range,pct}], gender}`) al modelo del formulario. */
export function audienceFromDb(raw: unknown): Audience {
  const base = emptyAudience()
  if (!raw || typeof raw !== 'object') return base
  const a = raw as { countries?: { name: string; pct: number }[]; ages?: { range: string; pct: number }[]; gender?: Record<string, number> }
  base.countries = (a.countries ?? []).map((c) => ({ label: c.name, pct: Number(c.pct) || 0 }))
  for (const age of a.ages ?? []) {
    const slot = base.ages.find((x) => x.label === age.range)
    if (slot) slot.pct = Number(age.pct) || 0
  }
  base.gender = { female: Number(a.gender?.female) || 0, male: Number(a.gender?.male) || 0, other: Number(a.gender?.other) || 0 }
  return base
}

/** Del modelo del formulario a la columna jsonb: solo lo que tiene valor (vacío = `{}`, «sin declarar»). */
export function audienceToDb(a: Audience): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const countries = a.countries.filter((c) => c.label.trim() && c.pct > 0).map((c) => ({ name: c.label.trim(), pct: c.pct }))
  if (countries.length) out.countries = countries
  const ages = a.ages.filter((x) => x.pct > 0).map((x) => ({ range: x.label, pct: x.pct }))
  if (ages.length) out.ages = ages
  if (a.gender.female + a.gender.male + a.gender.other > 0) out.gender = { ...a.gender }
  return out
}

export const hasAudience = (raw: unknown) => Object.keys(audienceToDb(audienceFromDb(raw))).length > 0

/** Errores legibles (null si es válida): cada bloque suma como mucho 100 %. */
export function audienceError(a: Audience): string | null {
  const bad = (n: number) => !Number.isFinite(n) || n < 0 || n > 100
  const sum = (xs: number[]) => xs.reduce((s, n) => s + n, 0)
  if ([...a.countries, ...a.ages].some((x) => bad(x.pct)) || Object.values(a.gender).some(bad)) return 'Los porcentajes de audiencia deben estar entre 0 y 100.'
  if (sum(a.countries.map((c) => c.pct)) > 100) return 'Los países de tu audiencia suman más de 100 %.'
  if (sum(a.ages.map((x) => x.pct)) > 100) return 'Las franjas de edad suman más de 100 %.'
  if (sum(Object.values(a.gender)) > 100) return 'El reparto por género suma más de 100 %.'
  if (a.countries.some((c) => c.pct > 0 && !c.label.trim())) return 'Pon nombre a cada país con porcentaje.'
  return null
}
