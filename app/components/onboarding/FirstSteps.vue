<script setup lang="ts">
/**
 * «Primeros pasos» en la pantalla de inicio: sustituye al recorrido modal que se abría solo (un diálogo de texto que no
 * señalaba nada de la interfaz). Cada paso sale de datos reales de la cuenta (ficha, paquetes, solicitudes,
 * publicaciones), enlaza a donde se hace y se marca solo al cumplirse. Desaparece al completarlo todo o al ocultarlo;
 * el recorrido de texto sigue disponible a mano desde Perfil → «Ver el recorrido de bienvenida».
 */
export interface FirstStep { label: string; hint: string; done: boolean; to: string }

const props = defineProps<{ steps: FirstStep[]; role: 'creator' | 'partner' }>()

// Cookie (y no localStorage) para que el servidor ya pinte el estado correcto, sin parpadeo.
const hidden = useCookie<boolean>(`ciberan-firststeps-${props.role}`, { default: () => false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
const doneCount = computed(() => props.steps.filter((s) => s.done).length)
const nextIndex = computed(() => props.steps.findIndex((s) => !s.done))
const visible = computed(() => !hidden.value && props.steps.length > 0 && doneCount.value < props.steps.length)
</script>

<template>
  <BaseCard v-if="visible" tone="overlay" radius="lg" data-first-steps>
    <div class="fsteps__head">
      <div class="fsteps__title">
        <RayMascot :size="46" :mood="doneCount === 0 ? 'swim' : 'happy'" />
        <SectionTitle title="Primeros pasos" as="h2" />
      </div>
      <button type="button" class="fsteps__hide" data-first-steps-hide @click="hidden = true">Ocultar</button>
    </div>
    <p class="fsteps__progress">{{ doneCount }} de {{ steps.length }} hechos</p>
    <ol class="fsteps__list">
      <li v-for="(s, i) in steps" :key="s.label" :data-done="s.done" :data-next="i === nextIndex">
        <NuxtLink :to="s.to" class="fsteps__row">
          <Icon :name="s.done ? 'ph:check-circle-fill' : 'ph:circle'" class="fsteps__icon" />
          <span class="fsteps__text">
            <span class="fsteps__label">{{ s.label }}</span>
            <span v-if="!s.done" class="fsteps__hint">{{ s.hint }}</span>
          </span>
          <Icon v-if="!s.done" name="ph:arrow-right-bold" class="fsteps__go" />
        </NuxtLink>
      </li>
    </ol>
  </BaseCard>
</template>
