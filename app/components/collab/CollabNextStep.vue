<script setup lang="ts">
import type { WorkTask, WorkWaiting } from '~/utils/collaboration-work'

/**
 * «Siguiente paso» de una colaboración: la acción que me toca (si la hay), si no
 * a qué espera la otra parte, y si no, que no queda nada pendiente. Sale de
 * `collaborationWork` (la misma lógica que la bandeja «Qué me toca»).
 * Aspecto en assets/css/patterns/collab-detail.css.
 */
const props = defineProps<{
  tasks: WorkTask[]
  waiting: WorkWaiting | null
  closedText?: string
  /**
   * Tipos de tarea cuya acción ya está en pantalla justo debajo (p. ej. «Responder» con el bloque de respuesta a la
   * vista): se enseña esa indicación en vez de un segundo botón que haga lo mismo.
   */
  inlineKinds?: string[]
}>()
const emit = defineEmits<{ go: [task: WorkTask] }>()

const main = computed(() => props.tasks[0] ?? null)
const others = computed(() => props.tasks.slice(1))
const inline = computed(() => !!main.value && !!props.inlineKinds?.includes(main.value.kind))
// Quién tiene la pelota: así se distingue de un vistazo «me toca a mí» de «espera la otra parte».
const kicker = computed(() => {
  if (main.value) return 'Siguiente paso · te toca a ti'
  if (props.waiting) return `Siguiente paso · le toca a ${props.waiting.counterpartName}`
  return props.closedText ? 'Estado' : 'Siguiente paso'
})
</script>

<template>
  <section class="nextstep" :data-state="main ? 'action' : waiting ? 'waiting' : 'done'" aria-labelledby="nextstep-title" data-next-step>
    <p class="nextstep__kicker">{{ kicker }}</p>
    <template v-if="main">
      <h2 id="nextstep-title" class="nextstep__title">{{ main.title }}</h2>
      <p v-if="main.detail" class="nextstep__detail">{{ main.detail }}</p>
      <div class="nextstep__foot">
        <span v-if="inline" class="nextstep__inline" data-next-step-inline><Icon name="ph:arrow-down-bold" class="size-4" /> Lo haces justo debajo</span>
        <BaseButton v-else variant="brand" size="sm" data-next-step-cta @click="emit('go', main)">{{ main.cta }}</BaseButton>
        <span v-if="others.length" class="nextstep__more">+{{ others.length }} más pendiente{{ others.length === 1 ? '' : 's' }}</span>
      </div>
    </template>
    <template v-else-if="waiting">
      <h2 id="nextstep-title" class="nextstep__title"><Icon name="ph:hourglass-medium" class="size-5" /> {{ waiting.text }}</h2>
      <p class="nextstep__detail">No hace falta que hagas nada ahora: te avisaremos cuando cambie.</p>
    </template>
    <template v-else>
      <h2 id="nextstep-title" class="nextstep__title"><Icon name="ph:check-circle-fill" class="size-5" /> {{ closedText ?? 'No tienes nada pendiente aquí' }}</h2>
    </template>
  </section>
</template>
