<script setup lang="ts">
/**
 * Selector de fecha propio (sustituye al `<input type="date">` nativo, que cada navegador pinta distinto y con
 * un aspecto ajeno a CIBERAN). El valor es siempre «YYYY-MM-DD» (el mismo formato que el campo nativo), así que
 * es un reemplazo directo. El calendario se despliega en línea, bajo el botón: dentro de una hoja con scroll un
 * menú flotante se recortaba. Teclado: flechas para moverse por los días, Enter elige, Escape cierra.
 */
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  /** «YYYY-MM-DD» o vacío. */
  modelValue: string
  /** Primer día elegible («YYYY-MM-DD»). */
  min?: string
  /** Atajos «Hoy / Mañana / En una semana…». */
  quick?: boolean
  placeholder?: string
}>(), { min: undefined, quick: true, placeholder: 'Elige una fecha' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const attrs = useAttrs()
const root = ref<HTMLElement | null>(null)
const open = ref(false)

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y!, (m ?? 1) - 1, d ?? 1) }
const todayIso = toIso(new Date())
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return toIso(d) }

const selected = computed(() => (props.modelValue && /^\d{4}-\d{2}-\d{2}$/.test(props.modelValue) ? props.modelValue : ''))
// Mes que se está viendo (primer día del mes).
const view = ref(startOfMonth(selected.value ? fromIso(selected.value) : new Date()))
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
watch(selected, (v) => { if (v) view.value = startOfMonth(fromIso(v)) })

const monthLabel = computed(() => {
  const s = view.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Cuadrícula de 6 semanas que empieza en lunes.
const days = computed(() => {
  const first = view.value
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = toIso(d)
    return { iso, day: d.getDate(), other: d.getMonth() !== first.getMonth(), today: iso === todayIso, disabled: !!props.min && iso < props.min }
  })
})
const prevDisabled = computed(() => !!props.min && toIso(new Date(view.value.getFullYear(), view.value.getMonth(), 0)) < props.min)
function shift(months: number) { view.value = new Date(view.value.getFullYear(), view.value.getMonth() + months, 1) }

const label = computed(() => {
  if (!selected.value) return ''
  const s = fromIso(selected.value).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const clean = s.replace('.', '')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
})
function pick(iso: string) {
  emit('update:modelValue', iso)
  open.value = false
}
const shortcuts = computed(() => [
  { label: 'Hoy', iso: addDays(0) }, { label: 'Mañana', iso: addDays(1) }, { label: 'En 3 días', iso: addDays(3) }, { label: 'En una semana', iso: addDays(7) }
].filter((s) => !props.min || s.iso >= props.min))

function onDocClick(e: MouseEvent) { if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open.value) { open.value = false; e.stopPropagation() } }
// Al abrirse, el calendario se trae a la vista (dentro de una hoja con scroll quedaba medio fuera).
watch(open, async (v) => { if (v) { await nextTick(); root.value?.querySelector('.dpick__panel')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) } })
onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))

// Flechas dentro de la cuadrícula.
function onGridKey(e: KeyboardEvent) {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key as 'ArrowLeft']
  if (!step) return
  e.preventDefault()
  const current = (document.activeElement as HTMLElement | null)?.dataset.iso
  if (!current) return
  const d = fromIso(current)
  d.setDate(d.getDate() + step)
  const iso = toIso(d)
  if (props.min && iso < props.min) return
  if (d.getMonth() !== view.value.getMonth() || d.getFullYear() !== view.value.getFullYear()) view.value = startOfMonth(d)
  nextTick(() => root.value?.querySelector<HTMLElement>(`[data-iso="${iso}"]`)?.focus())
}
</script>

<template>
  <div ref="root" class="dpick" @keydown="onKey">
    <button
      v-bind="attrs" type="button" class="dpick__trigger" :aria-expanded="open" aria-haspopup="dialog" :data-empty="!selected"
      @click="open = !open"
    >
      <Icon name="ph:calendar-blank-bold" class="size-5 shrink-0" />
      <span class="dpick__value">{{ label || placeholder }}</span>
      <Icon name="ph:caret-down-bold" class="dpick__caret size-3.5 shrink-0" />
    </button>

    <div v-if="open" class="dpick__panel" role="dialog" aria-label="Elegir fecha">
      <div v-if="quick && shortcuts.length" class="dpick__quick">
        <button v-for="s in shortcuts" :key="s.label" type="button" class="dpick__chip" :data-on="selected === s.iso" @click="pick(s.iso)">{{ s.label }}</button>
      </div>

      <div class="dpick__nav">
        <button type="button" class="dpick__step" aria-label="Mes anterior" :disabled="prevDisabled" @click="shift(-1)"><Icon name="ph:caret-left-bold" class="size-4" /></button>
        <p class="dpick__month" aria-live="polite">{{ monthLabel }}</p>
        <button type="button" class="dpick__step" aria-label="Mes siguiente" @click="shift(1)"><Icon name="ph:caret-right-bold" class="size-4" /></button>
      </div>

      <div class="dpick__grid" role="grid" :aria-label="monthLabel" @keydown="onGridKey">
        <span v-for="w in WEEKDAYS" :key="w" class="dpick__wd" aria-hidden="true">{{ w }}</span>
        <button
          v-for="d in days" :key="d.iso" type="button" class="dpick__day" :data-iso="d.iso"
          :data-other="d.other" :data-today="d.today" :data-selected="d.iso === selected" :disabled="d.disabled"
          :tabindex="d.iso === selected || (!selected && d.today) ? 0 : -1" :aria-pressed="d.iso === selected" @click="pick(d.iso)"
        >{{ d.day }}</button>
      </div>
    </div>
  </div>
</template>
