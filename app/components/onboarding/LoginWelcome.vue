<script setup lang="ts">
/**
 * Bienvenida al iniciar sesión, montada una vez en AppShell (igual que
 * OnboardingTour): 1) animación con el símbolo de CIBERAN (~2,6 s, se salta con
 * un clic o Escape) y 2) aviso de lanzamiento gratuito, que sale siempre salvo
 * que la persona marque «No volver a mostrar».
 */
const { pending, phase, noticeHidden, hideNoticeForever } = useLoginWelcome()
const { resolveMyProfileId } = useMyProfileId()

const INTRO_MS = 2600
const INTRO_REDUCED_MS = 900

const dontShowAgain = ref(false)
const userId = ref<string | null>(null)
// Se resuelve en paralelo a la animación; si se salta muy rápido, `afterIntro` espera a tenerlo.
let userIdReady: Promise<void> = Promise.resolve()
let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}

async function afterIntro() {
  clearTimer()
  if (phase.value !== 'intro') return
  await userIdReady
  if (phase.value !== 'intro') return
  const hidden = userId.value ? noticeHidden(userId.value) : false
  phase.value = hidden ? 'idle' : 'notice'
}

function closeNotice() {
  if (dontShowAgain.value && userId.value) hideNoticeForever(userId.value)
  phase.value = 'idle'
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (phase.value === 'intro') afterIntro()
  else if (phase.value === 'notice') closeNotice()
}

onMounted(async () => {
  if (!pending.value) return
  // Se consume al empezar: aunque se recargue o se navegue, no se repite.
  // La fase pasa a «intro» en el mismo instante, para que el recorrido no se cuele entre medias.
  pending.value = false
  phase.value = 'intro'
  document.addEventListener('keydown', onKeydown)
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  timer = setTimeout(afterIntro, reduced ? INTRO_REDUCED_MS : INTRO_MS)
  userIdReady = resolveMyProfileId().then((id) => { userId.value = id })
})

onUnmounted(() => {
  clearTimer()
  if (import.meta.client) document.removeEventListener('keydown', onKeydown)
  // Si se sale de la app con la bienvenida a medias, no deja bloqueado el recorrido.
  if (phase.value !== 'idle') phase.value = 'idle'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lw">
      <div v-if="phase === 'intro'" class="lw" role="presentation" data-login-welcome @click="afterIntro">
        <span class="lw__glow" aria-hidden="true" />
        <span class="lw__arc" aria-hidden="true" />
        <span class="lw__arc lw__arc--2" aria-hidden="true" />
        <div class="lw__stage">
          <AnimatedMark :size="176" rings />
          <p class="lw__brand">ciberan</p>
          <p class="lw__hello">Qué bien verte por aquí</p>
        </div>
        <button type="button" class="lw__skip" @click.stop="afterIntro">Saltar</button>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0"
    >
      <div
        v-if="phase === 'notice'" class="fixed inset-0 z-[92] flex items-center justify-center p-5 bg-black/55 backdrop-blur-[2px]"
        role="dialog" aria-modal="true" aria-labelledby="launch-notice-title" data-launch-notice
      >
        <div class="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] shadow-[var(--shadow-float)] p-6">
          <span class="inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-voltio-200)] text-[var(--color-tinta-950)] mb-4">
            <Icon name="ph:gift-bold" class="size-6" />
          </span>
          <h2 id="launch-notice-title" class="font-display text-[1.375rem] leading-tight text-[var(--color-text)] mb-2">
            CIBERAN es gratis durante el lanzamiento
          </h2>
          <p class="text-base text-[var(--color-text-muted)] leading-relaxed mb-3">
            Estamos empezando, y por eso puedes usar toda la plataforma sin pagar nada: sin cuotas y sin comisiones mientras dure el lanzamiento.
          </p>
          <p class="text-base text-[var(--color-text-muted)] leading-relaxed mb-5">
            Si más adelante añadimos planes de pago, te avisaremos con tiempo y no se cobrará nada sin que lo aceptes.
          </p>

          <label class="proposal__check text-[var(--text-muted)] mb-5" data-launch-notice-hide>
            <input v-model="dontShowAgain" type="checkbox">
            <span>No volver a mostrar</span>
          </label>

          <BaseButton variant="primary" size="lg" block data-launch-notice-close @click="closeNotice">Entendido</BaseButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
