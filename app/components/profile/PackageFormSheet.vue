<script setup lang="ts">
import type { Package } from '~/composables/usePackages'
import type { Role } from '~/types'
import { PACKAGE_TEMPLATES, DELIVERABLE_SUGGESTIONS, type PackageTemplate } from '~/utils/package-templates'

/**
 * Crear o editar un paquete (creador) o una necesidad (marca). Pensado para hacerlo en un minuto: plantillas de partida,
 * entregables con sugerencias de un clic, portada elegible desde el principio y una vista previa de cómo lo verán los
 * demás. Los datos que se guardan son los de siempre (título, descripción, precio y entregables).
 */
const props = defineProps<{ modelValue: boolean; profileId: string; role: Role; editing?: Package | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()

const { saving, createPackage, updatePackage, uploadPackageCover } = usePackages()

const isCreator = computed(() => props.role === 'creator')
const noun = computed(() => (isCreator.value ? 'paquete' : 'necesidad'))
const templates = computed(() => PACKAGE_TEMPLATES[props.role])

const title = ref('')
const description = ref('')
// El campo numérico entrega texto: se guarda tal cual y de él sale el importe en euros (o null si no vale).
const priceInput = ref<string | number | null>(null)
const priceEuros = computed(() => { const n = Number(priceInput.value); return priceInput.value !== null && priceInput.value !== '' && Number.isFinite(n) && n > 0 ? n : null })
const deliverables = ref<string[]>([])
const deliverableInput = ref('')
const errorMsg = ref('')
const templateId = ref('')
// Portada elegida antes de guardar (se sube justo después de crear, cuando ya hay id); al editar se sube al momento.
const pendingCover = ref<File | null>(null)
const pendingCoverUrl = ref<string | null>(null)

function releasePendingCover() {
  if (pendingCoverUrl.value) URL.revokeObjectURL(pendingCoverUrl.value)
  pendingCover.value = null
  pendingCoverUrl.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) { releasePendingCover(); return }
    title.value = props.editing?.title ?? ''
    description.value = props.editing?.description ?? ''
    priceInput.value = props.editing ? props.editing.priceCents / 100 : null
    deliverables.value = props.editing ? [...props.editing.deliverables] : []
    deliverableInput.value = ''
    errorMsg.value = ''
    templateId.value = ''
    releasePendingCover()
  }
)
onUnmounted(releasePendingCover)

function applyTemplate(t: PackageTemplate) {
  templateId.value = t.id
  title.value = t.title
  description.value = t.description
  deliverables.value = [...t.deliverables]
}
function addDeliverable(value?: string) {
  const v = (value ?? deliverableInput.value).trim()
  if (v && !deliverables.value.includes(v)) deliverables.value.push(v)
  if (value === undefined) deliverableInput.value = ''
}
function onDeliverableKeydown(e: KeyboardEvent) {
  if (e.key === ',') {
    e.preventDefault()
    addDeliverable()
  } else if (e.key === 'Backspace' && !deliverableInput.value && deliverables.value.length) {
    deliverables.value.pop()
  }
}
const suggestions = computed(() => DELIVERABLE_SUGGESTIONS.filter((s) => !deliverables.value.includes(s)))

const sheetTitle = computed(() => (props.editing ? `Editar ${noun.value}` : `Nuevo ${noun.value}`))

// ---- Portada ----
const coverInputEl = ref<HTMLInputElement | null>(null)
const coverUploading = ref(false)
const coverError = ref('')
async function onCoverChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  coverError.value = ''
  if (!props.editing) {
    releasePendingCover()
    pendingCover.value = file
    pendingCoverUrl.value = URL.createObjectURL(file)
    return
  }
  coverUploading.value = true
  try {
    const url = await uploadPackageCover(props.editing.id, file)
    if (props.editing) props.editing.coverUrl = url
  } catch (err) {
    console.error('[PackageFormSheet] fallo al subir la portada:', err)
    coverError.value = 'No se ha podido subir. Prueba con otra imagen (JPG/PNG/WebP).'
  } finally {
    coverUploading.value = false
    if (coverInputEl.value) coverInputEl.value.value = ''
  }
}
const coverShown = computed(() => pendingCoverUrl.value ?? props.editing?.coverUrl ?? null)

// Vista previa: el mismo componente que verán los demás, con lo que se va escribiendo.
const preview = computed<Package>(() => ({
  id: props.editing?.id ?? 'preview',
  profileId: props.profileId,
  title: title.value.trim() || (isCreator.value ? 'Título de tu paquete' : 'Título de tu necesidad'),
  description: description.value.trim() || null,
  priceCents: Math.round((priceEuros.value ?? 0) * 100),
  deliverables: deliverables.value,
  active: true,
  coverUrl: coverShown.value,
  sortOrder: 0,
  createdAt: ''
}))

