import { useGsap, prefersReducedMotion } from '~/composables/useGsap'

/**
 * Tratamiento por defecto para secciones que NO son el momento fuerte de la
 * página (ese vive en LandingFilmstrip/LandingCta, con su propia animación a
 * medida): entrada discreta en bloque al entrar en viewport, sin rebote.
 * Deliberadamente el mismo para toda la landing — la variedad vive en el
 * contenido, no en una animación distinta por sección.
 */
export function useScrollReveal() {
  function reveal(targets: Element[] | NodeListOf<Element>, opts: { stagger?: number; y?: number } = {}) {
    const els = Array.from(targets)
    if (!els.length) return

    if (prefersReducedMotion()) {
      els.forEach((el) => ((el as HTMLElement).style.opacity = '1'))
      return
    }

    const { gsap, ScrollTrigger } = useGsap()
    gsap.set(els, { opacity: 0, y: opts.y ?? 22 })
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      stagger: opts.stagger ?? 0.08,
      scrollTrigger: {
        trigger: els[0],
        start: 'top 85%',
        once: true
      }
    })
  }

  return { reveal }
}
