<script setup lang="ts">
import { statusMeta } from '~/utils/status'
import type { PostStatus } from '~/types'

/** Recorrido de una publicación por sus fases: lo hecho, la actual y lo que falta. En móvil solo se nombra la actual. */
const props = defineProps<{ flow: PostStatus[]; status: PostStatus }>()
const idx = computed(() => props.flow.indexOf(props.status))
const state = (i: number, s: PostStatus) => (i < idx.value || (i === idx.value && s === 'published') ? 'done' : i === idx.value ? 'current' : 'todo')
</script>

<template>
  <div>
    <ol class="pstep" :style="{ '--pstep-count': flow.length }" aria-label="Fases de la publicación">
      <li v-for="(s, i) in flow" :key="s" class="pstep__item" :data-state="state(i, s)" :aria-current="i === idx ? 'step' : undefined">
        <span class="pstep__bar" />
        <span class="pstep__label">
          <Icon :name="state(i, s) === 'done' ? 'ph:check-circle-fill' : state(i, s) === 'current' ? 'ph:circle-half-fill' : 'ph:circle'" class="size-4" />
          {{ statusMeta[s].label }}
        </span>
      </li>
    </ol>
    <p class="pstep__now mt-2">Paso {{ idx + 1 }} de {{ flow.length }} · <strong>{{ statusMeta[status].label }}</strong></p>
  </div>
</template>
