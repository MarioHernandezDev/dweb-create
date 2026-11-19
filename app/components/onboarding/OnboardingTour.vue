<script setup lang="ts">
/**
 * Recorrido de bienvenida (M-O1), montado una sola vez en AppShell.vue. Ya no es un diálogo de solo texto: cada paso
 * ilumina el apartado real del menú del que habla (`data-tour` en SideRail/BottomTabBar) y coloca la explicación al
 * lado. Si el elemento no se ve (p. ej. el menú de escritorio en móvil), el paso sale centrado. Se salta en cualquier
 * paso (botón o Escape) y nunca vuelve solo una vez visto o saltado.
 */
const { open, stepIndex, steps, current, isLast, maybeAutoStart, next, back, close } = useOnboardingTour()
const { role, ensureRole } = useMyRole()
const { resolveMyProfileId } = useMyProfileId()
const router = useRouter()
const account = useAccountState()
// Solo la animación inicial le pasa por delante: el aviso de lanzamiento es una tarjeta que no bloquea.
const { pending: welcomePending, phase: welcomePhase } = useLoginWelcome()
const welcomeBlocking = computed(() => welcomePending.value || welcomePhase.value === 'intro')
const visible = computed(() => open.value && !!current.value && !welcomeBlocking.value)

const primaryBtn = ref<{ $el: HTMLElement } | null>(null)

// ---- Dónde está el elemento señalado ----
interface Box { top: number; left: number; width: number; height: number }
const box = ref<Box | null>(null)
const viewport = ref({ w: 0, h: 0 })
const PAD = 6

function findTarget(key?: string): HTMLElement | null {
  if (!key) return null
  const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)]
  return els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }) ?? null
}
function measure() {
  if (!import.meta.client) return
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
  const el = visible.value ? findTarget(current.value?.target) : null
  if (!el) { box.value = null; return }
  const r = el.getBoundingClientRect()
  box.value = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
}

// Tarjeta junto al elemento: a su derecha si cabe (menú lateral), si no encima o debajo según dónde esté.
const cardStyle = computed(() => {
  const b = box.value
  if (!b) return undefined
  const { w, h } = viewport.value
  const cw = Math.min(352, w - 32)
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))
  if (b.left + b.width + 16 + cw <= w - 16) return { width: `${cw}px`, left: `${b.left + b.width + 16}px`, top: `${clamp(b.top + b.height / 2 - 120, 16, Math.max(16, h - 340))}px` }
  const left = `${clamp(b.left + b.width / 2 - cw / 2, 16, w - cw - 16)}px`
  if (b.top > h / 2) return { width: `${cw}px`, left, bottom: `${h - b.top + 14}px` }
  return { width: `${cw}px`, left, top: `${b.top + b.height + 14}px` }
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(visible, async (isVisible) => {
  if (!import.meta.client) return
  if (isVisible) {
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    await nextTick()
    measure()
    primaryBtn.value?.$el?.focus?.()
  } else {
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', measure)
    window.removeEventListener('scroll', measure, true)
    box.value = null
  }
})
watch(stepIndex, async () => { await nextTick(); measure(); primaryBtn.value?.$el?.focus?.() })
watch(open, (isOpen) => { if (!import.meta.client) return; if (!isOpen) account.markOnboardingDone() })

onMounted(async () => {
  const [id, myRole, acc] = await Promise.all([resolveMyProfileId(), ensureRole(), account.ensureLoaded()])
  if (!id || !myRole) return
  maybeAutoStart(id, myRole, { accountRead: !!acc, completedAt: acc?.onboarding_completed_at ?? null, createdAt: acc?.created_at ?? null })
  // Se anota en la cuenta al abrirlo, no al cerrarlo: así no vuelve a salir aunque se recargue con él abierto.
  if (open.value) account.markOnboardingDone()
})

onUnmounted(() => {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', measure)
  window.removeEventListener('scroll', measure, true)
})

function goToAction() {
  const to = current.value?.action?.to
  close()
  if (to) router.push(to)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="tour">
      <div v-if="visible && current" class="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" data-onboarding-tour>
        <!-- Con elemento señalado: un foco que oscurece todo menos él. Sin él: velo suave. -->
        <span v-if="box" class="tour__spot" aria-hidden="true" :style="{ top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px` }" />
        <span v-else class="tour__veil" aria-hidden="true" />

        <div class="tour__card" :class="!box && 'tour__card--center'" :style="cardStyle">
          <div class="tour__head">
            <p class="tour__step" aria-live="polite">Paso {{ stepIndex + 1 }} de {{ steps.length }}</p>
            <button type="button" class="tour__skip" data-tour-skip @click="close">Saltar recorrido</button>
          </div>

          <span class="tour__icon"><Icon :name="current.icon" class="size-5" /></span>
          <h2 id="tour-title" class="tour__title">{{ current.title }}</h2>
          <p class="tour__body">{{ current.body }}</p>

          <div class="tour__dots" aria-hidden="true">
            <span v-for="(_, i) in steps" :key="i" :data-on="i === stepIndex" />
          </div>

          <div class="tour__actions">
            <BaseButton v-if="stepIndex > 0" variant="secondary" size="md" @click="back">Atrás</BaseButton>
            <BaseButton v-if="isLast && current.action" variant="secondary" size="md" class="flex-1" @click="close">Luego</BaseButton>
            <BaseButton v-if="isLast && current.action" ref="primaryBtn" variant="primary" size="md" class="flex-1" @click="goToAction">{{ current.action.label }}</BaseButton>
            <BaseButton v-else ref="primaryBtn" variant="primary" size="md" class="flex-1" @click="next">{{ isLast ? 'Terminar' : 'Siguiente' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
