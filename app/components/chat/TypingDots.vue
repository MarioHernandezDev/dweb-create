<template>
  <div class="flex justify-start mt-3">
    <div class="inline-flex items-center gap-1 px-3.5 py-3 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)]">
      <span v-for="i in 3" :key="i" class="size-1.5 rounded-full bg-[var(--color-primary-500)] animate-bounce" :style="{ animationDelay: `${(i - 1) * 150}ms` }" />
    </div>
  </div>
</template>
