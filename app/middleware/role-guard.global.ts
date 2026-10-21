import { roleMeta } from '~/utils/nav'
import type { Role } from '~/types'

const roleSections: Role[] = ['creator', 'partner']

function sectionOf(path: string): Role | null {
  return roleSections.find((r) => path === `/${r}` || path.startsWith(`/${r}/`)) ?? null
}

/**
 * Control de acceso por rol. `@nuxtjs/supabase` ya se encarga de exigir
 * sesión iniciada (ver `redirectOptions` en nuxt.config.ts); esto añade la
 * segunda capa: una cuenta de un rol no puede entrar en la sección de otro
 * rol, aunque esté logueada. Si alguien con rol "partner" visita /creator,
 * lo mandamos a /partner, no le dejamos ver nada de ahí.
 */
// Cuánto nos fiamos de la última verificación de `getUser()` antes de
// repetirla. Ver el comentario dentro del middleware para el razonamiento
// completo de por qué esto no reabre el bug de sesión de las entradas (4)
// y (5) del CHANGELOG.
const USER_CACHE_TTL_MS = 30_000

export default defineNuxtRouteMiddleware(async (to) => {
  // OJO: `useSupabaseUser().value` es un ref que un listener aparte
  // (`onAuthStateChange`) rellena de forma asíncrona — en una recarga
  // normal puede que todavía no se haya enterado de la sesión cuando este
  // middleware corre (visto de verdad: vacío de forma intermitente, no
  // siempre). `getUser()` lo resuelve activamente contra Supabase en vez
  // de fiarse de ese ref, así que es fiable aunque el listener vaya tarde.
  //
  // Pero este middleware corre en CADA navegación dentro de la app, y
  // `getUser()` sale a red cada vez (~300-450ms contra el proyecto real,
  // medido; hasta 1.6s si el proyecto llevaba un rato inactivo) — eso es
  // lo que hacía sentir la app lenta al navegar, no un problema de
  // render. La solución no es volver al ref (eso fue exactamente el bug
  // original): es cachear el resultado YA VERIFICADO contra servidor
  // durante una ventana corta, para no repetir la llamada en cada clic.
  // Una recarga completa de página siempre arranca con la caché vacía, así
  // que el caso que de verdad arregló el bug (sesión recién creada, ref
  // todavía no actualizado) sigue yendo siempre por la red, sin cambios.
  const cachedUser = useState<{ id: string } | null>('role-guard-user-cache', () => null)
  const cachedAt = useState<number>('role-guard-user-cache-at', () => 0)

  let user = cachedUser.value
  if (!user || Date.now() - cachedAt.value > USER_CACHE_TTL_MS) {
    const { data } = await useSupabaseClient().auth.getUser()
    user = data.user
    cachedUser.value = user
    cachedAt.value = Date.now()
  }
  if (!user) return

  const { ensureRole } = useMyRole()
  const myRole = await ensureRole(user.id)

  // Sesión iniciada pero sin fila en `profiles` todavía (no debería pasar
  // con el trigger de la migración, pero por si acaso no lo dejamos colgado).
  if (!myRole) return

  // Deja lista la ficha de rol (creator/partner) y la foto de perfil de la
  // cuenta antes de montar cualquier página — así TopBar.vue/SideRail.vue la
  // leen ya en caché, sin parpadeo, y ninguna página necesita su propio
  // "cargando…" solo para saber quién es el usuario. Las dos son
  // independientes entre sí, en paralelo.
  await Promise.all([
    myRole === 'creator' ? useMyCreator().ensureCreator(user.id) : useMyPartner().ensurePartner(user.id),
    useMyAvatar().ensureAvatar(user.id)
  ])

  if (to.path === '/login') {
    return navigateTo(roleMeta[myRole].home)
  }

  const section = sectionOf(to.path)
  if (section && section !== myRole) {
    return navigateTo(roleMeta[myRole].home)
  }
})
