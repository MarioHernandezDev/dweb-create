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

</script>

<template>
  <div class="ficha-form" data-ficha-form>
    <slot name="cover" />

    <div class="ficha-form__cols">
      <section class="ficha-form__section" aria-labelledby="ficha-sec-identity">
        <h3 id="ficha-sec-identity" class="ficha-form__title">Presentación</h3>
        <div class="field">
          <div class="field__row">
            <label class="field__label" for="ficha-bio">Biografía</label>
            <span class="field__count" :data-over="ficha.bio.length > BIO_MAX" data-bio-counter>{{ ficha.bio.length }}/{{ BIO_MAX }}</span>
          </div>
          <textarea
            id="ficha-bio" v-model="ficha.bio" rows="5" class="textarea" :placeholder="texts.bioPlaceholder"
            :aria-invalid="!!errors.bio" aria-describedby="ficha-bio-error"
          />
          <p v-if="errors.bio" id="ficha-bio-error" class="field__error" role="alert" data-error="bio">{{ errors.bio }}</p>
        </div>

        <div class="field">
          <p class="field__label">{{ texts.categoriesLabel }}</p>
          <p class="field__hint">{{ texts.categoriesHint }}</p>
          <div class="ficha-form__chips" role="group" :aria-label="texts.categoriesLabel">
            <Chip v-for="cat in DISCOVERY_CATEGORIES" :key="cat" size="sm" :selected="ficha.categories.includes(cat)" @click="toggleCategory(cat)">{{ cat }}</Chip>
          </div>
        </div>
      </section>

      <section class="ficha-form__section" aria-labelledby="ficha-sec-collab">
        <h3 id="ficha-sec-collab" class="ficha-form__title">Colaboración</h3>
        <fieldset class="field">
          <legend class="field__label">{{ texts.rangeLabel }}</legend>
          <div class="ficha-form__pair">
            <div class="field">
              <label class="field__hint" for="ficha-min">{{ texts.minLabel }}</label>
              <input id="ficha-min" v-model.number="ficha.min" type="number" min="0" step="1" inputmode="numeric" class="input" :aria-invalid="!!errors.min">
              <p v-if="errors.min" class="field__error" role="alert" data-error="min">{{ errors.min }}</p>
            </div>
            <div class="field">
              <label class="field__hint" for="ficha-max">{{ texts.maxLabel }}</label>
              <input id="ficha-max" v-model.number="ficha.max" type="number" min="0" step="1" inputmode="numeric" class="input" :aria-invalid="!!errors.max">
              <p v-if="errors.max" class="field__error" role="alert" data-error="max">{{ errors.max }}</p>
            </div>
          </div>
        </fieldset>

        <div class="field">
          <div class="field__row">
            <label class="field__label" for="ficha-looking-for">{{ texts.lookingForLabel }}</label>
            <span class="field__count" :data-over="ficha.lookingFor.length > LOOKING_FOR_MAX">{{ ficha.lookingFor.length }}/{{ LOOKING_FOR_MAX }}</span>
          </div>
          <textarea
            id="ficha-looking-for" v-model="ficha.lookingFor" rows="3" class="textarea" :placeholder="texts.lookingForPlaceholder"
            :aria-invalid="!!errors.lookingFor"
          />
          <p v-if="errors.lookingFor" class="field__error" role="alert" data-error="lookingFor">{{ errors.lookingFor }}</p>
        </div>
        <slot name="collab-extra" />
      </section>
    </div>
  </div>
</template>
