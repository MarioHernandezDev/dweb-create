<script setup lang="ts">
/**
 * Imagen de contenido (portadas de perfiles, avatares, fotos de publicaciones)
 * pensada para cargar rápido:
 *  - las fotos de la app (Storage público y /img/) pasan por /api/img, que las
 *    sirve en webp al tamaño exacto con que se pintan y guarda el resultado en
 *    el servidor: nunca se descarga la original de varios MB;
 *  - `srcset` por densidad (1x / 2x): cada pantalla pide solo lo que necesita;
 *  - carga diferida salvo `priority` (las primeras tarjetas), que se piden ya
 *    y con `fetchpriority` alto;
 *  - `width`/`height` reservan la caja (sin saltos de maquetación) y lo que
 *    haya debajo (CoverArt, iniciales) se ve hasta que la foto pinta: nunca un
 *    hueco en blanco.
 * Lo que no es de la app (vista previa local blob:/data:) se pinta tal cual.
 * Si la foto falla, emite `error` para que el padre muestre su alternativa.
 */
const props = withDefaults(defineProps<{
  src: string
  alt?: string
  width: number
  height: number
  priority?: boolean
  quality?: number
}>(), { alt: '', quality: 70 })

defineEmits<{ error: [] }>()

const proxied = computed(() => props.src.startsWith('/img/') || /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//.test(props.src))
const url = (w: number, h: number) => `/api/img?u=${encodeURIComponent(props.src)}&w=${w}&h=${h}&q=${props.quality}`
const srcset = computed(() => (proxied.value ? `${url(props.width, props.height)} 1x, ${url(props.width * 2, props.height * 2)} 2x` : undefined))
</script>

<template>
  <img
    :src="proxied ? url(width, height) : src" :srcset="srcset" :alt="alt" :width="width" :height="height"
    :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : 'auto'" decoding="async"
    class="smart-image" @error="$emit('error')"
  >
</template>
