<script setup lang="ts">
import { translateAuthError } from '~/utils/auth-errors'

useHead({ title: 'Recuperar contraseña' })

const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')
// Un envío cada minuto: evita saturar el límite de correos de Supabase y que se pidan varios enlaces a la vez
// (cada enlace nuevo invalida el anterior, así que pedir de más es lo que lleva a usar uno que ya no vale).
const COOLDOWN_SECONDS = 60
const cooldown = ref(0)
const resentNote = ref(false)
// La espera es por dirección: si corriges el email, puedes pedirlo ya a la nueva.
const lastEmail = ref('')
const waiting = computed(() => cooldown.value > 0 && email.value.trim().toLowerCase() === lastEmail.value)
let timer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = COOLDOWN_SECONDS
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && timer) { clearInterval(timer); timer = null }
  }, 1000)
}
onUnmounted(() => { if (timer) clearInterval(timer) })

async function submit(isResend = false) {
  if (loading.value || waiting.value) return
  loading.value = true
  error.value = ''
  resentNote.value = false
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${window.location.origin}/reset-password`
  })
  loading.value = false
  // Mensaje igual exista o no la cuenta (no revelamos qué emails están registrados), salvo cuando el correo NO ha
  // podido salir (límite de envíos o fallo del servidor de correo): ahí nunca se dice que se ha enviado.
  if (resetError && /rate limit|only request this after|error sending|smtp|unexpected_failure|\b535\b/i.test(resetError.message)) {
    error.value = translateAuthError(resetError.message)
    if (/demasiados intentos/i.test(error.value)) { lastEmail.value = email.value.trim().toLowerCase(); startCooldown() }
    return
  }
  sent.value = true
  resentNote.value = isResend
  lastEmail.value = email.value.trim().toLowerCase()
  startCooldown()
}

// «Me equivoqué de email»: vuelve al formulario con la dirección escrita para corregirla.
function changeEmail() {
  sent.value = false
  resentNote.value = false
  error.value = ''
}
</script>

<template>
  <AuthShell>
    <!-- Enlace enviado -->
    <template v-if="sent">
      <span class="grid place-items-center size-14 rounded-full bg-[var(--color-menta)] mb-5">
        <Icon name="ph:envelope-simple-open-fill" class="size-6" />
      </span>
      <h1 class="auth__title">Revisa tu email</h1>
      <p class="auth__sub" data-reset-sent>
        Si existe una cuenta con <strong class="text-[var(--text-strong)]">{{ email }}</strong>, te hemos enviado un enlace para elegir una contraseña nueva.
      </p>
      <ul class="grid gap-2 mt-5 text-sm text-[var(--text-muted)]">
        <li class="flex gap-2"><Icon name="ph:folder-simple-bold" class="size-4 mt-0.5 shrink-0" />Mira también la carpeta de spam o promociones.</li>
        <li class="flex gap-2"><Icon name="ph:browser-bold" class="size-4 mt-0.5 shrink-0" />Abre el enlace en este mismo navegador.</li>
        <li class="flex gap-2"><Icon name="ph:clock-bold" class="size-4 mt-0.5 shrink-0" />Caduca pronto y solo vale una vez. Usa siempre el último correo.</li>
      </ul>
      <div class="grid gap-2 mt-6">
        <BaseButton type="button" variant="outline" size="md" icon="ph:envelope-simple-bold" :loading="loading" :disabled="waiting" @click="submit(true)">
          {{ waiting ? `Reenviar en ${cooldown} s` : '¿No te ha llegado? Reenviar el enlace' }}
        </BaseButton>
        <p v-if="resentNote" class="text-sm text-[var(--text-muted)]" role="status">Listo, te lo hemos enviado otra vez.</p>
        <p v-if="error" class="text-sm text-[var(--color-danger)]" role="alert">{{ error }}</p>
      </div>
      <p class="text-sm text-[var(--text-muted)] mt-4">¿Te has equivocado de dirección? <button type="button" class="font-semibold underline text-[var(--text-strong)]" data-change-email @click="changeEmail">Cambiar el email</button></p>
      <p class="auth__alt"><NuxtLink to="/login">Volver a acceder</NuxtLink></p>
    </template>

    <!-- Formulario -->
    <template v-else>
      <h1 class="auth__title">Recupera tu contraseña</h1>
      <p class="auth__sub">Escribe el email de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>
      <form class="auth__form" @submit.prevent="submit()">
        <BaseField label="Email" :error="error" v-slot="f">
          <BaseInput v-bind="f" v-model="email" type="email" required autocomplete="email" placeholder="tu@email.com" />
        </BaseField>
        <BaseButton type="submit" variant="primary" size="lg" block :loading="loading" :disabled="waiting">
          {{ loading ? 'Enviando…' : waiting ? `Espera ${cooldown} s para volver a pedirlo` : 'Enviar enlace' }}
        </BaseButton>
      </form>
      <p class="auth__alt"><NuxtLink to="/login">Volver a acceder</NuxtLink></p>
    </template>
  </AuthShell>
</template>
