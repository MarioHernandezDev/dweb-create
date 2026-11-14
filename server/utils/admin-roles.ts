import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Roles del equipo de admin y contraseñas personales.
 *  - viewer: solo lee (usuarios, actividad, reportes, métricas).
 *  - moderator: además revisa reportes y solicitudes de eliminación y bloquea cuentas.
 *  - admin: además verifica marcas, regala Pro, elimina cuentas y gestiona al equipo.
 * Separado de la sesión para poder probarlo sin servidor.
 */
export const ADMIN_ROLES = ['viewer', 'moderator', 'admin'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = { viewer: 'Solo lectura', moderator: 'Moderación', admin: 'Administración' }

const RANK: Record<AdminRole, number> = { viewer: 0, moderator: 1, admin: 2 }

export function isAdminRole(v: unknown): v is AdminRole {
  return typeof v === 'string' && (ADMIN_ROLES as readonly string[]).includes(v)
}

export function roleAtLeast(role: AdminRole, min: AdminRole): boolean {
  return RANK[role] >= RANK[min]
}

export const MIN_ADMIN_PASSWORD_LENGTH = 10

export function validateAdminPassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_ADMIN_PASSWORD_LENGTH) return `La contraseña necesita al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`
  if (password.length > 200) return 'La contraseña es demasiado larga.'
  return null
}

/** `scrypt$<sal>$<hash>`, ambos en hex. */
export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyAdminPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export interface MemberInput { email: string; name: string; role: AdminRole; password: string }

export function validateMemberInput(body: unknown): { ok: true; value: MemberInput } | { ok: false; message: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { ok: false, message: 'El correo no es válido.' }
  if (name.length < 2 || name.length > 80) return { ok: false, message: 'El nombre tiene que tener entre 2 y 80 caracteres.' }
  if (!isAdminRole(b.role)) return { ok: false, message: 'Elige un rol: solo lectura, moderación o administración.' }
  const passwordError = validateAdminPassword(b.password)
  if (passwordError) return { ok: false, message: passwordError }
  return { ok: true, value: { email, name, role: b.role, password: b.password as string } }
}
