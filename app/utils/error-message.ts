/**
 * Texto de un error para mostrarlo al usuario. Los errores de Supabase (PostgrestError) son objetos
 * con `message`, no instancias de `Error`: con `e instanceof Error` se perdía el mensaje del servidor
 * (ya en castellano: «Faltan 2 entregable(s)…», «La publicación ha cambiado…») y salía el genérico.
 */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string' && (e as { message: string }).message) {
    return (e as { message: string }).message
  }
  return fallback
}
