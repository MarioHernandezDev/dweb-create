<script setup lang="ts">
/**
 * Pestañas de "Tu perfil" (A-R18f): barra horizontal a todo el ancho en todos
 * los tamaños (en móvil, con scroll), con semántica de tablist y navegación por
 * teclado (flechas, Inicio y Fin). Cada pestaña apunta a su panel con
 * `aria-controls="profile-panel-<id>"`; el panel lo declara la página.
 */
const props = defineProps<{ tabs: { id: string; label: string; icon: string }[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

const refs = ref<HTMLElement[]>([])

function onKey(e: KeyboardEvent, index: number) {
  const last = props.tabs.length - 1
  let next = -1
  if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1
  else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = last
  if (next < 0) return
  e.preventDefault()
  emit('update:modelValue', props.tabs[next]!.id)
  nextTick(() => refs.value[next]?.focus())
}
</script>

<template>
  <div class="overflow-x-auto nx-scroll -mx-5 px-5 md:mx-0 md:px-0 border-b border-[var(--color-hairline)]">
    <div role="tablist" aria-label="Secciones de tu perfil" class="flex gap-1 min-w-max">
      <button
        v-for="(tab, i) in tabs" :id="`profile-tab-${tab.id}`" :key="tab.id" :ref="(el) => { if (el) refs[i] = el as HTMLElement }"
        type="button" role="tab" :aria-selected="modelValue === tab.id" :aria-controls="`profile-panel-${tab.id}`"
        :tabindex="modelValue === tab.id ? 0 : -1"
        class="relative inline-flex items-center gap-2 px-4 h-11 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-primary-500)] focus-visible:-outline-offset-2 rounded-t-[var(--radius-xs)]"
        :class="modelValue === tab.id ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        @click="emit('update:modelValue', tab.id)" @keydown="onKey($event, i)"
      >
        <Icon :name="tab.icon" class="size-4 shrink-0" :class="modelValue === tab.id && 'text-[var(--color-primary-500)]'" />
        {{ tab.label }}
        <span
          class="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-[var(--color-primary-500)] transition-opacity duration-200"
          :class="modelValue === tab.id ? 'opacity-100' : 'opacity-0'" aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>
