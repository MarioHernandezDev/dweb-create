<script setup lang="ts">
interface Step { icon: string; text: string }

const platforms: { value: string; label: string; steps: Step[] }[] = [
  {
    value: 'ios',
    label: 'iPhone',
    steps: [
      { icon: 'ph:compass-bold', text: 'Abre ciberan.app en Safari.' },
      { icon: 'ph:export-bold', text: 'Toca el icono de Compartir, en la barra inferior.' },
      { icon: 'ph:plus-square-bold', text: 'Elige "Añadir a pantalla de inicio" y confirma.' }
    ]
  },
  {
    value: 'android',
    label: 'Android',
    steps: [
      { icon: 'ph:compass-bold', text: 'Abre ciberan.app en Chrome.' },
      { icon: 'ph:dots-three-vertical-bold', text: 'Toca el menú de los tres puntos, arriba a la derecha.' },
      { icon: 'ph:download-simple-bold', text: 'Elige "Instalar aplicación" y confirma.' }
    ]
  },
  {
    value: 'desktop',
    label: 'Escritorio',
    steps: [
      { icon: 'ph:compass-bold', text: 'Abre ciberan.app en Chrome o Edge.' },
      { icon: 'ph:monitor-arrow-up-bold', text: 'Pulsa el icono de instalar en la barra de direcciones.' },
      { icon: 'ph:check-circle-bold', text: 'Confirma — CIBERAN se abre en su propia ventana.' }
    ]
  }
]

const active = ref('ios')
const current = computed(() => platforms.find((p) => p.value === active.value)!)
</script>

<template>
  <section id="app" class="bg-[var(--color-ink)] px-5 md:px-10 lg:px-16 py-20 md:py-28">
    <div class="max-w-6xl mx-auto grid md:grid-cols-[1fr_auto] gap-12 md:gap-16 items-start">
      <div>
        <p class="text-[0.8125rem] font-medium text-[var(--color-primary-500)] mb-2">Llévatela al móvil</p>
        <h3 class="font-display font-light text-[clamp(1.5rem,3.2vw,2.25rem)] text-[var(--color-text)] max-w-[30ch] mb-3">
          Instala CIBERAN como una app, sin pasar por ninguna tienda.
        </h3>
        <p class="text-[0.9375rem] text-[var(--color-text-muted)] leading-relaxed max-w-[48ch] mb-8">
          Es una web que se instala: ocupa poco, abre en su propia ventana y el icono queda en tu pantalla de inicio.
        </p>

        <SegmentedTabs
          :options="platforms.map((p) => ({ value: p.value, label: p.label }))" :model-value="active"
          class="mb-7" @update:model-value="active = $event"
        />

        <Transition
          mode="out-in" enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0 translate-y-1.5"
          leave-active-class="transition-opacity duration-100" leave-to-class="opacity-0"
        >
          <ol :key="active" class="flex flex-col gap-4 max-w-[30rem]">
            <li v-for="(step, i) in current.steps" :key="step.text" class="flex items-start gap-4">
              <span class="flex items-center justify-center size-8 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] text-[0.8125rem] font-medium shrink-0">
                {{ i + 1 }}
              </span>
              <p class="text-[0.9375rem] text-[var(--color-text)] leading-relaxed pt-1 flex items-center gap-2">
                <Icon :name="step.icon" class="size-4 text-[var(--color-text-faint)] shrink-0" />
                {{ step.text }}
              </p>
            </li>
          </ol>
        </Transition>
      </div>

      <div class="justify-self-center md:justify-self-end">
        <!-- Captura real del panel (hallazgo #21: antes esto era una
             cuadrícula de iconos genérica, no se veía el producto de
             verdad) — cuenta demo del creador, pantalla "Hoy". -->
        <div class="relative w-44 h-[22rem] rounded-[2.25rem] border-[6px] border-[var(--color-primary-900)] bg-[var(--color-ink-overlay)] shadow-[var(--shadow-float)] overflow-hidden">
          <div class="absolute top-0 inset-x-0 h-5 flex items-center justify-center z-10">
            <div class="w-16 h-3.5 rounded-full bg-[var(--color-primary-900)]" />
          </div>
          <NuxtImg
            src="/img/panel-preview.png" alt="El panel de CIBERAN abierto como app en un móvil" width="390" height="780"
            fit="cover" class="absolute inset-0 size-full object-cover object-top"
          />
          <div class="absolute bottom-4 inset-x-4 flex items-center gap-2 bg-[var(--color-ink-raised)] rounded-[var(--radius-xs)] px-3 py-2 shadow-[var(--shadow-float)]">
            <Icon name="ph:check-circle-fill" class="size-4 text-[var(--color-status-published)] shrink-0" />
            <span class="text-[0.6875rem] text-[var(--color-text)]">CIBERAN añadida a inicio</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
