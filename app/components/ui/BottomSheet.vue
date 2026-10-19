<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" @click="close" />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-250 ease-out" enter-from-class="translate-y-full md:translate-y-4 md:opacity-0" enter-to-class="translate-y-0 md:opacity-100"
      leave-active-class="transition-transform duration-200 ease-in" leave-from-class="translate-y-0" leave-to-class="translate-y-full md:translate-y-4 md:opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
        role="dialog" aria-modal="true" :aria-label="title"
      >
        <div class="bg-[var(--color-ink-raised)] rounded-t-[var(--radius-lg)] md:rounded-[var(--radius-lg)] w-full md:max-w-md md:mx-auto border border-[var(--color-hairline)] shadow-[var(--shadow-float)] max-h-[88dvh] flex flex-col">
          <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--color-hairline)] shrink-0">
            <span class="mx-auto md:hidden h-1 w-9 rounded-full bg-[var(--color-hairline-strong)] absolute top-2 left-1/2 -translate-x-1/2" />
            <h2 class="font-display text-[1.0625rem] text-[var(--color-text)]">{{ title }}</h2>
            <button type="button" aria-label="Cerrar" class="size-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)]" @click="close">
              <Icon name="ph:x-bold" class="size-4" />
            </button>
          </div>
          <div class="overflow-y-auto px-5 py-5 nx-scroll">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