async function save() {
  if (!title.value || !priceEuros.value) return
  errorMsg.value = ''
  addDeliverable()

  try {
    if (props.editing) {
      await updatePackage(props.editing.id, {
        title: title.value,
        description: description.value || null,
        priceCents: Math.round(priceEuros.value * 100),
        deliverables: deliverables.value
      })
    } else {
      const created = await createPackage({
        profileId: props.profileId,
        title: title.value,
        description: description.value || null,
        priceCents: Math.round(priceEuros.value * 100),
        deliverables: deliverables.value
      })
      // La portada elegida antes de guardar se sube ahora que el paquete ya tiene id. Si falla, el paquete ya existe
      // y se puede añadir después editándolo: no se pierde nada.
      if (pendingCover.value) {
        try { created.coverUrl = await uploadPackageCover(created.id, pendingCover.value) } catch { /* se añade luego al editar */ }
      }
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.'
  }
}
</script>

<template>
  <BottomSheet :model-value="modelValue" :title="sheetTitle" wide @update:model-value="$emit('update:modelValue', $event)">
    <div class="pform">
      <div class="pform__main">
        <section v-if="!editing" class="pform__templates" aria-label="Plantillas">
          <p class="pform__legend">Empieza con una plantilla <span>(luego lo editas todo)</span></p>
          <div class="pform__chips">
            <button v-for="t in templates" :key="t.id" type="button" class="pform__tpl" :data-on="templateId === t.id" data-package-template @click="applyTemplate(t)">{{ t.label }}</button>
          </div>
        </section>

        <BaseField label="Título" v-slot="f">
          <BaseInput v-bind="f" v-model="title" :placeholder="isCreator ? 'Ej. 1 Reel + 3 Stories' : 'Ej. Lanzamiento de producto'" maxlength="80" />
        </BaseField>

        <BaseField label="Descripción" optional hint="Qué incluye y cómo trabajas: es lo que decide a quien lo lee." v-slot="f">
          <BaseTextarea v-bind="f" v-model="description" rows="3" placeholder="Qué incluye…" maxlength="400" />
        </BaseField>

        <div class="pform__group">
          <label class="field__label" for="pkg-deliverables">Entregables</label>
          <div class="pform__tags">
            <span v-for="(d, i) in deliverables" :key="d" class="pform__tag">
              {{ d }}
              <button type="button" :aria-label="`Quitar ${d}`" @click="deliverables.splice(i, 1)"><Icon name="ph:x-bold" class="size-3" /></button>
            </span>
            <input
              id="pkg-deliverables" v-model="deliverableInput" type="text" placeholder="Escribe uno y pulsa Enter…" class="pform__input"
              @keydown.enter.prevent="addDeliverable()" @keydown="onDeliverableKeydown" @blur="addDeliverable()"
            >
          </div>
          <div v-if="suggestions.length" class="pform__chips" aria-label="Sugerencias de entregables">
            <button v-for="s in suggestions" :key="s" type="button" class="pform__sugg" @click="addDeliverable(s)"><Icon name="ph:plus-bold" class="size-3" /> {{ s }}</button>
          </div>
        </div>

        <BaseField :label="isCreator ? 'Precio del paquete' : 'Presupuesto'" :hint="isCreator ? 'Lo que cobras por el paquete completo.' : 'Lo que estás dispuesto a invertir.'" v-slot="f">
          <BaseInput v-bind="f" v-model="priceInput" type="number" min="1" step="1" suffix="€" placeholder="300" />
        </BaseField>

        <div class="pform__group">
          <p class="field__label">Portada <span class="field__optional">(opcional)</span></p>
          <button type="button" class="pform__cover" :disabled="coverUploading" @click="coverInputEl?.click()">
            <img v-if="coverShown" :src="coverShown" alt="" class="pform__cover-img">
            <Icon v-else name="ph:image-fill" class="size-6" />
            <span>{{ coverUploading ? 'Subiendo…' : coverShown ? 'Cambiar imagen' : 'Añadir una imagen' }}</span>
          </button>
          <input ref="coverInputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onCoverChange">
          <p v-if="coverError" class="field__error" role="alert">{{ coverError }}</p>
        </div>

        <p v-if="errorMsg" class="field__error" role="alert">{{ errorMsg }}</p>

        <BaseButton variant="primary" size="lg" block :loading="saving" :disabled="!title || !priceEuros || saving" data-save-package @click="save">
          {{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : `Publicar ${noun}` }}
        </BaseButton>
      </div>

      <aside class="pform__preview" aria-label="Vista previa">
        <p class="pform__legend">Así lo verán {{ isCreator ? 'las marcas' : 'los creadores' }}</p>
        <PackageCard :pkg="preview" showcase />
      </aside>
    </div>
  </BottomSheet>
</template>
