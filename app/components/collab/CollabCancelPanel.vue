<script setup lang="ts">
import { errorMessage } from '~/utils/error-message'
import { relativeTime } from '~/utils/status'

/**
 * Cierre anticipado de una colaboración aceptada o en curso. Dos vías:
 *  - Cancelar de común acuerdo: una parte lo propone con motivo y la otra acepta o prefiere seguir. Solo mientras
 *    no se ha pagado.
 *  - Dar por terminada por incumplimiento: lo decide una parte, explicando qué se ha incumplido. Avisa a la otra
 *    parte y al equipo de CIBERAN. No se puede deshacer.
 * Ninguna de las dos mueve dinero.
 */
const props = defineProps<{ collaborationId: string; status: string; paidAt: string | null; myProfileId: string | null; counterpartName: string }>()
const emit = defineEmits<{ changed: [] }>()

const { state, acting, load, request, respond, withdraw, terminate } = useCollabCancellation(props.collaborationId)
const { confirm } = useConfirm()
const toast = useToast()

const form = ref<'none' | 'cancel' | 'breach'>('none')
const reason = ref('')
const error = ref('')
const isActive = computed(() => props.status === 'accepted' || props.status === 'in_progress')
const pending = computed(() => isActive.value && !!state.value?.requestedAt)
const mine = computed(() => pending.value && state.value?.requestedBy === props.myProfileId)
const minLength = computed(() => (form.value === 'breach' ? 20 : 10))
const canSend = computed(() => reason.value.trim().length >= minLength.value && reason.value.length <= 1000)

onMounted(load)
watch(() => props.status, load)

function show(which: 'cancel' | 'breach') { form.value = which; reason.value = ''; error.value = '' }

async function act(fn: () => Promise<void>, okText: string, fallback: string) {
  error.value = ''
  try {
    await fn()
    toast.success(okText)
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e, fallback)
  }
}

async function send() {
  if (!canSend.value || acting.value) return
  const text = reason.value.trim()
  if (form.value === 'breach') {
    const ok = await confirm({
      title: '¿Dar la colaboración por terminada?',
      message: `Se cerrará para las dos partes por incumplimiento, se avisará a ${props.counterpartName} y el equipo de CIBERAN podrá revisarlo. No se puede deshacer y no mueve ningún pago.`,
      confirmLabel: 'Sí, terminar'
    })
    if (!ok) return
    await act(() => terminate(text), 'Colaboración terminada por incumplimiento', 'No se ha podido terminar la colaboración. Inténtalo de nuevo.')
  } else {
    await act(() => request(text), `Propuesta enviada a ${props.counterpartName}`, 'No se ha podido enviar la propuesta. Inténtalo de nuevo.')
  }
  if (!error.value) form.value = 'none'
}
async function accept() {
  const ok = await confirm({ title: '¿Cancelar la colaboración?', message: 'La colaboración quedará cancelada de común acuerdo para las dos partes. No se puede deshacer.', confirmLabel: 'Aceptar la cancelación' })
  if (ok) await act(() => respond(true), 'Colaboración cancelada', 'No se ha podido cancelar. Inténtalo de nuevo.')
}
const keepGoing = () => act(() => respond(false), 'Seguís adelante con la colaboración', 'No se ha podido responder. Inténtalo de nuevo.')
const takeBack = () => act(() => withdraw(), 'Propuesta retirada', 'No se ha podido retirar la propuesta. Inténtalo de nuevo.')
</script>

