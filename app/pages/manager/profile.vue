<script setup lang="ts">
useHead({ title: 'Perfil' })
</script>

<template>
  <AppShell role="manager" title="Perfil">
    <section class="flex items-center gap-4 mb-8">
      <BaseAvatar initials="TU" :hue="266" size="lg" />
      <div>
        <p class="font-display text-[1.25rem] text-[var(--color-text)]">Tu cuenta</p>
        <p class="text-[0.9375rem] text-[var(--color-text-muted)]">Community manager</p>
      </div>
    </section>

    <section class="mb-6">
      <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-[0.9375rem] text-[var(--color-text)]">Tema de la app</span>
          <ThemeToggle />
        </div>
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-[0.9375rem] text-[var(--color-text)]">Notificaciones</span>
          <span class="text-[0.8125rem] text-[var(--color-text-faint)]">Próximamente</span>
        </div>
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-[0.9375rem] text-[var(--color-text)]">Plan</span>
          <span class="text-[0.8125rem] text-[var(--color-text-faint)]">Agencia · beta</span>
        </div>
      </BaseCard>
    </section>

    <RoleSwitcher current="manager" />
  </AppShell>
</template>
