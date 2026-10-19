<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { localPhotos } from '~/utils/images'
import type { Role } from '~/types'

useHead({ title: 'Bienvenida' })

const banner = localPhotos.onboarding

type WorkMode = 'solo' | 'manager'

const roles: Role[] = ['manager', 'creator', 'client']
const selectedRole = ref<Role | null>(null)
const workMode = ref<WorkMode | null>(null)

// El influencer tiene un paso extra (solo/con manager); los otros dos roles
// van directos del paso 1 al de bienvenida.
const needsWorkModeStep = computed(() => selectedRole.value === 'creator')
const step = computed(() => {
  if (!selectedRole.value) return 1
  if (needsWorkModeStep.value && !workMode.value) return 2
  return 3
})
const totalSteps = computed(() => (needsWorkModeStep.value ? 3 : 2))

function chooseRole(role: Role) {
  selectedRole.value = role
  workMode.value = null
}

function back() {
  if (step.value === 3 && needsWorkModeStep.value) workMode.value = null
  else selectedRole.value = null
}

const welcomeCopy = computed(() => {
  if (selectedRole.value === 'manager') {
    return 'A partir de aquí verás el resumen de tu roster: cuántas entregas quedan esta semana y de quién.'
  }
  if (selectedRole.value === 'client') {
    return 'Desde aquí puedes contactar a un influencer o a una agencia, y aprobar su contenido cuando esté listo.'
  }
  if (workMode.value === 'manager') {
    return 'Te llevamos a tu calendario. Cuando una agencia te acepte en su roster, lo verás reflejado en tu perfil.'
  }
  return 'Te llevamos a tu calendario. Puedes conectar tus redes cuando quieras desde "Redes".'
})
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)] flex flex-col">
    <header class="flex items-center gap-2.5 px-5 py-5 md:px-10 md:py-6 max-w-xl mx-auto w-full">
      <NuxtImg src="/img/logo-svg.png" alt="" width="28" height="28" class="size-7" />
      <span class="font-display text-[1.0625rem] text-[var(--color-text)]">FEEDMA</span>
    </header>

    <main class="flex-1 flex items-center">
      <div class="w-full max-w-xl mx-auto px-5 md:px-10 py-8">
        <div class="flex items-center gap-1.5 mb-6">
          <button
            v-if="step > 1" type="button" aria-label="Volver" class="-ml-1 mr-1 size-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)]"
            @click="back"
          >
            <Icon name="ph:arrow-left-bold" class="size-4" />
          </button>
          <span
            v-for="n in totalSteps" :key="n" class="h-1.5 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-spring)]"
            :class="n <= step ? 'w-7 bg-[var(--color-primary-500)]' : 'w-3.5 bg-[var(--color-ink-overlay)]'"
          />
        </div>

        <Transition
          enter-active-class="transition-[opacity,transform] duration-250 ease-[var(--ease-spring)]" enter-from-class="opacity-0 translate-x-3"
          leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 -translate-x-3"
          mode="out-in"
        >
          <!-- Paso 1: elegir rol -->
          <div v-if="step === 1" key="role">
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

          <!-- Paso 2 (solo influencer): solo o con manager -->
          <div v-else-if="step === 2" key="workmode">
            <h1 class="font-display text-[1.875rem] md:text-[2.25rem] leading-[1.1] text-[var(--color-text)] mb-2">¿Trabajas solo o con un manager?</h1>
            <p class="text-[0.9375rem] text-[var(--color-text-muted)] mb-7">Puedes cambiarlo más adelante — esto solo decide quién puede gestionar tus entregas además de ti.</p>
            <div class="flex flex-col gap-3">
              <button type="button" class="text-left" @click="workMode = 'solo'">
                <BaseCard radius="lg" padding="lg" interactive class="flex items-center gap-4">
                  <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
                    <Icon name="ph:user-fill" class="size-5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="font-display text-[1.1875rem] text-[var(--color-text)]">Trabajo solo</p>
                    <p class="mt-0.5 text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">Las marcas te contactan directamente. Gestionas tú todo tu calendario.</p>
                  </div>
                </BaseCard>
              </button>
              <button type="button" class="text-left" @click="workMode = 'manager'">
                <BaseCard radius="lg" padding="lg" interactive class="flex items-center gap-4">
                  <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
                    <Icon name="ph:users-three-fill" class="size-5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="font-display text-[1.1875rem] text-[var(--color-text)]">Busco un manager</p>
                    <p class="mt-0.5 text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">Una agencia reparte el trabajo por ti y negocia con las marcas.</p>
                  </div>
                </BaseCard>
              </button>
            </div>
          </div>

          <!-- Paso final: bienvenida -->
          <div v-else key="done" class="text-center py-6">
            <span class="inline-flex items-center justify-center size-16 rounded-full bg-[var(--color-status-published)]/15 text-[var(--color-status-published)] mb-5">
              <Icon name="ph:check-fill" class="size-7" />
            </span>
            <h1 class="font-display text-[1.875rem] md:text-[2.25rem] leading-[1.1] text-[var(--color-text)] mb-2">Todo listo</h1>
            <p class="text-[0.9375rem] text-[var(--color-text-muted)] max-w-[34ch] mx-auto mb-7">{{ welcomeCopy }}</p>
            <BaseButton v-if="selectedRole" :to="roleMeta[selectedRole].home" variant="primary" size="lg" icon="ph:arrow-right-bold">
              Entrar a {{ roleMeta[selectedRole].label }}
            </BaseButton>
          </div>
        </Transition>
      </div>
    </main>
  </div>
</template>
