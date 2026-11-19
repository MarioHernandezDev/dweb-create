<script setup lang="ts">
interface Step { icon: string; text: string }

const platforms: { value: string; label: string; steps: Step[] }[] = [
  {
    value: 'ios',
    label: 'iPhone',
    steps: [
      { icon: 'ph:compass-bold', text: 'Abre ciberan.app en Safari.' },
      { icon: 'ph:export-bold', text: 'Toca el icono de Compartir, en la barra inferior.' },
      { icon: 'ph:plus-square-bold', text: 'Elige «Añadir a pantalla de inicio» y confirma.' }
    ]
  },
  {
    value: 'android',
    label: 'Android',
    steps: [
      { icon: 'ph:compass-bold', text: 'Abre ciberan.app en Chrome.' },
      { icon: 'ph:dots-three-vertical-bold', text: 'Toca el menú de los tres puntos, arriba a la derecha.' },
      { icon: 'ph:download-simple-bold', text: 'Elige «Instalar aplicación» y confirma.' }
    ]
  },
  {
    value: 'desktop',
    label: 'Escritorio',
    steps: [
      { icon: 'ph:compass-bold', text: 'Abre ciberan.app en Chrome o Edge.' },
      { icon: 'ph:monitor-arrow-up-bold', text: 'Pulsa el icono de instalar en la barra de direcciones.' },
      { icon: 'ph:check-circle-bold', text: 'Confirma: CIBERAN se abre en su propia ventana.' }
    ]
  }
]

const active = ref('ios')
const current = computed(() => platforms.find((p) => p.value === active.value)!)
</script>

<template>
  <section id="app" class="band band--paper">
    <div class="container install">
      <div>
        <h2 class="band__title">Instala CIBERAN como una app, sin pasar por ninguna tienda.</h2>
        <p class="band__intro">Es una web que se instala: ocupa poco, abre en su propia ventana y el icono queda en tu pantalla de inicio.</p>

        <SegmentedTabs
          :options="platforms.map((p) => ({ value: p.value, label: p.label }))" :model-value="active"
          label="Dispositivo" class="mt-8" @update:model-value="active = $event"
        />

        <ol :key="active" class="install__steps">
          <li v-for="(step, i) in current.steps" :key="step.text" class="install__step">
            <span class="install__num" aria-hidden="true">{{ i + 1 }}</span>
            <p class="flex items-center gap-2">
              <Icon :name="step.icon" class="size-5 shrink-0 text-[var(--text-muted)]" />
              {{ step.text }}
            </p>
          </li>
        </ol>
      </div>

      <!-- Captura real del panel (cuenta demo del creador, pantalla «Hoy»). -->
      <div class="install__phone">
        <NuxtImg
          src="/img/panel-preview.png" alt="El panel de CIBERAN abierto como app en un móvil" width="390" height="780"
          fit="cover" class="install__shot"
        />
      </div>
    </div>
  </section>
</template>
