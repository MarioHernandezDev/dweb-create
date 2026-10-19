export type ThemeMode = 'dark' | 'light'

export function useTheme() {
  const theme = useState<ThemeMode>('dwc-theme', () => 'dark')

  function apply(mode: ThemeMode) {
    theme.value = mode
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', mode)
      try {
        localStorage.setItem('dwc-theme', mode)
      } catch {
        // almacenamiento no disponible (modo privado); el tema solo dura la sesión
      }
    }
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  function syncFromDom() {
    if (import.meta.client) {
      const current = document.documentElement.getAttribute('data-theme') as ThemeMode | null
      if (current) theme.value = current
    }
  }

  return { theme, apply, toggle, syncFromDom }
}
