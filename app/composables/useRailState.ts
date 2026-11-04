/**
 * Estado plegado/desplegado de la columna lateral. Va en una cookie (no en
 * localStorage) para que el servidor pinte el estado correcto y no haya
 * parpadeo ni desajuste de hidratación al cargar.
 */
export function useRailState() {
  const collapsed = useCookie<boolean>('ciberan-rail-collapsed', {
    default: () => false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
  const toggle = () => { collapsed.value = !collapsed.value }
  return { collapsed, toggle }
}
