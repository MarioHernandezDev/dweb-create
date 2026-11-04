<script setup lang="ts">
/** Acciones de la cuenta al pie del resumen: repetir el recorrido de bienvenida y cerrar sesión. */
defineEmits<{ tour: []; logout: [] }>()
</script>

<template>
  <section class="account-actions" data-card="account-actions">
    <BaseButton variant="ghost" size="sm" icon="ph:compass-tool-bold" @click="$emit('tour')">Ver el recorrido de bienvenida</BaseButton>
    <BaseButton variant="ghost" size="sm" icon="ph:sign-out-bold" data-logout @click="$emit('logout')">Cerrar sesión</BaseButton>
  </section>
</template>
