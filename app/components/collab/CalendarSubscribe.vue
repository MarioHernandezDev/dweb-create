<script setup lang="ts">
/**
 * «Suscribirme al calendario»: un enlace privado que Google Calendar, Apple Calendar u Outlook consultan solos, así las fechas
 * de entrega se mantienen al día sin descargar nada. Quien tenga el enlace ve esas fechas: por eso se puede renovar.
 */
const open = ref(false)
const { url, webcalUrl, loading, error, load, rotate } = useCalendarFeed()
const { confirm } = useConfirm()
const toast = useToast()

async function show() {
  open.value = true
  await load()
}
async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    toast.success('Enlace copiado')
  } catch {
    toast.error('No se ha podido copiar: selecciónalo y cópialo a mano.')
  }
}
async function renew() {
  const ok = await confirm({
    title: '¿Generar un enlace nuevo?',
    message: 'El enlace actual dejará de funcionar y tendrás que volver a suscribir tu calendario con el nuevo.',
    confirmLabel: 'Generar enlace nuevo'
  })
  if (ok && (await rotate())) toast.success('Enlace nuevo generado')
}
</script>

<template>
  <BaseButton variant="outline" size="sm" icon="ph:rss-bold" data-calendar-subscribe @click="show">Suscribirme al calendario</BaseButton>

  <BottomSheet v-model="open" title="Suscribirte a tu calendario">
    <div class="calsub" data-calendar-sheet>
      <p>Con este enlace, tu calendario se actualiza solo cuando cambian las fechas de entrega. Sirve para Google Calendar, Apple Calendar y Outlook.</p>

      <p v-if="error" class="setting-error" role="alert">{{ error }} <button type="button" class="underline font-semibold" @click="load()">Reintentar</button></p>
      <SkeletonBlock v-else-if="loading && !url" height="2.75rem" rounded="var(--radius-md)" />
      <template v-else-if="url">
        <label class="sr-only" for="calsub-url">Enlace de tu calendario</label>
        <input id="calsub-url" class="input w-full" :value="url" readonly data-calendar-url @focus="($event.target as HTMLInputElement).select()">
        <div class="calsub__actions">
          <BaseButton variant="primary" size="sm" icon="ph:copy-bold" data-calendar-copy @click="copy">Copiar enlace</BaseButton>
          <a :href="webcalUrl" class="btn btn--secondary btn--sm" data-calendar-webcal>
            <Icon name="ph:calendar-plus-bold" class="btn__icon" aria-hidden="true" /><span>Abrir en mi calendario</span>
          </a>
        </div>
      </template>

      <ul class="calsub__steps">
        <li><strong>Google Calendar:</strong> Otros calendarios (+) → Desde URL → pega el enlace.</li>
        <li><strong>Apple Calendar:</strong> Archivo → Nueva suscripción a calendario → pega el enlace.</li>
        <li><strong>Outlook:</strong> Agregar calendario → Suscribirse desde la web → pega el enlace.</li>
      </ul>

      <p class="calsub__note"><Icon name="ph:lock-key-bold" class="size-4 shrink-0" aria-hidden="true" />Es privado: quien tenga el enlace ve tus fechas de entrega y sus títulos. Si lo compartes sin querer, genera uno nuevo.</p>
      <BaseButton variant="ghost" size="sm" icon="ph:arrows-clockwise-bold" :disabled="loading || !url" data-calendar-rotate @click="renew">Generar enlace nuevo</BaseButton>
    </div>
  </BottomSheet>
</template>
