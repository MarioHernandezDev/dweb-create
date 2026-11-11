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
}>()
const emit = defineEmits<{ go: [task: WorkTask] }>()

const main = computed(() => props.tasks[0] ?? null)
const others = computed(() => props.tasks.slice(1))
</script>

<template>
  <section class="nextstep" :data-state="main ? 'action' : waiting ? 'waiting' : 'done'" aria-labelledby="nextstep-title" data-next-step>
    <p class="nextstep__kicker">{{ !main && !waiting && closedText ? 'Estado' : 'Siguiente paso' }}</p>
    <template v-if="main">
      <h2 id="nextstep-title" class="nextstep__title">{{ main.title }}</h2>
      <p v-if="main.detail" class="nextstep__detail">{{ main.detail }}</p>
      <div class="nextstep__foot">
        <BaseButton variant="brand" size="sm" data-next-step-cta @click="emit('go', main)">{{ main.cta }}</BaseButton>
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
