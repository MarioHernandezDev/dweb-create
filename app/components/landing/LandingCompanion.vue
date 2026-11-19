<script setup lang="ts">
/**
 * Raya te acompaña por la portada.
 *
 * - Nada a tu lado mientras haces scroll: serpentea de izquierda a derecha según avanzas, se queda un poco rezagada
 *   (te «sigue») y gira la cabeza hacia donde vas (hacia abajo si bajas, hacia arriba si subes).
 * - Reacciona a cada sección (`data-companion` en la sección: `data-companion-mood`, `data-companion-tone`,
 *   `data-companion-say`): cambia de ánimo y dice una frase corta.
 * - Los ojos siguen al cursor; con un clic da una voltereta y suelta una frase.
 * - Es decorativa (`aria-hidden`, sin foco): no añade ni quita contenido. Con movimiento reducido no se mueve ni te
 *   sigue: queda fija en la esquina y solo cambia de frase. Solo se monta en el navegador.
 */
type Mood = 'swim' | 'happy' | 'wow' | 'sleepy'

const POKES = ['¡Eh, cosquillas!', 'Yo me quedo por aquí.', 'Pregúntame lo que quieras… bueno, no, soy una raya.', 'Sigue bajando, que hay más.', 'Glub.']
const MARGIN = 14

const root = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)
const mood = ref<Mood>('swim')
const tone = ref<'ink' | 'light'>('ink')
const say = ref('')
const bubbleOn = ref(false)
const look = reactive({ x: 0, y: 0 })
const spinning = ref(false)
const docked = ref(false)
const size = ref(92)
const bubbleSide = ref<'left' | 'top'>('left')
// Posición del globo respecto al origen del contenedor (esquina superior izquierda de la raya; en reposo, esquina inferior
// derecha de la pantalla). A la izquierda de la raya en pantallas anchas; encima de ella en móvil y en modo fijo.
const bubbleStyle = computed(() => {
  if (docked.value) return { right: '0px', bottom: `${Math.round(size.value * 0.86) + 10}px` }
  if (bubbleSide.value === 'left') return { right: '8px', top: `${Math.round(size.value * 0.18)}px` }
  return { right: `${-size.value}px`, bottom: '8px' }
})

// Estado de movimiento (no reactivo: se escribe cada fotograma).
let x = 0
let y = 0
let angle = 0
let targetAngle = 0
let velocity = 0
let lastScroll = 0
let lastTime = 0
let raf = 0
let pointer: { x: number; y: number } | null = null
let bubbleTimer: ReturnType<typeof setTimeout> | null = null
let moodTimer: ReturnType<typeof setTimeout> | null = null
let sectionMood: Mood = 'swim'
let observer: IntersectionObserver | null = null
let pokeIndex = 0

const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function showBubble(text: string, ms = 4600) {
  say.value = text
  bubbleOn.value = true
  if (bubbleTimer) clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => { bubbleOn.value = false }, ms)
}

function shortestDiff(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180
}

function layout() {
  const w = window.innerWidth
  size.value = w < 640 ? 62 : w < 1024 ? 78 : 92
  bubbleSide.value = w < 640 ? 'top' : 'left'
}

