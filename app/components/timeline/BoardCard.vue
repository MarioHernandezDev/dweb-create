<script setup lang="ts">
import type { Post, PostStatus } from '~/types'
import { contentTypeMeta, statusMeta, overdueLabel } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'

const props = defineProps<{ post: Post; phases: PostStatus[]; overdue?: boolean; /** Proyecto = nombre del partner de la colaboración; null/undefined = contenido propio (sin chip). */ project?: string | null }>()
defineEmits<{ open: [post: Post]; move: [status: PostStatus] }>()

// Cargadas una sola vez desde PhaseBoard.vue (onMounted) — este componente
// solo lee el `useState` ya compartido para resolver color/nombre.
const { labels } = useLabels()

// Portada = ficha de claqueta, no degradado al azar: el matiz sale del
// mismo hash que ya genera `post.cover` (coverArtFromString en avatar.ts),
// solo que aquí muy desaturado, como papel, con una textura de rayas
// diagonales encima en vez de un bloque de color vistoso.
const coverStyle = computed(() => {
  const hue = Number(props.post.cover.from.match(/hsl\((\d+)/)?.[1] ?? 0)
  return {
    backgroundColor: `hsl(${hue} 24% 93%)`,
    backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 8px, transparent 8px 16px)'
  }
})
</script>

<template>
  <!-- No es un <button> real: la tarjeta tiene un <select> interactivo dentro
       (el cambio de fase), y un botón no puede contener otro control
       interactivo. role="button" + tabindex + Enter/Espacio es el patrón
       correcto para ese caso — mismo criterio que ya se aplicó en
       DiscoveryCard.vue/FeaturedDeck.vue, adaptado porque aquí sí hace falta
       un contenedor no-botón. -->
  <div
    class="relative cursor-pointer select-none" role="button" tabindex="0" :aria-label="`Abrir «${post.title}»`"
    @click="$emit('open', post)" @keydown.enter="$emit('open', post)" @keydown.space.prevent="$emit('open', post)"
  >
    <div
      class="rounded-[var(--radius-xs)] transition-transform duration-150 ease-[var(--ease-spring)] active:scale-[0.99]"
      style="box-shadow: 4px 4px 0 0 rgb(26 22 37 / 7%), 8px 8px 0 0 rgb(26 22 37 / 4.5%)"
    >
      <!-- Spine: la fase es estructura (una franja real), no un punto de 8px -->
      <div class="h-[7px] rounded-t-[var(--radius-xs)]" :style="{ background: statusMeta[post.status].color }" />

      <div class="bg-[var(--color-paper)] border border-t-0 border-[var(--color-hairline)] rounded-b-[var(--radius-xs)] overflow-hidden">
        <div class="relative h-24 w-full flex items-center justify-center" :style="!post.mediaUrl ? coverStyle : undefined">
          <img v-if="post.mediaUrl" :src="post.mediaUrl" alt="" class="absolute inset-0 size-full object-cover">
          <Icon v-else :name="contentTypeMeta[post.contentType].icon" class="size-7 text-[var(--color-text)] opacity-20" />

          <span class="absolute top-2 right-2 flex items-center justify-center size-6 rounded-full bg-[var(--color-text)]/50 backdrop-blur-sm">
            <Icon :name="platformMeta[post.platform].icon" class="size-3.5 text-white" />
          </span>

          <!-- Esquina dobladita — solo sobre el placeholder, no tapa una foto real -->
          <span
            v-if="!post.mediaUrl" aria-hidden="true" class="absolute bottom-0 right-0 size-0"
            style="border-style: solid; border-width: 0 0 14px 14px; border-color: transparent transparent rgb(26 22 37 / 12%) transparent"
          />
        </div>

        <div class="p-3">
          <div v-if="post.labelIds.length" class="flex flex-wrap gap-1 mb-2">
            <span
              v-for="id in post.labelIds" :key="id"
              class="h-1.5 w-6 rounded-full"
              :style="{ background: labels.find((l) => l.id === id)?.color ?? 'var(--color-hairline-strong)' }"
            />
          </div>

          <p class="text-[0.875rem] font-medium text-[var(--color-text)] leading-snug line-clamp-2 min-h-[2.5em] mb-2">
            {{ post.title }}
          </p>

          <p v-if="project" class="inline-flex max-w-full items-center gap-1 mb-2 px-2 h-5 rounded-full bg-[var(--color-primary-500)]/10 text-[0.6875rem] font-medium text-[var(--color-primary-500)]" data-card-project>
            <Icon name="ph:handshake-fill" class="size-3 shrink-0" /> <span class="truncate">{{ project }}</span>
          </p>

          <p v-if="overdue" class="flex items-center gap-1 mb-2.5 text-[0.75rem] font-medium text-[var(--color-status-alert)]">
            <Icon name="ph:warning-fill" class="size-3.5 shrink-0" />
            {{ overdueLabel(post.dueInDays) }}
          </p>

          <p v-if="post.checklist.total" class="flex items-center gap-1 mb-2.5 text-[0.75rem] text-[var(--color-text-faint)]">
            <Icon name="ph:check-square-fill" class="size-3.5 shrink-0" :class="post.checklist.done === post.checklist.total && 'text-[var(--color-status-published)]'" />
            {{ post.checklist.done }}/{{ post.checklist.total }}
          </p>

          <!-- Etiqueta de carpeta en vez de botón sólido: la fase se lee, no se pulsa como una acción -->
          <div class="flex items-center gap-2 pt-2.5 border-t border-[var(--color-hairline)]">
            <span class="w-1 self-stretch rounded-full shrink-0" :style="{ background: statusMeta[post.status].color }" />
            <select
              class="flex-1 min-w-0 bg-transparent border-none outline-none p-0 appearance-none cursor-pointer text-[0.78125rem] font-semibold truncate"
              :style="{ color: statusMeta[post.status].color }"
              :value="post.status"
              aria-label="Cambiar de fase"
              @click.stop
              @change="$emit('move', ($event.target as HTMLSelectElement).value as PostStatus)"
            >
              <option v-for="p in phases" :key="p" :value="p" class="bg-[var(--color-ink-raised)] text-[var(--color-text)]">
                {{ statusMeta[p].label }}
              </option>
            </select>
            <Icon name="ph:caret-down-bold" class="size-3 shrink-0" :style="{ color: statusMeta[post.status].color }" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
