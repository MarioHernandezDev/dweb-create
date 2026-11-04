<script setup lang="ts">
import { gsap } from 'gsap'
import type { DiscoveryResult } from '~/composables/useDiscover'
import { prefersReducedMotion } from '~/composables/useGsap'

/**
 * Resultados de Descubrir como carrusel infinito con GSAP, adaptado del pen
 * de GreenSock (codepen.md): las tarjetas cruzan el escenario de derecha a
 * izquierda, entran escalando desde cero y vuelven a desaparecer; al llegar al
 * final dan la vuelta sin saltos.
 *
 * Diferencias con el pen, a propósito:
 *  - NO fija la página ni la mueve con el scroll (ScrollTrigger + pin): dentro
 *    de la app, el scroll tiene que seguir siendo de la página. Se maneja con
 *    los botones, las flechas del teclado, arrastrando (ratón o dedo) y
 *    deslizando en horizontal en el panel táctil.
 *  - Las tarjetas son las reales de Descubrir (enlace, guardar, contactar).
 *  - Con pocos resultados la separación crece (`spacing`), porque una misma
 *    tarjeta no puede estar en dos sitios a la vez: cada una necesita al menos
 *    1 s de recorrido libre (items × spacing ≥ 1).
 * Aspecto en assets/css/patterns/discover.css (.dcar).
 */
const props = defineProps<{
  results: DiscoveryResult[]
  kind: 'creator' | 'partner'
  ctaLabel: string
  pendingIds: string[]
  showScore: boolean
}>()
const emit = defineEmits<{ contact: [result: DiscoveryResult] }>()

const stage = ref<HTMLElement | null>(null)
const ids = computed(() => props.results.map((r) => r.id).join(','))

let ctx: gsap.Context | null = null
let seamlessLoop: gsap.core.Timeline | null = null
let scrub: gsap.core.Tween | null = null
let spacing = 0.1
let snap: (n: number) => number = (n) => n

function buildSeamlessLoop(items: HTMLElement[], gap: number) {
  const overlap = Math.ceil(1 / gap) // animaciones EXTRA a cada lado para que el bucle no se vea
  const startTime = items.length * gap + 0.5
  const loopTime = (items.length + overlap) * gap + 1
  const rawSequence = gsap.timeline({ paused: true }) // aquí viven las animaciones «reales»
  const loop = gsap.timeline({ paused: true, repeat: -1 }) // solo mueve el cabezal de rawSequence
  const total = items.length + overlap * 2

  gsap.set(items, { xPercent: 400, autoAlpha: 0, scale: 0 })

  for (let i = 0; i < total; i++) {
    const item = items[i % items.length]!
    const time = i * gap
    rawSequence
      .fromTo(item, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: 'power1.in', immediateRender: false }, time)
      .fromTo(item, { xPercent: 400 }, { xPercent: -400, duration: 1, ease: 'none', immediateRender: false }, time)
  }

  rawSequence.time(startTime)
  loop
    .to(rawSequence, { time: loopTime, duration: loopTime - startTime, ease: 'none' })
    .fromTo(rawSequence, { time: overlap * gap + 1 }, { time: startTime, duration: startTime - (overlap * gap + 1), immediateRender: false, ease: 'none' })
  return loop
}

function build() {
  teardown()
  const el = stage.value
  if (!el) return
  const items = gsap.utils.toArray<HTMLElement>(el.querySelectorAll('.dcar__item'))
  if (!items.length) return
  spacing = Math.max(0.1, 1 / items.length)
  snap = gsap.utils.snap(spacing)
  ctx = gsap.context(() => {
    seamlessLoop = buildSeamlessLoop(items, spacing)
    // Margen de recorrido hacia atrás: un bucle infinito no admite tiempos negativos.
    seamlessLoop.totalTime(seamlessLoop.duration() * 10)
    scrub = gsap.to(seamlessLoop, { totalTime: seamlessLoop.totalTime(), duration: 0.6, ease: 'power3', paused: true })
  }, el)
}

function teardown() {
  ctx?.revert()
  ctx = null
  seamlessLoop = null
  scrub = null
}

function step(direction: 1 | -1) {
  if (!seamlessLoop || !scrub) return
  const duration = seamlessLoop.duration()
  let target = snap((scrub.vars.totalTime as number) + direction * spacing)
  if (target < duration) { // se acerca al principio: salta 10 vueltas adelante (el bucle es idéntico)
    target += duration * 10
    seamlessLoop.totalTime(seamlessLoop.totalTime() + duration * 10)
    scrub.pause()
  }
  scrub.vars.totalTime = target
  scrub.invalidate().restart()
}

// ---- Entrada: flechas, arrastre y panel táctil ------------------------------
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') { step(1); e.preventDefault() }
  else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault() }
}

// Arrastrar con ratón o dedo. Antes, con ratón no funcionaba: al pulsar sobre la
// foto o el nombre (un enlace) el navegador empezaba a arrastrar la imagen como
// un archivo y cancelaba el gesto (`pointercancel`), así que nunca llegaba el
// «soltar». Ahora se bloquea ese arrastre nativo (`dragstart`) y se captura el
// puntero. Un arrastre que termina sobre un enlace no lo abre (`suppressClick`).
const DRAG_THRESHOLD = 50
let dragX: number | null = null
let suppressClick = false
function onDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragX = e.clientX
  suppressClick = false
}
function onMove(e: PointerEvent) {
  if (dragX === null || suppressClick) return
  if (Math.abs(e.clientX - dragX) > 8) {
    suppressClick = true
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
}
function onUp(e: PointerEvent) {
  if (dragX === null) return
  const dx = e.clientX - dragX
  dragX = null
  if (Math.abs(dx) > DRAG_THRESHOLD) step(dx < 0 ? 1 : -1)
}
function onClickCapture(e: MouseEvent) {
  if (!suppressClick) return
  suppressClick = false
  e.preventDefault()
  e.stopPropagation()
}

// Panel táctil (deslizar en horizontal) y Mayús + rueda. La rueda vertical normal
// sigue desplazando la página: aquí no se fija el scroll, a diferencia del pen.
let wheelLock = 0
function onWheel(e: WheelEvent) {
  const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
  if (Math.abs(dx) < 12) return
  e.preventDefault()
  const now = Date.now()
  if (now < wheelLock) return
  wheelLock = now + 420
  step(dx > 0 ? 1 : -1)
}

onMounted(() => {
  if (prefersReducedMotion()) return
  build()
  watch(ids, async () => { await nextTick(); build() })
})
onBeforeUnmount(teardown)
</script>

<template>
  <section class="dcar" aria-roledescription="carrusel" aria-label="Resultados" tabindex="0" @keydown="onKey">
    <div
      ref="stage" class="dcar__stage"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="dragX = null"
      @dragstart.prevent @click.capture="onClickCapture" @wheel="onWheel"
    >
      <div v-for="(r, i) in results" :key="r.id" class="dcar__item">
        <DiscoveryCard
          :result="r" :kind="kind" :cta-label="ctaLabel" :show-score="showScore" :priority="i < 3"
          :is-pending="pendingIds.includes(r.id)" @contact="emit('contact', r)"
        />
      </div>
    </div>
    <div class="dcar__actions">
      <IconButton icon="ph:arrow-left-bold" label="Anterior" variant="outline" @click="step(-1)" />
      <IconButton icon="ph:arrow-right-bold" label="Siguiente" variant="outline" @click="step(1)" />
    </div>
  </section>
</template>