<template>
  <div v-if="status === 'cancelled' || status === 'terminated' || isActive" class="ccancel" data-collab-cancel>
    <div v-if="status === 'cancelled'" class="ccancel__box" role="status">
      <p class="ccancel__title"><Icon name="ph:prohibit-bold" class="size-4" /> Cancelada de común acuerdo<template v-if="state?.cancelledAt"> · {{ relativeTime(state.cancelledAt) }}</template></p>
      <blockquote v-if="state?.reason" class="timeline__quote">{{ state.reason }}</blockquote>
    </div>

    <div v-else-if="status === 'terminated'" class="ccancel__box" data-tone="action" role="status">
      <p class="ccancel__title">
        <Icon name="ph:warning-octagon-bold" class="size-4" />
        {{ state?.terminatedBy && state.terminatedBy === myProfileId ? 'Diste la colaboración por terminada por incumplimiento' : `${counterpartName} dio la colaboración por terminada por incumplimiento` }}<template v-if="state?.terminatedAt"> · {{ relativeTime(state.terminatedAt) }}</template>
      </p>
      <blockquote v-if="state?.terminationReason" class="timeline__quote">{{ state.terminationReason }}</blockquote>
      <p class="note-form__hint">El equipo de CIBERAN tiene constancia. Si no estás de acuerdo, deja un apunte en la cronología o escríbenos.</p>
    </div>

    <template v-else>
      <div v-if="pending && mine" class="ccancel__box" role="status">
        <p class="ccancel__title"><Icon name="ph:hourglass-medium-bold" class="size-4" /> Has propuesto cancelar: falta la respuesta de {{ counterpartName }}</p>
        <blockquote v-if="state?.reason" class="timeline__quote">{{ state.reason }}</blockquote>
        <div class="note-form__actions"><BaseButton variant="outline" size="sm" :loading="acting" data-cancel-withdraw @click="takeBack">Retirar la propuesta</BaseButton></div>
      </div>

      <div v-else-if="pending" class="ccancel__box" data-tone="action" role="status">
        <p class="ccancel__title"><Icon name="ph:warning-circle-bold" class="size-4" /> {{ counterpartName }} propone cancelar la colaboración</p>
        <blockquote v-if="state?.reason" class="timeline__quote">{{ state.reason }}</blockquote>
        <div class="note-form__actions">
          <BaseButton variant="outline" size="sm" :disabled="acting" data-cancel-keep @click="keepGoing">Seguir con la colaboración</BaseButton>
          <BaseButton variant="destructive" size="sm" :loading="acting" data-cancel-accept @click="accept">Aceptar la cancelación</BaseButton>
        </div>
      </div>

      <!-- Cancelar y dar por incumplida son poco frecuentes e irreversibles: van plegadas bajo «Más acciones» para no
           competir con la acción principal. Si el formulario está abierto, se enseña directamente. -->
      <details v-if="form === 'none'" class="ccancel__more" data-more-actions>
        <summary>Más acciones</summary>
        <div class="ccancel__sep">
          <BaseButton v-if="!pending && !paidAt" variant="ghost" size="sm" icon="ph:prohibit-bold" block data-cancel-open @click="show('cancel')">Proponer cancelar de común acuerdo</BaseButton>
          <BaseButton variant="ghost" size="sm" icon="ph:warning-octagon-bold" block data-breach-open @click="show('breach')">Dar por terminada por incumplimiento</BaseButton>
        </div>
      </details>
      <form v-else class="note-form__form ccancel__sep" @submit.prevent="send">
        <label class="ccancel__label" for="cancel-reason">{{ form === 'breach' ? 'Qué se ha incumplido' : 'Motivo de la cancelación' }}</label>
        <textarea
          id="cancel-reason" v-model="reason" class="textarea" rows="3" maxlength="1000"
          :placeholder="form === 'breach' ? 'Describe qué se acordó y qué no se ha cumplido (plazos, entregables, condiciones)…' : `Explica a ${counterpartName} por qué propones cancelar…`"
        />
        <p class="note-form__hint">
          <template v-if="form === 'breach'">Cierra la colaboración sin esperar a {{ counterpartName }}: úsalo solo si de verdad no se ha cumplido lo pactado. Queda en la cronología y lo ve el equipo de CIBERAN. Mínimo 20 caracteres.</template>
          <template v-else>{{ counterpartName }} tendrá que aceptarla: hasta entonces la colaboración sigue como está. Quedará constancia en la cronología.</template>
        </p>
        <div class="note-form__actions">
          <BaseButton variant="ghost" size="sm" @click="form = 'none'">Volver</BaseButton>
          <BaseButton type="submit" variant="destructive" size="sm" :loading="acting" :disabled="!canSend">{{ form === 'breach' ? 'Terminar la colaboración' : 'Enviar propuesta' }}</BaseButton>
        </div>
      </form>
    </template>
    <p v-if="error" class="collab-error" role="alert">{{ error }}</p>
  </div>
</template>
