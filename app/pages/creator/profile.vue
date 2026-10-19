<script setup lang="ts">
useHead({ title: 'Perfil' })

const user = useSupabaseUser()
const { logout } = useLogout()
</script>

<template>
  <AppShell role="creator" title="Perfil">
    <div class="md:max-w-lg">
      <section class="flex items-center gap-4 mb-8">
        <BaseAvatar initials="TU" :hue="266" size="lg" />
        <div>
          <p class="font-display text-[1.25rem] text-[var(--color-text)]">Tu cuenta</p>
          <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Creador de contenido' }}</p>
        </div>
      </section>

      <section class="mb-6">
        <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
          <NuxtLink to="/creator/socials" class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Redes conectadas</span>
            <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)]" />
          </NuxtLink>
          <div class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Créditos de predicción</span>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">18 restantes</span>
          </div>
        </BaseCard>
      </section>

      <BaseButton variant="secondary" icon="ph:sign-out-bold" class="w-full" @click="logout">Cerrar sesión</BaseButton>
    </div>
  </AppShell>
</template>
