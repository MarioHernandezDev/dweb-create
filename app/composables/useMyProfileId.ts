/**
 * Resuelve el id de `profiles` (= auth.users.id) del usuario logueado de
 * forma fiable. `useSupabaseUser().value` es un ref que rellena
 * `onAuthStateChange` de forma asíncrona y puede ir un paso por detrás de la
 * sesión real justo al cargar una página (ver el comentario largo en
 * role-guard.global.ts) — mismo motivo por el que useMyCreator.ts/
 * useMyPartner.ts usan `client.auth.getUser()` en vez de fiarse del ref.
 */
export function useMyProfileId() {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  async function resolveMyProfileId(): Promise<string | null> {
    return user.value?.id ?? (await client.auth.getUser()).data.user?.id ?? null
  }

  return { resolveMyProfileId }
}
