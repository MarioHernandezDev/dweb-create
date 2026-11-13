<script setup lang="ts">
import { LABEL_COLORS } from '~/utils/labels'
import type { Label } from '~/composables/useLabels'

/** Etiquetas de una publicación: las puestas, el selector con las que ya existen y el alta de una nueva. */
defineProps<{ labels: Label[]; attached: Label[]; isAttached: (id: string) => boolean }>()
const emit = defineEmits<{ toggle: [label: Label]; create: [] }>()
const open = defineModel<boolean>('open', { required: true })
const newName = defineModel<string>('newName', { required: true })
const newColor = defineModel<string>('newColor', { required: true })
</script>

<template>
  <div>
    <div v-if="attached.length" class="plabels">
      <span v-for="l in attached" :key="l.id" class="plabel" :style="{ '--label': l.color }">
        {{ l.name }}
        <button type="button" :aria-label="`Quitar la etiqueta ${l.name}`" @click="emit('toggle', l)"><Icon name="ph:x-bold" class="size-3" /></button>
      </span>
    </div>
    <p v-else-if="!open" class="pdetail__empty">Sin etiquetas. Úsalas para agrupar publicaciones en el tablero.</p>

    <div v-if="open" class="plabels__picker">
      <button v-for="l in labels" :key="l.id" type="button" class="plabels__option" :aria-pressed="isAttached(l.id)" @click="emit('toggle', l)">
        <span class="plabels__dot" :style="{ '--label': l.color }" />
        <span>{{ l.name }}</span>
        <Icon v-if="isAttached(l.id)" name="ph:check-bold" class="size-4" />
      </button>
      <p v-if="!labels.length" class="pdetail__empty">Todavía no tienes ninguna etiqueta. Crea la primera:</p>

      <div class="plabels__new">
        <div class="plabels__colors" role="group" aria-label="Color de la etiqueta nueva">
          <button
            v-for="c in LABEL_COLORS" :key="c.hex" type="button" class="plabels__color" :style="{ '--label': c.hex }"
            :aria-label="c.name" :aria-pressed="newColor === c.hex" @click="newColor = c.hex"
          />
        </div>
        <form class="pdetail__add" @submit.prevent="emit('create')">
          <input v-model="newName" type="text" class="input" placeholder="Nueva etiqueta…" aria-label="Nombre de la etiqueta nueva">
          <BaseButton type="submit" size="sm" variant="secondary" :disabled="!newName.trim()">Crear</BaseButton>
        </form>
      </div>
    </div>

    <BaseButton variant="ghost" size="sm" :icon="open ? 'ph:x-bold' : 'ph:plus-bold'" :aria-expanded="open" @click="open = !open">
      {{ open ? 'Cerrar' : 'Añadir etiqueta' }}
    </BaseButton>
  </div>
</template>
