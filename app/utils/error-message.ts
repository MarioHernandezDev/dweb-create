/**
 * Texto de un error para mostrarlo al usuario.
 *
 * - Los errores de Supabase (PostgrestError) son objetos con `message`, no instancias de `Error`: con `e instanceof Error`
 *   se perdía el mensaje del servidor (ya en castellano: «Faltan 2 entregable(s)…», «La publicación ha cambiado…»).
 * - Los mensajes técnicos de Postgres, de la red o de la sesión NO se enseñan tal cual (salían en inglés o con nombres de
 *   tablas): se traducen a algo que se pueda entender y accionar. Lo que ya es castellano de negocio pasa sin tocar.
 */
const TECHNICAL: { test: RegExp; text: string }[] = [
  { test: /row-level security|permission denied|insufficient[_ ]privilege|not authorized|forbidden/i, text: 'No tienes permiso para hacer esto ahora. Si crees que es un error, recarga la página e inténtalo de nuevo.' },
  { test: /jwt|auth session missing|not authenticated|invalid (refresh )?token|refresh token/i, text: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' },
  { test: /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|err_network|econnrefused|enotfound/i, text: 'No se ha podido conectar con CIBERAN. Revisa tu conexión e inténtalo de nuevo.' },
  { test: /duplicate key|unique constraint|already exists/i, text: 'Eso ya existe: no hace falta volver a crearlo.' },
  { test: /foreign key|violates not-null|null value in column/i, text: 'Esta acción ya no es posible porque algo ha cambiado. Recarga la página e inténtalo de nuevo.' },
  { test: /check constraint|invalid input (syntax|value)|out of range|value too long/i, text: 'Algún dato no es válido. Revísalo e inténtalo de nuevo.' },
  { test: /timeout|timed out|statement timeout|canceling statement/i, text: 'Ha tardado demasiado. Inténtalo de nuevo en un momento.' },
  { test: /too many requests|rate limit|429/i, text: 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.' },
  // Cualquier otra cosa que huela a base de datos o a código: no se enseña.
  { test: /\b(relation|column|schema|function|syntax error|pgrst|postgres|sql|undefined|is not a function|cannot read)\b/i, text: '' }
]

function raw(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') return (e as { message: string }).message
  return ''
}

export function errorMessage(e: unknown, fallback: string): string {
  const message = raw(e).trim()
  if (!message) return fallback
  for (const rule of TECHNICAL) if (rule.test.test(message)) return rule.text || fallback
  return message
}
