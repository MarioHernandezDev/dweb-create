<script setup lang="ts">
/** «Descargar mis datos»: una copia en JSON de lo que la cuenta tiene guardado en CIBERAN. */
const { exporting, error, download } = useDataExport()
const toast = useToast()

async function run() {
  if (await download()) toast.success('Descarga preparada: revisa tu carpeta de descargas')
}
</script>

<template>
  <div data-export>
    <div class="setting-row">
      <div class="setting-row__text">
        <p class="setting-row__label">Descargar mis datos</p>
        <p class="setting-row__meta">Un archivo con tu ficha, publicaciones, colaboraciones, mensajes enviados y avisos. No incluye credenciales ni datos de pago.</p>
      </div>
      <BaseButton variant="secondary" size="sm" icon="ph:download-simple-bold" :loading="exporting" @click="run">Descargar</BaseButton>
    </div>
    <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
  </div>
</template>
