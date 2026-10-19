<script setup lang="ts">
const props = defineProps<{ title: string; subtitle?: string; role: import('~/types').Role }>()
const router = useRouter()
const route = useRoute()

const showBack = computed(() => route.path.split('/').filter(Boolean).length > 1)
</script>

<template>
  <header class="sticky top-0 z-30 flex items-center gap-3 px-5 py-4 md:px-8 md:py-6 bg-[var(--color-ink)]/85 backdrop-blur-md border-b border-[var(--color-hairline)]">
    <button
      v-if="showBack"
      type="button" aria-label="Volver" class="md:hidden -ml-1 size-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)]"
      @click="router.back()"
    >
      <Icon name="ph:arrow-left-bold" class="size-5" />
    </button>

    <div class="min-w-0 flex-1">
      <h1 class="font-display text-[1.375rem] md:text-[1.75rem] text-[var(--color-text)] truncate">{{ title }}</h1>
      <p v-if="subtitle" class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ subtitle }}</p>
    </div>

    <ThemeToggle />

    <NuxtLink :to="`/${role}/profile`" aria-label="Tu perfil" class="shrink-0">
      <BaseAvatar initials="TU" :hue="266" size="sm" />
    </NuxtLink>
  </header>
</template>
