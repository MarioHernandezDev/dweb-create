<script setup lang="ts">
import { audienceError, MAX_COUNTRIES, type Audience } from '~/utils/audience'

/**
 * Audiencia declarada: países, franjas de edad y reparto por género. La escribe el propio creador (ninguna red la mide
 * aquí), y el perfil público lo dice así. Cada bloque puede dejarse vacío y suma como mucho 100 %.
 */
const audience = defineModel<Audience>({ required: true })
const error = computed(() => audienceError(audience.value))
const sum = (xs: number[]) => Math.round(xs.reduce((s, n) => s + (Number(n) || 0), 0) * 10) / 10
const countriesSum = computed(() => sum(audience.value.countries.map((c) => c.pct)))
const agesSum = computed(() => sum(audience.value.ages.map((c) => c.pct)))
const genderSum = computed(() => sum(Object.values(audience.value.gender)))

function addCountry() {
  if (audience.value.countries.length < MAX_COUNTRIES) audience.value.countries.push({ label: '', pct: 0 })
}
function removeCountry(i: number) { audience.value.countries.splice(i, 1) }
const genderRows = [{ key: 'female', label: 'Mujeres' }, { key: 'male', label: 'Hombres' }, { key: 'other', label: 'Otros' }] as const
</script>

<template>
  <section class="aud-edit" aria-labelledby="aud-title" data-audience-editor>
    <h3 id="aud-title" class="ficha-form__title">Audiencia</h3>
    <p class="field__hint">La declaras tú: las marcas la verán marcada como «declarada por el creador». Déjalo en blanco lo que no sepas.</p>

    <fieldset class="aud-edit__block">
      <legend class="field__label">Países <span class="aud-edit__sum" :data-over="countriesSum > 100">{{ countriesSum }} %</span></legend>
      <div v-for="(c, i) in audience.countries" :key="i" class="aud-edit__row">
        <input v-model="c.label" type="text" maxlength="60" class="input" placeholder="País" :aria-label="`País ${i + 1}`">
        <input v-model.number="c.pct" type="number" min="0" max="100" step="1" class="input aud-edit__pct" :aria-label="`Porcentaje de ${c.label || `país ${i + 1}`}`"><span>%</span>
        <button type="button" class="aud-edit__x" :aria-label="`Quitar ${c.label || `país ${i + 1}`}`" @click="removeCountry(i)"><Icon name="ph:x-bold" class="size-3.5" /></button>
      </div>
      <BaseButton v-if="audience.countries.length < MAX_COUNTRIES" variant="outline" size="sm" icon="ph:plus-bold" @click="addCountry">Añadir país</BaseButton>
    </fieldset>

    <fieldset class="aud-edit__block">
      <legend class="field__label">Edad <span class="aud-edit__sum" :data-over="agesSum > 100">{{ agesSum }} %</span></legend>
      <div class="aud-edit__grid">
        <label v-for="a in audience.ages" :key="a.label" class="aud-edit__cell"><span>{{ a.label }}</span>
          <span class="aud-edit__in"><input v-model.number="a.pct" type="number" min="0" max="100" step="1" class="input aud-edit__pct" :aria-label="`Franja ${a.label}`">%</span>
        </label>
      </div>
    </fieldset>

    <fieldset class="aud-edit__block">
      <legend class="field__label">Género <span class="aud-edit__sum" :data-over="genderSum > 100">{{ genderSum }} %</span></legend>
      <div class="aud-edit__grid">
        <label v-for="g in genderRows" :key="g.key" class="aud-edit__cell"><span>{{ g.label }}</span>
          <span class="aud-edit__in"><input v-model.number="audience.gender[g.key]" type="number" min="0" max="100" step="1" class="input aud-edit__pct" :aria-label="g.label">%</span>
        </label>
      </div>
    </fieldset>
    <p v-if="error" class="field__error" role="alert" data-error="audience">{{ error }}</p>
  </section>
</template>
