<script setup lang="ts">
import { createClient } from '@supabase/supabase-js'
import { translateAuthError } from '~/utils/auth-errors'
import {
  MIN_PASSWORD_LENGTH, OTP_LENGTH, OTP_RESEND_SECONDS, normalizeOtp, validateCurrentPassword, validateEmailChange, validateOtp, validatePasswordChange
} from '~/utils/account-credentials'
import { passwordStrength } from '~/utils/password-strength'

/**
 * «Acceso a la cuenta»: ver el email y cambiar la contraseña o el email desde dentro de CIBERAN.
 *
 * Contraseña, en dos pasos: (1) la contraseña actual, que se comprueba con un cliente aparte para no tocar la sesión real;
 * (2) un código de 6 dígitos que llega al correo (`auth.reauthenticate()`), junto a la contraseña nueva, con medidor de
 * fortaleza y la opción de cerrar las demás sesiones. Que el servidor EXIJA ese código depende del ajuste «Secure password
 * change» de Supabase Auth (ver docs/19-SEGURIDAD-CUENTA.md): sin él, el código es una barrera de la pantalla, no del servidor.
 * Email: pide la contraseña actual y el cambio no se aplica hasta abrir el enlace enviado al correo nuevo.
 */
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const config = useRuntimeConfig()
const toast = useToast()
const email = computed(() => String((user.value as { email?: string } | null)?.email ?? ''))
const emailHint = computed(() => email.value.split('@')[0] ?? '')

type Panel = 'password' | 'email' | null
const open = ref<Panel>(null)
const pwStep = ref<'verify' | 'code'>('verify')
const busy = ref(false)
const error = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const code = ref('')
const signOutOthers = ref(true)
const newEmail = ref('')
const emailSentTo = ref('')
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const strength = computed(() => passwordStrength(newPassword.value, [emailHint.value]))
watch(code, (v) => { const clean = normalizeOtp(v); if (clean !== v) code.value = clean })

function startCooldown() {
  cooldown.value = OTP_RESEND_SECONDS
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1)
    if (cooldown.value === 0 && timer) { clearInterval(timer); timer = null }
  }, 1000)
}
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

function reset() {
  error.value = ''
  currentPassword.value = newPassword.value = confirmPassword.value = code.value = newEmail.value = ''
  pwStep.value = 'verify'
  signOutOthers.value = true
}
function toggle(which: Exclude<Panel, null>) {
  open.value = open.value === which ? null : which
  reset()
}

/** Comprueba la contraseña actual con un cliente aparte: así no se renueva la sesión real (que el servidor usa para decidir si exige el código). */
async function confirmCurrentPassword(): Promise<boolean> {
  const pub = config.public.supabase as { url?: string; key?: string }
  const verifier = createClient(String(pub.url), String(pub.key), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { error: signInError } = await verifier.auth.signInWithPassword({ email: email.value, password: currentPassword.value })
  if (signInError) {
    error.value = signInError.message === 'Invalid login credentials' ? 'La contraseña actual no es correcta.' : translateAuthError(signInError.message)
    return false
  }
  return true
}

async function sendCode() {
  const { error: reauthError } = await supabase.auth.reauthenticate()
  if (reauthError) { error.value = translateAuthError(reauthError.message); return false }
  startCooldown()
  return true
}

/** Paso 1 → comprueba la contraseña actual y envía el código al correo. */
async function verifyAndSend() {
  if (busy.value) return
  error.value = validateCurrentPassword(currentPassword.value) ?? ''
  if (error.value) return
  busy.value = true
  try {
    if (!(await confirmCurrentPassword())) return
    if (!(await sendCode())) return
    pwStep.value = 'code'
  } finally {
    busy.value = false
  }
}

async function resend() {
  if (busy.value || cooldown.value > 0) return
  busy.value = true
  error.value = ''
  try {
    if (await sendCode()) toast.success('Te hemos enviado un código nuevo')
  } finally {
    busy.value = false
  }
}

/** Paso 2 → aplica la contraseña nueva con el código. */
async function changePassword() {
  if (busy.value) return
  error.value = validateOtp(code.value) ?? validatePasswordChange({ current: currentPassword.value, next: newPassword.value, confirm: confirmPassword.value, hints: [emailHint.value] }) ?? ''
  if (error.value) return
  busy.value = true
  try {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword.value, nonce: normalizeOtp(code.value) })
    if (updateError) { error.value = translateAuthError(updateError.message); return }
    if (signOutOthers.value) await supabase.auth.signOut({ scope: 'others' }).catch(() => undefined)
    toast.success(signOutOthers.value ? 'Contraseña cambiada. Se ha cerrado la sesión en tus otros dispositivos.' : 'Contraseña cambiada')
    open.value = null
    reset()
  } finally {
    busy.value = false
  }
}

