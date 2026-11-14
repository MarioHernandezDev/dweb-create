<script setup lang="ts">
/** «Descargar mis datos»: una copia, en un ZIP con hojas CSV que abren Excel o Google Sheets, de lo que la cuenta tiene guardado en CIBERAN. */
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
        <p class="setting-row__meta">Un ZIP con una hoja por tema (ficha, publicaciones, colaboraciones, mensajes enviados, avisos…) y un LEEME. No incluye credenciales ni datos de pago.</p>
      </div>
      <BaseButton variant="secondary" size="sm" icon="ph:download-simple-bold" :loading="exporting" @click="run">Descargar</BaseButton>
    </div>
    <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
  </div>
</template>
