<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { translateAuthError } from '~/utils/auth-errors'
import type { Role } from '~/types'

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
const loading = ref(false)
const error = ref('')

const needsOrgName = computed(() => selectedRole.value === 'partner')
const detailLabel = computed(() => (selectedRole.value === 'partner' ? 'Sector' : 'Nicho'))

async function register() {
  if (!selectedRole.value) return
  loading.value = true
  error.value = ''

  resetAccountCaches()

  const { error: signUpError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: {
        role: selectedRole.value,
        full_name: fullName.value,
        // Para creator (sin campo de empresa), el display_name es el
        // propio nombre — ver handle_new_user() en la migración.
        name: needsOrgName.value ? orgName.value : fullName.value,
        detail: detail.value || null
      }
    }
  })

  loading.value = false
  if (signUpError) {
    error.value = translateAuthError(signUpError.message)
    return
  }

  stage.value = 'sent'
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
          <BaseField label="Email" v-slot="f">
            <BaseInput v-bind="f" v-model="email" type="email" required autocomplete="email" />
          </BaseField>
          <BaseField label="Contraseña" hint="Al menos 8 caracteres." :error="error" v-slot="f">
            <BaseInput v-bind="f" v-model="password" type="password" required minlength="8" autocomplete="new-password" />
          </BaseField>

          <BaseButton type="submit" variant="primary" size="lg" block :loading="loading" :icon="loading ? undefined : 'ph:arrow-right-bold'">
            {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
          </BaseButton>

          <p class="text-sm text-[var(--text-muted)] text-center">
            Al crear tu cuenta aceptas los
            <NuxtLink to="/terminos" target="_blank" class="underline">términos</NuxtLink>
            y la
            <NuxtLink to="/privacidad" target="_blank" class="underline">política de privacidad</NuxtLink>.
          </p>
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
        <BaseButton to="/login" variant="secondary" size="lg" icon="ph:arrow-left-bold" class="mt-7">Volver a acceder</BaseButton>
      </div>
    </Transition>

    <p v-if="stage === 'form'" class="auth__alt">¿Ya tienes cuenta? <NuxtLink to="/login">Accede</NuxtLink></p>
  </AuthShell>
</template>