async function changeEmail() {
  if (busy.value) return
  error.value = validateEmailChange({ currentEmail: email.value, next: newEmail.value, password: currentPassword.value }) ?? ''
  if (error.value) return
  busy.value = true
  try {
    if (!(await confirmCurrentPassword())) return
    const target = newEmail.value.trim()
    const { error: updateError } = await supabase.auth.updateUser({ email: target }, { emailRedirectTo: `${window.location.origin}/confirm` })
    if (updateError) { error.value = translateAuthError(updateError.message); return }
    emailSentTo.value = target
    toggle('email')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div data-account-access>
    <div class="setting-row">
      <div class="setting-row__text">
        <p class="setting-row__label">Email</p>
        <p class="setting-row__meta" data-account-email>{{ email || '—' }}</p>
      </div>
      <BaseButton variant="secondary" size="sm" icon="ph:envelope-simple-bold" :aria-expanded="open === 'email'" data-change-email-open @click="toggle('email')">Cambiar</BaseButton>
    </div>
    <p v-if="emailSentTo" class="setting-note" role="status" data-email-sent>
      Te hemos enviado un enlace de confirmación a <strong>{{ emailSentTo }}</strong>. El cambio se aplica cuando lo abras; hasta entonces sigues entrando con tu email actual.
    </p>
    <form v-if="open === 'email'" class="account-form" novalidate data-email-form @submit.prevent="changeEmail">
      <BaseField label="Email nuevo" v-slot="f"><BaseInput v-bind="f" v-model="newEmail" type="email" autocomplete="email" placeholder="tu@email.com" /></BaseField>
      <BaseField label="Tu contraseña actual" v-slot="f"><BaseInput v-bind="f" v-model="currentPassword" type="password" autocomplete="current-password" /></BaseField>
      <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
      <div class="account-form__actions">
        <BaseButton variant="ghost" size="sm" @click="toggle('email')">Cancelar</BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :loading="busy">Enviar enlace de confirmación</BaseButton>
      </div>
    </form>

    <div class="setting-row">
      <div class="setting-row__text">
        <p class="setting-row__label">Contraseña</p>
        <p class="setting-row__meta">Para cambiarla te pedimos la actual y un código que enviamos a tu correo.</p>
      </div>
      <BaseButton variant="secondary" size="sm" icon="ph:key-bold" :aria-expanded="open === 'password'" data-change-password-open @click="toggle('password')">Cambiar</BaseButton>
    </div>

    <form v-if="open === 'password' && pwStep === 'verify'" class="account-form" novalidate data-password-form data-step="verify" @submit.prevent="verifyAndSend">
      <p class="account-form__step">Paso 1 de 2 · Confirma que eres tú</p>
      <BaseField label="Contraseña actual" v-slot="f"><BaseInput v-bind="f" v-model="currentPassword" type="password" autocomplete="current-password" /></BaseField>
      <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
      <div class="account-form__actions">
        <BaseButton variant="ghost" size="sm" @click="toggle('password')">Cancelar</BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" icon="ph:paper-plane-tilt-bold" :loading="busy">Enviar código al correo</BaseButton>
      </div>
    </form>

    <form v-else-if="open === 'password' && pwStep === 'code'" class="account-form" novalidate data-password-form data-step="code" @submit.prevent="changePassword">
      <p class="account-form__step">Paso 2 de 2 · Código y contraseña nueva</p>
      <p class="account-form__lead" role="status"><Icon name="ph:envelope-open-bold" class="size-5 shrink-0" aria-hidden="true" />Te hemos enviado un código de {{ OTP_LENGTH }} dígitos a <strong>{{ email }}</strong>. Caduca en unos minutos; mira también el spam.</p>
      <BaseField label="Código del correo" v-slot="f">
        <BaseInput v-bind="f" v-model="code" inputmode="numeric" autocomplete="one-time-code" placeholder="······" class="account-code" data-otp />
      </BaseField>
      <BaseField label="Contraseña nueva" v-slot="f"><BaseInput v-bind="f" v-model="newPassword" type="password" autocomplete="new-password" data-new-password /></BaseField>
      <div v-if="newPassword" class="pwmeter" data-pw-meter :data-score="strength.score">
        <div class="pwmeter__bars" aria-hidden="true"><span v-for="n in 4" :key="n" :data-on="n <= strength.score" /></div>
        <p class="pwmeter__text"><strong>{{ strength.label }}.</strong> {{ strength.hint }}</p>
      </div>
      <p v-else class="setting-note">Mínimo {{ MIN_PASSWORD_LENGTH }} caracteres. Cuanto más larga, mejor.</p>
      <BaseField label="Repite la contraseña nueva" v-slot="f"><BaseInput v-bind="f" v-model="confirmPassword" type="password" autocomplete="new-password" /></BaseField>
      <label class="account-form__check"><input v-model="signOutOthers" type="checkbox" data-sign-out-others> Cerrar la sesión en mis otros dispositivos</label>
      <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
      <div class="account-form__actions">
        <BaseButton variant="ghost" size="sm" @click="toggle('password')">Cancelar</BaseButton>
        <BaseButton variant="secondary" size="sm" :disabled="busy || cooldown > 0" data-resend-code @click="resend">{{ cooldown > 0 ? `Reenviar código (${cooldown} s)` : 'Reenviar código' }}</BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :loading="busy">Cambiar contraseña</BaseButton>
      </div>
    </form>

    <p class="setting-note">¿No recuerdas la actual? Cierra sesión y usa «¿Olvidaste tu contraseña?» en la pantalla de acceso.</p>
  </div>
</template>
