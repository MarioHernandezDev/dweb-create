export function useLogout() {
  const supabase = useSupabaseClient()

  async function logout() {
    await supabase.auth.signOut()
    resetAccountCaches()
    await navigateTo('/login')
  }

  return { logout }
}
