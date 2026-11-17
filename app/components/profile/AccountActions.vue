<script setup lang="ts">
/** Acciones de la cuenta al pie del resumen: repetir el recorrido de bienvenida y cerrar sesión. */
defineEmits<{ tour: []; logout: [] }>()
</script>

<template>
  <section class="account-actions" data-card="account-actions">
    <BaseButton variant="ghost" size="sm" icon="ph:compass-tool-bold" @click="$emit('tour')">Ver el recorrido de bienvenida</BaseButton>
    <!-- En escritorio y tablet «Cerrar sesión» ya está siempre en la columna lateral; aquí solo hace falta en móvil. -->
    <BaseButton variant="ghost" size="sm" icon="ph:sign-out-bold" class="md:hidden" data-logout @click="$emit('logout')">Cerrar sesión</BaseButton>
  </section>
</template>
