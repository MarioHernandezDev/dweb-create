<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { localPhotos } from '~/utils/images'
import { translateAuthError } from '~/utils/auth-errors'
import type { Role } from '~/types'

useHead({ title: 'Crear cuenta' })

const banner = localPhotos.onboarding
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
const orgLabel = 'Nombre de la empresa'
const detailLabel = computed(() => (selectedRole.value === 'partner' ? 'Sector (opcional)' : 'Nicho (opcional)'))

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
  <div class="min-h-dvh bg-[var(--color-ink)] flex flex-col">
    <header class="flex items-center gap-2.5 px-5 py-5 md:px-10 md:py-6 max-w-xl mx-auto w-full">
      <NuxtImg src="/img/logo-svg.png" alt="" width="28" height="28" class="size-7" />
      <span class="font-brand text-[1.0625rem] text-[var(--color-text)]">FEEDMA</span>
    </header>

    <main class="flex-1 flex items-center">
      <div class="w-full max-w-xl mx-auto px-5 md:px-10 py-8">
        <div v-if="stage === 'form'" class="flex items-center gap-1.5 mb-6">
          <button
            v-if="step > 1" type="button" aria-label="Volver" class="-ml-1 mr-1 size-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)]"
            @click="back"
          >
            <Icon name="ph:arrow-left-bold" class="size-4" />
          </button>
          <span
            v-for="n in 2" :key="n" class="h-1.5 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-spring)]"
            :class="n <= step ? 'w-7 bg-[var(--color-primary-500)]' : 'w-3.5 bg-[var(--color-ink-overlay)]'"
          />
        </div>

        <Transition
          enter-active-class="transition-[opacity,transform] duration-250 ease-[var(--ease-spring)]" enter-from-class="opacity-0 translate-x-3"
          leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 -translate-x-3"
          mode="out-in"
        >
          <!-- Paso 1: elegir rol -->
          <div v-if="stage === 'form' && step === 1" key="role">
            <div class="relative h-36 md:h-44 rounded-[var(--radius-lg)] overflow-hidden mb-6">
              <CoverImage :photo="banner" :width="640" :height="360" scrim="tint" class="absolute inset-0" />
            </div>
            <h1 class="font-display text-[1.875rem] md:text-[2.25rem] leading-[1.1] text-[var(--color-text)] mb-2">¿Quién eres?</h1>
            <p class="text-[0.9375rem] text-[var(--color-text-muted)] mb-7">Así te mostramos la pantalla que te hace falta, y nada más.</p>
            <div class="flex flex-col gap-3">
              <button v-for="role in roles" :key="role" type="button" class="text-left" @click="chooseRole(role)">
                <BaseCard radius="lg" padding="lg" interactive class="flex items-center gap-4">
                  <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
                    <Icon :name="roleMeta[role].icon" class="size-5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="font-display text-[1.1875rem] text-[var(--color-text)]">{{ roleMeta[role].label }}</p>
                    <p class="mt-0.5 text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">{{ roleMeta[role].description }}</p>
                  </div>
                  <Icon name="ph:arrow-right-bold" class="size-4 shrink-0 text-[var(--color-text-faint)]" />
                </BaseCard>
              </button>
            </div>
          </div>

          <!-- Paso 2: formulario real de registro -->
          <form v-else-if="stage === 'form'" key="register" class="flex flex-col gap-4" @submit.prevent="register">
            <h1 class="font-display text-[1.875rem] md:text-[2.25rem] leading-[1.1] text-[var(--color-text)] mb-1">Crea tu cuenta</h1>
            <p class="text-[0.9375rem] text-[var(--color-text-muted)] mb-2">Como {{ selectedRole ? roleMeta[selectedRole].label : '' }}.</p>

            <div>
              <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="full-name">Tu nombre</label>
              <input
                id="full-name" v-model="fullName" type="text" required autocomplete="name"
                class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
              >
            </div>

            <div v-if="needsOrgName">
              <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="org-name">{{ orgLabel }}</label>
              <input
                id="org-name" v-model="orgName" type="text" required
                class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
              >
            </div>

            <div>
              <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="detail">{{ detailLabel }}</label>
              <input
                id="detail" v-model="detail" type="text"
                class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
              >
            </div>

            <div>
              <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="signup-email">Email</label>
              <input
                id="signup-email" v-model="email" type="email" required autocomplete="email"
                class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
              >
            </div>

            <div>
              <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="signup-password">Contraseña</label>
              <input
                id="signup-password" v-model="password" type="password" required minlength="8" autocomplete="new-password"
                class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
              >
              <p class="mt-1 text-[0.75rem] text-[var(--color-text-faint)]">Al menos 8 caracteres.</p>
            </div>

            <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)]">{{ error }}</p>

            <BaseButton
              type="submit" variant="primary" size="lg" class="w-full mt-1" :icon-spin="loading"
              :icon="loading ? 'ph:circle-notch-bold' : 'ph:arrow-right-bold'" :disabled="loading"
            >
              {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
            </BaseButton>

            <p class="text-[0.75rem] text-[var(--color-text-faint)] text-center">
              Al crear tu cuenta aceptas los
              <NuxtLink to="/terminos" target="_blank" class="underline underline-offset-2 hover:text-[var(--color-text-muted)]">términos</NuxtLink>
              y la
              <NuxtLink to="/privacidad" target="_blank" class="underline underline-offset-2 hover:text-[var(--color-text-muted)]">política de privacidad</NuxtLink>.
            </p>
          </form>

          <!-- Confirmación de email -->
          <div v-else key="sent" class="text-center py-6">
            <span class="inline-flex items-center justify-center size-16 rounded-full bg-[var(--color-status-published)]/15 text-[var(--color-status-published)] mb-5">
              <Icon name="ph:envelope-simple-open-fill" class="size-7" />
            </span>
            <h1 class="font-display text-[1.875rem] md:text-[2.25rem] leading-[1.1] text-[var(--color-text)] mb-2">Revisa tu email</h1>
            <p class="text-[0.9375rem] text-[var(--color-text-muted)] max-w-[38ch] mx-auto mb-7">
              Te hemos enviado un enlace a <strong class="text-[var(--color-text)]">{{ email }}</strong> para confirmar tu cuenta. En cuanto lo confirmes, ya puedes entrar con tu email y contraseña.
            </p>
            <BaseButton to="/login" variant="secondary" size="lg" icon="ph:arrow-left-bold">Volver a acceder</BaseButton>
          </div>
        </Transition>
      </div>
    </main>
  </div>
</template>
