export function useLogout() {
  const supabase = useSupabaseClient()
  const { reset } = useMyRole()

  async function logout() {
    await supabase.auth.signOut()
    reset()
    await navigateTo('/login')
  }

  return { logout }
}
