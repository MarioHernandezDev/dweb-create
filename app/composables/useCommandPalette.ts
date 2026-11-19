/** Estado de la paleta de comandos (Cmd/Ctrl+K): una sola para toda la app, abierta o cerrada. */
export function useCommandPalette() {
  const open = useState<boolean>('command-palette-open', () => false)
  return { open, toggle: () => { open.value = !open.value }, show: () => { open.value = true }, hide: () => { open.value = false } }
}
