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
  <div class="settings-tabs nx-scroll">
    <div role="tablist" aria-label="Secciones de tu perfil" class="settings-tabs__list">
      <button
        v-for="(tab, i) in tabs" :id="`profile-tab-${tab.id}`" :key="tab.id" :ref="(el) => { if (el) refs[i] = el as HTMLElement }"
        type="button" role="tab" class="settings-tabs__tab" :aria-selected="modelValue === tab.id" :aria-controls="`profile-panel-${tab.id}`"
        :tabindex="modelValue === tab.id ? 0 : -1"
        @click="emit('update:modelValue', tab.id)" @keydown="onKey($event, i)"
      >
        <Icon :name="tab.icon" class="size-4 shrink-0" />
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>
