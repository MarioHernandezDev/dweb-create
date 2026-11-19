<script setup lang="ts">
/**
 * Contenedor del chat (A-R20a). Mismas rutas de siempre (`/chat` y `/chat/[id]`,
 * así que los enlaces de las notificaciones no cambian) pero con la bandeja
 * persistente a la izquierda y el hilo a la derecha en escritorio; en móvil,
 * una pantalla u otra según haya conversación abierta. Fuera de /creator y
 * /partner a propósito, como inbox.vue: lo visitan los dos roles.
 */
useHead({ title: 'Chat' })

const route = useRoute()
const { role, ensureRole } = useMyRole()
const myRole = role.value ?? (await ensureRole()) ?? 'creator'
const hasThread = computed(() => !!route.params.id)
</script>

<template>
  <AppShell :role="myRole" title="Chat" subtitle="Habla y negocia con otros perfiles" full-width>
    <!-- Alto fijo del panel: se desplazan la lista y los mensajes, nunca la página.
         Medido (no a ojo) en navegador: ver CHANGELOG Alex-42. -->
    <div class="grid h-[calc(100dvh-12.5rem)] grid-cols-[minmax(0,1fr)] gap-4 md:h-[calc(100dvh-12rem)] lg:grid-cols-[21rem_minmax(0,1fr)] 2xl:grid-cols-[24rem_minmax(0,1fr)]" data-chat-layout>
      <aside class="min-h-0 min-w-0 flex-col" :class="hasThread ? 'hidden lg:flex' : 'flex'">
        <ChatConversationList />
      </aside>
      <section class="min-h-0 min-w-0 flex-col" :class="hasThread ? 'flex' : 'hidden lg:flex'" data-chat-pane>
        <NuxtPage :page-key="(route.params.id as string) ?? 'chat-index'" />
      </section>
    </div>
  </AppShell>
</template>
