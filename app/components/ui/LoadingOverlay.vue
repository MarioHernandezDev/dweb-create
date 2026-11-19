<script setup lang="ts">
// Usa el mismo indicador que alimenta <NuxtLoadingIndicator> en app.vue:
// el «throttle» de Nuxt (200 ms) evita el parpadeo en navegaciones rápidas, y
// se cierra solo al terminar la navegación (también si falla). El único
// temporizador propio solo decide cuándo escalar el aviso y se limpia siempre.
//
// La pantalla completa con el símbolo animado se reserva para la carga inicial y para esperas largas: en una
// navegación normal dentro de la app basta la barra de progreso de arriba (taparlo todo cada vez que una página tarda
// 200 ms se sentía pesado e innecesario).
const { isLoading } = useLoadingIndicator()

const SLOW_MS = 1200
const ready = ref(false) // la app ya pintó una vez: a partir de aquí, solo se escala si tarda de verdad
const slow = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

onNuxtReady(() => { ready.value = true })

watch(isLoading, (loading) => {
  if (timer) { clearTimeout(timer); timer = null }
  slow.value = false
  if (loading) timer = setTimeout(() => { slow.value = true }, SLOW_MS)
})
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

const visible = computed(() => isLoading.value && (!ready.value || slow.value))
</script>

<template>
  <Transition name="loading">
    <div v-if="visible" role="status" aria-label="Cargando" class="loading">
      <AnimatedMark :size="132" rings />
    </div>
  </Transition>
</template>
