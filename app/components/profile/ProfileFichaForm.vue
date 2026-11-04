<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import { BIO_MAX, LOOKING_FOR_MAX, type FichaErrors } from '~/utils/profile-ficha'

/**
 * Formulario de la ficha pública (A-R18c) — SOLO lo que es idéntico entre
 * creador y partner (campos, validación visible y contadores); las etiquetas y
 * los textos de ayuda llegan por props porque cada rol habla de cosas
 * distintas (tarifa vs presupuesto, "marcas" vs "creadores"). No guarda nada:
 * muta el objeto `ficha` de la página, que decide cuándo y cómo persistir.
 */
export interface FichaModel {
  bio: string
  categories: string[]
  min: number | string | null
  max: number | string | null
  lookingFor: string
}

const props = defineProps<{
  ficha: FichaModel
  errors: FichaErrors
  texts: {
    bioPlaceholder: string
    categoriesLabel: string
    categoriesHint: string
    rangeLabel: string
    minLabel: string
    maxLabel: string
    lookingForLabel: string
    lookingForPlaceholder: string
  }
}>()

function toggleCategory(cat: string) {
  const i = props.ficha.categories.indexOf(cat)
  if (i === -1) props.ficha.categories.push(cat)
  else props.ficha.categories.splice(i, 1)
}

const field = 'w-full rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 transition-colors'
const invalid = 'border-[var(--color-status-alert)]/70 focus:border-[var(--color-status-alert)]'
</script>

<template>
  <div class="flex flex-col gap-6" data-ficha-form>
    <slot name="cover" />

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="flex flex-col gap-4" aria-labelledby="ficha-sec-identity">
        <h3 id="ficha-sec-identity" class="text-sm font-semibold text-[var(--text-muted)]">Presentación</h3>
        <div>
          <div class="flex items-baseline justify-between mb-1.5">
            <label class="text-sm font-medium text-[var(--color-text-muted)]" for="ficha-bio">Biografía</label>
            <span class="text-micro" :class="ficha.bio.length > BIO_MAX ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-text-faint)]'" data-bio-counter>{{ ficha.bio.length }}/{{ BIO_MAX }}</span>
          </div>
          <textarea
            id="ficha-bio" v-model="ficha.bio" rows="5" :placeholder="texts.bioPlaceholder" :aria-invalid="!!errors.bio" aria-describedby="ficha-bio-error"
            class="px-3.5 py-2.5 resize-y" :class="[field, errors.bio && invalid]"
          />
          <p v-if="errors.bio" id="ficha-bio-error" class="mt-1 text-micro text-[var(--color-status-alert)]" data-error="bio">{{ errors.bio }}</p>
        </div>

        <div>
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-0.5">{{ texts.categoriesLabel }}</p>
          <p class="text-micro text-[var(--color-text-faint)] mb-2">{{ texts.categoriesHint }}</p>
          <div class="flex flex-wrap gap-1.5" role="group" :aria-label="texts.categoriesLabel">
            <button
              v-for="cat in DISCOVERY_CATEGORIES" :key="cat" type="button" :aria-pressed="ficha.categories.includes(cat)"
              class="px-3 h-8 rounded-full text-micro font-medium border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-primary-500)]"
              :class="ficha.categories.includes(cat)
                ? 'bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/50 text-[var(--color-primary-500)]'
                : 'bg-[var(--color-ink-overlay)] border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:border-[var(--color-primary-500)]/40 hover:text-[var(--color-primary-600)]'"
              @click="toggleCategory(cat)"
            >
              {{ cat }}
            </button>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4" aria-labelledby="ficha-sec-collab">
        <h3 id="ficha-sec-collab" class="text-sm font-semibold text-[var(--text-muted)]">Colaboración</h3>
        <fieldset>
          <legend class="text-sm font-medium text-[var(--color-text-muted)] mb-1.5">{{ texts.rangeLabel }}</legend>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-micro text-[var(--color-text-faint)] mb-1" for="ficha-min">{{ texts.minLabel }}</label>
              <input id="ficha-min" v-model.number="ficha.min" type="number" min="0" step="1" inputmode="numeric" :aria-invalid="!!errors.min" class="h-11 px-3" :class="[field, errors.min && invalid]">
              <p v-if="errors.min" class="mt-1 text-micro text-[var(--color-status-alert)]" data-error="min">{{ errors.min }}</p>
            </div>
            <div>
              <label class="block text-micro text-[var(--color-text-faint)] mb-1" for="ficha-max">{{ texts.maxLabel }}</label>
              <input id="ficha-max" v-model.number="ficha.max" type="number" min="0" step="1" inputmode="numeric" :aria-invalid="!!errors.max" class="h-11 px-3" :class="[field, errors.max && invalid]">
              <p v-if="errors.max" class="mt-1 text-micro text-[var(--color-status-alert)]" data-error="max">{{ errors.max }}</p>
            </div>
          </div>
        </fieldset>

        <div>
          <div class="flex items-baseline justify-between mb-1.5">
            <label class="text-sm font-medium text-[var(--color-text-muted)]" for="ficha-looking-for">{{ texts.lookingForLabel }}</label>
            <span class="text-micro" :class="ficha.lookingFor.length > LOOKING_FOR_MAX ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-text-faint)]'">{{ ficha.lookingFor.length }}/{{ LOOKING_FOR_MAX }}</span>
          </div>
          <textarea
            id="ficha-looking-for" v-model="ficha.lookingFor" rows="3" :placeholder="texts.lookingForPlaceholder" :aria-invalid="!!errors.lookingFor"
            class="px-3.5 py-2.5 resize-y" :class="[field, errors.lookingFor && invalid]"
          />
          <p v-if="errors.lookingFor" class="mt-1 text-micro text-[var(--color-status-alert)]" data-error="lookingFor">{{ errors.lookingFor }}</p>
        </div>
      </section>
    </div>
  </div>
</template>
