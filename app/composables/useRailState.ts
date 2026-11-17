/**
 * Estado de la columna lateral. Tres valores:
 *  - `auto` (por defecto): desplegada en pantallas anchas y plegada (solo iconos) en tablet,
 *    donde una columna de 16 rem se comía un tercio del contenido. Lo decide el CSS
 *    (patterns/shell.css), así no hay parpadeo ni desajuste de hidratación.
 *  - `open` / `collapsed`: la persona ha elegido con el botón de plegar; manda su elección.
 * Va en una cookie (no en localStorage) para que el servidor pinte el estado correcto.
 */
export type RailPref = 'auto' | 'open' | 'collapsed'

export function useRailState() {
  const pref = useCookie<RailPref>('ciberan-rail', {
    default: () => 'auto',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })

  // ¿Se ve plegada ahora mismo? En `auto` depende del ancho (mismo corte que shell.css).
  function effectivelyCollapsed() {
    if (pref.value === 'collapsed') return true
    if (pref.value === 'open') return false
    return import.meta.client ? window.matchMedia('(width >= 48rem) and (width < 72rem)').matches : false
  }
  const toggle = () => { pref.value = effectivelyCollapsed() ? 'open' : 'collapsed' }

  return { pref, toggle }
}
