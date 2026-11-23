/**
 * Fortaleza de una contraseña (medidor del cambio de contraseña). Sin red ni diccionarios enormes: mide largo, variedad y
 * descarta lo evidente (contraseñas muy comunes, repeticiones, secuencias y el propio nombre o email). Es una ayuda para
 * elegir bien, no una garantía: la regla dura es solo «no es una de las más fáciles de adivinar».
 */
export type StrengthScore = 0 | 1 | 2 | 3 | 4
export interface Strength { score: StrengthScore; label: string; hint: string }

const LABELS = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'] as const

/** Las más usadas (en español e inglés). Se compara sin mayúsculas y sin los dígitos o símbolos del final. */
export const COMMON_PASSWORDS = new Set([
  'password', 'contrasena', 'contraseña', 'qwerty', 'qwertyuiop', 'abcdefgh', 'abcd1234', 'letmein', 'welcome', 'iloveyou',
  'admin', 'administrador', 'passw0rd', 'p4ssword', 'changeme', 'secreto', 'ciberan', 'creador', 'partner', 'marca',
  'futbol', 'barcelona', 'realmadrid', 'princesa', 'dragon', 'monkey', 'football', 'baseball', 'master', 'shadow', 'sunshine',
  '12345678', '123456789', '1234567890', '11111111', '00000000', '87654321', '123123123', 'asdfghjkl', 'zxcvbnm', 'usuario',
  'hola1234', 'holamundo', 'hello123', 'test1234', 'prueba', 'alex1234'
])

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** ¿Gran parte de la contraseña es una escalera de caracteres seguidos («123456», «abcdef», «987654»)? */
function isSequence(s: string): boolean {
  const lower = s.toLowerCase()
  let best = 1
  let run = 1
  let dir = 0
  for (let i = 1; i < lower.length; i++) {
    const d = lower.charCodeAt(i) - lower.charCodeAt(i - 1)
    if ((d === 1 || d === -1) && (dir === 0 || dir === d)) { run++; dir = d } else { run = d === 1 || d === -1 ? 2 : 1; dir = d === 1 || d === -1 ? d : 0 }
    best = Math.max(best, run)
  }
  return best >= 6 && best * 2 >= lower.length
}

/** `hints`: datos propios que no deberían formar parte de la contraseña (nombre, parte local del email…). */
export function passwordStrength(password: string, hints: string[] = []): Strength {
  const make = (score: StrengthScore, hint: string): Strength => ({ score, label: LABELS[score], hint })
  if (!password) return make(0, 'Escribe una contraseña.')
  const n = norm(password)
  const core = n.replace(/[^a-z]+$/g, '') // «password123!» → «password»
  if (COMMON_PASSWORDS.has(n) || COMMON_PASSWORDS.has(core)) return make(0, 'Es de las contraseñas más usadas: cualquiera la probaría primero.')
  if (new Set(n).size < 4) return make(0, 'Repite muy pocos caracteres.')
  if (password.length < 8) return make(0, 'Usa al menos 8 caracteres.')

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length
  let score: StrengthScore = 1
  if (password.length >= 10 && classes >= 2) score = 2
  if (password.length >= 12 && classes >= 3) score = 3
  if ((password.length >= 14 && classes >= 3) || password.length >= 18) score = 4

  const personal = hints.map(norm).filter((h) => h.length >= 4).find((h) => n.includes(h))
  if (personal) return make(Math.min(score, 1) as StrengthScore, 'Contiene tu nombre o tu email: es lo primero que probaría alguien que te conozca.')
  if (isSequence(password)) return make(Math.min(score, 1) as StrengthScore, 'Es una secuencia fácil de adivinar.')

  const hint = score >= 3 ? 'Muy bien: es larga y variada.' : password.length < 12 ? 'Alárgala (12 caracteres o más) y mezcla mayúsculas, números o símbolos.' : 'Mezcla mayúsculas, números o símbolos para reforzarla.'
  return make(score, hint)
}
