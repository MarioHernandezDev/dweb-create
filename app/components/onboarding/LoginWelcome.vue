<script setup lang="ts">
/**
 * Bienvenida al iniciar sesión, montada una vez en AppShell (igual que
 * OnboardingTour): 1) animación con el símbolo de CIBERAN (~2,6 s, se salta con
 * un clic o Escape) y 2) aviso de lanzamiento gratuito, que sale siempre salvo
 * que la persona marque «No volver a mostrar».
 */
const { pending, phase, noticeHidden, hideNoticeForever } = useLoginWelcome()
const { resolveMyProfileId } = useMyProfileId()
// Mientras el recorrido está abierto, el aviso espera (reaparece al cerrarlo) para no tener dos cosas a la vez.
const { open: tourOpen } = useOnboardingTour()

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
        v-if="phase === 'notice' && !tourOpen" class="launch-notice" role="status" aria-labelledby="launch-notice-title" data-launch-notice
      >
        <!-- Ya no es un diálogo que bloquea la pantalla: es un aviso en la esquina que se puede ignorar o cerrar. -->
        <span class="launch-notice__icon"><Icon name="ph:gift-bold" class="size-5" /></span>
        <div class="launch-notice__body">
          <h2 id="launch-notice-title" class="launch-notice__title">CIBERAN es gratis durante el lanzamiento</h2>
          <p class="launch-notice__text">
            Puedes usar toda la plataforma sin cuotas ni comisiones mientras dure. Si más adelante añadimos planes de pago, te avisaremos con tiempo y no se cobrará nada sin que lo aceptes.
          </p>
          <div class="launch-notice__foot">
            <label class="proposal__check text-[var(--text-muted)]" data-launch-notice-hide>
              <input v-model="dontShowAgain" type="checkbox">
              <span>No volver a mostrar</span>
            </label>
            <BaseButton variant="primary" size="sm" data-launch-notice-close @click="closeNotice">Entendido</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
