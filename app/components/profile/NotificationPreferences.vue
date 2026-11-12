<script setup lang="ts">
import { NOTIFICATION_PREFERENCE_GROUPS, isGroupEnabled } from '~/utils/notifications'

/** Qué avisos quiere recibir el usuario en la bandeja. Lo que pide una acción (solicitudes, ofertas, revisiones, pagos) llega siempre. */
const props = defineProps<{ role: 'creator' | 'partner' }>()
const { muted, emailEnabled, loaded, saving, error, load, setGroup, setEmailEnabled } = useNotificationPreferences()
const toast = useToast()
const groups = computed(() => NOTIFICATION_PREFERENCE_GROUPS.filter((g) => !g.role || g.role === props.role))

onMounted(() => { if (!loaded.value) load() })

async function toggle(id: string) {
  const group = groups.value.find((g) => g.id === id)
  if (!group) return
  const enable = !isGroupEnabled(group, muted.value)
  if (await setGroup(group, enable)) toast.success(enable ? `Volverás a recibir: ${group.label.toLowerCase()}` : `Silenciado: ${group.label.toLowerCase()}`)
}

async function toggleEmail() {
  const enable = !emailEnabled.value
  if (await setEmailEnabled(enable)) toast.success(enable ? 'Te avisaremos también por correo' : 'Ya no recibirás avisos por correo')
}
</script>

<template>
  <div data-notification-preferences>
    <p class="setting-row__meta mb-3">Las solicitudes, ofertas, revisiones y pagos se avisan siempre. Aquí eliges el resto.</p>
    <div v-if="!loaded && !error" aria-busy="true"><SkeletonBlock v-for="n in 3" :key="n" height="3rem" rounded="var(--radius-md)" class="mb-2" /></div>
    <div v-else class="setting-list">
      <div v-for="g in groups" :key="g.id" class="setting-row">
        <div class="setting-row__text">
          <p :id="`notif-pref-${g.id}`" class="setting-row__label">{{ g.label }}</p>
          <p class="setting-row__meta">{{ g.description }}</p>
        </div>
        <button
          type="button" role="switch" class="switch" :aria-checked="isGroupEnabled(g, muted)" :aria-labelledby="`notif-pref-${g.id}`"
          :disabled="!loaded || saving !== null" :aria-busy="saving === g.id" @click="toggle(g.id)"
        >
          <span class="switch__thumb" />
        </button>
      </div>
      <div class="setting-row" data-notification-email>
        <div class="setting-row__text">
          <p id="notif-pref-email" class="setting-row__label">Avisos por correo</p>
          <p class="setting-row__meta">Si tienes avisos sin leer, te mandamos un resumen a tu correo. Los de tu cuenta (verificación, contraseña) llegan siempre.</p>
        </div>
        <button
          type="button" role="switch" class="switch" :aria-checked="emailEnabled" aria-labelledby="notif-pref-email"
          :disabled="!loaded || saving !== null" :aria-busy="saving === 'email'" @click="toggleEmail"
        >
          <span class="switch__thumb" />
        </button>
      </div>
    </div>
    <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
  </div>
</template>
