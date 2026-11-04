/**
 * Número del icono «Bandeja de entrada» en la barra lateral y la inferior: las
 * tareas de «Qué me toca» (lo que hay que hacer) cuando ya están calculadas y
 * hay alguna; si no, los avisos importantes sin leer. El icono de la barra
 * superior sigue contando solo avisos.
 */
export function useInboxBadge() {
  const { unreadCount } = useNotifications()
  const taskCount = useState<number>('my-work-task-count', () => 0)
  const workLoaded = useState<boolean>('my-work-loaded', () => false)
  return computed(() => (workLoaded.value && taskCount.value > 0 ? taskCount.value : unreadCount.value))
}