function frame(time: number) {
  const dt = Math.min(48, time - (lastTime || time))
  lastTime = time
  const vw = window.innerWidth
  const vh = window.innerHeight
  const scroll = window.scrollY
  const delta = scroll - lastScroll
  lastScroll = scroll

  // Velocidad suavizada del scroll (px por fotograma de 16 ms): mide hacia dónde y con qué prisa vas.
  velocity += ((delta * 16) / Math.max(dt, 1) - velocity) * 0.18

  // Serpentea de lado a lado según el recorrido y se queda rezagada respecto a ti.
  const amp = vw >= 1024 ? 96 : vw >= 640 ? 44 : 10
  const baseX = vw - size.value - MARGIN
  const targetX = baseX - amp + Math.sin(scroll / 240) * amp
  const baseY = vh * 0.76 - size.value / 2
  const lag = Math.max(-130, Math.min(130, -velocity * 11))
  const targetY = baseY + lag

  const prevX = x
  x += (targetX - x) * 0.07
  y += (targetY - y) * 0.085

  // Gira la cabeza hacia donde vas (cabeza abajo si bajas) y se inclina al cambiar de lado.
  if (Math.abs(velocity) > 0.6) targetAngle = velocity > 0 ? 180 : 0
  const tilt = Math.max(-18, Math.min(18, (x - prevX) * 5))
  const wanted = targetAngle + tilt + Math.sin(time / 900) * 3
  angle += shortestDiff(angle, wanted) * 0.09

  if (root.value) root.value.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  if (body.value) body.value.style.transform = `rotate(${angle.toFixed(1)}deg)`

  // Ojos: hacia el cursor (si lo hay) o hacia donde nada; en el sistema de la propia raya.
  let lx = 0
  let ly = velocity > 0.6 ? 0.9 : velocity < -0.6 ? -0.9 : 0
  if (pointer) {
    const cx = x + size.value / 2
    const cy = y + size.value * 0.43
    const dx = pointer.x - cx
    const dy = pointer.y - cy
    const dist = Math.hypot(dx, dy) || 1
    const rad = (-angle * Math.PI) / 180
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad)
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad)
    const k = Math.min(1, dist / 240)
    lx = (rx / dist) * k
    ly = (ry / dist) * k
  }
  look.x = lx
  look.y = ly

  const settling = Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2 || Math.abs(shortestDiff(angle, wanted)) > 0.25 || Math.abs(velocity) > 0.05
  raf = settling ? requestAnimationFrame(frame) : 0
}

function kick() {
  if (docked.value || raf) return
  lastTime = 0
  raf = requestAnimationFrame(frame)
}

function onPointer(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  pointer = { x: e.clientX, y: e.clientY }
  kick()
}

function applyMood(m: Mood, hold = 0) {
  if (moodTimer) { clearTimeout(moodTimer); moodTimer = null }
  mood.value = m
  if (hold) moodTimer = setTimeout(() => { mood.value = sectionMood }, hold)
}

function poke() {
  spinning.value = false
  requestAnimationFrame(() => { spinning.value = true })
  setTimeout(() => { spinning.value = false }, 850)
  applyMood('happy', 1800)
  showBubble(POKES[pokeIndex++ % POKES.length]!, 3200)
}

function observeSections() {
  const sections = document.querySelectorAll<HTMLElement>('[data-companion]')
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const el = entry.target as HTMLElement
      sectionMood = (el.dataset.companionMood as Mood) || 'swim'
      tone.value = el.dataset.companionTone === 'dark' ? 'light' : 'ink'
      applyMood(sectionMood)
      if (el.dataset.companionSay) showBubble(el.dataset.companionSay)
    }
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 })
  sections.forEach((s) => observer!.observe(s))
}

onMounted(() => {
  layout()
  docked.value = prefersReduced()
  lastScroll = window.scrollY
  x = window.innerWidth - size.value - MARGIN
  y = window.innerHeight * 0.76 - size.value / 2
  if (!docked.value) {
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    kick()
  }
  window.addEventListener('resize', layout, { passive: true })
  observeSections()
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  if (bubbleTimer) clearTimeout(bubbleTimer)
  if (moodTimer) clearTimeout(moodTimer)
  observer?.disconnect()
  window.removeEventListener('scroll', kick)
  window.removeEventListener('pointermove', onPointer)
  window.removeEventListener('resize', layout)
})
</script>

<template>
  <ClientOnly>
    <div ref="root" class="ray-companion" :class="docked && 'ray-companion--docked'" aria-hidden="true" data-ray-companion>
      <div
        class="ray-companion__bubble" :class="[bubbleOn && 'is-on', tone === 'light' && 'ray-companion__bubble--on-dark']"
        :style="bubbleStyle"
      >{{ say }}</div>
      <div ref="body" class="ray-companion__body" :class="spinning && 'is-spin'" @click="poke">
        <RayMascot :size="size" :mood="mood" :tone="tone" :look="look" />
      </div>
    </div>
  </ClientOnly>
</template>
