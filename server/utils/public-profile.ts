/**
 * Qué se enseña de un perfil a quien NO ha iniciado sesión. Es una lista cerrada:
 * lo que no se copia aquí de forma explícita no sale del servidor, aunque la fila
 * de la base de datos lo tenga.
 *
 * Fuera a propósito: el id de la cuenta (`profile_id`), tarifas y presupuestos,
 * paquetes con precio, audiencia declarada, con quién ha colaborado y
 * la privacidad del chat. Todo eso sigue necesitando sesión.
 *
 * Nota: las URLs de foto y portada viven en una carpeta de Storage con el id de la
 * cuenta, así que ese identificador sí se puede deducir de ellas. No es un secreto
 * (no da acceso a nada: lo protege RLS), pero no se devuelve como campo.
 */
export type PublicRole = 'creator' | 'partner'

export interface GuestProfilePayload {
  profile: {
    /** No es el id de la cuenta: se rellena con el id de la ficha para que la vista tenga una semilla estable. */
    profileId: string
    id: string
    role: PublicRole
    name: string
    avatarUrl: string | null
    coverUrl: string | null
    createdAt: string
    bio: string | null
    headline: string | null
    location: string | null
    categories: string[]
    industry: string | null
    website: string | null
    collaborationTypes: string[]
    verifiedSocials: { platform: string; handle: string | null; followersCount: number }[]
    minCents: null
    maxCents: null
    lookingFor: string | null
    chatPrivacy: 'everyone'
    audience: Record<string, never>
  }
  stats: Record<string, unknown>[]
  content: Record<string, unknown>[]
  activity: { collabCount: number; responseHours: number | null }
  rating: { avgStars: number; ratingCount: number }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isPublicRole(v: unknown): v is PublicRole {
  return v === 'creator' || v === 'partner'
}
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v)
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** Solo http(s): una web guardada con otro esquema no se enlaza desde una página pública. */
export function safeWebsite(v: unknown): string | null {
  const s = str(v)
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

/** Construye la ficha para invitados copiando campo a campo desde la fila de `creators` o `partners`. */
export function toGuestProfile(
  role: PublicRole,
  row: Record<string, unknown>,
  avatarUrl: string | null,
  socials: Record<string, unknown>[]
): GuestProfilePayload['profile'] {
  const id = String(row.id)
  return {
    profileId: id,
    id,
    role,
    name: String(role === 'creator' ? row.display_name : row.company_name),
    avatarUrl: str(avatarUrl),
    coverUrl: str(row.cover_url),
    createdAt: String(row.created_at),
    bio: str(row.bio),
    headline: str(row.headline),
    location: str(row.location),
    categories: list(row.categories),
    industry: role === 'partner' ? str(row.industry) : null,
    website: role === 'partner' ? safeWebsite(row.website) : null,
    collaborationTypes: role === 'partner' ? list(row.collaboration_types) : [],
    verifiedSocials: role === 'creator'
      ? socials.map((s) => ({ platform: String(s.platform), handle: str(s.handle), followersCount: Number(s.followers_count) || 0 }))
      : [],
    minCents: null,
    maxCents: null,
    lookingFor: str(row.looking_for),
    chatPrivacy: 'everyone',
    audience: {}
  }
}
