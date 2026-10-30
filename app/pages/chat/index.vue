<script setup lang="ts">
// Panel derecho cuando no hay ninguna conversación abierta (solo se ve en
// escritorio; en móvil la bandeja ocupa la pantalla). La bandeja y su estado
// vacío viven en pages/chat.vue y ChatConversationList.vue.
</script>

<template>
  <div class="flex h-full flex-1 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-hairline-strong)]" data-chat-empty-pane>
    <EmptyState
      icon="ph:chat-circle-dots" title="Elige una conversación"
      description="Selecciona una a la izquierda para leerla y responder. Las ofertas pendientes de tu respuesta aparecen marcadas."
    />
  </div>
</template>
