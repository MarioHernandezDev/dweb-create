<script setup lang="ts">
/**
 * Raya, la mantarraya de CIBERAN, como personaje: la misma criatura del símbolo de la marca, pero dibujada en vectores
 * para poder moverse (aletas que baten, cola que ondula) y expresarse (ojos que miran hacia `look`, estados de ánimo).
 * Es decorativa: no lleva texto accesible. Todo el movimiento es CSS (transform) y se apaga con movimiento reducido.
 *
 * - `tone="ink"`: sobre fondos claros (cuerpo de tinta, manchas hueso, acentos voltio).
 * - `tone="light"`: sobre fondos oscuros (cuerpo hueso, manchas tinta, acentos voltio).
 * - `mood`: «swim» (nada tranquila), «happy» (bate rápido y salta), «wow» (aletas abiertas, ojos grandes),
 *   «sleepy» (ojos entornados, aleteo lento).
 * - `look`: hacia dónde mira, de -1 a 1 en cada eje (en el sistema de la propia mantarraya).
 * - `still`: sin animación (listados vacíos largos, impresión…).
 */
const props = withDefaults(defineProps<{
  size?: number
  mood?: 'swim' | 'happy' | 'wow' | 'sleepy'
  tone?: 'ink' | 'light'
  look?: { x: number; y: number }
  still?: boolean
}>(), { size: 96, mood: 'swim', tone: 'ink', look: () => ({ x: 0, y: 0 }), still: false })

const pupil = computed(() => ({ transform: `translate(${(props.look.x * 1.7).toFixed(2)}px, ${(props.look.y * 1.7).toFixed(2)}px)` }))
</script>

<template>
  <svg
    class="ray" :class="[`ray--${mood}`, `ray--${tone}`, still && 'is-still']"
    viewBox="0 0 200 172" :width="size" :height="Math.round(size * 0.86)" aria-hidden="true" focusable="false"
  >
    <!-- Cola -->
    <g class="ray__tail"><path d="M100 120 C 96 138, 105 152, 99 168" /></g>

    <!-- Aletas (baten en espejo alrededor del cuerpo) -->
    <g class="ray__wing ray__wing--l">
      <path class="ray__wing-shape" d="M100 46 C 76 37, 34 50, 3 106 C 30 91, 62 98, 100 122 Z" />
      <path class="ray__wing-line" d="M94 66 C 68 64, 38 78, 20 100" />
    </g>
    <g class="ray__wing ray__wing--r">
      <path class="ray__wing-shape" d="M100 46 C 124 37, 166 50, 197 106 C 170 91, 138 98, 100 122 Z" />
      <path class="ray__wing-line" d="M106 66 C 132 64, 162 78, 180 100" />
    </g>

    <!-- Cuerpo y aletas cefálicas («cuernos») -->
    <path class="ray__horn" d="M93 38 C 86 26, 83 16, 90 10 C 92 19, 96 27, 99 35 Z" />
    <path class="ray__horn" d="M107 38 C 114 26, 117 16, 110 10 C 108 19, 104 27, 101 35 Z" />
    <path class="ray__body" d="M100 28 C 113 32, 119 52, 117 78 C 115 104, 108 120, 100 126 C 92 120, 85 104, 83 78 C 81 52, 87 32, 100 28 Z" />

    <!-- Manchas de los hombros -->
    <path class="ray__patch" d="M93 60 C 85 65, 83 78, 87 92 C 93 86, 97 74, 97 60 Z" />
    <path class="ray__patch" d="M107 60 C 115 65, 117 78, 113 92 C 107 86, 103 74, 103 60 Z" />

    <!-- Ojos -->
    <g class="ray__eyes">
      <g class="ray__eye"><circle class="ray__eye-white" cx="90" cy="44" r="4.3" /><circle class="ray__pupil" cx="90" cy="44" r="2.1" :style="pupil" /></g>
      <g class="ray__eye"><circle class="ray__eye-white" cx="110" cy="44" r="4.3" /><circle class="ray__pupil" cx="110" cy="44" r="2.1" :style="pupil" /></g>
    </g>
  </svg>
</template>
