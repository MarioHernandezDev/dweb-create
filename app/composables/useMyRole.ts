import type { Role } from '~/types'

// En la base de datos el rol se llama 'influencer' (así se llama la tabla);
// en el frontend, las rutas y el tipo Role usan 'creator' (así nació la app).
// Esto traduce entre los dos mundos en el único sitio donde hace falta.
const dbRoleToAppRole: Record<string, Role> = {
  manager: 'manager',
  influencer: 'creator',
  client: 'client'
}

/**
 * El rol (manager / influencer / client) del usuario ya logueado, leído de
 * `profiles.role`. Se cachea en memoria de la pestaña (useState) para no
 * volver a consultarlo en cada cambio de ruta.
 */
export function useMyRole() {
  const role = useState<Role | null | undefined>('my-role', () => undefined)

  /**
   * `userId` es opcional: pásalo justo después de un login (desde
   * `data.user.id` que devuelve `signInWithPassword`), porque `useSupabaseUser()`
   * tarda un instante en ponerse al día — lo actualiza un listener aparte
   * (`onAuthStateChange`), no la propia llamada de login. Sin ese dato
   * explícito, justo tras iniciar sesión `user.value` todavía puede ser
   * `null` y parecería que la cuenta "no tiene rol", cuando el problema es
   * solo de sincronización, no de datos.
   */
  async function ensureRole(userId?: string) {
    if (role.value !== undefined) return role.value

    const client = useSupabaseClient()
    let id = userId ?? useSupabaseUser().value?.id
    if (!id) {
      // Ver el mismo caso en useMyInfluencer.ts: `useSupabaseUser()` puede
      // ir un paso por detrás de la sesión real justo tras cargar la
      // página o iniciar sesión. `getSession()` espera a la sesión de
      // verdad en vez de fiarse del ref reactivo.
      const { data: sessionData } = await client.auth.getSession()
      id = sessionData.session?.user.id
    }
    // No cachear `null` aquí si simplemente no había id todavía — se
    // confundiría con "esta cuenta de verdad no tiene rol" y quedaría
    // atascado el resto de la sesión de pestaña (useState no se reintenta
    // solo). Se deja `role.value` en `undefined` para poder reintentarlo.
    if (!id) return null

    // Sin tipos generados de la base de datos todavía (`supabase gen types`,
    // más adelante), así que tipamos la fila a mano en este único punto.
    const { data } = await client.from('profiles').select('role').eq('id', id).single<{ role: string }>()
    role.value = (data?.role ? dbRoleToAppRole[data.role] : undefined) ?? null
    return role.value
  }

  function reset() {
    role.value = undefined
  }

  return { role, ensureRole, reset }
}
