<script setup lang="ts">
import { gsap } from 'gsap'
import { useResizeObserver } from '@vueuse/core'
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
 *  - Hay una tarjeta protagonista (la del centro, a tamaño real y la única con
 *    la que se interactúa); las vecinas quedan más pequeñas y atenuadas, y al
 *    pulsarlas pasan al centro. Un contador dice por cuál vas.
 *  - La altura no es fija: se mide la tarjeta más alta y todas la igualan, para
 *    que no queden tarjetas con media página en blanco.
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
/** Tarjeta que está (o va a quedar) en el centro. */
const activeIndex = ref(0)
/** Altura de la tarjeta más alta, en px (0 = aún sin medir). */
const cardHeight = ref(0)

let ctx: gsap.Context | null = null
let seamlessLoop: gsap.core.Timeline | null = null
let scrub: gsap.core.Tween | null = null
let spacing = 0.1
let snap: (n: number) => number = (n) => n

function buildSeamlessLoop(items: HTMLElement[], gap: number) {
  const count = items.length
  const overlap = Math.ceil(1 / gap) // animaciones EXTRA a cada lado para que el bucle no se vea
  const rawSequence = gsap.timeline({ paused: true }) // aquí viven las animaciones «reales»
  const total = count + overlap * 2

  // Recorrido horizontal: se calcula para que dos tarjetas vecinas queden siempre a
  // un ancho de distancia (con pocos resultados, recorrido corto; con muchos, largo).
  // Como las vecinas están reducidas, queda un hueco entre ellas sin que se monten.
  const reach = Math.round(50 / gap)
  gsap.set(items, { xPercent: reach, autoAlpha: 0, scale: 0.6 })

  for (let i = 0; i < total; i++) {
    // Desplazado `overlap` puestos para que al empezar el bucle esté centrada la tarjeta 0.
    const item = items[(((i - overlap) % count) + count) % count]!
    const time = i * gap
    rawSequence
      .fromTo(item, { scale: 0.6 }, { scale: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.in', immediateRender: false }, time)
      .fromTo(item, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, yoyo: true, repeat: 1, ease: 'power1.in', immediateRender: false }, time)
      .fromTo(item, { xPercent: reach }, { xPercent: -reach, duration: 1, ease: 'none', immediateRender: false }, time)
  }

  // El bucle recorre exactamente una vuelta (count × gap) de la secuencia: empieza con la
  // animación nº `overlap` en su punto medio (tarjeta 0 centrada) y termina, una vuelta
  // después, en un estado idéntico. Antes la ventana medía `overlap × gap + 0,5`, que solo
  // coincide con una vuelta a partir de 15 resultados: con menos, al dar la vuelta saltaba
  // de tarjeta.
  const start = overlap * gap + 0.5
  const lap = count * gap
  rawSequence.time(start)
  return gsap.timeline({ paused: true, repeat: -1 })
    .fromTo(rawSequence, { time: start }, { time: start + lap, duration: lap, ease: 'none', immediateRender: false })
}

// Todas las tarjetas igualan a la más alta. Se mide con la altura mínima a cero
// para obtener la natural de cada una (si no, la medida anterior se perpetúa).
async function measure() {
  const el = stage.value
  if (!el) return
  cardHeight.value = 0
  await nextTick()
  let max = 0
  for (const card of el.querySelectorAll<HTMLElement>('.dcar__item > .dcard')) max = Math.max(max, card.offsetHeight)
  cardHeight.value = max
}

function build() {
  teardown()
  const el = stage.value
  if (!el) return
  const items = gsap.utils.toArray<HTMLElement>(el.querySelectorAll('.dcar__item'))
  if (!items.length) return
  activeIndex.value = 0
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
  // Cada paso avanza una tarjeta y una vuelta completa dura items × spacing.
  const count = props.results.length
  activeIndex.value = ((Math.round(target / spacing) % count) + count) % count
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
// Las vecinas están inertes: un clic sobre ellas llega al escenario y las trae al centro.
function onStageClick(e: MouseEvent) {
  const el = stage.value
  if (!el || (e.target as HTMLElement).closest('.dcar__item')) return
  const box = el.getBoundingClientRect()
  step(e.clientX > box.left + box.width / 2 ? 1 : -1)
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

// El ancho de la tarjeta depende del de la pantalla: si cambia, se vuelve a medir la altura.
let lastWidth = 0
useResizeObserver(stage, ([entry]) => {
  const width = Math.round(entry?.contentRect.width ?? 0)
  if (!width || width === lastWidth) return
  lastWidth = width
  measure()
})

onMounted(async () => {
  if (prefersReducedMotion()) return
  await measure()
  build()
  watch(ids, async () => { await nextTick(); await measure(); build() })
})
onBeforeUnmount(teardown)
</script>

<template>
  <section class="dcar" aria-roledescription="carrusel" aria-label="Resultados" tabindex="0" @keydown="onKey">
    <div
      ref="stage" class="dcar__stage" :style="{ '--dcar-h': `${cardHeight}px` }"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="dragX = null"
      @dragstart.prevent @click.capture="onClickCapture" @click="onStageClick" @wheel="onWheel"
    >
      <div
        v-for="(r, i) in results" :key="r.id" class="dcar__item" :class="i === activeIndex && 'is-active'"
        :inert="i !== activeIndex" :aria-hidden="i !== activeIndex ? 'true' : undefined"
      >
        <DiscoveryCard
          :result="r" :kind="kind" :cta-label="ctaLabel" :show-score="showScore" :priority="i < 3"
          :is-pending="pendingIds.includes(r.id)" @contact="emit('contact', r)"
        />
      </div>
    </div>
    <div class="dcar__actions">
      <IconButton icon="ph:arrow-left-bold" label="Anterior" variant="outline" @click="step(-1)" />
      <p class="dcar__count" aria-live="polite"><strong>{{ activeIndex + 1 }}</strong> de {{ results.length }}</p>
      <IconButton icon="ph:arrow-right-bold" label="Siguiente" variant="outline" @click="step(1)" />
    </div>
  </section>
</template>
