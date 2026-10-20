import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/**
 * Punto único de acceso a GSAP + ScrollTrigger. Solo se usa desde
 * `onMounted` (nunca corre en servidor), así que registrar el plugin aquí
 * — una vez, protegido por el flag de módulo — es seguro.
 */
export function useGsap() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return { gsap, ScrollTrigger }
}

/** El usuario pidió menos movimiento: las secciones deben acabar en su estado final, sin animar. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
