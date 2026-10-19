import { roleMeta } from '~/utils/nav'
import type { Role } from '~/types'

const roleSections: Role[] = ['manager', 'creator', 'client']

function sectionOf(path: string): Role | null {
  return roleSections.find((r) => path === `/${r}` || path.startsWith(`/${r}/`)) ?? null
}

/**
 * Control de acceso por rol. `@nuxtjs/supabase` ya se encarga de exigir
 * sesión iniciada (ver `redirectOptions` en nuxt.config.ts); esto añade la
 * segunda capa: una cuenta de un rol no puede entrar en la sección de otro
 * rol, aunque esté logueada. Si alguien con rol "cliente" visita /manager,
 * lo mandamos a /client, no le dejamos ver nada de ahí.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) return

  const { ensureRole } = useMyRole()
  const myRole = await ensureRole()

  // Sesión iniciada pero sin fila en `profiles` todavía (no debería pasar
  // con el trigger de la migración, pero por si acaso no lo dejamos colgado).
  if (!myRole) return

  if (to.path === '/login') {
    return navigateTo(roleMeta[myRole].home)
  }

  const section = sectionOf(to.path)
  if (section && section !== myRole) {
    return navigateTo(roleMeta[myRole].home)
  }
})
