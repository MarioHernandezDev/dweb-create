<script setup lang="ts">
/** Deja elegir si la ficha se puede abrir con el enlace sin haber iniciado sesión. */
const { enabled, saving, error, load, set } = usePublicProfileSetting()
const toast = useToast()

onMounted(() => { if (enabled.value === null) load() })

async function toggle() {
  if (enabled.value === null) return
  const next = !enabled.value
  if (await set(next)) toast.success(next ? 'Tu perfil se puede ver con el enlace sin iniciar sesión' : 'Tu perfil solo lo ve quien ha iniciado sesión')
}
</script>

<template>
  <div data-public-profile-toggle>
    <div class="setting-list">
      <div class="setting-row">
        <div class="setting-row__text">
          <p id="public-profile-toggle-label" class="setting-row__label">Perfil visible sin iniciar sesión</p>
          <p class="setting-row__meta">Quien abra tu enlace verá tu nombre, foto, presentación, categorías, redes verificadas, contenido destacado y valoración. Las tarifas, el catálogo y el contacto siguen pidiendo sesión.</p>
        </div>
        <button
          type="button" role="switch" class="switch" :aria-checked="enabled === true" aria-labelledby="public-profile-toggle-label"
          :disabled="enabled === null || saving" :aria-busy="saving" data-public-profile-switch @click="toggle"
        >
          <span class="switch__thumb" />
        </button>
      </div>
    </div>
    <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
  </div>
</template>
