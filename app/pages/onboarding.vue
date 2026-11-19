<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { translateAuthError } from '~/utils/auth-errors'
import type { Role } from '~/types'
import { TERMS_VERSION } from '~/utils/legal'

useHead({ title: 'Crear cuenta' })

const supabase = useSupabaseClient()

type Stage = 'form' | 'sent'

const roles: Role[] = ['creator', 'partner']
const selectedRole = ref<Role | null>(null)
const stage = ref<Stage>('form')

const step = computed(() => (!selectedRole.value ? 1 : 2))

function chooseRole(role: Role) {
  selectedRole.value = role
}

function back() {
  selectedRole.value = null
}

const fullName = ref('')
const orgName = ref('') // nombre de empresa — solo partner
const detail = ref('') // niche/industry, opcional
const email = ref('')
const password = ref('')
const passwordRepeat = ref('')
const acceptedTerms = ref(false)
const loading = ref(false)
const error = ref('')
// El email ya tiene cuenta: el aviso va junto al campo de email (no bajo la contraseña) y con enlace para acceder.
const existingAccount = ref(false)
const repeatTouched = ref(false)
const { sending: resending, sent: resent, error: resendError, cooldown, resend } = useResendConfirmation()
const passwordMismatch = computed(() => (repeatTouched.value || passwordRepeat.value.length > 0) && password.value !== passwordRepeat.value)

const needsOrgName = computed(() => selectedRole.value === 'partner')
const detailLabel = computed(() => (selectedRole.value === 'partner' ? 'Sector' : 'Nicho'))

async function register() {
  if (!selectedRole.value) return
  if (password.value !== passwordRepeat.value) {
    error.value = ''
    repeatTouched.value = true
    return
  }
  if (!acceptedTerms.value) {
    error.value = 'Tienes que aceptar los términos y la política de privacidad para crear la cuenta.'
    return
  }
  loading.value = true
  error.value = ''
  existingAccount.value = false

  resetAccountCaches()

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      // El enlace del correo vuelve a ESTA app (no al «Site URL» del panel, que hoy es localhost).
      emailRedirectTo: `${window.location.origin}/confirm`,
      data: {
        role: selectedRole.value,
        full_name: fullName.value,
        // Para creator (sin campo de empresa), el display_name es el
        // propio nombre — ver handle_new_user() en la migración.
        name: needsOrgName.value ? orgName.value : fullName.value,
        detail: detail.value || null,
        // Versión aceptada en el alta: TermsGate la registra en la cuenta al primer acceso.
        terms_version: TERMS_VERSION
      }
    }
  })

  loading.value = false
  if (signUpError) {
    error.value = translateAuthError(signUpError.message)
    return
  }

  // Con un email que ya tiene cuenta confirmada, Supabase responde «éxito» sin enviar nada (para no revelar qué
  // emails existen) y devuelve el usuario sin identidades. Antes la pantalla decía «Revisa tu email» y el correo
  // nunca llegaba: ahora se avisa. Una cuenta pendiente de confirmar sí conserva su identidad (se reenvía el correo).
  if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
    error.value = 'Ya existe una cuenta con ese email. Accede con ella, o usa otro email (con Gmail vale una variante tipo tunombre+marca@gmail.com).'
    existingAccount.value = true
    return
  }

  stage.value = 'sent'
}

// «Me equivoqué de email»: vuelve al formulario con todo lo escrito para corregirlo y crear la cuenta con la dirección buena.
function changeEmail() {
  stage.value = 'form'
  error.value = ''
}
</script>

