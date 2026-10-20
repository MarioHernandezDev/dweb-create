import type { Role } from '~/types'

/**
 * El rol (creator / partner) del usuario ya logueado, leído de
 * `profiles.role` — mismo valor en la base de datos y en el frontend desde
 * que se quitó el rol manager, no hace falta traducir entre los dos mundos.
 * Se cachea en memoria de la pestaña (useState) para no volver a
 * consultarlo en cada cambio de ruta.
 */
export function useMyRole() {
  const role = useState<Role | null | undefined>('my-role', () => undefined)

  /**
   * `userId` es opcional: pásalo cuando ya lo tengas resuelto (p. ej. desde
   * `data.user.id` que devuelve `signInWithPassword`, o desde
   * `role-guard.global.ts`). Si no llega, se resuelve con `getUser()` en vez
   * de leer `useSupabaseUser().value` directamente: ese ref lo rellena un
   * listener aparte (`onAuthStateChange`) y puede ir un paso por detrás de
   * la sesión real — no solo justo tras el login, también en una recarga
   * normal cualquiera (visto de verdad, de forma intermitente).
   */
  async function ensureRole(userId?: string) {
    if (role.value !== undefined) return role.value

    const client = useSupabaseClient()
    const id = userId ?? (await client.auth.getUser()).data.user?.id
    // No cachear `null` aquí si simplemente no hay id todavía — sería
    // indistinguible de "esta cuenta de verdad no tiene rol" y, al ser
    // `useState`, quedaría atascado el resto de la sesión de pestaña (no se
    // reintenta solo). Se deja `role.value` en `undefined` para que la
    // siguiente llamada lo reintente de verdad.
    if (!id) return null

    // Sin tipos generados de la base de datos todavía (`supabase gen types`,
    // más adelante), así que tipamos la fila a mano en este único punto.
    const { data } = await client.from('profiles').select('role').eq('id', id).single<{ role: string }>()
    role.value = (data?.role as Role | undefined) ?? null
    return role.value
  }

  function reset() {
    role.value = undefined
  }

  return { role, ensureRole, reset }
}
