import { prefersReducedMotion, useGsap } from '~/composables/useGsap'

/**
 * Contador animado para las tarjetas de YouTube (A-R16f). Devuelve el texto a
 * mostrar. Reglas:
 *  - El texto FINAL es siempre el valor real ya formateado (`fallback`/`to`):
 *    en servidor, sin JavaScript, con "menos movimiento" o si algo falla, se
 *    ve directamente el valor real. La animación solo es el camino hacia él.
 *  - Al cambiar el valor (p. ej. otro periodo) cuenta desde el número que se
 *    estaba viendo, no desde 0.
 *  - Nunca retrasa la lectura del dato: `aria-label` de la tarjeta ya lleva el valor final.
 */
export function useCountUp(
  count: () => { to: number; format: (n: number) => string } | undefined,
  fallback: () => string | null
) {
  const display = ref<string | null>(fallback())
  const state = { v: 0 }
  let tween: { kill: () => void } | null = null
  let mounted = false

  function finish() {
    const c = count()
    if (c) state.v = c.to
    display.value = c ? c.format(c.to) : fallback()
  }

  function run(from: number) {
    tween?.kill()
    tween = null
    const c = count()
    if (!c) return finish()
    if (!mounted || prefersReducedMotion() || from === c.to) return finish()
    try {
      const { gsap } = useGsap()
      state.v = from
      display.value = c.format(Math.round(from))
      tween = gsap.to(state, {
        v: c.to,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: () => { display.value = c.format(Math.round(state.v)) },
        onComplete: finish
      })
    } catch {
      finish()
    }
  }

  onMounted(() => {
    mounted = true
    run(0)
  })

  watch(
    () => [count()?.to, fallback()] as const,
    () => run(state.v)
  )

  onBeforeUnmount(() => tween?.kill())

  return display
}
