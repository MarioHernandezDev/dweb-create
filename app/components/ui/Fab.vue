<script setup lang="ts">
defineProps<{ icon?: string; active?: boolean; label?: string }>()
defineEmits<{ click: [] }>()

// Se esconde al bajar (no tapa lo que lees) y vuelve al subir o al parar arriba del todo. Con el formulario abierto
// (`active`) se queda siempre visible.
const hidden = ref(false)
let lastY = 0
function onScroll() {
  const y = window.scrollY
  const delta = y - lastY
  if (Math.abs(delta) < 8) return
  hidden.value = delta > 0 && y > 120
  lastY = y
}
onMounted(() => {
  lastY = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <button
    type="button" :aria-label="label ?? 'Nueva publicación'"
    class="fixed z-20 right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-9 md:bottom-9 size-14 rounded-full bg-[var(--color-voltio-400)] text-[var(--color-tinta-950)] shadow-[var(--shadow-3)] hover:shadow-[var(--shadow-2)] hover:bg-[var(--color-voltio-300)] flex items-center justify-center active:scale-90 transition-[transform,box-shadow,background-color] duration-300 ease-[var(--ease-spring-out)]"
    :class="[active && 'rotate-45', hidden && !active && 'translate-y-28 opacity-0 pointer-events-none']"
    @click="$emit('click')"
  >
    <Icon :name="icon ?? 'ph:plus-bold'" class="size-6" />
  </button>
</template>
