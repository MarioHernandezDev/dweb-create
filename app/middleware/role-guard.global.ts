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
  // OJO: `useSupabaseUser().value` es un ref que un listener aparte
  // (`onAuthStateChange`) rellena de forma asíncrona — en una recarga
  // normal puede que todavía no se haya enterado de la sesión cuando este
  // middleware corre (visto de verdad: vacío de forma intermitente, no
  // siempre). `getUser()` lo resuelve activamente contra Supabase en vez
  // de fiarse de ese ref, así que es fiable aunque el listener vaya tarde.
  const { data: { user } } = await useSupabaseClient().auth.getUser()
  if (!user) return

  const { ensureRole } = useMyRole()
  const myRole = await ensureRole(user.id)

  // Sesión iniciada pero sin fila en `profiles` todavía (no debería pasar
  // con el trigger de la migración, pero por si acaso no lo dejamos colgado).
  if (!myRole) return

  // Deja lista la ficha de rol (influencer/brand_client/manager) antes de
  // montar cualquier página de esa sección — así ninguna página necesita su
  // propio "cargando…" solo para saber quién es el usuario.
  if (myRole === 'creator') await useMyInfluencer().ensureInfluencer(user.id)
  else if (myRole === 'client') await useMyBrandClient().ensureBrandClient(user.id)
  else if (myRole === 'manager') await useMyManager().ensureManager(user.id)

  if (to.path === '/login') {
    return navigateTo(roleMeta[myRole].home)
  }

  const section = sectionOf(to.path)
  if (section && section !== myRole) {
    return navigateTo(roleMeta[myRole].home)
  }
})