<template>
  <AuthShell claim="Empieza por decirnos quién eres." sub="Así te mostramos la pantalla que te hace falta, y nada más.">
    <Transition
      enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-out)]" enter-from-class="opacity-0 translate-x-3"
      leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-out)]" leave-to-class="opacity-0 -translate-x-3"
      mode="out-in"
    >
      <!-- Paso 1: elegir rol -->
      <div v-if="stage === 'form' && step === 1" key="role">
        <p class="text-sm font-semibold text-[var(--text-muted)] mb-3">Paso 1 de 2</p>
        <h1 class="auth__title">¿Quién eres?</h1>
        <p class="auth__sub">Elige el perfil con el que vas a usar CIBERAN.</p>
        <div class="grid gap-3 mt-7">
          <button v-for="role in roles" :key="role" type="button" class="text-left" @click="chooseRole(role)">
            <BaseCard radius="lg" padding="lg" interactive class="flex items-center gap-4">
              <span class="grid place-items-center size-12 rounded-full bg-[var(--color-voltio-200)] shrink-0">
                <Icon :name="roleMeta[role].icon" class="size-5" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="font-display text-lg font-bold">{{ roleMeta[role].label }}</p>
                <p class="mt-0.5 text-sm text-[var(--text-muted)]">{{ roleMeta[role].description }}</p>
              </div>
              <Icon name="ph:arrow-right-bold" class="size-4 shrink-0 text-[var(--text-muted)]" />
            </BaseCard>
          </button>
        </div>
      </div>

      <!-- Paso 2: formulario real de registro -->
      <form v-else-if="stage === 'form'" key="register" @submit.prevent="register">
        <div class="flex items-center gap-2 mb-3">
          <IconButton icon="ph:arrow-left-bold" label="Volver al paso 1" size="sm" class="-ml-2" @click="back" />
          <p class="text-sm font-semibold text-[var(--text-muted)]">Paso 2 de 2</p>
        </div>
        <h1 class="auth__title">Crea tu cuenta</h1>
        <p class="auth__sub">Como {{ selectedRole ? roleMeta[selectedRole].label.toLowerCase() : '' }}.</p>

        <div class="auth__form">
          <BaseField label="Tu nombre" v-slot="f">
            <BaseInput v-bind="f" v-model="fullName" required autocomplete="name" />
          </BaseField>
          <BaseField v-if="needsOrgName" label="Nombre de la empresa" v-slot="f">
            <BaseInput v-bind="f" v-model="orgName" required />
          </BaseField>
          <BaseField :label="detailLabel" optional v-slot="f">
            <BaseInput v-bind="f" v-model="detail" />
          </BaseField>
          <BaseField label="Email" :error="existingAccount ? error : ''" v-slot="f">
            <BaseInput v-bind="f" v-model="email" type="email" required autocomplete="email" />
          </BaseField>
          <p v-if="existingAccount" class="text-sm -mt-2" data-existing-account><NuxtLink to="/login" class="font-semibold underline">Ir a acceder</NuxtLink></p>
          <BaseField label="Contraseña" hint="Al menos 8 caracteres." :error="existingAccount ? '' : error" v-slot="f">
            <BaseInput v-bind="f" v-model="password" type="password" required minlength="8" autocomplete="new-password" />
          </BaseField>
          <BaseField label="Repite la contraseña" :error="passwordMismatch ? 'Las contraseñas no coinciden.' : ''" v-slot="f">
            <BaseInput v-bind="f" v-model="passwordRepeat" type="password" required minlength="8" autocomplete="new-password" data-password-repeat />
          </BaseField>

          <label class="proposal__check text-[var(--text-muted)]" data-terms-check>
            <input v-model="acceptedTerms" type="checkbox" required>
            <span>
              He leído y acepto los
              <NuxtLink to="/terminos" target="_blank" class="underline">términos</NuxtLink>
              y la
              <NuxtLink to="/privacidad" target="_blank" class="underline">política de privacidad</NuxtLink>.
            </span>
          </label>

          <BaseButton type="submit" variant="primary" size="lg" block :loading="loading" :icon="loading ? undefined : 'ph:arrow-right-bold'">
            {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
          </BaseButton>

          <p class="text-sm text-[var(--text-muted)] text-center">Crear la cuenta es gratis. Tu perfil será visible para otros usuarios y, si no lo cambias en Privacidad, también con su enlace sin iniciar sesión.</p>
        </div>
      </form>

      <!-- Confirmación de email -->
      <div v-else key="sent">
        <span class="grid place-items-center size-14 rounded-full bg-[var(--color-menta)] mb-5">
          <Icon name="ph:envelope-simple-open-fill" class="size-6" />
        </span>
        <h1 class="auth__title">Revisa tu email</h1>
        <p class="auth__sub">
          Te hemos enviado un enlace a <strong class="text-[var(--text-strong)]">{{ email }}</strong> para confirmar tu cuenta. En cuanto lo confirmes, ya puedes entrar con tu email y contraseña.
        </p>
        <div class="grid gap-2 mt-6" data-resend-confirmation>
          <BaseButton type="button" variant="outline" size="md" icon="ph:envelope-simple-bold" :loading="resending" :disabled="cooldown > 0" @click="resend(email)">
            {{ cooldown > 0 ? `Reenviar en ${cooldown} s` : '¿No te ha llegado? Reenviar el correo' }}
          </BaseButton>
          <p v-if="resent" class="text-sm text-[var(--text-muted)]" role="status">Listo, te lo hemos enviado otra vez. Mira también el spam.</p>
          <p v-if="resendError" class="text-sm text-[var(--color-danger)]" role="alert">{{ resendError }}</p>
        </div>
        <p class="text-sm text-[var(--text-muted)] mt-4">¿Te has equivocado de dirección? <button type="button" class="font-semibold underline text-[var(--text-strong)]" data-change-email @click="changeEmail">Cambiar el email</button></p>
        <BaseButton to="/login" variant="secondary" size="lg" icon="ph:arrow-left-bold" class="mt-4">Volver a acceder</BaseButton>
      </div>
    </Transition>

    <p v-if="stage === 'form'" class="auth__alt">¿Ya tienes cuenta? <NuxtLink to="/login">Accede</NuxtLink></p>
  </AuthShell>
</template>
